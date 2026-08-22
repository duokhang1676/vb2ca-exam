import { notFound } from "next/navigation";
import { ResultsView } from "@/components/results-view";
import { parseQuestions } from "@/lib/exam/json";
import type { McqDetailItem } from "@/lib/exam/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function ResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const { data: attempt } = await supabase
    .from("attempts")
    .select("*")
    .eq("id", id)
    .single();

  if (!attempt || !attempt.submitted_at) notFound();

  const { data: exam } = await supabase
    .from("exams")
    .select("title, essay_prompt, questions")
    .eq("id", attempt.exam_id)
    .single();

  if (!exam) notFound();

  const questions = parseQuestions(exam.questions);
  const detail = (attempt.mcq_detail as McqDetailItem[] | null) ?? [];

  return (
    <ResultsView
      title={exam.title}
      essayPrompt={exam.essay_prompt}
      essayText={attempt.essay_text ?? ""}
      essayScore={Number(attempt.essay_score ?? 0)}
      essayFeedback={attempt.essay_feedback ?? ""}
      mcqScore={Number(attempt.mcq_score ?? 0)}
      correctCount={detail.filter((item) => item.isCorrect).length}
      totalQuestions={questions.length}
      totalScore={Number(attempt.total_score ?? 0)}
      detail={detail}
    />
  );
}
