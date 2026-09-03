import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/session";
import { getEssay, listEssays } from "@/lib/nlxh/store";
import { getSectionPack, pickRandomEssayId } from "@/lib/nlxh/section-store";

export async function GET(request: Request) {
  const { user, response } = await requireAuthUser();
  if (!user) return response;
  const url = new URL(request.url);
  const essayId = url.searchParams.get("essayId") || "";
  const packId = url.searchParams.get("packId") || "";
  try {
    const pack = packId ? await getSectionPack(packId) : null;
    if (pack && !essayId) {
      return NextResponse.json({
        essayId: pack.essayId,
        packId: pack.id,
        prompt: pack.essayPrompt,
        hasPackHints: true,
      });
    }
    const essay = essayId ? await getEssay(essayId) : null;
    if (essay) {
      return NextResponse.json({
        essayId: essay.id,
        packId: pack?.id ?? null,
        prompt: essay.prompt,
        hasPackHints: Boolean(pack),
      });
    }
    const essays = await listEssays();
    const randomId = pickRandomEssayId(essays.map((item) => item.id));
    const random = randomId ? await getEssay(randomId) : null;
    if (!random) {
      return NextResponse.json({ error: "Chưa có đề nghị luận trong ngân hàng." }, { status: 404 });
    }
    return NextResponse.json({
      essayId: random.id,
      packId: null,
      prompt: random.prompt,
      hasPackHints: false,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không tải được đề." },
      { status: 500 },
    );
  }
}
