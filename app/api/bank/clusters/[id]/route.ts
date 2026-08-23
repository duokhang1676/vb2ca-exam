import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/session";
import { updateClusterPassage } from "@/lib/exam/bank";
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
    const body = (await request.json().catch(() => ({}))) as {
      passage?: unknown;
    };
    if (typeof body.passage !== "string") {
      throw new ContributeError(
        "INVALID_CONTENT",
        "Thiếu đoạn thông tin / tình huống.",
        "Nội dung chưa hợp lệ",
        ["Nhập đoạn dùng chung rồi bấm Lưu."],
      );
    }
    const cluster = await updateClusterPassage(id, body.passage);
    return NextResponse.json(cluster);
  } catch (error) {
    return contributeErrorResponse(error, "Không lưu được cụm câu hỏi.");
  }
}
