import { generateObject } from "ai";
import { GEMINI_MODEL, getGemini } from "./gemini";
import {
  practiceInsightSchema,
  type PracticeInsight,
} from "./schema";
import type { PracticeInsightPayload } from "./practice-stats";

export async function generatePracticeInsight(
  payload: PracticeInsightPayload,
): Promise<PracticeInsight> {
  const google = getGemini();
  const { object } = await generateObject({
    model: google(GEMINI_MODEL),
    schema: practiceInsightSchema,
    messages: [
      {
        role: "user",
        content: `Bạn là trợ lý ôn thi VB2CA. Dựa CHỈ vào JSON thống kê sau, viết tiếng Việt rất ngắn.
Cấm lặp lại số liệu thô, cấm viết dài, cấm bịa chủ đề không có trong JSON.
evaluation: 2-4 câu nhận xét điểm mạnh/yếu.
suggestions: tối đa 5 gợi ý luyện tập, mỗi gợi ý một câu ngắn.

JSON:
${JSON.stringify(payload)}`,
      },
    ],
  });

  const suggestions = object.suggestions
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 5);

  return {
    evaluation: object.evaluation.trim(),
    suggestions:
      suggestions.length > 0
        ? suggestions
        : ["Ôn lại các dạng bài sai nhiều nhất trong thống kê."],
  };
}
