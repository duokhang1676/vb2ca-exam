import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/session";
import { getPackDraft } from "@/lib/nlxh/packs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { user, response } = await requireAuthUser();
  if (!user) return response;
  const { id } = await params;
  try {
    const draft = await getPackDraft(user.id, id);
    return NextResponse.json({
      id: draft.id,
      items: draft.pack.items.map((item) => ({
        essayFingerprint: item.essayFingerprint,
        questionType: item.analysis.questionType,
        coreIssue: item.analysis.coreIssue,
        seedCount: item.seeds.length,
        hasReference: Boolean(item.referenceEssay),
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không tải được bản xem trước." },
      { status: 400 },
    );
  }
}
