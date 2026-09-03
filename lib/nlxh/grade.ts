import { asJson } from "@/lib/exam/json";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  evaluateFullEssayWithGemini,
  evaluateWithGemini,
} from "./ai";
import {
  firstSkillStep,
  masteryFromScores,
  nextStepId,
  passedStep,
  stepById,
} from "./curriculum";
import { localGrade } from "./grade-local";
import { recommendAfterFullEssay } from "./recommend";
import { getEnrollment, listProgress, saveEnrollment } from "./store";
import type {
  PathMode,
  PracticeAnswer,
  PracticeFeedback,
  PracticeLevel,
  PracticeMode,
  QuestionAnalysis,
  SeedData,
} from "./types";
import { isPracticeMode, roundScore } from "./types";

export type GradeResult = {
  attemptId: string;
  score: number;
  wordCount: number;
  feedback: PracticeFeedback;
  advanced: boolean;
  nextStepId: string | null;
  rewrite: boolean;
  pathCompleted: boolean;
  preferExternalGrade: boolean;
};

async function updateSkillProgress(params: {
  userId: string;
  skill: PracticeMode;
  score: number;
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data: recent } = await supabase
    .from("nlxh_practice_attempts")
    .select("score")
    .eq("user_id", params.userId)
    .eq("practice_mode", params.skill)
    .order("created_at", { ascending: false })
    .limit(5);
  const scores = (recent ?? [])
    .map((row) => Number(row.score))
    .filter((value) => Number.isFinite(value));
  const attempts = scores.length;
  const average = attempts ? scores.reduce((sum, value) => sum + value, 0) / attempts : 0;
  const recentAverage = average;
  const best = attempts ? Math.max(...scores) : params.score;
  const mastery = masteryFromScores({ attempts, recentAverage });
  await supabase.from("nlxh_skill_progress").upsert({
    user_id: params.userId,
    skill: params.skill,
    attempts,
    average_score: roundScore(average),
    recent_average_score: roundScore(recentAverage),
    best_score: roundScore(best),
    mastery,
    updated_at: new Date().toISOString(),
  });
}

async function advancePath(params: {
  userId: string;
  pathMode: PathMode;
  stepId: string;
  skill: PracticeMode;
  score: number;
  analysis: QuestionAnalysis | null;
  rubricScores?: Record<string, number>;
}): Promise<{
  advanced: boolean;
  nextStepId: string | null;
  rewrite: boolean;
  pathCompleted: boolean;
}> {
  if (
    params.pathMode === "free" ||
    params.pathMode === "daily" ||
    params.pathMode === "review"
  ) {
    return {
      advanced: false,
      nextStepId: null,
      rewrite: params.score < 6,
      pathCompleted: false,
    };
  }

  const enrollment = await getEnrollment(params.userId);
  if (!enrollment) {
    return { advanced: false, nextStepId: null, rewrite: params.score < 6, pathCompleted: false };
  }

  if (params.pathMode === "remedial" && enrollment.remedialSkill) {
    if (params.score >= 7) {
      const returnId = enrollment.remedialReturnStepId ?? "m10-l2";
      enrollment.remedialSkill = null;
      enrollment.remedialReturnStepId = null;
      enrollment.currentStepId = returnId;
      await saveEnrollment(enrollment);
      return {
        advanced: true,
        nextStepId: returnId,
        rewrite: false,
        pathCompleted: false,
      };
    }
    return {
      advanced: false,
      nextStepId: enrollment.currentStepId,
      rewrite: true,
      pathCompleted: false,
    };
  }

  if (params.score < 6) {
    return {
      advanced: false,
      nextStepId: params.stepId,
      rewrite: true,
      pathCompleted: false,
    };
  }

  const supabase = getSupabaseAdmin();
  const { data: stepAttempts } = await supabase
    .from("nlxh_practice_attempts")
    .select("score")
    .eq("user_id", params.userId)
    .eq("step_id", params.stepId)
    .order("created_at", { ascending: false })
    .limit(5);
  const scores = (stepAttempts ?? [])
    .map((row) => Number(row.score))
    .filter((value) => Number.isFinite(value));
  const recentAverage =
    scores.reduce((sum, value) => sum + value, 0) / Math.max(scores.length, 1);
  const step = stepById(params.stepId);
  const ok =
    !step ||
    passedStep({
      step,
      score: params.score,
      recentAverage,
      attemptsForStep: scores.length,
    });
  if (!ok) {
    return {
      advanced: false,
      nextStepId: params.stepId,
      rewrite: true,
      pathCompleted: false,
    };
  }

  if (params.skill === "full_essay") {
    const remedial = recommendAfterFullEssay(params.rubricScores);
    if (remedial[0]) {
      enrollment.remedialSkill = remedial[0];
      enrollment.remedialReturnStepId = params.stepId;
      await saveEnrollment(enrollment);
      const remedialStep = firstSkillStep(remedial[0], params.analysis);
      return {
        advanced: true,
        nextStepId: remedialStep?.id ?? params.stepId,
        rewrite: false,
        pathCompleted: false,
      };
    }
  }

  const next = nextStepId(params.stepId, params.analysis);
  if (!next) {
    enrollment.status = "completed";
    await saveEnrollment(enrollment);
    return {
      advanced: true,
      nextStepId: null,
      rewrite: false,
      pathCompleted: true,
    };
  }
  enrollment.currentStepId = next;
  enrollment.status = "active";
  await saveEnrollment(enrollment);
  return {
    advanced: true,
    nextStepId: next,
    rewrite: false,
    pathCompleted: false,
  };
}

export async function submitPractice(params: {
  userId: string;
  essayId: string;
  prompt: string;
  mode: PracticeMode;
  level: PracticeLevel;
  pathMode: PathMode;
  stepId: string;
  answer: PracticeAnswer;
  analysis: QuestionAnalysis | null;
  seed: SeedData | null;
  seedId?: string | null;
  usedHintCount: number;
  durationSeconds?: number;
  previousWeaknesses?: string[];
}): Promise<GradeResult> {
  const local = localGrade({
    mode: params.mode,
    level: params.level,
    answer: params.answer,
    analysis: params.analysis,
    seed: params.seed,
    prompt: params.prompt,
  });

  let score = local.score;
  let feedback = local.feedback;
  let rubricScores: Record<string, number> | undefined;
  const preferExternalGrade = params.mode === "full_essay";
  const answerText =
    params.answer.text?.trim() ||
    (params.answer.items ?? []).join("\n") ||
    Object.values(params.answer.fields ?? {}).join("\n");

  if (local.useAi && params.mode !== "full_essay") {
    const ai = await evaluateWithGemini({
      question: params.prompt,
      analysis: params.analysis,
      mode: params.mode,
      answer: answerText,
      previousWeaknesses: params.previousWeaknesses,
      userId: params.userId,
    });
    if (ai) {
      score = roundScore(ai.score);
      feedback = {
        summary: score >= 7 ? "Đạt yêu cầu kỹ năng này." : "Cần viết lại cho rõ hơn.",
        strengths: ai.strengths.slice(0, 2),
        weaknesses: ai.weaknesses.slice(0, 2),
        suggestedRevision: ai.suggestedRevision,
      };
    }
  }

  if (params.mode === "full_essay" && local.score > 0) {
    const ai = await evaluateFullEssayWithGemini({
      question: params.prompt,
      analysis: params.analysis,
      answer: answerText,
      userId: params.userId,
    });
    if (ai) {
      score = roundScore(ai.overallScore);
      rubricScores = ai.scores;
      feedback = {
        summary: score >= 7 ? "Bài đã có hình thức nghị luận." : "Bài còn thiếu ý then chốt.",
        strengths: ai.strengths.slice(0, 2),
        weaknesses: ai.priorityFixes.slice(0, 2),
        missingComponents: ai.missingComponents,
        priorityFixes: ai.priorityFixes,
        nextPractice: ai.nextPractice[0],
        scores: ai.scores,
      };
    } else {
      feedback = {
        ...feedback,
        summary:
          "Đã chấm hình thức. Có thể chấm sâu bằng chatbot ngoài để tiết kiệm token.",
      };
    }
  }

  const supabase = getSupabaseAdmin();
  const { data: attempt, error } = await supabase
    .from("nlxh_practice_attempts")
    .insert({
      user_id: params.userId,
      essay_id: params.essayId,
      practice_mode: params.mode,
      level: params.level,
      exercise_seed_id: params.seedId ?? null,
      path_mode: params.pathMode,
      step_id: params.stepId,
      answer: asJson(params.answer),
      score,
      rubric_scores: rubricScores ? asJson(rubricScores) : null,
      feedback: asJson(feedback),
      used_hint_count: params.usedHintCount,
      duration_seconds: params.durationSeconds ?? null,
      word_count: local.wordCount,
    })
    .select("id")
    .single();
  if (error || !attempt) throw new Error(error?.message || "Không lưu được bài luyện.");

  await updateSkillProgress({
    userId: params.userId,
    skill: params.mode,
    score,
  });

  const path = await advancePath({
    userId: params.userId,
    pathMode: params.pathMode,
    stepId: params.stepId,
    skill: params.mode,
    score,
    analysis: params.analysis,
    rubricScores,
  });

  return {
    attemptId: attempt.id,
    score,
    wordCount: local.wordCount,
    feedback,
    ...path,
    preferExternalGrade: preferExternalGrade && !rubricScores,
  };
}

export async function applyExternalGrade(params: {
  userId: string;
  attemptId: string;
  score: number;
  feedback: PracticeFeedback;
  rubricScores?: Record<string, number>;
}): Promise<GradeResult> {
  const supabase = getSupabaseAdmin();
  const { data: attempt, error } = await supabase
    .from("nlxh_practice_attempts")
    .select("*")
    .eq("id", params.attemptId)
    .eq("user_id", params.userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!attempt) throw new Error("Không tìm thấy bài luyện.");

  await supabase
    .from("nlxh_practice_attempts")
    .update({
      score: params.score,
      feedback: asJson(params.feedback),
      rubric_scores: params.rubricScores ? asJson(params.rubricScores) : attempt.rubric_scores,
    })
    .eq("id", params.attemptId);

  if (!isPracticeMode(attempt.practice_mode)) {
    throw new Error("Kỹ năng không hợp lệ.");
  }

  await updateSkillProgress({
    userId: params.userId,
    skill: attempt.practice_mode,
    score: params.score,
  });

  const path = await advancePath({
    userId: params.userId,
    pathMode: (attempt.path_mode as PathMode) ?? "guided",
    stepId: attempt.step_id ?? "",
    skill: attempt.practice_mode,
    score: params.score,
    analysis: null,
    rubricScores: params.rubricScores,
  });

  return {
    attemptId: attempt.id,
    score: params.score,
    wordCount: attempt.word_count ?? 0,
    feedback: params.feedback,
    ...path,
    preferExternalGrade: false,
  };
}

export async function progressPayload(userId: string) {
  const enrollment = await getEnrollment(userId);
  const progress = await listProgress(userId);
  return { enrollment, progress };
}
