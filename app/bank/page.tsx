import { QuestionBank } from "@/components/question-bank";
import { normalizeQuestionType, type ExamCode, type McqOptions } from "@/lib/exam/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function BankPage() {
  const supabase = getSupabaseAdmin();
  const [essaysResult, questionsResult] = await Promise.all([
    supabase
      .from("essays")
      .select("id, prompt, source_filename")
      .order("created_at", { ascending: true }),
    supabase
      .from("questions")
      .select("id, exam_code, type, stem, options, answer")
      .order("created_at", { ascending: true }),
  ]);

  const essays = (essaysResult.data ?? []).map((row) => ({
    id: row.id,
    prompt: row.prompt,
    sourceFilename: row.source_filename,
  }));

  const questions = (questionsResult.data ?? []).map((row) => ({
    id: row.id,
    examCode: row.exam_code as ExamCode,
    type: normalizeQuestionType(row.type),
    stem: row.stem,
    options: (row.options as McqOptions | null) ?? undefined,
    answer: row.answer,
  }));

  return <QuestionBank essays={essays} questions={questions} />;
}
