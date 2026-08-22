import { NextResponse } from "next/server";
import { asJson, parseAnswers } from "@/lib/exam/json";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const body = (await request.json()) as {
    essayText?: string;
    answers?: Record<string, string>;
  };

  const supabase = getSupabaseAdmin();
  const { data: attempt, error } = await supabase
    .from("attempts")
    .select("id, submitted_at, answers, essay_text")
    .eq("id", id)
    .single();

  if (error || !attempt) {
    return NextResponse.json({ error: "Không tìm thấy bài làm." }, { status: 404 });
  }

  if (attempt.submitted_at) {
    return NextResponse.json({ error: "Bài đã nộp, không lưu thêm được." }, { status: 409 });
  }

  const current = parseAnswers(attempt.answers);
  const { error: updateError } = await supabase
    .from("attempts")
    .update({
      essay_text: body.essayText ?? attempt.essay_text,
      answers: asJson({ ...current, ...(body.answers ?? {}) }),
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
