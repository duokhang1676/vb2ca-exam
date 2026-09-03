import { generateObject } from "ai";
import { GEMINI_MODEL, getGemini } from "@/lib/exam/gemini";
import { recordUsage } from "./store";
import {
  FULL_RUBRIC,
  MAX_HINTS_PER_SECTION,
  SECTION_CONFIG,
  sectionGradeSchema,
  sectionHintResultSchema,
  type SectionGradeResult,
  type SectionKey,
} from "./section-types";

function hasGeminiKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

function hintLevelInstruction(hintIndex: number): string {
  if (hintIndex <= 0) {
    return "Gợi ý 1 (mơ hồ): chỉ nêu hướng viết, khung ý chính, không đưa câu mẫu hoàn chỉnh.";
  }
  if (hintIndex === 1) {
    return "Gợi ý 2 (cụ thể hơn): nêu các ý cần có, từ khóa, trình tự lập luận, vẫn chưa viết hộ toàn bộ đoạn.";
  }
  return "Gợi ý 3 (chi tiết): đưa dàn ý gần hoàn chỉnh hoặc vài câu mẫu để học sinh triển khai, nhưng không viết nguyên đoạn nộp bài.";
}

export function buildSectionHintPrompt(params: {
  essayPrompt: string;
  section: SectionKey;
  hintIndex: number;
  currentAnswer?: string;
}): string {
  const config = SECTION_CONFIG[params.section];
  return [
    "Bạn là giáo viên Ngữ văn, hướng dẫn viết nghị luận xã hội theo từng phần.",
    `Đề bài:\n${params.essayPrompt}`,
    `Phần cần gợi ý: ${config.label} (${config.wordMin}–${config.wordMax} chữ, tối đa ${config.maxScore} điểm).`,
    `Barem:\n${FULL_RUBRIC[params.section]}`,
    hintLevelInstruction(params.hintIndex),
    params.currentAnswer?.trim()
      ? `Bài đang viết dở:\n${params.currentAnswer.trim()}`
      : "Học sinh chưa viết gì.",
    "Trả về JSON { hint: string } bằng tiếng Việt, tối đa 180 chữ.",
  ].join("\n\n");
}

export function buildSectionGradingPrompt(params: {
  essayPrompt: string;
  sections: SectionKey[];
  answers: Record<string, string>;
}): string {
  const rubricBlock = params.sections
    .map((section) => {
      const config = SECTION_CONFIG[section];
      return `- ${section} · ${config.label} (${config.wordMin}–${config.wordMax} chữ, tối đa ${config.maxScore} điểm):\n  ${FULL_RUBRIC[section]}\n  Bài viết:\n  ${params.answers[section]?.trim() || "(trống)"}`;
    })
    .join("\n\n");
  const maxTotal = params.sections.reduce(
    (sum, section) => sum + SECTION_CONFIG[section].maxScore,
    0,
  );
  return [
    "Bạn là giám khảo nghị luận xã hội. Chấm đúng barem, cho điểm lẻ 0,5 nếu cần.",
    `Đề bài:\n${params.essayPrompt}`,
    `Chỉ chấm các phần sau. Tổng tối đa của bài này: ${maxTotal} điểm.`,
    rubricBlock,
    "Trả JSON:",
    "{ scores: { [sectionKey]: number }, feedback: { [sectionKey]: string }, total: number, overall: string, suggestions: string }",
    "scores chỉ gồm các phần đã chọn, không vượt maxScore từng phần. total = tổng các phần đã chấm.",
    "feedback từng phần: 2–4 câu. overall: đánh giá chung. suggestions: gợi ý cải thiện cụ thể.",
  ].join("\n\n");
}

export function clampSectionGrade(
  grade: SectionGradeResult,
  sections: SectionKey[],
): SectionGradeResult {
  const scores: SectionGradeResult["scores"] = {};
  let total = 0;
  for (const section of sections) {
    const max = SECTION_CONFIG[section].maxScore;
    const raw = grade.scores[section] ?? 0;
    const clamped = Math.max(0, Math.min(max, Math.round(raw * 2) / 2));
    scores[section] = clamped;
    total += clamped;
  }
  return {
    ...grade,
    scores,
    total: Math.round(total * 2) / 2,
  };
}

export function sectionPackExportPrompt(essays: { fingerprint: string; prompt: string }[]): string {
  const list =
    essays.length > 0
      ? essays
          .map((item, index) => `[${index + 1}] fingerprint=${item.fingerprint}\n${item.prompt}`)
          .join("\n\n")
      : "Không có đề ngân hàng. Hãy tự tạo 1 đề nghị luận xã hội mới.";
  return [
    "Tạo gói luyện tập nghị luận xã hội theo 6 phần.",
    "Mỗi phần cần đúng 3 gợi ý, gợi ý sau chi tiết hơn gợi ý trước.",
    "Trả đúng JSON, không markdown:",
    `{
  "essayPrompt": "đề tự luận",
  "essayFingerprint": "fingerprint nếu dùng đề có sẵn, bỏ trống nếu đề mới",
  "hints": {
    "mo_bai": ["gợi ý 1", "gợi ý 2", "gợi ý 3"],
    "giai_thich": ["gợi ý 1", "gợi ý 2", "gợi ý 3"],
    "phan_tich_ban_luan": ["gợi ý 1", "gợi ý 2", "gợi ý 3"],
    "phan_bien_mo_rong": ["gợi ý 1", "gợi ý 2", "gợi ý 3"],
    "bai_hoc": ["gợi ý 1", "gợi ý 2", "gợi ý 3"],
    "ket_bai": ["gợi ý 1", "gợi ý 2", "gợi ý 3"]
  }
}`,
    "Các phần: mo_bai 40–60 chữ; giai_thich 70–100; phan_tich_ban_luan 180–280; phan_bien_mo_rong 70–110; bai_hoc 100–170; ket_bai 40–80.",
    "Đề có sẵn (ưu tiên dùng, giữ fingerprint):",
    list,
  ].join("\n\n");
}

export async function generateSectionHintWithGemini(params: {
  essayPrompt: string;
  section: SectionKey;
  hintIndex: number;
  currentAnswer?: string;
  userId?: string;
}): Promise<string | null> {
  if (!hasGeminiKey()) return null;
  const hintIndex = Math.max(0, Math.min(MAX_HINTS_PER_SECTION - 1, params.hintIndex));
  try {
    const google = getGemini();
    const { object } = await generateObject({
      model: google(GEMINI_MODEL),
      schema: sectionHintResultSchema,
      messages: [
        {
          role: "user",
          content: buildSectionHintPrompt({ ...params, hintIndex }),
        },
      ],
    });
    await recordUsage({
      userId: params.userId,
      action: `section_hint_${params.section}_${hintIndex + 1}`,
      model: GEMINI_MODEL,
      cached: false,
      source: "gemini",
    });
    return object.hint;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function gradeSectionsWithGemini(params: {
  essayPrompt: string;
  sections: SectionKey[];
  answers: Record<string, string>;
  userId?: string;
}): Promise<SectionGradeResult | null> {
  if (!hasGeminiKey()) return null;
  try {
    const google = getGemini();
    const { object } = await generateObject({
      model: google(GEMINI_MODEL),
      schema: sectionGradeSchema,
      messages: [{ role: "user", content: buildSectionGradingPrompt(params) }],
    });
    await recordUsage({
      userId: params.userId,
      action: "section_grade",
      model: GEMINI_MODEL,
      cached: false,
      source: "gemini",
    });
    return clampSectionGrade(object, params.sections);
  } catch (error) {
    console.error(error);
    return null;
  }
}
