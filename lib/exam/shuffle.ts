import {
  CLUSTER_HEADER_TEMPLATES,
  FILL_HEADER_TEMPLATE,
  OPTION_LETTERS,
  formatRangeHeader,
} from "./constants";
import {
  isMcq,
  normalizeQuestionType,
  type ClusterKind,
  type DisplayBlock,
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

function hasClusterMetadata(questions: Question[]): boolean {
  return questions.some((question) => Boolean(question.clusterId));
}

function shuffledOptionMaps(questions: Question[]): Record<string, OptionLetter[]> {
  const optionMaps: Record<string, OptionLetter[]> = {};
  for (const question of questions) {
    if (isMcq(question.type)) {
      optionMaps[String(question.originalNumber)] = fisherYates([
        ...OPTION_LETTERS,
      ]);
    }
  }
  return optionMaps;
}

function identityOptionMaps(questions: Question[]): Record<string, OptionLetter[]> {
  const optionMaps: Record<string, OptionLetter[]> = {};
  for (const question of questions) {
    if (isMcq(question.type)) {
      optionMaps[String(question.originalNumber)] = [...OPTION_LETTERS];
    }
  }
  return optionMaps;
}

export function createIdentityShuffle(questions: Question[]): ShuffleMap {
  return {
    order: questions.map((_, index) => index),
    optionMaps: identityOptionMaps(questions),
  };
}

export function createFlexibleShuffle(questions: Question[]): ShuffleMap {
  const units: number[][] = [];
  const seenClusters = new Set<string>();

  questions.forEach((question, index) => {
    if (question.clusterId && isMcq(question.type)) {
      if (seenClusters.has(question.clusterId)) return;
      seenClusters.add(question.clusterId);
      const members = questions
        .map((item, itemIndex) => ({ item, itemIndex }))
        .filter(
          (entry) =>
            entry.item.clusterId === question.clusterId && isMcq(entry.item.type),
        )
        .sort(
          (a, b) =>
            (a.item.clusterPosition ?? 0) - (b.item.clusterPosition ?? 0),
        )
        .map((entry) => entry.itemIndex);
      units.push(members);
      return;
    }
    units.push([index]);
  });

  return {
    order: fisherYates(units).flat(),
    optionMaps: shuffledOptionMaps(questions),
  };
}

export function createShuffle(questions: Question[]): ShuffleMap {
  const optionMaps = shuffledOptionMaps(questions);

  if (!hasClusterMetadata(questions)) {
    const mcqIndices: number[] = [];
    const fillIndices: number[] = [];
    questions.forEach((question, index) => {
      if (isMcq(question.type)) mcqIndices.push(index);
      else fillIndices.push(index);
    });
    return {
      order: [...fisherYates(mcqIndices), ...fisherYates(fillIndices)],
      optionMaps,
    };
  }

  const independent: number[] = [];
  const fill: number[] = [];
  const clusterMap = new Map<string, { position: number; index: number }[]>();

  questions.forEach((question, index) => {
    if (question.clusterId && isMcq(question.type)) {
      const members = clusterMap.get(question.clusterId) ?? [];
      members.push({
        position: question.clusterPosition ?? members.length + 1,
        index,
      });
      clusterMap.set(question.clusterId, members);
      return;
    }
    if (isMcq(question.type)) {
      independent.push(index);
      return;
    }
    fill.push(index);
  });

  const clusterOrders = Array.from(clusterMap.values()).map((members) =>
    [...members]
      .sort((a, b) => a.position - b.position)
      .map((member) => member.index),
  );

  const order = [
    ...fisherYates(independent),
    ...fisherYates(clusterOrders).flat(),
    ...fisherYates(fill),
  ];

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

    const base: DisplayQuestion = {
      originalNumber: question.originalNumber,
      displayIndex: displayOffset + 1,
      type,
      stem: question.stem,
      section: question.section,
      clusterId: question.clusterId,
      clusterPosition: question.clusterPosition,
      clusterKind: question.clusterKind,
      passage: question.passage,
      topic: question.topic,
      solution: question.solution,
    };

    if (type !== "mcq" || !question.options || !mapped) {
      return base;
    }

    const options = Object.fromEntries(
      OPTION_LETTERS.map((letter, i) => [
        letter,
        question.options![mapped[i]],
      ]),
    ) as DisplayQuestion["options"];

    return { ...base, type: "mcq", options };
  });
}

export function toDisplayBlocks(questions: DisplayQuestion[]): DisplayBlock[] {
  if (questions.length === 0) return [];

  if (!questions.some((question) => question.clusterId)) {
    const independent = questions.filter((question) => isMcq(question.type));
    const fill = questions.filter((question) => !isMcq(question.type));
    const blocks: DisplayBlock[] = [];
    if (independent.length > 0) {
      blocks.push({ kind: "independent", questions: independent });
    }
    if (fill.length > 0) {
      blocks.push({
        kind: "fill",
        header: formatRangeHeader(
          FILL_HEADER_TEMPLATE,
          fill[0].displayIndex,
          fill[fill.length - 1].displayIndex,
        ),
        questions: fill,
      });
    }
    return blocks;
  }

  const blocks: DisplayBlock[] = [];
  let index = 0;
  while (index < questions.length) {
    const current = questions[index];
    if (current.clusterId) {
      const clusterId = current.clusterId;
      const clustered: DisplayQuestion[] = [];
      while (
        index < questions.length &&
        questions[index].clusterId === clusterId
      ) {
        clustered.push(questions[index]);
        index += 1;
      }
      const kind: ClusterKind = current.clusterKind ?? "passage";
      const start = clustered[0].displayIndex;
      const end = clustered[clustered.length - 1].displayIndex;
      blocks.push({
        kind: "cluster",
        header: formatRangeHeader(CLUSTER_HEADER_TEMPLATES[kind], start, end),
        passage: current.passage ?? clustered.find((item) => item.passage)?.passage ?? "",
        clusterKind: kind,
        questions: clustered,
      });
      continue;
    }
    if (!isMcq(current.type)) {
      const fill: DisplayQuestion[] = [];
      while (index < questions.length && !isMcq(questions[index].type)) {
        fill.push(questions[index]);
        index += 1;
      }
      blocks.push({
        kind: "fill",
        header: formatRangeHeader(
          FILL_HEADER_TEMPLATE,
          fill[0].displayIndex,
          fill[fill.length - 1].displayIndex,
        ),
        questions: fill,
      });
      continue;
    }
    const independent: DisplayQuestion[] = [];
    while (
      index < questions.length &&
      isMcq(questions[index].type) &&
      !questions[index].clusterId
    ) {
      independent.push(questions[index]);
      index += 1;
    }
    blocks.push({ kind: "independent", questions: independent });
  }
  return blocks;
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
