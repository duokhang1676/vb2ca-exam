import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/session";
import {
  ContributeError,
  contributeErrorResponse,
} from "@/lib/exam/contribute-error";
import { isJsonFile } from "@/lib/exam/document";
import { parseSampleJsonText } from "@/lib/exam/parse-sample-json";
import { saveGeneratedSampleExam } from "@/lib/exam/sample";
import { isExamCode } from "@/lib/exam/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const { user, response } = await requireAuthUser();
  if (!user) return response;

  try {
    const form = await request.formData();
    const examCodeRaw = form.get("examCode");
    const file = form.get("file");

    if (!isExamCode(examCodeRaw)) {
      throw new ContributeError(
        "INVALID_FILE_TYPE",
        "Chọn mã đề CA1 hoặc CA4.",
        "Thiếu mã đề",
        ["Chọn CA1 hoặc CA4 trước khi đóng góp đề minh họa."],
      );
    }
    if (!(file instanceof File)) {
      throw new ContributeError(
        "INVALID_FILE_TYPE",
        `Cần upload file JSON đề minh họa ${examCodeRaw}.`,
        "Thiếu file đề",
        [
          `Chọn file .json theo định dạng đề ${examCodeRaw} (essayPrompt, questions, answerKey).`,
        ],
      );
    }
    if (!isJsonFile(file.name, file.type)) {
      throw new ContributeError(
        "INVALID_FILE_TYPE",
        `Đề minh họa ${examCodeRaw} chỉ nhận file JSON.`,
        "Sai loại file đề",
        [
          "Chọn file .json có examCode, essayPrompt, questions và answerKey.",
        ],
      );
    }

    const sampleFile =
      examCodeRaw === "CA1"
        ? "fixtures/generated/ca1-template.json"
        : "fixtures/generated/ca4-template.json";

    let payload;
    try {
      payload = parseSampleJsonText(await file.text(), examCodeRaw);
    } catch (error) {
      throw new ContributeError(
        "INVALID_CONTENT",
        error instanceof Error ? error.message : "Không đọc được file JSON.",
        "JSON đề minh họa không đúng format",
        [
          `Cần examCode ${examCodeRaw}, essayPrompt, questions (≥ 1 câu) và answerKey.`,
          "Chỉ nhận 3 dạng: trắc nghiệm độc lập, trắc nghiệm cụm, điền đáp án.",
          `Đối chiếu với file mẫu ${sampleFile}.`,
        ],
      );
    }

    let saved;
    try {
      saved = await saveGeneratedSampleExam({
        examCode: examCodeRaw,
        essayPrompt: payload.essayPrompt,
        questions: payload.questions,
        answerKey: payload.answerKey,
        diversity: payload.diversity,
        createdBy: user.id,
        sourceFilename: file.name,
      });
    } catch (error) {
      throw new ContributeError(
        "INVALID_CONTENT",
        error instanceof Error ? error.message : "Không lưu được đề JSON.",
        `JSON đề minh họa không đúng cấu trúc ${examCodeRaw}`,
        [
          "Cần essayPrompt, ít nhất 1 câu, mỗi câu thuộc mcq độc lập / mcq cụm / fill.",
          "Số câu, thứ tự dạng và số thành phần cụm không bắt buộc.",
          `Đối chiếu với file mẫu ${sampleFile}.`,
        ],
      );
    }

    return NextResponse.json({
      examId: saved.examId,
      title: saved.title,
      number: saved.number,
      added: saved.imported.essays.added + saved.imported.questions.added,
      skipped: saved.imported.essays.skipped + saved.imported.questions.skipped,
    });
  } catch (error) {
    console.error(error);
    return contributeErrorResponse(error, "Không đọc được đề minh họa từ file.");
  }
}
