import { NextResponse } from "next/server";
import { requireOwnedAttempt } from "@/lib/auth/attempt";
import { examDurationMs } from "@/lib/exam/constants";
import { essayFingerprint, questionFingerprint } from "@/lib/exam/fingerprint";
import { parseAnswers, parseFlagged, parseQuestions, parseShuffle } from "@/lib/exam/json";
import { listUserMarks, markSet } from "@/lib/exam/marks";
import { toDisplayQuestions } from "@/lib/exam/shuffle";
import { isExamCode, isSectionMode } from "@/lib/exam/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const { user, attempt, response } = await requireOwnedAttempt(id);
  if (!attempt || !user) return response;

  const supabase = getSupabaseAdmin();

  const { data: exam, error: examError } = await supabase
    .from("exams")
    .select("id, title, essay_prompt, questions, exam_code")
    .eq("id", attempt.exam_id)
    .single();

  if (examError || !exam) {
    return NextResponse.json({ error: "Không tìm thấy đề thi." }, { status: 404 });
  }

  const sectionMode = isSectionMode(attempt.section_mode)
    ? attempt.section_mode
    : "full";
  const examCode = isExamCode(exam.exam_code) ? exam.exam_code : "CA1";
  const questions = parseQuestions(exam.questions);
  const shuffle = parseShuffle(attempt.shuffle);
  const displayQuestions =
    sectionMode === "part1" ? [] : toDisplayQuestions(questions, shuffle);
  const fingerprints = new Map(
    questions.map((question) => [
      question.originalNumber,
      questionFingerprint({
        examCode,
        type: question.type,
        stem: question.stem,
        options: question.options,
      }),
    ]),
  );
  const withFingerprints = displayQuestions.map((question) => ({
    ...question,
    fingerprint: fingerprints.get(question.originalNumber),
  }));

  const marks = await listUserMarks(user.id);
  const questionMarks = markSet(marks, "question");
  const essayMarks = markSet(marks, "essay");
  const essayFp = exam.essay_prompt ? essayFingerprint(exam.essay_prompt) : "";

  const endsAt =
    new Date(attempt.started_at).getTime() + examDurationMs(sectionMode);

  return NextResponse.json({
    attempt: {
      id: attempt.id,
      examId: attempt.exam_id,
      startedAt: attempt.started_at,
      submittedAt: attempt.submitted_at,
      essayText: attempt.essay_text ?? "",
      answers: parseAnswers(attempt.answers),
      flagged: parseFlagged(attempt.flagged),
      essayFlagged: Boolean(attempt.essay_flagged) || (essayFp ? essayMarks.has(essayFp) : false),
      sectionMode,
      endsAt,
      serverNow: Date.now(),
    },
    exam: {
      id: exam.id,
      title: exam.title,
      examCode,
      essayPrompt: sectionMode === "part2" ? "" : exam.essay_prompt,
      essayFingerprint: essayFp,
      questions: withFingerprints.map((question) => ({
        ...question,
        marked: question.fingerprint
          ? questionMarks.has(question.fingerprint)
          : false,
      })),
    },
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const { user, attempt, response } = await requireOwnedAttempt(id);
  if (!attempt || !user) return response;

  if (attempt.submitted_at) {
    return NextResponse.json(
      { error: "Không thể xóa bài đã nộp." },
      { status: 409 },
    );
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("attempts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
