import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { commitSectionPack, getSectionPackDraft } from "@/lib/nlxh/section-store";

export async function POST(request: Request) {
  const { user, response } = await requireAuthUser();
  if (!user) return response;
  try {
    const body = (await request.json().catch(() => ({}))) as { draftId?: string };
    if (!body.draftId) {
      return NextResponse.json({ error: "Thiếu bản xem trước." }, { status: 400 });
    }
    const draft = await getSectionPackDraft(user.id, body.draftId);
    const summary = await commitSectionPack(user.id, draft.pack);
    await getSupabaseAdmin().from("nlxh_section_pack_drafts").delete().eq("id", draft.id);
    return NextResponse.json(summary);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không nạp được gói dữ liệu." },
      { status: 400 },
    );
  }
}
