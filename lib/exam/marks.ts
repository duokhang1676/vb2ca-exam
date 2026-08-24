import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { ExamCode, MarkKind } from "./types";

export type QuestionMark = {
  kind: MarkKind;
  fingerprint: string;
  examCode: ExamCode | null;
};

export async function listUserMarks(userId: string): Promise<QuestionMark[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("question_marks")
    .select("kind, fingerprint, exam_code")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    kind: row.kind === "essay" ? "essay" : "question",
    fingerprint: row.fingerprint,
    examCode: row.exam_code === "CA1" || row.exam_code === "CA4" ? row.exam_code : null,
  }));
}

export async function setQuestionMark(params: {
  userId: string;
  kind: MarkKind;
  fingerprint: string;
  examCode?: ExamCode | null;
  marked: boolean;
}) {
  const supabase = getSupabaseAdmin();
  if (!params.marked) {
    const { error } = await supabase
      .from("question_marks")
      .delete()
      .eq("user_id", params.userId)
      .eq("kind", params.kind)
      .eq("fingerprint", params.fingerprint);
    if (error) throw new Error(error.message);
    return { marked: false };
  }

  const { error } = await supabase.from("question_marks").upsert(
    {
      user_id: params.userId,
      kind: params.kind,
      fingerprint: params.fingerprint,
      exam_code: params.examCode ?? null,
    },
    { onConflict: "user_id,kind,fingerprint" },
  );
  if (error) throw new Error(error.message);
  return { marked: true };
}

export function markSet(marks: QuestionMark[], kind: MarkKind): Set<string> {
  return new Set(
    marks.filter((mark) => mark.kind === kind).map((mark) => mark.fingerprint),
  );
}
