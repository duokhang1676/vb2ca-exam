import { notFound } from "next/navigation";
import { MathText } from "@/components/math-text";
import { StartExamButton } from "@/components/start-exam-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EXAM_SPECS, questionTypeLabel } from "@/lib/exam/constants";
import { parseQuestions } from "@/lib/exam/json";
import { toDisplayBlocks } from "@/lib/exam/shuffle";
import { isExamCode } from "@/lib/exam/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function ExamPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const { data: exam } = await supabase
    .from("exams")
    .select("id, title, essay_prompt, questions, exam_code")
    .eq("id", id)
    .single();

  if (!exam) notFound();

  const questions = parseQuestions(exam.questions);
  const indexed = questions.map((question, index) => ({
    ...question,
    displayIndex: index + 1,
  }));
  const blocks = toDisplayBlocks(indexed);
  const spec = isExamCode(exam.exam_code) ? EXAM_SPECS[exam.exam_code] : null;
  const clusterCount = blocks.filter((block) => block.kind === "cluster").length;
  const belowSpec = spec ? questions.length < spec.total : false;
  const belowClusters = spec ? clusterCount < spec.clusters : false;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">Xem trước đề</Badge>
          {exam.exam_code ? <Badge variant="outline">{exam.exam_code}</Badge> : null}
        </div>
        <h1 className="text-2xl font-semibold">{exam.title}</h1>
        <p className="text-sm text-muted-foreground">
          Kiểm tra đề đã trích đúng chưa. Câu hỏi và đáp án sẽ được đảo khi bắt
          đầu làm bài. Phần 2 có {questions.length} câu
          {spec ? ` (định mức ${spec.total})` : ""}, {clusterCount} cụm thông
          tin/tình huống
          {spec ? ` (định mức ${spec.clusters})` : ""}.
        </p>
        {belowSpec ? (
          <p className="rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
            Ngân hàng chưa đủ {spec?.total} câu cho mã này. Bài làm sẽ dùng{" "}
            {questions.length} câu hiện có, điểm phần 2 vẫn trên thang 70.
          </p>
        ) : null}
        {belowClusters ? (
          <p className="rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
            Ngân hàng chưa đủ {spec?.clusters} cụm câu phụ thuộc. Đề này có{" "}
            {clusterCount} cụm.
          </p>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Phần 1 · Nghị luận xã hội</CardTitle>
        </CardHeader>
        <CardContent>
          <MathText className="font-exam text-lg leading-8" text={exam.essay_prompt} />
        </CardContent>
      </Card>

      {blocks.map((block, blockIndex) => (
        <Card key={`preview-${blockIndex}`}>
          <CardHeader>
            <CardTitle className={block.kind === "independent" ? "text-base" : "font-exam text-base"}>
              {block.kind === "independent"
                ? `Phần 2 · Trắc nghiệm độc lập (${block.questions.length} câu)`
                : block.header}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {block.kind === "cluster" && block.passage ? (
              <MathText
                className="font-exam rounded-lg bg-muted/50 p-3 text-lg leading-8"
                text={block.passage}
              />
            ) : null}
            {(block.kind === "independent"
              ? block.questions.slice(0, 3)
              : block.questions
            ).map((question) => (
              <div key={question.originalNumber} className="rounded-lg border p-3">
                <p className="mb-2 text-xs text-muted-foreground">
                  Câu {question.displayIndex} · {questionTypeLabel(question.type)}
                </p>
                <MathText className="font-exam text-lg leading-8" text={question.stem} />
              </div>
            ))}
            {block.kind === "independent" && block.questions.length > 3 ? (
              <p className="text-xs text-muted-foreground">
                … còn {block.questions.length - 3} câu độc lập.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ))}

      <StartExamButton examId={exam.id} />
    </div>
  );
}
