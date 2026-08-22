import { generateObject } from "ai";
import { ESSAY_MAX_SCORE } from "./constants";
import { GEMINI_MODEL, getGemini } from "./gemini";
import { essayGradeSchema, type EssayGrade } from "./schema";

export async function gradeEssay(params: {
  prompt: string;
  essayText: string;
}): Promise<EssayGrade> {
  const text = params.essayText.trim();
  if (!text) {
    return {
      score: 0,
      feedback:
        "Không có bài làm phần tự luận nên điểm phần này là 0/30.",
    };
  }

  const google = getGemini();
  const { object } = await generateObject({
    model: google(GEMINI_MODEL),
    schema: essayGradeSchema,
    messages: [
      {
        role: "user",
        content: `Bạn là giám khảo chấm nghị luận xã hội kỳ thi Văn bằng 2 Công an.
Thang điểm: 0 đến ${ESSAY_MAX_SCORE}.

Đề bài:
${params.prompt}

Bài làm của thí sinh:
${text}

Chấm theo rubric:
- Ý đúng, bám đề, liên hệ thực tiễn (0-12)
- Lập luận, dẫn chứng, mạch lạc (0-10)
- Bố cục mở-thân-kết (0-5)
- Ngôn ngữ, chính tả, văn phong (0-3)

Trả về score (số, có thể lẻ 0.5) và feedback bằng tiếng Việt (3-6 câu): điểm mạnh, điểm yếu, gợi ý cải thiện.`,
      },
    ],
  });

  return {
    score: Math.max(0, Math.min(ESSAY_MAX_SCORE, Number(object.score.toFixed(1)))),
    feedback: object.feedback.trim(),
  };
}
