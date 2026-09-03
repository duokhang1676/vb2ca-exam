import { notFound, redirect } from "next/navigation";
import { MarkedDrillTaker } from "@/components/marked-drill-taker";
import { getAuthUser } from "@/lib/auth/session";
import { essayFingerprint, questionFingerprint } from "@/lib/exam/fingerprint";
import { correctDisplayAnswer } from "@/lib/exam/grade";
import { listUserMarks, markSet } from "@/lib/exam/marks";
import {
  filterMarkedSample,
  getSampleExamDetail,
} from "@/lib/exam/sample";
import {
  createIdentityShuffle,
  toDisplayQuestions,
} from "@/lib/exam/shuffle";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Luyện tập câu đánh dấu",
};

export default async function MarkedDrillPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) redirect(`/login?next=/bank/samples/${id}/drill`);

  const sample = await getSampleExamDetail(id);
  if (!sample || !sample.id) notFound();

  const marks = await listUserMarks(user.id);
  const essayMarks = markSet(marks, "essay");
  const questionMarks = markSet(marks, "question");
  const markedNumbers = sample.questions
    .filter((question) =>
      questionMarks.has(
        questionFingerprint({
          examCode: sample.examCode,
          type: question.type,
          stem: question.stem,
          options: question.options,
        }),
      ),
    )
    .map((question) => question.originalNumber);
  const essayMarked = essayMarks.has(essayFingerprint(sample.essayPrompt));
  const filtered = filterMarkedSample({
    essayPrompt: sample.essayPrompt,
    essayMarked,
    questions: sample.questions,
    markedNumbers,
    answerKey: sample.answerKey,
  });

  if (!filtered.hasMarked) {
    redirect(`/bank?tab=sample&examCode=${sample.examCode}`);
  }

  const shuffle = createIdentityShuffle(filtered.questions);
  const questions = toDisplayQuestions(filtered.questions, shuffle).map(
    (question) => {
      const source = filtered.questions.find(
        (item) => item.originalNumber === question.originalNumber,
      );
      return {
        ...question,
        fingerprint: source
          ? questionFingerprint({
              examCode: sample.examCode,
              type: source.type,
              stem: source.stem,
              options: source.options,
            })
          : undefined,
        correctDisplayAnswer: correctDisplayAnswer(
          question,
          filtered.answerKey,
          shuffle,
        ),
        marked: true,
      };
    },
  );

  return (
    <MarkedDrillTaker
      title={sample.title}
      examCode={sample.examCode}
      essayPrompt={filtered.essayPrompt}
      essayTopic={sample.essayTopic}
      essaySolution={sample.essaySolution}
      essayFingerprint={essayFingerprint(sample.essayPrompt)}
      essayMarked={essayMarked}
      questions={questions}
    />
  );
}
