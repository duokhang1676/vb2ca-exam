import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/session";
import { isSectionKey } from "@/lib/nlxh/section-types";
import { getSectionHistory } from "@/lib/nlxh/section-store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ section: string }> },
) {
  const { user, response } = await requireAuthUser();
  if (!user) return response;
  const { section } = await context.params;
  if (!isSectionKey(section)) {
    return NextResponse.json({ error: "Phần luyện tập không hợp lệ." }, { status: 400 });
  }
  try {
    const items = await getSectionHistory(user.id, section);
    return NextResponse.json({ items });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không tải được lịch sử." },
      { status: 500 },
    );
  }
}
