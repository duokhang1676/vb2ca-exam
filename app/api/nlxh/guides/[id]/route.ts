import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/session";
import { GUIDE_BUCKET } from "@/lib/nlxh/guides";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const { user, response } = await requireAuthUser();
  if (!user) return response;
  const { id } = await params;
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("nlxh_guides")
    .select("id, storage_path, created_by")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Không tìm thấy tài liệu." }, { status: 404 });
  }
  if (data.created_by !== user.id) {
    return NextResponse.json(
      { error: "Chỉ xóa được tài liệu bạn đã tải lên." },
      { status: 403 },
    );
  }

  const { error: deleteError } = await supabase.from("nlxh_guides").delete().eq("id", id);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }
  await supabase.storage.from(GUIDE_BUCKET).remove([data.storage_path]);
  return NextResponse.json({ ok: true });
}
