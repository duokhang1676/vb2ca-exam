import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/session";
import { listEssays } from "@/lib/nlxh/store";
import { sectionPackExportPrompt } from "@/lib/nlxh/section-grade";

export async function POST() {
  const { user, response } = await requireAuthUser();
  if (!user) return response;
  try {
    const essays = await listEssays();
    const selected = essays.slice(0, 5);
    return NextResponse.json({
      prompt: sectionPackExportPrompt(
        selected.map((essay) => ({
          fingerprint: essay.fingerprint,
          prompt: essay.prompt,
        })),
      ),
      essays: selected.map((essay) => ({
        id: essay.id,
        fingerprint: essay.fingerprint,
        prompt: essay.prompt.slice(0, 180),
      })),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không tạo được prompt gói." },
      { status: 500 },
    );
  }
}
