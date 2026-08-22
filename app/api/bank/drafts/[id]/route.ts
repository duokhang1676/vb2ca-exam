import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/session";
import { ContributeError, contributeErrorResponse } from "@/lib/exam/contribute-error";
import { payloadFromUnknown } from "@/lib/exam/draft";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { user, response } = await requireAuthUser();
  if (!user) return response;
  const { id } = await params;

  try {
    const supabase = getSupabaseAdmin();
    const { data: draft, error } = await supabase
      .from("contribution_drafts")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!draft || new Date(draft.expires_at).getTime() < Date.now()) {
      throw new ContributeError(
        "DRAFT_EXPIRED",
        "Bản review đã hết hạn hoặc không tồn tại.",
        "Bản review đã hết hạn",
        ["Quay về trang chủ và nạp lại file.", "Bản trích xuất chỉ giữ 2 giờ."],
      );
    }
    const payload = payloadFromUnknown(draft.payload);
    if (!payload) {
      throw new ContributeError(
        "DRAFT_EXPIRED",
        "Dữ liệu review bị hỏng.",
        "Không đọc được bản review",
        ["Upload lại file từ trang chủ."],
      );
    }
    return NextResponse.json({
      id: draft.id,
      expiresAt: draft.expires_at,
      payload,
    });
  } catch (error) {
    return contributeErrorResponse(error, "Không tải được bản review.");
  }
}
