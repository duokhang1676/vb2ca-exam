import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/session";
import {
  getExistingSampleExam,
  getOrCreateSampleExam,
  listSampleExams,
} from "@/lib/exam/sample";
import { isExamCode } from "@/lib/exam/types";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(request: Request) {
  const { user, response } = await requireAuthUser();
  if (!user) return response;

  try {
    const examCodeParam = new URL(request.url).searchParams.get("examCode");
    const examCode = isExamCode(examCodeParam) ? examCodeParam : "CA1";
    const samples = await listSampleExams(examCode);
    return NextResponse.json({ samples });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không tải được danh sách đề minh họa.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const { user, response } = await requireAuthUser();
  if (!user) return response;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      examCode?: string;
      examId?: string;
    };
    const examCode = isExamCode(body.examCode) ? body.examCode : "CA1";
    const examId = body.examId?.trim();

    if (examId && examId !== "official") {
      const existing = await getExistingSampleExam(examCode, examId);
      return NextResponse.json({ examId: existing.examId });
    }

    const created = await getOrCreateSampleExam(examCode);
    return NextResponse.json({ examId: created.examId });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không tạo được đề minh họa.",
      },
      { status: 500 },
    );
  }
}
