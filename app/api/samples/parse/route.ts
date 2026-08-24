import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/session";
import {
  ContributeError,
  contributeErrorResponse,
} from "@/lib/exam/contribute-error";
import { EXAM_SPECS } from "@/lib/exam/constants";
import { isDocxFile, isPdfFile } from "@/lib/exam/document";
import { parseAnswerKey } from "@/lib/exam/parse-answers";
import { parseNativeExamFile } from "@/lib/exam/parse-native";
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
    const answers = form.get("answers");

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
        "Cần upload file đề PDF hoặc DOCX có chữ đọc được.",
        "Thiếu file đề",
        ["Chọn file PDF hoặc DOCX đề đầy đủ phần 1 và phần 2."],
      );
    }
    if (!(answers instanceof File)) {
      throw new ContributeError(
        "EMPTY_ANSWER_KEY",
        "Cần file đáp án TXT kèm file đề.",
        "Thiếu file đáp án",
        ["Upload thêm file .txt, mỗi dòng một câu."],
      );
    }
    if (!isPdfFile(file.name, file.type) && !isDocxFile(file.name, file.type)) {
      throw new ContributeError(
        "INVALID_FILE_TYPE",
        "Đề minh họa chỉ nhận PDF hoặc DOCX.",
        "Sai loại file đề",
        ["Chọn .pdf hoặc .docx có chữ chọn được, không dùng file scan."],
      );
    }

    const answerText = await answers.text();
    let answerKey;
    try {
      answerKey = parseAnswerKey(answerText, EXAM_SPECS[examCodeRaw].total);
    } catch (error) {
      throw new ContributeError(
        "EMPTY_ANSWER_KEY",
        error instanceof Error ? error.message : "Không đọc được file đáp án.",
        "File đáp án không đúng format",
        [
          "Mỗi dòng: `1 A`, `46 72` hoặc `55 Năng lực pháp luật`.",
          `Cần đủ ${EXAM_SPECS[examCodeRaw].total} câu cho mã ${examCodeRaw}.`,
        ],
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const parsed = await parseNativeExamFile({
      bytes,
      filename: file.name,
      mimeType: file.type,
      examCode: examCodeRaw,
      answerKey,
    });

    const saved = await saveGeneratedSampleExam({
      examCode: examCodeRaw,
      essayPrompt: parsed.essayPrompt,
      questions: parsed.questions,
      answerKey,
      pdf: { bytes: Buffer.from(bytes), filename: file.name },
      answerFile: {
        bytes: Buffer.from(answerText, "utf8"),
        filename: answers.name,
      },
    });

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
