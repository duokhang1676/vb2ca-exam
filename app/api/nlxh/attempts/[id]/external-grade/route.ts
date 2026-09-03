import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/session";
import { applyExternalGrade } from "@/lib/nlxh/grade";
import { externalGradeSchema } from "@/lib/nlxh/schemas";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { roundScore } from "@/lib/nlxh/types";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { user, response } = await requireAuthUser();
  if (!user) return response;
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const { data: attempt } = await supabase
    .from("nlxh_practice_attempts")
    .select("id, essay_id, practice_mode, answer")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!attempt) {
    return NextResponse.json({ error: "Không tìm thấy bài luyện." }, { status: 404 });
  }
  const { data: essay } = await supabase
    .from("essays")
    .select("prompt")
    .eq("id", attempt.essay_id)
    .maybeSingle();
  const { data: analysis } = await supabase
    .from("nlxh_question_analyses")
    .select("question_type, core_issue")
    .eq("essay_id", attempt.essay_id)
    .maybeSingle();

  const { externalGradePrompt } = await import("@/lib/nlxh/prompts");
  const { isPracticeMode } = await import("@/lib/nlxh/types");
  if (!isPracticeMode(attempt.practice_mode)) {
    return NextResponse.json({ error: "Kỹ năng không hợp lệ." }, { status: 400 });
  }
  const answer = attempt.answer as { text?: string; items?: string[] };
  const prompt = externalGradePrompt({
    attemptId: attempt.id,
    question: essay?.prompt ?? "",
    analysis: analysis
      ? {
          essayId: attempt.essay_id,
          questionType: (analysis.question_type as "D1_L1") ?? "D1_L1",
          mainTopic: "",
          coreIssue: analysis.core_issue,
          keywords: [],
          frameworkVersion: "framework_v1",
          source: "manual",
        }
      : null,
    mode: attempt.practice_mode,
    answer: answer.text ?? (answer.items ?? []).join("\n"),
  });
  return NextResponse.json({ prompt });
}

export async function POST(request: Request, { params }: Params) {
  const { user, response } = await requireAuthUser();
  if (!user) return response;
  const { id } = await params;
  try {
    const body = (await request.json().catch(() => ({}))) as { json?: string };
    if (!body.json?.trim()) {
      return NextResponse.json({ error: "Hãy dán JSON chấm bài." }, { status: 400 });
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(body.json);
    } catch {
      return NextResponse.json({ error: "JSON không đọc được." }, { status: 400 });
    }
    const grade = externalGradeSchema.parse(parsed);
    if (grade.attemptId !== id) {
      return NextResponse.json({ error: "attemptId không khớp bài đang chấm." }, { status: 400 });
    }
    const score = roundScore(grade.overallScore ?? grade.score ?? 0);
    const result = await applyExternalGrade({
      userId: user.id,
      attemptId: id,
      score,
      rubricScores: grade.scores,
      feedback: {
        summary: score >= 7 ? "Chấm sâu: đạt yêu cầu." : "Chấm sâu: cần viết lại phần yếu.",
        strengths: (grade.strengths ?? []).slice(0, 2),
        weaknesses: (grade.weaknesses ?? grade.priorityFixes ?? []).slice(0, 2),
        suggestedRevision: grade.suggestedRevision,
        missingComponents: grade.missingComponents,
        priorityFixes: grade.priorityFixes,
        nextPractice: grade.nextPractice?.[0],
        scores: grade.scores,
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không nhập được điểm chấm ngoài." },
      { status: 400 },
    );
  }
}
