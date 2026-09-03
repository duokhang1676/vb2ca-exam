import { PRACTICE_MODE_LABELS } from "./types";
import type {
  PracticeAnswer,
  PracticeFeedback,
  PracticeMode,
  QuestionAnalysis,
  QuestionType,
  SeedData,
} from "./types";
import { countWords, roundScore } from "./types";

function filled(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

function joinAnswer(answer: PracticeAnswer): string {
  if (answer.text?.trim()) return answer.text.trim();
  if (answer.items?.length) return answer.items.filter((item) => item.trim()).join("\n");
  if (answer.fields) {
    return Object.values(answer.fields)
      .map((item) => item.trim())
      .filter(Boolean)
      .join(" ");
  }
  return "";
}

function keywordOverlap(answer: string, keywords: string[]): number {
  const hay = answer.toLowerCase();
  if (!keywords.length) return 0;
  const hits = keywords.filter((word) => hay.includes(word.toLowerCase())).length;
  return hits / keywords.length;
}

export function localGrade(params: {
  mode: PracticeMode;
  level: number;
  answer: PracticeAnswer;
  analysis: QuestionAnalysis | null;
  seed: SeedData | null;
  prompt: string;
}): { score: number; feedback: PracticeFeedback; wordCount: number; useAi: boolean } {
  const text = joinAnswer(params.answer);
  const wordCount = countWords(text);
  const keywords = params.analysis?.keywords ?? [];

  if (params.mode === "identify_type") {
    const expected =
      params.seed?.correctType ??
      params.analysis?.questionType ??
      null;
    const selected = params.answer.selectedType;
    if (!selected) {
      return {
        score: 0,
        wordCount: 0,
        useAi: false,
        feedback: {
          summary: "Chưa chọn dạng đề.",
          strengths: [],
          weaknesses: ["Thiếu lựa chọn"],
        },
      };
    }
    const correct = expected && selected === expected;
    return {
      score: correct ? 10 : 4,
      wordCount: 0,
      useAi: false,
      feedback: {
        summary: correct
          ? "Đúng dạng đề."
          : `Dạng phù hợp hơn: ${expected ?? "cần xem lại khung"}.`,
        strengths: correct ? ["Nhận diện đúng"] : [],
        weaknesses: correct ? [] : ["Chưa khớp dạng đề"],
      },
    };
  }

  if (!text) {
    return {
      score: 0,
      wordCount: 0,
      useAi: false,
      feedback: {
        summary: "Chưa có bài làm.",
        strengths: [],
        weaknesses: ["Bỏ trống"],
      },
    };
  }

  if (params.mode === "build_arguments" && params.level === 1) {
    const selected = params.answer.selectedIds ?? [];
    const correctIds = (params.seed?.choices ?? [])
      .filter((choice) => choice.correct)
      .map((choice) => choice.id);
    if (correctIds.length > 0) {
      const hits = selected.filter((id) => correctIds.includes(id)).length;
      const extras = selected.filter((id) => !correctIds.includes(id)).length;
      const score = roundScore((hits / Math.max(correctIds.length, 1)) * 10 - extras * 2);
      return {
        score,
        wordCount,
        useAi: false,
        feedback: {
          summary:
            score >= 7
              ? "Đã chọn luận điểm phù hợp."
              : "Còn luận điểm lệch hoặc thiếu ý chính.",
          strengths: hits > 0 ? ["Có ý bám đề"] : [],
          weaknesses: extras > 0 ? ["Có ý nhiễu"] : hits < 3 ? ["Chưa đủ 3 luận điểm"] : [],
        },
      };
    }
  }

  if (params.mode === "evidence" && params.level === 1) {
    const selected = params.answer.selectedIds ?? [];
    const correctIds = (params.seed?.choices ?? [])
      .filter((choice) => choice.correct)
      .map((choice) => choice.id);
    if (correctIds.length > 0) {
      const hits = selected.filter((id) => correctIds.includes(id)).length;
      const score = roundScore((hits / Math.max(correctIds.length, 1)) * 10);
      return {
        score,
        wordCount,
        useAi: false,
        feedback: {
          summary: score >= 7 ? "Dẫn chứng phù hợp." : "Cần chọn dẫn chứng khái quát, đúng vấn đề.",
          strengths: hits > 0 ? ["Có dẫn chứng liên quan"] : [],
          weaknesses: score < 7 ? ["Dẫn chứng chưa khớp"] : [],
        },
      };
    }
  }

  const minWords =
    params.mode === "full_essay"
      ? 500
      : params.mode === "outline"
        ? 40
        : params.level === 1
          ? 20
          : 40;

  if (wordCount < Math.min(12, minWords)) {
    return {
      score: 3,
      wordCount,
      useAi: false,
      feedback: {
        summary: "Bài quá ngắn để chấm nội dung.",
        strengths: [],
        weaknesses: ["Chưa đủ ý"],
      },
    };
  }

  let score = 6;
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (params.mode === "identify_issue") {
    const overlap = keywordOverlap(text, keywords);
    if (overlap >= 0.3) {
      score = 8;
      strengths.push("Bám từ khóa của đề");
    } else {
      weaknesses.push("Chưa rõ vấn đề cốt lõi");
    }
    if ((params.answer.keywords?.length ?? 0) >= 2) strengths.push("Có từ khóa");
  }

  if (params.level === 1 && params.answer.fields) {
    const values = Object.values(params.answer.fields);
    const complete = values.filter((item) => filled(item)).length;
    if (complete >= values.length && values.length > 0) {
      score = Math.max(score, 8);
      strengths.push("Đủ các ý trong khung");
    } else {
      weaknesses.push("Khung còn chỗ trống");
      score = Math.min(score, 6);
    }
  }

  if (params.mode === "full_essay" && wordCount < 500) {
    weaknesses.push("Chưa đạt 500 chữ");
    score = Math.min(score, 5);
  } else if (params.mode === "full_essay" && wordCount >= 500) {
    strengths.push("Đủ độ dài tối thiểu");
  }

  if (params.mode === "introduction" && (wordCount < 40 || wordCount > 140)) {
    weaknesses.push("Độ dài mở bài chưa ổn");
  }

  const copiedPrompt =
    text.length > 40 && params.prompt.trim() && text.includes(params.prompt.trim());
  if (copiedPrompt) {
    weaknesses.push("Lặp nguyên văn đề");
    score = Math.min(score, 4);
  }

  const deterministic =
    params.level === 1 &&
    (params.mode === "build_arguments" || params.mode === "evidence");

  return {
    score: roundScore(score),
    wordCount,
    useAi: !deterministic && params.level >= 2,
    feedback: {
      summary:
        score >= 7
          ? "Đạt yêu cầu hình thức, chờ chấm nội dung nếu cần."
          : "Cần viết lại cho đủ ý và bám đề.",
      strengths: strengths.slice(0, 2),
      weaknesses: weaknesses.slice(0, 2),
    },
  };
}

export function weakSkillsFromRubric(
  scores?: Record<string, number>,
): PracticeMode[] {
  if (!scores) return [];
  const map: Record<string, PracticeMode> = {
    criticalThinking: "counter_argument",
    solutions: "solutions",
    evidence: "evidence",
    argumentation: "build_arguments",
    structure: "outline",
    analysis: "explanation",
  };
  return Object.entries(map)
    .filter(([key]) => (scores[key] ?? 10) < 6)
    .map(([, skill]) => skill);
}

export function feedbackLabel(mode: PracticeMode): string {
  return PRACTICE_MODE_LABELS[mode];
}

export function expectedTypeFromSeed(
  seed: SeedData | null,
  analysis: QuestionAnalysis | null,
): QuestionType | null {
  return seed?.correctType ?? analysis?.questionType ?? null;
}
