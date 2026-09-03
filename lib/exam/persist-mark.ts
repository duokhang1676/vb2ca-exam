import type { ExamCode, MarkKind } from "./types";

export async function persistQuestionMark(params: {
  kind: MarkKind;
  fingerprint?: string;
  examCode: ExamCode;
  marked: boolean;
}) {
  if (!params.fingerprint) return;
  await fetch("/api/question-marks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind: params.kind,
      fingerprint: params.fingerprint,
      examCode: params.examCode,
      marked: params.marked,
    }),
  });
}
