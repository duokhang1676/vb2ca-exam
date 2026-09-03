import {
  DAILY_SKILLS,
  firstSkillStep,
  nextStepId,
  stepById,
  visibleSteps,
} from "./curriculum";
import { guessQuestionType } from "./frameworks";
import { generateAnalysisWithGemini, generateSeedWithGemini } from "./ai";
import { buildStaticSeed } from "./static-seed";
import {
  PATH_VERSION,
  isPracticeLevel,
  isPracticeMode,
  type PathMode,
  type PracticeLevel,
  type PracticeMode,
  type QuestionAnalysis,
  type SeedData,
} from "./types";
import {
  getAnalysis,
  getEnrollment,
  getEssay,
  getLastStepScore,
  getSeed,
  listEssays,
  listProgress,
  saveEnrollment,
  upsertAnalysis,
  upsertSeed,
  type EssayRow,
} from "./store";

export type SessionTask = {
  pathMode: PathMode;
  stepId: string;
  skill: PracticeMode | "framework";
  level: PracticeLevel | 0;
  title: string;
  instruction: string;
  essay: EssayRow | null;
  analysis: QuestionAnalysis | null;
  seed: { id: string | null; data: SeedData } | null;
  needsPack: boolean;
  enrollmentStatus: "active" | "completed";
  progressIndex: number;
  progressTotal: number;
  lastScore?: number | null;
};

async function pickEssay(preferredId?: string | null): Promise<EssayRow | null> {
  if (preferredId) {
    const existing = await getEssay(preferredId);
    if (existing) return existing;
  }
  const essays = await listEssays();
  if (essays.length === 0) return null;
  for (const essay of essays) {
    const analysis = await getAnalysis(essay.id);
    if (analysis) return essay;
  }
  return essays[0] ?? null;
}

async function ensureAnalysis(
  essay: EssayRow,
  userId: string,
): Promise<{ analysis: QuestionAnalysis | null; needsPack: boolean }> {
  const cached = await getAnalysis(essay.id);
  if (cached) return { analysis: cached, needsPack: false };

  const generated = await generateAnalysisWithGemini({
    question: essay.prompt,
    userId,
  });
  if (generated) {
    const saved = await upsertAnalysis({
      essayId: essay.id,
      analysis: {
        questionType: generated.questionType,
        mainTopic: generated.mainTopic,
        coreIssue: generated.coreIssue,
        keywords: generated.keywords,
        suggestedPosition: generated.suggestedPosition,
        source: "gemini",
      },
      model: "gemini-2.5-flash",
    });
    return { analysis: saved, needsPack: false };
  }

  const fallback = await upsertAnalysis({
    essayId: essay.id,
    analysis: {
      questionType: guessQuestionType(essay.prompt),
      mainTopic: essay.topic?.trim() || essay.prompt.slice(0, 80),
      coreIssue: essay.prompt.slice(0, 160),
      keywords: essay.prompt
        .split(/\s+/)
        .filter((word) => word.length > 2)
        .slice(0, 4)
        .concat(["vấn đề"])
        .slice(0, 4),
      source: "manual",
    },
  });
  return { analysis: fallback, needsPack: true };
}

async function ensureSeed(params: {
  essay: EssayRow;
  analysis: QuestionAnalysis | null;
  mode: PracticeMode;
  level: PracticeLevel;
  userId: string;
}): Promise<{ seed: { id: string | null; data: SeedData }; needsPack: boolean }> {
  const cached = await getSeed({
    essayId: params.essay.id,
    mode: params.mode,
    level: params.level,
  });
  if (cached) return { seed: cached, needsPack: false };

  if (params.analysis) {
    const generated = await generateSeedWithGemini({
      question: params.essay.prompt,
      analysis: params.analysis,
      mode: params.mode,
      level: params.level,
      userId: params.userId,
    });
    if (generated) {
      const saved = await upsertSeed({
        essayId: params.essay.id,
        mode: params.mode,
        level: params.level,
        data: generated,
        model: "gemini-2.5-flash",
      });
      return { seed: saved, needsPack: false };
    }
  }

  return {
    seed: {
      id: null,
      data: buildStaticSeed({
        mode: params.mode,
        level: params.level,
        prompt: params.essay.prompt,
        analysis: params.analysis,
      }),
    },
    needsPack: true,
  };
}

export async function loadGuidedSession(userId: string): Promise<SessionTask> {
  let enrollment = await getEnrollment(userId);
  if (!enrollment) {
    enrollment = {
      userId,
      pathVersion: PATH_VERSION,
      currentStepId: "m0",
      currentEssayId: null,
      remedialSkill: null,
      remedialReturnStepId: null,
      status: "active",
    };
    await saveEnrollment(enrollment);
  }

  const essay = await pickEssay(enrollment.currentEssayId);
  if (essay && essay.id !== enrollment.currentEssayId) {
    enrollment.currentEssayId = essay.id;
    await saveEnrollment(enrollment);
  }

  const analysisPack = essay
    ? await ensureAnalysis(essay, userId)
    : { analysis: null, needsPack: false };
  const steps = visibleSteps(analysisPack.analysis);
  const current =
    (enrollment.remedialSkill
      ? firstSkillStep(enrollment.remedialSkill, analysisPack.analysis)
      : null) ??
    stepById(enrollment.currentStepId) ??
    steps[0];

  if (!current) {
    return {
      pathMode: "guided",
      stepId: "m0",
      skill: "framework",
      level: 0,
      title: "Học khung bài nghị luận",
      instruction: "Chưa có lộ trình.",
      essay,
      analysis: analysisPack.analysis,
      seed: null,
      needsPack: false,
      enrollmentStatus: enrollment.status,
      progressIndex: 0,
      progressTotal: steps.length,
    };
  }

  const index = Math.max(0, steps.findIndex((step) => step.id === current.id));
  if (current.skill === "framework") {
    return {
      pathMode: enrollment.remedialSkill ? "remedial" : "guided",
      stepId: current.id,
      skill: "framework",
      level: 0,
      title: current.title,
      instruction: current.instruction,
      essay,
      analysis: analysisPack.analysis,
      seed: null,
      needsPack: !essay,
      enrollmentStatus: enrollment.status,
      progressIndex: index,
      progressTotal: steps.length,
    };
  }

  if (!essay) {
    return {
      pathMode: "guided",
      stepId: current.id,
      skill: current.skill,
      level: current.level === 0 ? 1 : current.level,
      title: current.title,
      instruction: current.instruction,
      essay: null,
      analysis: null,
      seed: null,
      needsPack: true,
      enrollmentStatus: enrollment.status,
      progressIndex: index,
      progressTotal: steps.length,
    };
  }

  const level = current.level === 0 ? 1 : current.level;
  const seedPack = await ensureSeed({
    essay,
    analysis: analysisPack.analysis,
    mode: current.skill,
    level,
    userId,
  });

  return {
    pathMode: enrollment.remedialSkill ? "remedial" : "guided",
    stepId: current.id,
    skill: current.skill,
    level,
    title: current.title,
    instruction: current.instruction,
    essay,
    analysis: analysisPack.analysis,
    seed: seedPack.seed,
    needsPack: analysisPack.needsPack || seedPack.needsPack,
    enrollmentStatus: enrollment.status,
    progressIndex: index,
    progressTotal: steps.length,
  };
}

export async function loadFreeSession(params: {
  userId: string;
  essayId?: string;
  skill: PracticeMode;
  level: PracticeLevel;
}): Promise<SessionTask> {
  const essay = await pickEssay(params.essayId);
  if (!essay) {
    throw new Error("Ngân hàng chưa có đề nghị luận.");
  }
  const analysisPack = await ensureAnalysis(essay, params.userId);
  const seedPack = await ensureSeed({
    essay,
    analysis: analysisPack.analysis,
    mode: params.skill,
    level: params.level,
    userId: params.userId,
  });
  const step = firstSkillStep(params.skill, analysisPack.analysis);
  return {
    pathMode: "free",
    stepId: step?.id ?? `free-${params.skill}-l${params.level}`,
    skill: params.skill,
    level: params.level,
    title: step?.title ?? params.skill,
    instruction: step?.instruction ?? "Luyện tự do.",
    essay,
    analysis: analysisPack.analysis,
    seed: seedPack.seed,
    needsPack: analysisPack.needsPack || seedPack.needsPack,
    enrollmentStatus: "active",
    progressIndex: 0,
    progressTotal: 1,
  };
}

export async function loadDailySession(userId: string): Promise<SessionTask[]> {
  const progress = await listProgress(userId);
  const weak = [...progress]
    .filter((item) => item.attempts > 0)
    .sort((a, b) => a.recentAverageScore - b.recentAverageScore)
    .map((item) => item.skill);
  const skills = [...new Set([...weak.slice(0, 2), ...DAILY_SKILLS])].slice(0, 4);
  const tasks: SessionTask[] = [];
  for (const skill of skills) {
    if (!isPracticeMode(skill)) continue;
    tasks.push(
      await loadFreeSession({
        userId,
        skill,
        level: 1,
      }),
    );
  }
  return tasks.map((task) => ({ ...task, pathMode: "daily" as const }));
}

export async function completeFramework(userId: string): Promise<string | null> {
  const enrollment = await getEnrollment(userId);
  if (!enrollment) return null;
  const essay = enrollment.currentEssayId
    ? await getEssay(enrollment.currentEssayId)
    : await pickEssay(null);
  const analysis = essay ? await getAnalysis(essay.id) : null;
  const next = nextStepId("m0", analysis);
  enrollment.currentStepId = next ?? "m1";
  enrollment.currentEssayId = essay?.id ?? enrollment.currentEssayId;
  await saveEnrollment(enrollment);
  return enrollment.currentStepId;
}

export async function loadReviewSession(params: {
  userId: string;
  stepId: string;
}): Promise<SessionTask> {
  const enrollment = await getEnrollment(params.userId);
  if (!enrollment) {
    throw new Error("Chưa bắt đầu lộ trình luyện nghị luận.");
  }
  const essay = await pickEssay(enrollment.currentEssayId);
  const analysisPack = essay
    ? await ensureAnalysis(essay, params.userId)
    : { analysis: null, needsPack: false };
  const steps = visibleSteps(analysisPack.analysis);
  const currentIndex = Math.max(
    0,
    steps.findIndex((step) => step.id === enrollment.currentStepId),
  );
  const target = stepById(params.stepId);
  const targetIndex = steps.findIndex((step) => step.id === params.stepId);
  const unlocked =
    enrollment.status === "completed" ||
    (targetIndex >= 0 && targetIndex <= currentIndex);
  if (!target || targetIndex < 0 || !unlocked) {
    throw new Error("Chưa mở khóa phần luyện này.");
  }

  const lastScore = await getLastStepScore({
    userId: params.userId,
    stepId: target.id,
  });

  if (target.skill === "framework") {
    return {
      pathMode: "review",
      stepId: target.id,
      skill: "framework",
      level: 0,
      title: target.title,
      instruction: target.instruction,
      essay,
      analysis: analysisPack.analysis,
      seed: null,
      needsPack: !essay,
      enrollmentStatus: enrollment.status,
      progressIndex: targetIndex,
      progressTotal: steps.length,
      lastScore,
    };
  }

  if (!essay) {
    throw new Error("Ngân hàng chưa có đề nghị luận.");
  }

  const level = target.level === 0 ? 1 : target.level;
  const seedPack = await ensureSeed({
    essay,
    analysis: analysisPack.analysis,
    mode: target.skill,
    level,
    userId: params.userId,
  });

  return {
    pathMode: "review",
    stepId: target.id,
    skill: target.skill,
    level,
    title: target.title,
    instruction: target.instruction,
    essay,
    analysis: analysisPack.analysis,
    seed: seedPack.seed,
    needsPack: analysisPack.needsPack || seedPack.needsPack,
    enrollmentStatus: enrollment.status,
    progressIndex: targetIndex,
    progressTotal: steps.length,
    lastScore,
  };
}

export function parseLevel(value: unknown): PracticeLevel {
  const number = Number(value);
  return isPracticeLevel(number) ? number : 1;
}
