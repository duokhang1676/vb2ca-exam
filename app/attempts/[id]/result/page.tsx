import { notFound, redirect } from "next/navigation";
import { ResultsView } from "@/components/results-view";
import { getAuthUser } from "@/lib/auth/session";
import { essayFingerprint, questionFingerprint } from "@/lib/exam/fingerprint";
import { parseFlagged, parseQuestions } from "@/lib/exam/json";
import { listUserMarks, markSet } from "@/lib/exam/marks";
import {
  isAttemptMode,
  isExamCode,
  isSectionMode,
  type McqDetailItem,
} from "@/lib/exam/types";
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
    .select(
      "title, essay_prompt, essay_topic, essay_solution, questions, exam_code",
    )
    .eq("id", attempt.exam_id)
    .single();

  if (!exam) notFound();

  const examCode = isExamCode(exam.exam_code) ? exam.exam_code : "CA1";
  const questions = parseQuestions(exam.questions);
  const metaByNumber = new Map(
    questions.map((question) => [
      question.originalNumber,
      { topic: question.topic, solution: question.solution },
    ]),
  );
  const marks = await listUserMarks(user.id);
  const questionMarks = markSet(marks, "question");
  const essayMarks = markSet(marks, "essay");
  const essayFp = exam.essay_prompt ? essayFingerprint(exam.essay_prompt) : "";
  const flagged = new Set(parseFlagged(attempt.flagged));
  const essayFlagged =
    Boolean(attempt.essay_flagged) ||
    (essayFp ? essayMarks.has(essayFp) : false);
  const rawDetail = (attempt.mcq_detail as McqDetailItem[] | null) ?? [];
  const detail = rawDetail.map((item) => {
    const meta = metaByNumber.get(item.originalNumber);
    const fingerprint = questionFingerprint({
      examCode,
      type: item.type,
      stem: item.stem,
      options: item.options,
    });
    return {
      ...item,
      topic: meta?.topic,
      solution: meta?.solution,
      fingerprint,
      marked: flagged.has(item.originalNumber) || questionMarks.has(fingerprint),
    };
  });
  const sectionMode = isSectionMode(attempt.section_mode)
    ? attempt.section_mode
    : "full";
  const attemptMode = isAttemptMode(attempt.attempt_mode)
    ? attempt.attempt_mode
    : "exam";

  return (
    <ResultsView
      attemptId={id}
      examCode={examCode}
      title={exam.title}
      essayPrompt={exam.essay_prompt}
      essayTopic={exam.essay_topic}
      essaySolution={exam.essay_solution}
      essayFingerprint={essayFp}
      essayText={attempt.essay_text ?? ""}
      essayScore={Number(attempt.essay_score ?? 0)}
      essayFeedback={attempt.essay_feedback ?? ""}
      mcqScore={Number(attempt.mcq_score ?? 0)}
      correctCount={detail.filter((item) => item.isCorrect).length}
      totalQuestions={sectionMode === "part1" ? 0 : questions.length}
      totalScore={Number(attempt.total_score ?? 0)}
      detail={detail}
      sectionMode={sectionMode}
      attemptMode={attemptMode}
      essayFlagged={essayFlagged}
    />
  );
}
