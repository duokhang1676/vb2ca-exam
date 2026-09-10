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
import {
  phaseEndsAt,
  resolvePhase,
  shouldExposeEssayPrompt,
  shouldExposeQuestions,
} from "@/lib/exam/phase";
import { toDisplayQuestions } from "@/lib/exam/shuffle";
import {
  isAttemptMode,
  isExamCode,
  isSectionMode,
  type AnswerKey,
} from "@/lib/exam/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

type AttemptRow = Database["public"]["Tables"]["attempts"]["Row"];

export async function buildAttemptPayload(attempt: AttemptRow, userId: string) {
  const supabase = getSupabaseAdmin();
  const { data: exam, error: examError } = await supabase
    .from("exams")
    .select(
      "id, title, essay_prompt, essay_topic, essay_solution, questions, exam_code, answer_key",
    )
    .eq("id", attempt.exam_id)
    .single();

  if (examError || !exam) {
    return { ok: false as const, error: "Không tìm thấy đề thi.", status: 404 };
  }

  const sectionMode = isSectionMode(attempt.section_mode)
    ? attempt.section_mode
    : "full";
  const attemptMode = isAttemptMode(attempt.attempt_mode)
    ? attempt.attempt_mode
    : "exam";
  const currentPhase = resolvePhase({
    sectionMode,
    currentPhase: attempt.current_phase,
  });
  const isPractice = attemptMode === "practice";
  const examCode = isExamCode(exam.exam_code) ? exam.exam_code : "CA1";
  const questions = parseQuestions(exam.questions);
  const shuffle = parseShuffle(attempt.shuffle);
  const exposeQuestions = shouldExposeQuestions(sectionMode, currentPhase);
  const displayQuestions = exposeQuestions
    ? toDisplayQuestions(questions, shuffle)
    : [];
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

  const marks = await listUserMarks(userId);
  const questionMarks = markSet(marks, "question");
  const essayMarks = markSet(marks, "essay");
  const essayFp = exam.essay_prompt ? essayFingerprint(exam.essay_prompt) : "";

  const showTopic = Boolean(attempt.show_topic);
  const endsAt = isPractice
    ? null
    : phaseEndsAt({
        sectionMode,
        phase: currentPhase,
        startedAt: attempt.started_at,
        part2StartedAt: attempt.part2_started_at,
      });

  let answerKey: AnswerKey = {};
  if (isPractice) {
    try {
      answerKey = parseAnswerKeyJson(exam.answer_key);
    } catch {
      answerKey = {};
    }
  }

  return {
    ok: true as const,
    payload: {
      attempt: {
        id: attempt.id,
        examId: attempt.exam_id,
        startedAt: attempt.started_at,
        submittedAt: attempt.submitted_at,
        essayText: attempt.essay_text ?? "",
        answers: parseAnswers(attempt.answers),
        flagged: parseFlagged(attempt.flagged),
        essayFlagged:
          Boolean(attempt.essay_flagged) ||
          (essayFp ? essayMarks.has(essayFp) : false),
        sectionMode,
        attemptMode,
        currentPhase,
        part2StartedAt: attempt.part2_started_at,
        showTopic,
        endsAt,
        serverNow: Date.now(),
      },
      exam: {
        id: exam.id,
        title: exam.title,
        examCode,
        essayPrompt: shouldExposeEssayPrompt(sectionMode, currentPhase)
          ? (exam.essay_prompt ?? "")
          : "",
        essayTopic: showTopic ? (exam.essay_topic ?? "") : "",
        essaySolution: isPractice ? (exam.essay_solution ?? "") : "",
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
    },
  };
}
