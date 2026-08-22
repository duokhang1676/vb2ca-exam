import { NextResponse } from "next/server";
import { importQuestions } from "@/lib/exam/bank";
import { extractDocxText, isDocxFile, isPdfFile } from "@/lib/exam/document";
import { parseAnswerKey } from "@/lib/exam/parse-answers";
import { parseQuestionsDocument } from "@/lib/exam/parse-pdf";
import { isExamCode } from "@/lib/exam/types";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const examCodeRaw = form.get("examCode");
    const file = form.get("file");
    const answers = form.get("answers");

    if (!isExamCode(examCodeRaw)) {
      return NextResponse.json(
        { error: "Chọn mã đề CA1 hoặc CA4." },
        { status: 400 },
      );
    }
    if (!(file instanceof File) || !(answers instanceof File)) {
      return NextResponse.json(
        { error: "Cần file câu hỏi (PDF/DOCX) và file đáp án TXT." },
        { status: 400 },
      );
    }

    const answerKey = parseAnswerKey(await answers.text());
    const bytes = new Uint8Array(await file.arrayBuffer());
    let questions;

    if (isPdfFile(file.name, file.type)) {
      questions = await parseQuestionsDocument({
        examCode: examCodeRaw,
        answerKey,
        file: {
          bytes,
          mediaType: "application/pdf",
          filename: file.name,
        },
      });
    } else if (isDocxFile(file.name, file.type)) {
      const text = await extractDocxText(bytes);
      questions = await parseQuestionsDocument({
        examCode: examCodeRaw,
        answerKey,
        text,
      });
    } else {
      return NextResponse.json(
        { error: "Phần 2 chỉ nhận PDF hoặc DOCX kèm TXT đáp án." },
        { status: 400 },
      );
    }

    const summary = await importQuestions({
      examCode: examCodeRaw,
      questions,
      answerKey,
    });
    return NextResponse.json(summary);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không nạp được câu hỏi phần 2.",
      },
      { status: 500 },
    );
  }
}
