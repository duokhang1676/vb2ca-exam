import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/session";
import { submitPractice } from "@/lib/nlxh/grade";
import {
  isPathMode,
  isPracticeLevel,
  isPracticeMode,
  type PracticeAnswer,
} from "@/lib/nlxh/types";
import { attemptAnswerSchema } from "@/lib/nlxh/schemas";
import { getAnalysis, getEssay, getSeed } from "@/lib/nlxh/store";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const { user, response } = await requireAuthUser();
  if (!user) return response;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      essayId?: string;
      practiceMode?: string;
      level?: number;
      pathMode?: string;
      stepId?: string;
      answer?: unknown;
      usedHintCount?: number;
      durationSeconds?: number;
      previousWeaknesses?: string[];
    };

    if (!body.essayId || !isPracticeMode(body.practiceMode)) {
      return NextResponse.json({ error: "Thiếu đề hoặc kỹ năng." }, { status: 400 });
    }
    const level = isPracticeLevel(body.level) ? body.level : 1;
    const pathMode = isPathMode(body.pathMode) ? body.pathMode : "guided";
    const parsedAnswer = attemptAnswerSchema.safeParse(body.answer ?? {});
    if (!parsedAnswer.success) {
      return NextResponse.json({ error: "Bài làm không hợp lệ." }, { status: 400 });
    }

    const essay = await getEssay(body.essayId);
    if (!essay) {
      return NextResponse.json({ error: "Không tìm thấy đề nghị luận." }, { status: 404 });
    }
    const analysis = await getAnalysis(essay.id);
    const seed = await getSeed({
      essayId: essay.id,
      mode: body.practiceMode,
      level,
    });

    const result = await submitPractice({
      userId: user.id,
      essayId: essay.id,
      prompt: essay.prompt,
      mode: body.practiceMode,
      level,
      pathMode,
      stepId: body.stepId ?? "",
      answer: parsedAnswer.data as PracticeAnswer,
      analysis,
      seed: seed?.data ?? null,
      seedId: seed?.id,
      usedHintCount: Number(body.usedHintCount) || 0,
      durationSeconds: body.durationSeconds,
      previousWeaknesses: body.previousWeaknesses,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không nộp được bài luyện." },
      { status: 500 },
    );
  }
}
