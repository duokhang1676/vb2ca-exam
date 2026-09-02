import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/session";
import { asJson, parseQuestions } from "@/lib/exam/json";
import {
  createFlexibleShuffle,
  createIdentityShuffle,
  createShuffle,
} from "@/lib/exam/shuffle";
import { isAttemptMode, isSectionMode, sectionModesForParts } from "@/lib/exam/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { user, response } = await requireAuthUser();
  if (!user) return response;

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    sectionMode?: string;
    shuffle?: boolean;
    showTopic?: boolean;
    attemptMode?: string;
  };
  const sectionMode = isSectionMode(body.sectionMode) ? body.sectionMode : "full";
  const shouldShuffle = body.shuffle !== false;
  const showTopic = Boolean(body.showTopic);
  const attemptMode = isAttemptMode(body.attemptMode) ? body.attemptMode : "exam";
  const supabase = getSupabaseAdmin();

  const { data: exam, error } = await supabase
    .from("exams")
    .select("id, questions, source, essay_prompt")
    .eq("id", id)
    .single();

  if (error || !exam) {
    return NextResponse.json({ error: "Không tìm thấy đề thi." }, { status: 404 });
  }

  const questions = parseQuestions(exam.questions);
  const hasPart1 = Boolean(exam.essay_prompt?.trim());
  const hasPart2 = questions.length > 0;
  if (!sectionModesForParts(hasPart1, hasPart2).includes(sectionMode)) {
    const message = !hasPart1
      ? "Đề này không có phần 1."
      : "Đề này không có phần 2.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  const activeQuestions = sectionMode === "part1" ? [] : questions;
  const shuffle = !shouldShuffle
    ? createIdentityShuffle(activeQuestions)
    : exam.source === "sample"
      ? createFlexibleShuffle(activeQuestions)
      : createShuffle(activeQuestions);

  const { data: attempt, error: insertError } = await supabase
    .from("attempts")
    .insert({
      exam_id: exam.id,
      user_id: user.id,
      shuffle: asJson(shuffle),
      answers: asJson({}),
      flagged: asJson([]),
      essay_flagged: false,
      section_mode: sectionMode,
      show_topic: showTopic,
      attempt_mode: attemptMode,
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
