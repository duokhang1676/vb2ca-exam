import { QuestionBank } from "@/components/question-bank";
import { getAuthUser } from "@/lib/auth/session";
import { essayFingerprint, questionFingerprint } from "@/lib/exam/fingerprint";
import { listUserMarks, markSet, isMarkedFingerprint } from "@/lib/exam/marks";
import { listSampleExamDetails } from "@/lib/exam/sample";
import {
  isClusterKind,
  isExamCode,
  normalizeQuestionType,
  type ExamCode,
  type McqOptions,
} from "@/lib/exam/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function BankPage({
  searchParams,
}: {
  searchParams: Promise<{
    added?: string;
    skipped?: string;
    tab?: string;
    examCode?: string;
  }>;
}) {
  const { added, skipped, tab, examCode } = await searchParams;
  const user = await getAuthUser();
  const signedIn = Boolean(user);
  const supabase = getSupabaseAdmin();
  const [essaysResult, questionsResult, clustersResult, samples, marks] =
    await Promise.all([
      supabase
        .from("essays")
        .select("id, prompt, source_filename, fingerprint, title, topic, solution")
        .order("created_at", { ascending: true }),
      supabase
        .from("questions")
        .select(
          "id, exam_code, type, stem, options, answer, cluster_id, cluster_position, fingerprint, topic, solution",
        )
        .order("created_at", { ascending: true }),
      supabase
        .from("question_clusters")
        .select("id, exam_code, kind, passage")
        .order("created_at", { ascending: true }),
      listSampleExamDetails(),
      user ? listUserMarks(user.id) : Promise.resolve([]),
    ]);

  const essayMarks = markSet(marks, "essay");
  const questionMarks = markSet(marks, "question");

  const essays = (essaysResult.data ?? []).map((row) => ({
    id: row.id,
    prompt: row.prompt,
    sourceFilename: row.source_filename,
    fingerprint: row.fingerprint,
    title: row.title ?? undefined,
    topic: row.topic ?? undefined,
    solution: row.solution ?? undefined,
    marked: essayMarks.has(row.fingerprint),
  }));

  const questions = (questionsResult.data ?? []).map((row) => {
    const examCode = row.exam_code as ExamCode;
    const type = normalizeQuestionType(row.type);
    const options = (row.options as McqOptions | null) ?? undefined;
    const fingerprint = questionFingerprint({
      examCode,
      type,
      stem: row.stem,
      options,
    });
    return {
      id: row.id,
      examCode,
      type,
      stem: row.stem,
      options,
      answer: row.answer,
      clusterId: row.cluster_id,
      clusterPosition: row.cluster_position,
      fingerprint,
      topic: row.topic ?? undefined,
      solution: row.solution ?? undefined,
      marked: isMarkedFingerprint(questionMarks, row.fingerprint, fingerprint),
    };
  });

  const clusters = (clustersResult.data ?? []).map((row) => ({
    id: row.id,
    examCode: row.exam_code as ExamCode,
    kind: isClusterKind(row.kind) ? row.kind : "passage",
    passage: row.passage,
    questions: questions
      .filter((question) => question.clusterId === row.id)
      .sort(
        (a, b) => (a.clusterPosition ?? 0) - (b.clusterPosition ?? 0),
      ),
  }));

  const sampleViews = samples.map((sample) => {
    const examCode = isExamCode(sample.examCode) ? sample.examCode : "CA1";
    const essayFp = essayFingerprint(sample.essayPrompt);
    const questionFingerprints: Record<number, string> = {};
    const markedNumbers: number[] = [];
    for (const question of sample.questions) {
      const fingerprint = questionFingerprint({
        examCode,
        type: question.type,
        stem: question.stem,
        options: question.options,
      });
      questionFingerprints[question.originalNumber] = fingerprint;
      if (questionMarks.has(fingerprint)) {
        markedNumbers.push(question.originalNumber);
      }
    }
    return {
      ...sample,
      id: sample.id ?? "",
      essayFingerprint: essayFp,
      questionFingerprints,
      essayMarked: essayMarks.has(essayFp),
      markedNumbers,
    };
  });

  const addedCount = Number(added ?? "");
  const skippedCount = Number(skipped ?? "");
  const showImport =
    Number.isFinite(addedCount) && Number.isFinite(skippedCount) && (added != null || skipped != null);
  const initialTab =
    tab === "sample" || tab === "CA1" || tab === "CA4" || tab === "essay"
      ? tab
      : "essay";

  return (
    <div className="space-y-4">
      {showImport ? (
        <p className="rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
          Đã thêm {addedCount} mục mới
          {skippedCount > 0 ? `, bỏ qua ${skippedCount} mục trùng.` : "."}{" "}
          Kiểm tra danh sách dưới đây; nếu còn sai, bấm Sửa ngay trên từng mục.
        </p>
      ) : null}
      <QuestionBank
        essays={essays}
        questions={questions}
        clusters={clusters}
        samples={sampleViews}
        signedIn={signedIn}
        initialTab={initialTab}
        initialExamCode={isExamCode(examCode) ? examCode : "CA1"}
      />
    </div>
  );
}
