import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/session";
import { progressPayload } from "@/lib/nlxh/grade";
import { visibleSteps } from "@/lib/nlxh/curriculum";
import { getAnalysis, listEssays } from "@/lib/nlxh/store";

export async function GET() {
  const { user, response } = await requireAuthUser();
  if (!user) return response;
  try {
    const payload = await progressPayload(user.id);
    const analysis = payload.enrollment?.currentEssayId
      ? await getAnalysis(payload.enrollment.currentEssayId)
      : null;
    const essays = await listEssays();
    return NextResponse.json({
      ...payload,
      essays: essays.map((essay) => ({
        id: essay.id,
        prompt: essay.prompt.slice(0, 160),
      })),
      steps: visibleSteps(analysis).map((step) => ({
        id: step.id,
        title: step.title,
        skill: step.skill,
        level: step.level,
      })),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không tải được tiến độ." },
      { status: 500 },
    );
  }
}
