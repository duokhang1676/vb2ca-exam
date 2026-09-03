import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/session";
import {
  GUIDE_BUCKET,
  GUIDE_MAX_BYTES,
  guideMime,
  isGuideFile,
  sanitizeGuideName,
} from "@/lib/nlxh/guides";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function mapGuide(row: {
  id: string;
  title: string;
  storage_path: string;
  mime: string;
  original_name: string;
  created_by: string;
  created_at: string;
}) {
  return {
    id: row.id,
    title: row.title,
    storagePath: row.storage_path,
    mime: row.mime,
    originalName: row.original_name,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export async function GET() {
  const { user, response } = await requireAuthUser();
  if (!user) return response;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("nlxh_guides")
    .select("id, title, storage_path, mime, original_name, created_by, created_at")
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({
    guides: (data ?? []).map(mapGuide),
    userId: user.id,
  });
}

export async function POST(request: Request) {
  const { user, response } = await requireAuthUser();
  if (!user) return response;

  const form = await request.formData();
  const file = form.get("file");
  const titleRaw = form.get("title");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Cần chọn file PDF hoặc DOCX." }, { status: 400 });
  }
  if (!isGuideFile(file.name, file.type)) {
    return NextResponse.json(
      { error: "Chỉ nhận tài liệu PDF hoặc DOCX." },
      { status: 400 },
    );
  }
  if (file.size > GUIDE_MAX_BYTES) {
    return NextResponse.json({ error: "File tối đa 15MB." }, { status: 400 });
  }

  const title =
    (typeof titleRaw === "string" ? titleRaw.trim() : "") ||
    file.name.replace(/\.[^.]+$/, "").trim() ||
    "Tài liệu hướng dẫn";
  const mime = guideMime(file.name, file.type);
  const safeName = sanitizeGuideName(file.name) || `guide.${mime.includes("pdf") ? "pdf" : "docx"}`;
  const storagePath = `${user.id}/${crypto.randomUUID()}-${safeName}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const supabase = getSupabaseAdmin();

  const { error: uploadError } = await supabase.storage
    .from(GUIDE_BUCKET)
    .upload(storagePath, bytes, { contentType: mime, upsert: false });
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("nlxh_guides")
    .insert({
      title,
      storage_path: storagePath,
      mime,
      original_name: file.name,
      created_by: user.id,
    })
    .select("id, title, storage_path, mime, original_name, created_by, created_at")
    .single();
  if (error || !data) {
    await supabase.storage.from(GUIDE_BUCKET).remove([storagePath]);
    return NextResponse.json(
      { error: error?.message ?? "Không lưu được tài liệu." },
      { status: 500 },
    );
  }

  return NextResponse.json({ guide: mapGuide(data) });
}
