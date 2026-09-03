import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/session";
import { getEssay } from "@/lib/nlxh/store";
import { isSectionKey, SECTION_KEYS, type SectionKey } from "@/lib/nlxh/section-types";
import { getSectionPack, insertSectionAttempt } from "@/lib/nlxh/section-store";
import { gradeSectionsWithGemini } from "@/lib/nlxh/section-grade";

export async function POST(request: Request) {
  const { user, response } = await requireAuthUser();
  if (!user) return response;
  try {
    const body = (await request.json().catch(() => ({}))) as {
      essayId?: string;
      packId?: string;
      sections?: string[];
      answers?: Record<string, string>;
      hintCounts?: Record<string, number>;
    };
    const sections = (body.sections ?? []).filter(isSectionKey);
    if (sections.length === 0) {
      return NextResponse.json({ error: "Hãy chọn ít nhất một phần." }, { status: 400 });
    }
    const pack = body.packId ? await getSectionPack(body.packId) : null;
    const essay = body.essayId ? await getEssay(body.essayId) : null;
    const essayPrompt = essay?.prompt ?? pack?.essayPrompt ?? "";
    if (!essayPrompt) {
      return NextResponse.json({ error: "Thiếu đề bài." }, { status: 400 });
    }
    const answers = Object.fromEntries(
      SECTION_KEYS.map((key) => [key, String(body.answers?.[key] ?? "").trim()]),
    ) as Record<SectionKey, string>;
    const empty = sections.filter((section) => !answers[section]);
    if (empty.length > 0) {
      return NextResponse.json({ error: "Hãy viết hết các phần đã chọn trước khi nộp." }, { status: 400 });
    }
    const grade = await gradeSectionsWithGemini({
      essayPrompt,
      sections,
      answers,
      userId: user.id,
    });
    if (!grade) {
      return NextResponse.json(
        { error: "Không chấm được bài. Kiểm tra GEMINI_API_KEY hoặc thử lại." },
        { status: 503 },
      );
    }
    const attemptId = await insertSectionAttempt({
      userId: user.id,
      essayId: essay?.id ?? pack?.essayId ?? null,
      essayPrompt,
      sections,
      answers,
      grade,
      hintCounts: body.hintCounts ?? {},
      sectionPackId: pack?.id ?? null,
    });
    return NextResponse.json({ attemptId, ...grade });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không nộp được bài." },
      { status: 500 },
    );
  }
}
