import { NextResponse } from "next/server";

export type ContributeErrorCode =
  | "UNAUTHORIZED"
  | "INVALID_FILE_TYPE"
  | "EMPTY_ANSWER_KEY"
  | "OCR_EMPTY"
  | "OCR_TIMEOUT"
  | "GEMINI_ERROR"
  | "DRAFT_EXPIRED"
  | "COMMIT_PARTIAL"
  | "COMMIT_EMPTY";

export class ContributeError extends Error {
  constructor(
    public code: ContributeErrorCode,
    message: string,
    public title: string,
    public steps: string[],
  ) {
    super(message);
    this.name = "ContributeError";
  }
}

export function contributeErrorResponse(error: unknown, fallback: string) {
  if (error instanceof ContributeError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        title: error.title,
        steps: error.steps,
      },
      { status: error.code === "UNAUTHORIZED" ? 401 : 400 },
    );
  }
  const message = error instanceof Error ? error.message : fallback;
  const mapped = mapUnknownContributeError(message, fallback);
  return NextResponse.json(
    {
      error: mapped.message,
      code: mapped.code,
      title: mapped.title,
      steps: mapped.steps,
    },
    { status: 500 },
  );
}

export function mapUnknownContributeError(
  message: string,
  fallback: string,
): {
  code: ContributeErrorCode;
  title: string;
  message: string;
  steps: string[];
} {
  if (/timeout|timed out|ETIMEDOUT|deadline/i.test(message)) {
    return {
      code: "OCR_TIMEOUT",
      title: "Trích xuất quá thời gian",
      message:
        "Hệ thống đọc file lâu hơn dự kiến. File có thể quá dài hoặc kết nối AI bị gián đoạn.",
      steps: [
        "Thử lại sau ít phút.",
        "Nếu PDF nhiều trang, tách riêng Phần 1 và Phần 2.",
        "Với file scan, xuất lại thành DOCX có chữ chọn được.",
      ],
    };
  }
  if (/Không trích|Không tìm thấy đề|Không ghép được câu/i.test(message)) {
    return {
      code: "OCR_EMPTY",
      title: "Không đọc được nội dung đề",
      message,
      steps: [
        "Đối chiếu file với mục Xem ví dụ format.",
        "Phần 1 chỉ gồm nghị luận; phần 2 gồm câu hỏi đánh số và đáp án TXT.",
        "Thử DOCX nếu PDF là ảnh scan.",
      ],
    };
  }
  if (/dòng đáp án|File đáp án/i.test(message)) {
    return {
      code: "EMPTY_ANSWER_KEY",
      title: "File đáp án không đúng format",
      message,
      steps: [
        "Mỗi dòng: số câu, khoảng trắng, đáp án. Ví dụ `1 A` hoặc `55 Năng lực pháp luật`.",
        "Tải file mẫu CA1/CA4 rồi so sánh.",
        "Lưu TXT dạng UTF-8, không bảng Word.",
      ],
    };
  }
  if (
    /did not match schema|No object generated|ZodError|too_big/i.test(message)
  ) {
    return {
      code: "GEMINI_ERROR",
      title: "AI trả sai cấu trúc đề",
      message:
        "Hệ thống đọc được file nhưng JSON không khớp cấu trúc câu hỏi hoặc cụm.",
      steps: [
        "Thử nạp lại cùng file. Hệ thống sẽ cắt cụm thừa và bỏ cụm thiếu.",
        "Nếu vẫn lỗi, tách phần trắc nghiệm và phần điền, hoặc đổi sang DOCX.",
        "Đối chiếu file với mục Xem ví dụ format.",
      ],
    };
  }
  return {
    code: "GEMINI_ERROR",
    title: "Không nạp được file",
    message: message || fallback,
    steps: [
      "Kiểm tra đúng loại file PDF/DOCX (và TXT đáp án nếu là phần 2).",
      "Mở mục Xem ví dụ format rồi chỉnh file cho khớp.",
      "Thử lại. Nếu vẫn lỗi, giảm số trang hoặc đổi sang DOCX.",
    ],
  };
}
