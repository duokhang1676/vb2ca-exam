import { NextResponse } from "next/server";
import { asJson, parseQuestions } from "@/lib/exam/json";
import { createShuffle } from "@/lib/exam/shuffle";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();

  const { data: exam, error } = await supabase
    .from("exams")
    .select("id, questions")
    .eq("id", id)
    .single();

  if (error || !exam) {
    return NextResponse.json({ error: "Không tìm thấy đề thi." }, { status: 404 });
  }

  const questions = parseQuestions(exam.questions);
  const shuffle = createShuffle(questions);

  const { data: attempt, error: insertError } = await supabase
    .from("attempts")
    .insert({
      exam_id: exam.id,
      shuffle: asJson(shuffle),
      answers: asJson({}),
    })
    .select("id")
    .single();

  if (insertError || !attempt) {
    return NextResponse.json(
      { error: insertError?.message || "Không bắt đầu được bài làm." },
      { status: 500 },
    );
  }

  return NextResponse.json({ attemptId: attempt.id });
}
