import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/session";
import { getSectionAttempt } from "@/lib/nlxh/section-store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireAuthUser();
  if (!user) return response;
  const { id } = await context.params;
  try {
    const attempt = await getSectionAttempt(user.id, id);
    if (!attempt) {
      return NextResponse.json({ error: "Không tìm thấy bài làm." }, { status: 404 });
    }
    return NextResponse.json({ attempt });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không tải được bài làm." },
      { status: 500 },
    );
  }
}
