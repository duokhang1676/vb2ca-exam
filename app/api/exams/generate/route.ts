import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/session";
import { assembleRandomExam } from "@/lib/exam/assemble";
import { ensureBankReady } from "@/lib/exam/sample";
import { isExamCode, isSectionMode } from "@/lib/exam/types";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  const { user, response } = await requireAuthUser();
  if (!user) return response;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      examCode?: string;
      sectionMode?: string;
      essayId?: string;
    };
    const examCode = isExamCode(body.examCode) ? body.examCode : "CA1";
    const sectionMode = isSectionMode(body.sectionMode) ? body.sectionMode : "full";
    const essayId =
      sectionMode === "part1" && typeof body.essayId === "string" && body.essayId
        ? body.essayId
        : undefined;
    await ensureBankReady(examCode);
    const exam = await assembleRandomExam(examCode, sectionMode, essayId);
    return NextResponse.json({ examId: exam.id, sectionMode });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không tạo được bài làm từ ngân hàng.",
      },
      { status: 500 },
    );
  }
}
