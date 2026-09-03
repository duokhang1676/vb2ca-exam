import type { QuestionType } from "./types";

export type FrameworkBlock = {
  type: QuestionType | "common";
  title: string;
  steps: string[];
};

export const ESSAY_FRAMEWORKS: FrameworkBlock[] = [
  {
    type: "common",
    title: "Khung dùng chung",
    steps: [
      "Mở bài: dẫn vào vấn đề, xác định vấn đề nghị luận, nêu quan điểm.",
      "Giải thích: từ khóa và nội dung / thông điệp.",
      "Phân tích: biểu hiện hoặc thực trạng; nguyên nhân hoặc cơ sở; ý nghĩa hoặc hậu quả.",
      "Dẫn chứng: nêu, phân tích, kết nối với luận điểm — không bịa số liệu.",
      "Phản biện: góc nhìn khác, giới hạn, tránh cực đoan, trở lại vấn đề.",
      "Giải pháp / bài học: đúng chủ thể, hành động, cách làm, mục tiêu.",
      "Kết bài: khẳng định vấn đề, ý nghĩa, trách nhiệm bản thân.",
    ],
  },
  {
    type: "D1_L1",
    title: "D1-L1 · Phẩm chất / tư tưởng tích cực",
    steps: [
      "Giải thích phẩm chất hoặc tư tưởng.",
      "Biểu hiện trong đời sống.",
      "Vai trò / ý nghĩa với cá nhân và cộng đồng.",
      "Dẫn chứng khái quát.",
      "Phản đề / biểu hiện lệch lạc.",
      "Bài học và hướng hành động.",
    ],
  },
  {
    type: "D1_L2",
    title: "D1-L2 · Tư tưởng / lối sống tiêu cực",
    steps: [
      "Giải thích hiện tượng tư tưởng tiêu cực.",
      "Biểu hiện / thực trạng.",
      "Nguyên nhân.",
      "Hậu quả.",
      "Phê phán / phản biện.",
      "Giải pháp và bài học cá nhân.",
    ],
  },
  {
    type: "D1_L3",
    title: "D1-L3 · Ý kiến / câu nói / quan niệm sống",
    steps: [
      "Giải nghĩa từ khóa.",
      "Giải nghĩa toàn bộ nhận định.",
      "Xác định thông điệp.",
      "Phân tích tính đúng đắn.",
      "Dẫn chứng.",
      "Phản biện / giới hạn.",
      "Bài học nhận thức và hành động.",
    ],
  },
  {
    type: "D2_L1",
    title: "D2-L1 · Hiện tượng đời sống tiêu cực",
    steps: [
      "Giải thích hiện tượng.",
      "Thực trạng.",
      "Nguyên nhân.",
      "Hậu quả.",
      "Phê phán.",
      "Giải pháp đa chủ thể.",
    ],
  },
  {
    type: "D2_L2",
    title: "D2-L2 · Hiện tượng đời sống tích cực",
    steps: [
      "Giải thích hiện tượng.",
      "Biểu hiện.",
      "Ý nghĩa.",
      "Dẫn chứng.",
      "Rào cản / giới hạn.",
      "Cách lan tỏa và bài học.",
    ],
  },
];

export const TARGET_WORDS: Partial<Record<string, string>> = {
  introduction: "60-90",
  explanation: "80-120",
  counter_argument: "80-120",
  evidence: "80-120",
  solutions: "120-180",
  conclusion: "50-80",
  paragraph: "80-120",
  full_essay: "500+",
};

export function guessQuestionType(prompt: string): QuestionType {
  const text = prompt.toLowerCase();
  const quoted = /[“”"']/.test(prompt) || /câu nói|ý kiến|quan niệm|nhận định/.test(text);
  if (quoted) return "D1_L3";

  const phenomenon =
    /hiện tượng|mạng xã hội|tiêu dùng|môi trường|học đường|cộng đồng mạng|livestream|thực phẩm/.test(
      text,
    );
  const negative =
    /vô cảm|ích kỷ|tiêu cực|bạo lực|đổ lỗi|ngại khó|thực dụng|phô trương|tha hóa|suy đồi|tệ nạn|lừa đảo/.test(
      text,
    );
  if (phenomenon) return negative ? "D2_L1" : "D2_L2";
  if (negative) return "D1_L2";
  return "D1_L1";
}
