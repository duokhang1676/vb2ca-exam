import {
  isNegativeType,
  isPositiveType,
  type CurriculumStep,
  type PracticeMode,
  type QuestionAnalysis,
} from "./types";

function skipIf(
  predicate: (analysis: Pick<QuestionAnalysis, "questionType">) => boolean,
): CurriculumStep["skipWhen"] {
  return (analysis) => (analysis ? predicate(analysis) : true);
}

export const CURRICULUM: CurriculumStep[] = [
  {
    id: "m0",
    skill: "framework",
    level: 0,
    title: "Học khung bài nghị luận",
    instruction:
      "Đọc khung dùng chung và khung theo từng dạng đề. Khi đã nắm trục bài, bấm Đã hiểu để sang nhận diện đề.",
    passScore: 7,
    minAttempts: 1,
  },
  {
    id: "m1",
    skill: "identify_type",
    level: 1,
    title: "Nhận diện dạng đề",
    instruction:
      "Chọn đúng một dạng: tư tưởng tích cực, tư tưởng tiêu cực, câu nói/quan niệm, hiện tượng tiêu cực hoặc hiện tượng tích cực.",
    passScore: 7,
    minAttempts: 1,
  },
  {
    id: "m2-l1",
    skill: "identify_issue",
    level: 1,
    title: "Xác định vấn đề · có gợi ý",
    instruction:
      "Viết vấn đề nghị luận cốt lõi (1–2 câu) và 3 từ khóa. Có gợi ý nhẹ từ đề.",
    passScore: 7,
    minAttempts: 1,
  },
  {
    id: "m2-l2",
    skill: "identify_issue",
    level: 2,
    title: "Xác định vấn đề · tự làm",
    instruction: "Không dùng gợi ý. Tự xác định vấn đề nghị luận và từ khóa.",
    passScore: 7,
    minAttempts: 1,
  },
  {
    id: "m3-l1",
    skill: "introduction",
    level: 1,
    title: "Mở bài · có khung",
    instruction:
      "Điền khung mở bài: dẫn vào vấn đề, nêu vấn đề nghị luận, nêu quan điểm.",
    passScore: 7,
    minAttempts: 1,
  },
  {
    id: "m3-l2",
    skill: "introduction",
    level: 2,
    title: "Mở bài · có gợi ý",
    instruction: "Viết mở bài 60–90 chữ. Có thể mở gợi ý theo tầng.",
    passScore: 7,
    minAttempts: 1,
  },
  {
    id: "m3-l3",
    skill: "introduction",
    level: 3,
    title: "Mở bài · tự viết",
    instruction: "Tự viết mở bài 60–90 chữ, không khung, không gợi ý sẵn.",
    passScore: 7,
    minAttempts: 1,
  },
  {
    id: "m4-l1",
    skill: "explanation",
    level: 1,
    title: "Giải thích · có khung",
    instruction: "Điền khung giải thích từ khóa và nội dung vấn đề.",
    passScore: 7,
    minAttempts: 1,
  },
  {
    id: "m4-l2",
    skill: "explanation",
    level: 2,
    title: "Giải thích · có gợi ý",
    instruction: "Viết đoạn giải thích 80–120 chữ.",
    passScore: 7,
    minAttempts: 1,
  },
  {
    id: "m4-l3",
    skill: "explanation",
    level: 3,
    title: "Giải thích · tự viết",
    instruction: "Tự viết đoạn giải thích, không khung.",
    passScore: 7,
    minAttempts: 1,
  },
  {
    id: "m5-l1",
    skill: "build_arguments",
    level: 1,
    title: "Luận điểm · chọn ý",
    instruction: "Chọn đúng 3 luận điểm phù hợp, không trùng ý.",
    passScore: 7,
    minAttempts: 1,
  },
  {
    id: "m5-l2",
    skill: "build_arguments",
    level: 2,
    title: "Luận điểm · có gợi ý",
    instruction: "Tự viết 3 luận điểm. Có gợi ý nếu cần.",
    passScore: 7,
    minAttempts: 1,
  },
  {
    id: "m5-l3",
    skill: "build_arguments",
    level: 3,
    title: "Luận điểm · tự viết",
    instruction: "Tự đề xuất 3 luận điểm không trùng, bám vấn đề.",
    passScore: 7,
    minAttempts: 1,
  },
  {
    id: "m5b-l1",
    skill: "causes",
    level: 1,
    title: "Nguyên nhân · có khung",
    instruction: "Nêu 3 nguyên nhân theo khung: gốc rễ, hoàn cảnh, chủ thể.",
    passScore: 7,
    minAttempts: 1,
    skipWhen: skipIf((a) => !isNegativeType(a.questionType) && a.questionType !== "D1_L3"),
  },
  {
    id: "m5b-l2",
    skill: "causes",
    level: 2,
    title: "Nguyên nhân · tự viết",
    instruction: "Tự phân tích nguyên nhân, tránh dừng ở bề mặt.",
    passScore: 7,
    minAttempts: 1,
    skipWhen: skipIf((a) => !isNegativeType(a.questionType) && a.questionType !== "D1_L3"),
  },
  {
    id: "m5c-l1",
    skill: "benefits",
    level: 1,
    title: "Ý nghĩa · có khung",
    instruction: "Nêu vai trò/ý nghĩa với cá nhân, cộng đồng, xã hội.",
    passScore: 7,
    minAttempts: 1,
    skipWhen: skipIf((a) => !isPositiveType(a.questionType) && a.questionType !== "D1_L3"),
  },
  {
    id: "m5c-l2",
    skill: "benefits",
    level: 2,
    title: "Ý nghĩa · tự viết",
    instruction: "Tự viết đoạn phân tích ý nghĩa / vai trò.",
    passScore: 7,
    minAttempts: 1,
    skipWhen: skipIf((a) => !isPositiveType(a.questionType) && a.questionType !== "D1_L3"),
  },
  {
    id: "m5d-l1",
    skill: "consequences",
    level: 1,
    title: "Hậu quả · có khung",
    instruction: "Nêu hậu quả với cá nhân, cộng đồng, xã hội.",
    passScore: 7,
    minAttempts: 1,
    skipWhen: skipIf((a) => !isNegativeType(a.questionType)),
  },
  {
    id: "m5d-l2",
    skill: "consequences",
    level: 2,
    title: "Hậu quả · tự viết",
    instruction: "Tự phân tích hậu quả, gắn với nguyên nhân nếu có.",
    passScore: 7,
    minAttempts: 1,
    skipWhen: skipIf((a) => !isNegativeType(a.questionType)),
  },
  {
    id: "m5e-l1",
    skill: "evidence",
    level: 1,
    title: "Dẫn chứng · chọn ý",
    instruction: "Chọn dẫn chứng phù hợp, khái quát, không bịa số liệu.",
    passScore: 7,
    minAttempts: 1,
  },
  {
    id: "m5e-l2",
    skill: "evidence",
    level: 2,
    title: "Dẫn chứng · tự viết",
    instruction:
      "Tự nêu dẫn chứng và phân tích ngắn. Không bịa sự kiện, nhân vật, số liệu.",
    passScore: 7,
    minAttempts: 1,
  },
  {
    id: "m6-l1",
    skill: "counter_argument",
    level: 1,
    title: "Phản biện · có khung",
    instruction:
      "Điền khung: góc nhìn khác → giới hạn → trở lại vấn đề cốt lõi.",
    passScore: 7,
    minAttempts: 1,
  },
  {
    id: "m6-l2",
    skill: "counter_argument",
    level: 2,
    title: "Phản biện · có gợi ý",
    instruction: "Viết đoạn phản biện 80–120 chữ.",
    passScore: 7,
    minAttempts: 1,
  },
  {
    id: "m6-l3",
    skill: "counter_argument",
    level: 3,
    title: "Phản biện · tự viết",
    instruction: "Tự viết phản biện, tránh cực đoan.",
    passScore: 7,
    minAttempts: 1,
  },
  {
    id: "m7-l1",
    skill: "solutions",
    level: 1,
    title: "Giải pháp · có khung",
    instruction: "Điền chủ thể, hành động, cách làm, mục tiêu.",
    passScore: 7,
    minAttempts: 1,
  },
  {
    id: "m7-l2",
    skill: "solutions",
    level: 2,
    title: "Giải pháp · có gợi ý",
    instruction: "Viết 2–3 giải pháp cụ thể, khả thi.",
    passScore: 7,
    minAttempts: 1,
  },
  {
    id: "m7-l3",
    skill: "solutions",
    level: 3,
    title: "Giải pháp · tự viết",
    instruction: "Tự đề xuất giải pháp, đúng chủ thể, gắn nguyên nhân.",
    passScore: 7,
    minAttempts: 1,
  },
  {
    id: "m8-l1",
    skill: "conclusion",
    level: 1,
    title: "Kết bài · có khung",
    instruction: "Điền khung: khẳng định vấn đề, ý nghĩa, trách nhiệm bản thân.",
    passScore: 7,
    minAttempts: 1,
  },
  {
    id: "m8-l2",
    skill: "conclusion",
    level: 2,
    title: "Kết bài · có gợi ý",
    instruction: "Viết kết bài 50–80 chữ.",
    passScore: 7,
    minAttempts: 1,
  },
  {
    id: "m8-l3",
    skill: "conclusion",
    level: 3,
    title: "Kết bài · tự viết",
    instruction: "Tự viết kết bài, không khung.",
    passScore: 7,
    minAttempts: 1,
  },
  {
    id: "m8b-l1",
    skill: "paragraph",
    level: 1,
    title: "Viết đoạn · có khung",
    instruction: "Viết một đoạn thân bài theo luận điểm cho sẵn.",
    passScore: 7,
    minAttempts: 1,
  },
  {
    id: "m8b-l2",
    skill: "paragraph",
    level: 2,
    title: "Viết đoạn · tự viết",
    instruction: "Tự chọn một luận điểm và viết đoạn 80–120 chữ.",
    passScore: 7,
    minAttempts: 1,
  },
  {
    id: "m9-l1",
    skill: "outline",
    level: 1,
    title: "Dàn ý · có gợi ý",
    instruction: "Lập dàn ý 8–12 gạch, bám khung dạng đề. Có gợi ý mục.",
    passScore: 7,
    minAttempts: 1,
  },
  {
    id: "m9-l2",
    skill: "outline",
    level: 2,
    title: "Dàn ý tốc độ",
    instruction: "Lập dàn ý hoàn chỉnh trong khoảng 10 phút, không gợi ý mục.",
    passScore: 7,
    minAttempts: 1,
  },
  {
    id: "m10-l2",
    skill: "full_essay",
    level: 2,
    title: "Bài hoàn chỉnh · có dàn ý",
    instruction:
      "Viết bài nghị luận tối thiểu 500 chữ (mục tiêu 700–900) trên đúng đề đang luyện.",
    passScore: 7,
    minAttempts: 1,
  },
  {
    id: "m10-l3",
    skill: "full_essay",
    level: 3,
    title: "Bài hoàn chỉnh · tự viết",
    instruction: "Viết lại bài hoàn chỉnh không nhìn dàn ý mẫu.",
    passScore: 7,
    minAttempts: 1,
  },
];

export function stepById(id: string): CurriculumStep | undefined {
  return CURRICULUM.find((step) => step.id === id);
}

export function visibleSteps(
  analysis: Pick<QuestionAnalysis, "questionType"> | null,
): CurriculumStep[] {
  return CURRICULUM.filter((step) => !step.skipWhen?.(analysis));
}

export function nextStepId(
  currentId: string,
  analysis: Pick<QuestionAnalysis, "questionType"> | null,
): string | null {
  const steps = visibleSteps(analysis);
  const index = steps.findIndex((step) => step.id === currentId);
  if (index < 0) return steps[0]?.id ?? null;
  return steps[index + 1]?.id ?? null;
}

export function firstSkillStep(
  skill: PracticeMode,
  analysis: Pick<QuestionAnalysis, "questionType"> | null,
): CurriculumStep | undefined {
  return visibleSteps(analysis).find((step) => step.skill === skill);
}

export function masteryFromScores(params: {
  attempts: number;
  recentAverage: number;
}): "new" | "learning" | "familiar" | "mastered" {
  if (params.attempts <= 0) return "new";
  if (params.attempts >= 5 && params.recentAverage >= 8) return "mastered";
  if (params.attempts >= 3 && params.recentAverage >= 7) return "familiar";
  return "learning";
}

export function passedStep(params: {
  step: CurriculumStep;
  score: number;
  recentAverage: number;
  attemptsForStep: number;
}): boolean {
  if (params.score >= params.step.passScore) return true;
  return (
    params.attemptsForStep >= params.step.minAttempts &&
    params.attemptsForStep >= 3 &&
    params.recentAverage >= params.step.passScore
  );
}

export const DAILY_SKILLS: PracticeMode[] = [
  "identify_type",
  "counter_argument",
  "solutions",
  "paragraph",
];
