import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/session";
import { parseSectionPackJson, saveSectionPackDraft } from "@/lib/nlxh/section-store";
import { SECTION_KEYS } from "@/lib/nlxh/section-types";

export async function POST(request: Request) {
  const { user, response } = await requireAuthUser();
  if (!user) return response;
  try {
    const body = (await request.json().catch(() => ({}))) as { json?: string };
    if (!body.json?.trim()) {
      return NextResponse.json({ error: "Hãy dán JSON từ chatbot." }, { status: 400 });
    }
    const pack = parseSectionPackJson(body.json);
    const draftId = await saveSectionPackDraft(user.id, pack);
    return NextResponse.json({
      draftId,
      essayPrompt: pack.essayPrompt.slice(0, 240),
      hintCount: SECTION_KEYS.reduce((sum, key) => sum + pack.hints[key].length, 0),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không đọc được JSON gói." },
      { status: 400 },
    );
  }
}
