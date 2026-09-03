import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/session";
import {
  completeFramework,
  loadDailySession,
  loadFreeSession,
  loadGuidedSession,
  parseLevel,
} from "@/lib/nlxh/session";
import { isPracticeMode } from "@/lib/nlxh/types";
import { getEnrollment, saveEnrollment } from "@/lib/nlxh/store";
import { PATH_VERSION } from "@/lib/nlxh/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const { user, response } = await requireAuthUser();
  if (!user) return response;

  try {
    const url = new URL(request.url);
    const mode = url.searchParams.get("mode") ?? "guided";
    const skill = url.searchParams.get("skill");
    if (mode === "daily" && isPracticeMode(skill)) {
      const task = await loadFreeSession({
        userId: user.id,
        essayId: url.searchParams.get("essayId") ?? undefined,
        skill,
        level: parseLevel(url.searchParams.get("level")),
      });
      return NextResponse.json({ task: { ...task, pathMode: "daily" } });
    }
    if (mode === "daily") {
      const tasks = await loadDailySession(user.id);
      return NextResponse.json({ tasks });
    }
    if (mode === "free") {
      const skill = url.searchParams.get("skill");
      if (!isPracticeMode(skill)) {
        return NextResponse.json({ error: "Thiếu kỹ năng luyện tự do." }, { status: 400 });
      }
      const task = await loadFreeSession({
        userId: user.id,
        essayId: url.searchParams.get("essayId") ?? undefined,
        skill,
        level: parseLevel(url.searchParams.get("level")),
      });
      return NextResponse.json({ task });
    }
    const task = await loadGuidedSession(user.id);
    return NextResponse.json({ task });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Không tải được phiên luyện NLXH.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const { user, response } = await requireAuthUser();
  if (!user) return response;
  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
  };
  try {
    if (body.action === "restart") {
      await saveEnrollment({
        userId: user.id,
        pathVersion: PATH_VERSION,
        currentStepId: "m0",
        currentEssayId: (await getEnrollment(user.id))?.currentEssayId ?? null,
        remedialSkill: null,
        remedialReturnStepId: null,
        status: "active",
      });
      const task = await loadGuidedSession(user.id);
      return NextResponse.json({ task });
    }
    if (body.action === "complete_framework") {
      await completeFramework(user.id);
      const task = await loadGuidedSession(user.id);
      return NextResponse.json({ task });
    }
    const task = await loadGuidedSession(user.id);
    return NextResponse.json({ task });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không cập nhật được lộ trình." },
      { status: 500 },
    );
  }
}
