import { notFound, redirect } from "next/navigation";
import { ResultsView } from "@/components/results-view";
import { getAuthUser } from "@/lib/auth/session";
import { parseQuestions } from "@/lib/exam/json";
import { isSectionMode, type McqDetailItem } from "@/lib/exam/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function ResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const { data: attempt } = await supabase
    .from("attempts")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!attempt || !attempt.submitted_at) notFound();

  const { data: exam } = await supabase
    .from("exams")
    .select("title, essay_prompt, essay_topic, essay_solution, questions")
    .eq("id", attempt.exam_id)
    .single();

  if (!exam) notFound();

  const questions = parseQuestions(exam.questions);
  const metaByNumber = new Map(
    questions.map((question) => [
      question.originalNumber,
      { topic: question.topic, solution: question.solution },
    ]),
  );
  const rawDetail = (attempt.mcq_detail as McqDetailItem[] | null) ?? [];
  const detail = rawDetail.map((item) => {
    const meta = metaByNumber.get(item.originalNumber);
    return {
      ...item,
      topic: meta?.topic,
      solution: meta?.solution,
    };
  });
  const sectionMode = isSectionMode(attempt.section_mode)
    ? attempt.section_mode
    : "full";

  return (
    <ResultsView
      title={exam.title}
      essayPrompt={exam.essay_prompt}
      essayTopic={exam.essay_topic}
      essaySolution={exam.essay_solution}
      essayText={attempt.essay_text ?? ""}
      essayScore={Number(attempt.essay_score ?? 0)}
      essayFeedback={attempt.essay_feedback ?? ""}
      mcqScore={Number(attempt.mcq_score ?? 0)}
      correctCount={detail.filter((item) => item.isCorrect).length}
      totalQuestions={sectionMode === "part1" ? 0 : questions.length}
      totalScore={Number(attempt.total_score ?? 0)}
      detail={detail}
      sectionMode={sectionMode}
    />
  );
}
