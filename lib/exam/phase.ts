import { PART1_DURATION_MS, PART2_DURATION_MS } from "./constants";
import {
  isAttemptPhase,
  isSectionMode,
  type AttemptPhase,
  type SectionMode,
} from "./types";

export function isSequentialFull(sectionMode: SectionMode): boolean {
  return sectionMode === "full";
}

export function initialPhase(sectionMode: SectionMode): AttemptPhase {
  return sectionMode === "part2" ? "part2" : "part1";
}

export function resolvePhase(params: {
  sectionMode: unknown;
  currentPhase?: unknown;
}): AttemptPhase {
  const sectionMode = isSectionMode(params.sectionMode)
    ? params.sectionMode
    : "full";
  if (sectionMode === "part2") return "part2";
  if (sectionMode === "part1") return "part1";
  return isAttemptPhase(params.currentPhase) ? params.currentPhase : "part1";
}

export function phaseEndsAt(params: {
  sectionMode: SectionMode;
  phase: AttemptPhase;
  startedAt: string;
  part2StartedAt?: string | null;
}): number {
  const started = new Date(params.startedAt).getTime();
  if (params.phase === "part1") {
    return started + PART1_DURATION_MS;
  }
  if (isSequentialFull(params.sectionMode) && params.part2StartedAt) {
    return new Date(params.part2StartedAt).getTime() + PART2_DURATION_MS;
  }
  return started + PART2_DURATION_MS;
}

export function shouldExposeQuestions(
  sectionMode: SectionMode,
  phase: AttemptPhase,
): boolean {
  if (sectionMode === "part1") return false;
  if (isSequentialFull(sectionMode) && phase === "part1") return false;
  return true;
}

export function shouldExposeEssayPrompt(
  sectionMode: SectionMode,
  phase: AttemptPhase,
): boolean {
  if (sectionMode === "part2") return false;
  if (isSequentialFull(sectionMode) && phase === "part2") return false;
  return true;
}

export function isEssayLocked(
  sectionMode: SectionMode,
  phase: AttemptPhase,
): boolean {
  return isSequentialFull(sectionMode) && phase === "part2";
}

export function isPart2AnswersLocked(
  sectionMode: SectionMode,
  phase: AttemptPhase,
): boolean {
  return isSequentialFull(sectionMode) && phase === "part1";
}
