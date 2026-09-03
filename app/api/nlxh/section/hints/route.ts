import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/session";
import { getEssay } from "@/lib/nlxh/store";
import {
  isSectionKey,
  MAX_HINTS_PER_SECTION,
} from "@/lib/nlxh/section-types";
import { getSectionPack } from "@/lib/nlxh/section-store";
import { generateSectionHintWithGemini } from "@/lib/nlxh/section-grade";

export async function POST(request: Request) {
  const { user, response } = await requireAuthUser();
  if (!user) return response;
  try {
    const body = (await request.json().catch(() => ({}))) as {
      essayId?: string;
      section?: string;
      hintIndex?: number;
      currentAnswer?: string;
      packId?: string;
    };
    if (!isSectionKey(body.section)) {
      return NextResponse.json({ error: "Thiếu phần cần gợi ý." }, { status: 400 });
    }
    const hintIndex = Math.max(0, Math.min(MAX_HINTS_PER_SECTION - 1, Number(body.hintIndex) || 0));
    const pack = body.packId ? await getSectionPack(body.packId) : null;
    if (pack) {
      const stored = pack.hints[body.section][hintIndex];
      return NextResponse.json({ hint: stored, cached: true });
    }
    const essay = body.essayId ? await getEssay(body.essayId) : null;
    const essayPrompt = essay?.prompt ?? "";
    if (!essayPrompt) {
      return NextResponse.json({ error: "Thiếu đề bài để tạo gợi ý." }, { status: 400 });
    }
    const hint = await generateSectionHintWithGemini({
      essayPrompt,
      section: body.section,
      hintIndex,
      currentAnswer: body.currentAnswer,
      userId: user.id,
    });
    if (!hint) {
      return NextResponse.json(
        { error: "Không tạo được gợi ý. Kiểm tra GEMINI_API_KEY hoặc thử lại." },
        { status: 503 },
      );
    }
    return NextResponse.json({ hint, cached: false });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không tạo được gợi ý." },
      { status: 500 },
    );
  }
}
