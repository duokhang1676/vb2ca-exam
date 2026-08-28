import { NextResponse } from "next/server";
import { requireOwnedAttempt } from "@/lib/auth/attempt";
import { examDurationMs } from "@/lib/exam/constants";
import { essayFingerprint, questionFingerprint } from "@/lib/exam/fingerprint";
import { correctDisplayAnswer } from "@/lib/exam/grade";
import {
  parseAnswerKeyJson,
  parseAnswers,
  parseFlagged,
  parseQuestions,
  parseShuffle,
} from "@/lib/exam/json";
import { listUserMarks, markSet } from "@/lib/exam/marks";
import { toDisplayQuestions } from "@/lib/exam/shuffle";
import { isAttemptMode, isExamCode, isSectionMode, type AnswerKey } from "@/lib/exam/types";
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
    .select("id, title, essay_prompt, essay_topic, essay_solution, questions, exam_code, answer_key")
    .eq("id", attempt.exam_id)
    .single();

  if (examError || !exam) {
    return NextResponse.json({ error: "Không tìm thấy đề thi." }, { status: 404 });
  }

  const sectionMode = isSectionMode(attempt.section_mode)
    ? attempt.section_mode
    : "full";
  const attemptMode = isAttemptMode(attempt.attempt_mode)
    ? attempt.attempt_mode
    : "exam";
  const isPractice = attemptMode === "practice";
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

  const showTopic = Boolean(attempt.show_topic);
  const endsAt = isPractice
    ? null
    : new Date(attempt.started_at).getTime() + examDurationMs(sectionMode);

  let answerKey: AnswerKey = {};
  if (isPractice) {
    try {
      answerKey = parseAnswerKeyJson(exam.answer_key);
    } catch {
      answerKey = {};
    }
  }

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
      attemptMode,
      showTopic,
      endsAt,
      serverNow: Date.now(),
    },
    exam: {
      id: exam.id,
      title: exam.title,
      examCode,
      essayPrompt: sectionMode === "part2" ? "" : exam.essay_prompt,
      essayTopic: showTopic ? exam.essay_topic ?? "" : "",
      essaySolution: isPractice ? exam.essay_solution ?? "" : "",
      essayFingerprint: essayFp,
      questions: withFingerprints.map((question) => {
        const { solution, ...rest } = question;
        const base = {
          ...rest,
          topic: showTopic ? rest.topic : undefined,
          marked: rest.fingerprint
            ? questionMarks.has(rest.fingerprint)
            : false,
        };
        if (!isPractice) return base;
        return {
          ...base,
          solution,
          correctDisplayAnswer: correctDisplayAnswer(
            question,
            answerKey,
            shuffle,
          ),
        };
      }),
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
