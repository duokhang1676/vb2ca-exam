import { NextResponse } from "next/server";
import { requireOwnedAttempt } from "@/lib/auth/attempt";
import { pointsPerQuestion, PRACTICE_ESSAY_FEEDBACK } from "@/lib/exam/constants";
import { gradeEssay } from "@/lib/exam/grade-essay";
import { gradeMultipleChoice, roundTotal } from "@/lib/exam/grade";
import {
  asJson,
  parseAnswerKeyJson,
  parseAnswers,
  parseFlagged,
  parseQuestions,
  parseShuffle,
} from "@/lib/exam/json";
import { toDisplayQuestions } from "@/lib/exam/shuffle";
import { isAttemptMode, isSectionMode } from "@/lib/exam/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const { attempt, response } = await requireOwnedAttempt(id);
  if (!attempt) return response;
  const body = (await request.json().catch(() => ({}))) as {
    essayText?: string;
    answers?: Record<string, string>;
    flagged?: number[];
    essayFlagged?: boolean;
  };

  const supabase = getSupabaseAdmin();

  if (attempt.submitted_at) {
    return NextResponse.json({ resultUrl: `/attempts/${id}/result` });
  }

  const { data: exam, error: examError } = await supabase
    .from("exams")
    .select("essay_prompt, questions, answer_key")
    .eq("id", attempt.exam_id)
    .single();

  if (examError || !exam) {
    return NextResponse.json({ error: "Không tìm thấy đề thi." }, { status: 404 });
  }

  const sectionMode = isSectionMode(attempt.section_mode)
    ? attempt.section_mode
    : "full";
  const attemptMode = isAttemptMode(attempt.attempt_mode)
    ? attempt.attempt_mode
    : "exam";
  const answers = {
    ...parseAnswers(attempt.answers),
    ...(body.answers ?? {}),
  };
  const essayText = body.essayText ?? attempt.essay_text ?? "";
  const questions = parseQuestions(exam.questions);
  const shuffle = parseShuffle(attempt.shuffle);
  const displayQuestions =
    sectionMode === "part1" ? [] : toDisplayQuestions(questions, shuffle);
  const answerKey = parseAnswerKeyJson(exam.answer_key);

  const mcq =
    sectionMode === "part1"
      ? {
          mcqScore: 0,
          correctCount: 0,
          totalQuestions: 0,
          detail: [],
        }
      : gradeMultipleChoice({
          questions: displayQuestions,
          answers,
          answerKey,
          shuffle,
          points: pointsPerQuestion(displayQuestions.length),
        });

  const essay =
    sectionMode === "part2"
      ? {
          score: 0,
          feedback: "Bài làm chỉ gồm phần 2 nên không chấm nghị luận.",
        }
      : attemptMode === "practice"
        ? {
            score: 0,
            feedback: PRACTICE_ESSAY_FEEDBACK,
          }
        : await gradeEssay({
            prompt: exam.essay_prompt,
            essayText,
          });

  const total = roundTotal(essay.score, mcq.mcqScore);

  const { error: updateError } = await supabase
    .from("attempts")
    .update({
      essay_text: essayText,
      answers: asJson(answers),
      flagged: asJson(body.flagged ?? parseFlagged(attempt.flagged)),
      essay_flagged:
        typeof body.essayFlagged === "boolean"
          ? body.essayFlagged
          : Boolean(attempt.essay_flagged),
      submitted_at: new Date().toISOString(),
      essay_score: essay.score,
      essay_feedback: essay.feedback,
      mcq_score: mcq.mcqScore,
      mcq_detail: asJson(mcq.detail),
      total_score: total,
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ resultUrl: `/attempts/${id}/result` });
}
