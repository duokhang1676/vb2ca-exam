import { NextResponse } from "next/server";
import { EXAM_DURATION_MS } from "@/lib/exam/constants";
import { parseAnswers, parseQuestions, parseShuffle } from "@/lib/exam/json";
import { toDisplayQuestions } from "@/lib/exam/shuffle";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();

  const { data: attempt, error } = await supabase
    .from("attempts")
    .select(
      "id, exam_id, shuffle, started_at, submitted_at, essay_text, answers",
    )
    .eq("id", id)
    .single();

  if (error || !attempt) {
    return NextResponse.json({ error: "Không tìm thấy bài làm." }, { status: 404 });
  }

  const { data: exam, error: examError } = await supabase
    .from("exams")
    .select("id, title, essay_prompt, questions")
    .eq("id", attempt.exam_id)
    .single();

  if (examError || !exam) {
    return NextResponse.json({ error: "Không tìm thấy đề thi." }, { status: 404 });
  }

  const questions = parseQuestions(exam.questions);
  const shuffle = parseShuffle(attempt.shuffle);
  const displayQuestions = toDisplayQuestions(questions, shuffle);
  const endsAt = new Date(attempt.started_at).getTime() + EXAM_DURATION_MS;

  return NextResponse.json({
    attempt: {
      id: attempt.id,
      examId: attempt.exam_id,
      startedAt: attempt.started_at,
      submittedAt: attempt.submitted_at,
      essayText: attempt.essay_text ?? "",
      answers: parseAnswers(attempt.answers),
      endsAt,
      serverNow: Date.now(),
    },
    exam: {
      id: exam.id,
      title: exam.title,
      essayPrompt: exam.essay_prompt,
      questions: displayQuestions,
    },
  });
}
