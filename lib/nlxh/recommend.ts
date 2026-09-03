import type { PracticeMode, SkillProgress } from "./types";

export function recommendNext(params: {
  progress: SkillProgress[];
  hasOutline: boolean;
  completedFullEssay: boolean;
}): PracticeMode {
  const weakest = [...params.progress]
    .filter((item) => item.attempts > 0)
    .sort((a, b) => a.recentAverageScore - b.recentAverageScore)[0];

  if (weakest && weakest.recentAverageScore < 6) return weakest.skill;

  const outline = params.progress.find((item) => item.skill === "outline");
  if (!params.hasOutline || (outline && outline.recentAverageScore < 7)) {
    return "outline";
  }

  if (!params.completedFullEssay) return "full_essay";
  return weakest?.skill ?? "full_essay";
}

export function recommendAfterFullEssay(scores?: Record<string, number>): PracticeMode[] {
  if (!scores) return [];
  const pairs: [string, PracticeMode][] = [
    ["criticalThinking", "counter_argument"],
    ["solutions", "solutions"],
    ["evidence", "evidence"],
    ["argumentation", "build_arguments"],
    ["analysis", "explanation"],
    ["structure", "outline"],
  ];
  return pairs
    .filter(([key]) => (scores[key] ?? 10) < 6)
    .map(([, skill]) => skill)
    .slice(0, 2);
}
