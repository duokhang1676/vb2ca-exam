import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/session";
import { buildPackPrompt } from "@/lib/nlxh/packs";

export async function POST(request: Request) {
  const { user, response } = await requireAuthUser();
  if (!user) return response;
  try {
    const body = (await request.json().catch(() => ({}))) as { essayIds?: string[] };
    const pack = await buildPackPrompt(body.essayIds);
    return NextResponse.json(pack);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không tạo được prompt gói." },
      { status: 500 },
    );
  }
}
