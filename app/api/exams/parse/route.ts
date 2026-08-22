import { NextResponse } from "next/server";
import { parseAnswerKey } from "@/lib/exam/parse-answers";
import { parseExamPdf } from "@/lib/exam/parse-pdf";
import { persistExam } from "@/lib/exam/persist-exam";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const pdf = form.get("pdf");
    const answers = form.get("answers");

    if (!(pdf instanceof File) || !(answers instanceof File)) {
      return NextResponse.json(
        { error: "Cần upload cả file đề PDF và file đáp án TXT." },
        { status: 400 },
      );
    }

    if (!pdf.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "File đề phải là PDF." }, { status: 400 });
    }

    const pdfBytes = new Uint8Array(await pdf.arrayBuffer());
    const answerText = await answers.text();
    const answerKey = parseAnswerKey(answerText);
    const parsed = await parseExamPdf(pdfBytes, answerKey);

    const exam = await persistExam({
      title: parsed.title,
      essayPrompt: parsed.essayPrompt,
      questions: parsed.questions,
      answerKey,
      pdf: { bytes: Buffer.from(pdfBytes), filename: pdf.name },
      answerFile: {
        bytes: Buffer.from(answerText, "utf8"),
        filename: answers.name,
      },
    });

    return NextResponse.json({ examId: exam.id });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không phân tích được đề thi. Thử lại hoặc dùng đề mẫu.",
      },
      { status: 500 },
    );
  }
}
