import { notFound, redirect } from "next/navigation";
import { MarkedDrillTaker } from "@/components/marked-drill-taker";
import { getAuthUser } from "@/lib/auth/session";
import { questionFingerprint } from "@/lib/exam/fingerprint";
import { correctDisplayAnswer } from "@/lib/exam/grade";
import { parseAnswerKeyJson, parseQuestions } from "@/lib/exam/json";
import { listUserMarks, markSet } from "@/lib/exam/marks";
import {
  createIdentityShuffle,
  toDisplayQuestions,
} from "@/lib/exam/shuffle";
import {
  isExamCode,
  type McqDetailItem,
} from "@/lib/exam/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Luyện tập câu sai",
};

export default async function WrongPracticePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) redirect(`/login?next=/attempts/${id}/practice`);

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
    .select("title, questions, answer_key, exam_code")
    .eq("id", attempt.exam_id)
    .single();

  if (!exam) notFound();

  const examCode = isExamCode(exam.exam_code) ? exam.exam_code : "CA1";
  const questions = parseQuestions(exam.questions);
  const answerKey = parseAnswerKeyJson(exam.answer_key);
  const detail = (attempt.mcq_detail as McqDetailItem[] | null) ?? [];
  const wrongNumbers = new Set(
    detail
      .filter((item) => !item.isCorrect)
      .map((item) => item.originalNumber),
  );
  const wrongQuestions = questions.filter((question) =>
    wrongNumbers.has(question.originalNumber),
  );

  if (wrongQuestions.length === 0) {
    redirect(`/attempts/${id}/result`);
  }

  const marks = await listUserMarks(user.id);
  const questionMarks = markSet(marks, "question");
  const shuffle = createIdentityShuffle(wrongQuestions);
  const display = toDisplayQuestions(wrongQuestions, shuffle).map(
    (question) => {
      const source = wrongQuestions.find(
        (item) => item.originalNumber === question.originalNumber,
      );
      const fingerprint = source
        ? questionFingerprint({
            examCode,
            type: source.type,
            stem: source.stem,
            options: source.options,
          })
        : undefined;
      return {
        ...question,
        fingerprint,
        marked: fingerprint ? questionMarks.has(fingerprint) : true,
        correctDisplayAnswer: correctDisplayAnswer(
          question,
          answerKey,
          shuffle,
        ),
      };
    },
  );

  return (
    <MarkedDrillTaker
      title={exam.title}
      examCode={examCode}
      essayPrompt=""
      essayFingerprint=""
      essayMarked={false}
      questions={display}
      subtitle="Luyện tập câu sai · Không chấm điểm, không lưu lịch sử"
      exitHref={`/attempts/${id}/result`}
      part2Title={`Phần 2 · ${display.length} câu sai`}
    />
  );
}
