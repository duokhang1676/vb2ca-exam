import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/session";
import { setQuestionMark } from "@/lib/exam/marks";
import { isExamCode, type MarkKind } from "@/lib/exam/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { user, response } = await requireAuthUser();
  if (!user) return response;

  const body = (await request.json().catch(() => ({}))) as {
    kind?: string;
    fingerprint?: string;
    examCode?: string;
    marked?: boolean;
  };
  const kind: MarkKind | null =
    body.kind === "essay" || body.kind === "question" ? body.kind : null;
  const fingerprint = body.fingerprint?.trim();
  if (!kind || !fingerprint) {
    return NextResponse.json(
      { error: "Thiếu loại hoặc fingerprint câu hỏi." },
      { status: 400 },
    );
  }

  try {
    const result = await setQuestionMark({
      userId: user.id,
      kind,
      fingerprint,
      examCode: isExamCode(body.examCode) ? body.examCode : null,
      marked: Boolean(body.marked),
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Không lưu được đánh dấu.",
      },
      { status: 500 },
    );
  }
}
