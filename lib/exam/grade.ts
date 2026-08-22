import { pointsPerQuestion } from "./constants";
import { displayLetterToOriginal, originalLetterToDisplay } from "./shuffle";
import { isMcq, type AnswerKey, type AttemptAnswers, type DisplayQuestion, type GradeResult, type McqDetailItem, type ShuffleMap } from "./types";

function normalizeNumeric(value: string): string {
  return value.replace(/\s+/g, "").replace(",", ".");
}

function isNumericMatch(user: string, correct: string): boolean {
  const a = Number(normalizeNumeric(user));
  const b = Number(normalizeNumeric(correct));
  if (Number.isFinite(a) && Number.isFinite(b)) return a === b;
  return normalizeNumeric(user) === normalizeNumeric(correct);
}

function normalizeFill(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function isFillMatch(user: string, correct: string): boolean {
  if (isNumericMatch(user, correct)) return true;
  return normalizeFill(user) === normalizeFill(correct);
}

export function gradeMultipleChoice(params: {
  questions: DisplayQuestion[];
  answers: AttemptAnswers;
  answerKey: AnswerKey;
  shuffle: ShuffleMap;
  points?: number;
}): GradeResult {
  const perQuestion =
    params.points ?? pointsPerQuestion(params.questions.length);
  const detail: McqDetailItem[] = params.questions.map((question) => {
    const key = String(question.originalNumber);
    const userAnswer = params.answers[key]?.trim() || null;
    const correctOriginal = params.answerKey[key] ?? "";
    const correctDisplay = isMcq(question.type)
      ? originalLetterToDisplay(
          params.shuffle,
          question.originalNumber,
          correctOriginal,
        )
      : correctOriginal;

    let isCorrect = false;
    if (userAnswer) {
      if (isMcq(question.type)) {
        const originalUser = displayLetterToOriginal(
          params.shuffle,
          question.originalNumber,
          userAnswer,
        );
        isCorrect =
          originalUser.toUpperCase() === correctOriginal.toUpperCase();
      } else {
        isCorrect = isFillMatch(userAnswer, correctOriginal);
      }
    }

    return {
      originalNumber: question.originalNumber,
      displayIndex: question.displayIndex,
      type: question.type,
      stem: question.stem,
      options: question.options,
      userAnswer,
      correctAnswer: correctOriginal,
      correctDisplayAnswer: correctDisplay,
      isCorrect,
      points: isCorrect ? Number(perQuestion.toFixed(2)) : 0,
    };
  });

  const correctCount = detail.filter((item) => item.isCorrect).length;
  const mcqScore = Number((correctCount * perQuestion).toFixed(1));

  return {
    mcqScore,
    correctCount,
    totalQuestions: detail.length,
    detail,
  };
}

export function roundTotal(essayScore: number, mcqScore: number): number {
  return Number((essayScore + mcqScore).toFixed(1));
}
