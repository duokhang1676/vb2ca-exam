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
    const { data: rows, error: loadError } = await supabase
      .from("question_marks")
      .select("id, fingerprint")
      .eq("user_id", params.userId)
      .eq("kind", params.kind);
    if (loadError) throw new Error(loadError.message);
    const prefix = `${params.fingerprint}:`;
    const ids = (rows ?? [])
      .filter(
        (row) =>
          row.fingerprint === params.fingerprint ||
          row.fingerprint.startsWith(prefix),
      )
      .map((row) => row.id);
    if (ids.length > 0) {
      const { error } = await supabase.from("question_marks").delete().in("id", ids);
      if (error) throw new Error(error.message);
    }
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

export function isMarkedFingerprint(
  marks: Set<string>,
  stored: string,
  contentHash: string,
): boolean {
  if (marks.has(stored) || marks.has(contentHash)) return true;
  for (const mark of marks) {
    if (mark.startsWith(`${contentHash}:`)) return true;
  }
  return false;
}
