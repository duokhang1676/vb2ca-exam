import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/session";
import { listSectionPacks } from "@/lib/nlxh/section-store";

export async function GET() {
  const { user, response } = await requireAuthUser();
  if (!user) return response;
  try {
    const packs = await listSectionPacks();
    return NextResponse.json({ packs });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không tải được danh sách đề." },
      { status: 500 },
    );
  }
}
