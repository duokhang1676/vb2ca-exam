import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/session";
import { updateEssay } from "@/lib/exam/bank";
import {
  ContributeError,
  contributeErrorResponse,
} from "@/lib/exam/contribute-error";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { user, response } = await requireAuthUser();
  if (!user) return response;
  const { id } = await params;

  try {
    const body = (await request.json().catch(() => ({}))) as { prompt?: unknown };
    if (typeof body.prompt !== "string") {
      throw new ContributeError(
        "INVALID_CONTENT",
        "Thiếu nội dung đề nghị luận.",
        "Nội dung chưa hợp lệ",
        ["Nhập đề bài rồi bấm Lưu."],
      );
    }
    const essay = await updateEssay(id, body.prompt);
    return NextResponse.json(essay);
  } catch (error) {
    return contributeErrorResponse(error, "Không lưu được đề nghị luận.");
  }
}
