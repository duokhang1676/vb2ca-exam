import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/session";
import { parsePackJson, savePackDraft } from "@/lib/nlxh/packs";

export async function POST(request: Request) {
  const { user, response } = await requireAuthUser();
  if (!user) return response;
  try {
    const body = (await request.json().catch(() => ({}))) as { json?: string };
    if (!body.json?.trim()) {
      return NextResponse.json({ error: "Hãy dán JSON từ chatbot." }, { status: 400 });
    }
    const pack = parsePackJson(body.json);
    const draftId = await savePackDraft(user.id, pack);
    return NextResponse.json({
      draftId,
      itemCount: pack.items.length,
      seedCount: pack.items.reduce((sum, item) => sum + item.seeds.length, 0),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không đọc được JSON gói." },
      { status: 400 },
    );
  }
}
