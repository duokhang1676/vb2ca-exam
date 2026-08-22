import { NextResponse } from "next/server";
import { pointsPerQuestion } from "@/lib/exam/constants";
import { gradeEssay } from "@/lib/exam/grade-essay";
import { gradeMultipleChoice, roundTotal } from "@/lib/exam/grade";
import { asJson, parseAnswerKeyJson, parseAnswers, parseQuestions, parseShuffle } from "@/lib/exam/json";
import { toDisplayQuestions } from "@/lib/exam/shuffle";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    essayText?: string;
    answers?: Record<string, string>;
  };

  const supabase = getSupabaseAdmin();
  const { data: attempt, error } = await supabase
    .from("attempts")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !attempt) {
    return NextResponse.json({ error: "Không tìm thấy bài làm." }, { status: 404 });
  }

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

  const answers = {
    ...parseAnswers(attempt.answers),
    ...(body.answers ?? {}),
  };
  const essayText = body.essayText ?? attempt.essay_text ?? "";
  const questions = parseQuestions(exam.questions);
  const shuffle = parseShuffle(attempt.shuffle);
  const displayQuestions = toDisplayQuestions(questions, shuffle);
  const answerKey = parseAnswerKeyJson(exam.answer_key);

  const mcq = gradeMultipleChoice({
    questions: displayQuestions,
    answers,
    answerKey,
    shuffle,
    points: pointsPerQuestion(displayQuestions.length),
  });

  const essay = await gradeEssay({
    prompt: exam.essay_prompt,
    essayText,
  });

  const total = roundTotal(essay.score, mcq.mcqScore);

  const { error: updateError } = await supabase
    .from("attempts")
    .update({
      essay_text: essayText,
      answers: asJson(answers),
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
