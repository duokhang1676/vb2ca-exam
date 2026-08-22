import { OPTION_LETTERS } from "./constants";
import {
  isMcq,
  normalizeQuestionType,
  type DisplayQuestion,
  type OptionLetter,
  type Question,
  type ShuffleMap,
} from "./types";

function fisherYates<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function createShuffle(questions: Question[]): ShuffleMap {
  const mcqIndices: number[] = [];
  const fillIndices: number[] = [];

  questions.forEach((question, index) => {
    if (isMcq(question.type)) mcqIndices.push(index);
    else fillIndices.push(index);
  });

  const order = [...fisherYates(mcqIndices), ...fisherYates(fillIndices)];
  const optionMaps: Record<string, OptionLetter[]> = {};

  for (const question of questions) {
    if (isMcq(question.type)) {
      optionMaps[String(question.originalNumber)] = fisherYates([
        ...OPTION_LETTERS,
      ]);
    }
  }

  return { order, optionMaps };
}

export function toDisplayQuestions(
  questions: Question[],
  shuffle: ShuffleMap,
): DisplayQuestion[] {
  return shuffle.order.map((questionIndex, displayOffset) => {
    const question = questions[questionIndex];
    const type = normalizeQuestionType(question.type);
    const mapped = shuffle.optionMaps[String(question.originalNumber)];

    if (type !== "mcq" || !question.options || !mapped) {
      return {
        originalNumber: question.originalNumber,
        displayIndex: displayOffset + 1,
        type,
        stem: question.stem,
      };
    }

    const options = Object.fromEntries(
      OPTION_LETTERS.map((letter, i) => [
        letter,
        question.options![mapped[i]],
      ]),
    ) as DisplayQuestion["options"];

    return {
      originalNumber: question.originalNumber,
      displayIndex: displayOffset + 1,
      type: "mcq",
      stem: question.stem,
      options,
    };
  });
}

export function displayLetterToOriginal(
  shuffle: ShuffleMap,
  originalNumber: number,
  displayLetter: string,
): string {
  const mapped = shuffle.optionMaps[String(originalNumber)];
  if (!mapped) return displayLetter.toUpperCase();
  const index = OPTION_LETTERS.indexOf(displayLetter.toUpperCase() as OptionLetter);
  if (index < 0) return displayLetter;
  return mapped[index];
}

export function originalLetterToDisplay(
  shuffle: ShuffleMap,
  originalNumber: number,
  originalLetter: string,
): string {
  const mapped = shuffle.optionMaps[String(originalNumber)];
  if (!mapped) return originalLetter.toUpperCase();
  const index = mapped.indexOf(originalLetter.toUpperCase() as OptionLetter);
  if (index < 0) return originalLetter;
  return OPTION_LETTERS[index];
}
