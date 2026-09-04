import { z } from "zod";

export const SECTION_KEYS = [
  "mo_bai",
  "giai_thich",
  "phan_tich_ban_luan",
  "phan_bien_mo_rong",
  "bai_hoc",
  "ket_bai",
] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];

export const SECTION_CONFIG = {
  mo_bai: {
    label: "Mở bài",
    shortLabel: "Mở bài",
    wordMin: 40,
    wordMax: 60,
    maxScore: 2,
  },
  giai_thich: {
    label: "Phần 1. Giải thích vấn đề",
    shortLabel: "Giải thích",
    wordMin: 70,
    wordMax: 100,
    maxScore: 4,
  },
  phan_tich_ban_luan: {
    label: "Phần 2. Phân tích & Bàn luận",
    shortLabel: "Phân tích & Bàn luận",
    wordMin: 180,
    wordMax: 280,
    maxScore: 12,
  },
  phan_bien_mo_rong: {
    label: "Phần 3. Phản biện & Mở rộng",
    shortLabel: "Phản biện & Mở rộng",
    wordMin: 70,
    wordMax: 110,
    maxScore: 4,
  },
  bai_hoc: {
    label: "Phần 4. Bài học nhận thức & Hành động",
    shortLabel: "Bài học",
    wordMin: 100,
    wordMax: 170,
    maxScore: 5,
  },
  ket_bai: {
    label: "Kết bài",
    shortLabel: "Kết bài",
    wordMin: 40,
    wordMax: 80,
    maxScore: 3,
  },
} as const satisfies Record<
  SectionKey,
  {
    label: string;
    shortLabel: string;
    wordMin: number;
    wordMax: number;
    maxScore: number;
  }
>;

export const FULL_RUBRIC: Record<SectionKey, string> = {
  mo_bai:
    "Mở bài – 2 điểm: đúng vấn đề 1đ; thể hiện quan điểm và dẫn nhập gọn 1đ.",
  giai_thich:
    "Giải thích – 4 điểm: giải thích đúng từ khóa 1,5đ; làm rõ nội dung nhận định 1,5đ; xác định đúng thông điệp/vấn đề 1đ.",
  phan_tich_ban_luan:
    "Phân tích & Bàn luận – 12 điểm. Phân tích bản chất – 5 điểm: luận điểm đúng 1,5đ; phân tích nguyên nhân/bản chất 2đ; logic và chiều sâu 1,5đ. Ý nghĩa/hậu quả – 4 điểm: xác định đúng tác động 1,5đ; phân tích nhiều cấp độ 1,5đ; liên hệ đúng chủ đề 1đ. Dẫn chứng – thực tiễn – 3 điểm: dẫn chứng phù hợp 1đ; phân tích dẫn chứng 1đ; kết nối với luận điểm 1đ.",
  phan_bien_mo_rong:
    "Phản biện & Mở rộng – 4 điểm: có góc nhìn khác/phản đề 1đ; chỉ ra giới hạn, biểu hiện lệch lạc hoặc cách hiểu chưa đúng 1đ; lập luận cân bằng, không cực đoan 1đ; xác lập lại quan điểm đúng 1đ.",
  bai_hoc:
    "Bài học nhận thức & Hành động – 5 điểm: xác định đúng nhận thức/chủ thể trách nhiệm 1đ; hành động hoặc giải pháp cụ thể 1,5đ; có cách thực hiện 1đ; phù hợp với vấn đề đã phân tích 1đ; liên hệ trách nhiệm cá nhân 0,5đ.",
  ket_bai:
    "Kết bài – 3 điểm: khẳng định vấn đề 1đ; rút ra ý nghĩa/thông điệp 1đ; liên hệ trách nhiệm bản thân 1đ.",
};

export const TOTAL_MAX_SCORE = 30;
export const MAX_HINTS_PER_SECTION = 3;

export function isSectionKey(value: unknown): value is SectionKey {
  return typeof value === "string" && (SECTION_KEYS as readonly string[]).includes(value);
}

export function parseSectionKeys(value: unknown): SectionKey[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isSectionKey);
}

const hintTripleSchema = z.array(z.string().min(1).max(2500)).length(3);

export const sectionHintsSchema = z.object({
  mo_bai: hintTripleSchema,
  giai_thich: hintTripleSchema,
  phan_tich_ban_luan: hintTripleSchema,
  phan_bien_mo_rong: hintTripleSchema,
  bai_hoc: hintTripleSchema,
  ket_bai: hintTripleSchema,
});

export const sectionPackSchema = z.object({
  essayPrompt: z.string().min(10).max(8000),
  essayFingerprint: z.string().min(8).max(128).optional(),
  hints: sectionHintsSchema,
});

export const sectionHintResultSchema = z.object({
  hint: z.string().min(1).max(2500),
});

const scoreField = z.number().min(0).max(12).optional();

export const sectionGradeSchema = z.object({
  scores: z.object({
    mo_bai: scoreField,
    giai_thich: scoreField,
    phan_tich_ban_luan: scoreField,
    phan_bien_mo_rong: scoreField,
    bai_hoc: scoreField,
    ket_bai: scoreField,
  }),
  feedback: z.object({
    mo_bai: z.string().max(800).optional(),
    giai_thich: z.string().max(800).optional(),
    phan_tich_ban_luan: z.string().max(800).optional(),
    phan_bien_mo_rong: z.string().max(800).optional(),
    bai_hoc: z.string().max(800).optional(),
    ket_bai: z.string().max(800).optional(),
  }),
  total: z.number().min(0).max(30),
  overall: z.string().min(1).max(1200),
  suggestions: z.string().min(1).max(1200),
});

export type SectionHints = z.infer<typeof sectionHintsSchema>;
export type SectionPackPayload = z.infer<typeof sectionPackSchema>;
export type SectionGradeResult = z.infer<typeof sectionGradeSchema>;

export type SectionStats = {
  section: SectionKey;
  attempts: number;
  averageScore: number | null;
  maxScore: number;
};

export type SectionHistoryItem = {
  id: string;
  createdAt: string;
  essayPrompt: string;
  score: number | null;
  maxScore: number;
  total: number | null;
};

export type SectionPackRow = {
  id: string;
  title: string;
  serialNumber: number;
  essayId: string | null;
  essayPrompt: string;
  createdAt: string;
};
