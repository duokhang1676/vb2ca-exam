import { QuestionBank } from "@/components/question-bank";
import { getAuthUser } from "@/lib/auth/session";
import { essayFingerprint, questionFingerprint } from "@/lib/exam/fingerprint";
import { listUserMarks, markSet } from "@/lib/exam/marks";
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
  searchParams: Promise<{ added?: string; skipped?: string; tab?: string }>;
}) {
  const { added, skipped, tab } = await searchParams;
  const user = await getAuthUser();
  const signedIn = Boolean(user);
  const supabase = getSupabaseAdmin();
  const [essaysResult, questionsResult, clustersResult, samples, marks] =
    await Promise.all([
      supabase
        .from("essays")
        .select("id, prompt, source_filename, fingerprint")
        .order("created_at", { ascending: true }),
      supabase
        .from("questions")
        .select(
          "id, exam_code, type, stem, options, answer, cluster_id, cluster_position, fingerprint",
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
    marked: essayMarks.has(row.fingerprint),
  }));

  const questions = (questionsResult.data ?? []).map((row) => ({
    id: row.id,
    examCode: row.exam_code as ExamCode,
    type: normalizeQuestionType(row.type),
    stem: row.stem,
    options: (row.options as McqOptions | null) ?? undefined,
    answer: row.answer,
    clusterId: row.cluster_id,
    clusterPosition: row.cluster_position,
    marked: questionMarks.has(row.fingerprint),
  }));

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
    const markedNumbers = sample.questions
      .filter((question) =>
        questionMarks.has(
          questionFingerprint({
            examCode,
            type: question.type,
            stem: question.stem,
            options: question.options,
          }),
        ),
      )
      .map((question) => question.originalNumber);
    return {
      ...sample,
      id: sample.id ?? "",
      essayMarked: essayMarks.has(essayFingerprint(sample.essayPrompt)),
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
      />
    </div>
  );
}
