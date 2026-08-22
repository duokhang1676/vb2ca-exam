import { NextResponse } from "next/server";
import { getOrCreateSampleExam } from "@/lib/exam/sample";
import { isExamCode } from "@/lib/exam/types";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      examCode?: string;
    };
    const examCode = isExamCode(body.examCode) ? body.examCode : "CA1";
    const { examId } = await getOrCreateSampleExam(examCode);
    return NextResponse.json({ examId });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không tạo được đề minh họa 2026.",
      },
      { status: 500 },
    );
  }
}
