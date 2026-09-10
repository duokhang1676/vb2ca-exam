import { NextResponse } from "next/server";
import { requireOwnedAttempt } from "@/lib/auth/attempt";
import { buildAttemptPayload } from "@/lib/exam/attempt-payload";
import { asJson, parseAnswers, parseFlagged } from "@/lib/exam/json";
import { isSequentialFull, resolvePhase } from "@/lib/exam/phase";
import { isSectionMode } from "@/lib/exam/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const { user, attempt, response } = await requireOwnedAttempt(id);
  if (!attempt || !user) return response;

  const body = (await request.json().catch(() => ({}))) as {
    essayText?: string;
    flagged?: number[];
    essayFlagged?: boolean;
  };

  if (attempt.submitted_at) {
    return NextResponse.json(
      { error: "Bài đã nộp, không chuyển phần được." },
      { status: 409 },
    );
  }

  const sectionMode = isSectionMode(attempt.section_mode)
    ? attempt.section_mode
    : "full";
  const phase = resolvePhase({
    sectionMode,
    currentPhase: attempt.current_phase,
  });

  if (!isSequentialFull(sectionMode)) {
    return NextResponse.json(
      { error: "Bài làm này không có hai phần tuần tự." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();
  let nextAttempt = attempt;

  if (phase === "part1") {
    const { data: updated, error: updateError } = await supabase
      .from("attempts")
      .update({
        essay_text: body.essayText ?? attempt.essay_text,
        answers: asJson(parseAnswers(attempt.answers)),
        flagged: asJson(body.flagged ?? parseFlagged(attempt.flagged)),
        essay_flagged:
          typeof body.essayFlagged === "boolean"
            ? body.essayFlagged
            : Boolean(attempt.essay_flagged),
        current_phase: "part2",
        part2_started_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("current_phase", "part1")
      .select("*")
      .maybeSingle();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (updated) {
      nextAttempt = updated;
    } else {
      const { data: current } = await supabase
        .from("attempts")
        .select("*")
        .eq("id", id)
        .single();
      if (current) nextAttempt = current;
    }
  }

  const result = await buildAttemptPayload(nextAttempt, user.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.payload);
}
