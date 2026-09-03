import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/session";
import { listEssays } from "@/lib/nlxh/store";
import { getSectionStats, listSectionPacks } from "@/lib/nlxh/section-store";

export async function GET() {
  const { user, response } = await requireAuthUser();
  if (!user) return response;
  try {
    const [stats, essays, packs] = await Promise.all([
      getSectionStats(user.id),
      listEssays(),
      listSectionPacks(),
    ]);
    return NextResponse.json({
      stats,
      essays: essays.map((essay) => ({
        id: essay.id,
        title: essay.title,
        prompt: essay.prompt.slice(0, 180),
      })),
      packs,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không tải được thống kê." },
      { status: 500 },
    );
  }
}
