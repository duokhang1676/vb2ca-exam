import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 2 * 1024 * 1024;

function extensionFor(type: string): string {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  return "jpg";
}

function inferImageType(file: File): string | null {
  const type = file.type === "image/jpg" ? "image/jpeg" : file.type;
  if (ALLOWED_TYPES.has(type)) return type;
  const name = file.name.toLowerCase();
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".gif")) return "image/gif";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  return null;
}

export async function POST(request: Request) {
  const { user, response } = await requireAuthUser();
  if (!user) return response;

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Cần chọn một file ảnh." }, { status: 400 });
  }
  const contentType = inferImageType(file);
  if (!contentType) {
    return NextResponse.json(
      { error: "Chỉ nhận ảnh JPG, PNG, WEBP hoặc GIF." },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Ảnh đại diện tối đa 2MB." }, { status: 400 });
  }

  const path = `${user.id}/avatar-${Date.now()}.${extensionFor(contentType)}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const supabase = getSupabaseAdmin();

  const { data: existing } = await supabase
    .from("profiles")
    .select("avatar_path, display_name")
    .eq("id", user.id)
    .maybeSingle();

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, bytes, { contentType, upsert: true, cacheControl: "3600" });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const updatedAt = new Date().toISOString();
  if (existing) {
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_path: path, updated_at: updatedAt })
      .eq("id", user.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    const { error } = await supabase.from("profiles").insert({
      id: user.id,
      display_name: user.user_metadata?.display_name || user.email || "Tài khoản",
      avatar_path: path,
      updated_at: updatedAt,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  if (existing?.avatar_path && existing.avatar_path !== path) {
    await supabase.storage.from("avatars").remove([existing.avatar_path]);
  }

  return NextResponse.json({ ok: true, path });
}
