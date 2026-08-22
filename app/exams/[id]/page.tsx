import { notFound } from "next/navigation";
import { MathText } from "@/components/math-text";
import { StartExamButton } from "@/components/start-exam-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EXAM_SPECS, questionTypeLabel } from "@/lib/exam/constants";
import { parseQuestions } from "@/lib/exam/json";
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
  const preview = questions.slice(0, 3);
  const spec = isExamCode(exam.exam_code) ? EXAM_SPECS[exam.exam_code] : null;
  const belowSpec = spec ? questions.length < spec.total : false;

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
          {spec ? ` (định mức ${spec.total})` : ""}.
        </p>
        {belowSpec ? (
          <p className="rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
            Ngân hàng chưa đủ {spec?.total} câu cho mã này. Bài làm sẽ dùng{" "}
            {questions.length} câu hiện có, điểm phần 2 vẫn trên thang 70.
          </p>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Phần 1 · Nghị luận xã hội</CardTitle>
        </CardHeader>
        <CardContent>
          <MathText className="text-sm leading-7" text={exam.essay_prompt} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Phần 2 · 3 câu đầu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {preview.map((question) => (
            <div key={question.originalNumber} className="rounded-lg border p-3">
              <p className="mb-2 text-xs text-muted-foreground">
                Câu {question.originalNumber} · {questionTypeLabel(question.type)}
              </p>
              <MathText className="text-sm" text={question.stem} />
            </div>
          ))}
        </CardContent>
      </Card>

      <StartExamButton examId={exam.id} />
    </div>
  );
}
