import { guessQuestionType, TARGET_WORDS } from "./frameworks";
import { PRACTICE_MODE_LABELS, QUESTION_TYPE_LABELS } from "./types";
import type {
  PracticeLevel,
  PracticeMode,
  QuestionAnalysis,
  QuestionType,
  SeedData,
} from "./types";

function typeOf(
  prompt: string,
  analysis: QuestionAnalysis | null,
): QuestionType {
  return analysis?.questionType ?? guessQuestionType(prompt);
}

function issueOf(prompt: string, analysis: QuestionAnalysis | null): string {
  return analysis?.coreIssue ?? prompt.slice(0, 140);
}

export function buildStaticSeed(params: {
  mode: PracticeMode;
  level: PracticeLevel;
  prompt: string;
  analysis: QuestionAnalysis | null;
}): SeedData {
  const type = typeOf(params.prompt, params.analysis);
  const issue = issueOf(params.prompt, params.analysis);
  const keywords = params.analysis?.keywords ?? [];
  const task = PRACTICE_MODE_LABELS[params.mode];
  const targetWords = TARGET_WORDS[params.mode];

  if (params.mode === "identify_type") {
    return {
      task: "Chọn đúng dạng đề nghị luận.",
      correctType: type,
      hints: [
        "Xem đề nói về phẩm chất, hiện tượng hay câu nói.",
        "Tích cực hay tiêu cực?",
        `Gợi ý: ${QUESTION_TYPE_LABELS[type]}`,
      ],
    };
  }

  if (params.mode === "identify_issue") {
    return {
      task: "Xác định vấn đề nghị luận cốt lõi.",
      hints:
        params.level === 1
          ? [
              "Vấn đề là điều cần bàn, không phải nhắc lại nguyên đề.",
              keywords[0] ? `Chú ý từ khóa: ${keywords[0]}` : "Tìm từ then chốt trong đề.",
              `Hướng: ${issue}`,
            ]
          : ["Viết 1–2 câu vấn đề + 3 từ khóa."],
      expectedIdeas: [issue, ...keywords.slice(0, 3)],
    };
  }

  if (params.mode === "introduction") {
    return {
      task,
      targetWords,
      requiredElements: ["dẫn nhập", "vấn đề nghị luận", "quan điểm"],
      scaffold:
        "Trong cuộc sống hiện nay, … là vấn đề đáng suy nghĩ. Đề bài đặt ra vấn đề … Tôi cho rằng …",
      hints: [
        "Câu cuối mở bài phải nêu rõ quan điểm.",
        "Tránh kể lể dài trước khi vào vấn đề.",
        `Vấn đề: ${issue}`,
      ],
      commonMistakes: ["Dẫn nhập quá dài", "Không nêu quan điểm"],
    };
  }

  if (params.mode === "explanation") {
    return {
      task,
      targetWords,
      requiredElements: ["giải thích từ khóa", "giải thích vấn đề"],
      scaffold: "Trước hết, … được hiểu là … Điều này có nghĩa …",
      hints: ["Giải thích từ then chốt trước.", "Tránh giảng lan man ngoài đề.", issue],
    };
  }

  if (params.mode === "build_arguments") {
    const suggested = [
      "Nhận thức đúng vấn đề giúp định hướng hành động.",
      "Hành động cụ thể tạo ra giá trị cho cộng đồng.",
      "Trách nhiệm cá nhân gắn với trách nhiệm xã hội.",
      "Chỉ nói không làm thì không giải quyết được vấn đề.",
      "Đổ lỗi hoàn cảnh để né trách nhiệm.",
    ];
    return {
      task,
      suggestedArguments: suggested.slice(0, 3),
      distractors: suggested.slice(3),
      choices: suggested.map((text, index) => ({
        id: String(index + 1),
        text,
        correct: index < 3,
      })),
      hints: ["3 luận điểm không trùng ý.", "Mỗi ý phải bám vấn đề.", issue],
    };
  }

  if (params.mode === "causes") {
    return {
      task,
      requiredElements: ["nguyên nhân nhận thức", "nguyên nhân hoàn cảnh", "chủ thể"],
      scaffold: "Nguyên nhân từ nhận thức … Từ hoàn cảnh … Từ trách nhiệm chủ thể …",
      hints: ["Hỏi 'vì sao' ít nhất hai tầng.", "Tránh chỉ nêu hiện tượng."],
    };
  }

  if (params.mode === "benefits") {
    return {
      task,
      requiredElements: ["cá nhân", "cộng đồng", "xã hội"],
      scaffold: "Với cá nhân, … Với cộng đồng, … Với xã hội, …",
      hints: ["Tách rõ 3 phạm vi.", "Gắn với vấn đề, không khen chung chung."],
    };
  }

  if (params.mode === "consequences") {
    return {
      task,
      requiredElements: ["cá nhân", "cộng đồng", "xã hội"],
      scaffold: "Hậu quả với cá nhân … Với cộng đồng … Về lâu dài …",
      hints: ["Nêu hệ quả, không dừng ở mô tả.", "Có thể gắn với nguyên nhân đã nêu."],
    };
  }

  if (params.mode === "evidence") {
    const choices = [
      { id: "1", text: "Người trẻ tham gia hoạt động cộng đồng, tình nguyện, giữ chữ tín.", correct: true },
      { id: "2", text: "Một thống kê bịa: 97,3% thanh niên vi phạm năm 2024.", correct: false },
      { id: "3", text: "Gương người lao động thầm lặng hoàn thành trách nhiệm.", correct: true },
      { id: "4", text: "Dẫn một điều luật không tồn tại.", correct: false },
    ];
    return {
      task,
      targetWords,
      choices,
      hints: [
        "Dùng dẫn chứng khái quát, không bịa số liệu.",
        "Sau khi nêu phải phân tích ngắn.",
        "Gắn dẫn chứng với luận điểm.",
      ],
    };
  }

  if (params.mode === "counter_argument") {
    return {
      task,
      targetWords,
      requiredElements: ["góc nhìn khác", "giới hạn", "trở lại vấn đề"],
      scaffold: "Cũng có ý kiến cho rằng … Tuy nhiên, nếu tuyệt đối hóa thì … Vì vậy …",
      hints: ["Đừng phủ định hết.", "Phải quay lại vấn đề cốt lõi."],
    };
  }

  if (params.mode === "solutions") {
    return {
      task,
      targetWords,
      requiredElements: ["chủ thể", "hành động", "cách làm", "mục tiêu"],
      scaffold: "Về phía bản thân, cần … Nhà trường/gia đình … Xã hội …",
      hints: ["Mỗi giải pháp có chủ thể rõ.", "Tránh khẩu hiệu chung."],
    };
  }

  if (params.mode === "conclusion") {
    return {
      task,
      targetWords,
      requiredElements: ["khẳng định", "ý nghĩa", "trách nhiệm"],
      scaffold: "Tóm lại, … Điều này có ý nghĩa … Bản thân cần …",
      hints: ["Không mở vấn đề mới.", "Kết bằng trách nhiệm hành động."],
    };
  }

  if (params.mode === "paragraph") {
    return {
      task,
      targetWords,
      suggestedArguments: ["Luận điểm: nhận thức đúng phải đi cùng hành động cụ thể."],
      scaffold: "Mở ý — giải thích — dẫn chứng khái quát — kết ý.",
      hints: ["Một đoạn một luận điểm.", "Có câu kết đoạn."],
    };
  }

  if (params.mode === "outline") {
    return {
      task: "Lập dàn ý 8–12 gạch.",
      hints:
        params.level === 1
          ? [
              "Bám khung dạng đề đang luyện.",
              "Mỗi gạch là một ý, không viết đoạn.",
              QUESTION_TYPE_LABELS[type],
            ]
          : ["Làm trong khoảng 10 phút.", "Đủ mở — thân — kết."],
      expectedIdeas: [
        "Mở bài",
        "Giải thích",
        "Luận điểm",
        "Dẫn chứng",
        "Phản biện",
        "Giải pháp",
        "Kết bài",
      ],
    };
  }

  return {
    task: "Viết bài nghị luận hoàn chỉnh, tối thiểu 500 chữ.",
    targetWords: "700-900",
    requiredElements: [
      "mở bài",
      "giải thích",
      "luận điểm",
      "dẫn chứng",
      "phản biện",
      "giải pháp",
      "kết bài",
    ],
    hints: ["Giữ đúng đề đã luyện.", "Ưu tiên lập luận rõ, không bịa dẫn chứng."],
  };
}
