import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/session";
import { asJson } from "@/lib/exam/json";
import { generatePracticeInsight } from "@/lib/exam/practice-insights";
import { loadPracticeReview } from "@/lib/exam/practice-stats";
import { practiceInsightSchema, type PracticeInsight } from "@/lib/exam/schema";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 30;

function parseCachedInsight(value: unknown): PracticeInsight | null {
  const parsed = practiceInsightSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export async function POST() {
  const { user, response } = await requireAuthUser();
  if (!user) return response;

  try {
    const review = await loadPracticeReview(user.id);
    if (review.summary.submitted === 0) {
      return NextResponse.json(
        { error: "Chưa có bài đã nộp để đánh giá." },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();
    const { data: profile, error: loadError } = await supabase
      .from("profiles")
      .select("practice_insight, practice_insight_hash")
      .eq("id", user.id)
      .maybeSingle();
    if (loadError) throw new Error(loadError.message);

    const cached = parseCachedInsight(profile?.practice_insight);
    if (cached && profile?.practice_insight_hash === review.payloadHash) {
      return NextResponse.json({
        insight: cached,
        unchanged: true,
      });
    }

    const insight = await generatePracticeInsight(review.payload);
    const { error: saveError } = await supabase
      .from("profiles")
      .update({
        practice_insight: asJson(insight),
        practice_insight_at: new Date().toISOString(),
        practice_insight_hash: review.payloadHash,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
    if (saveError) throw new Error(saveError.message);

    return NextResponse.json({ insight, unchanged: false });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không tạo được nhận xét luyện tập.",
      },
      { status: 500 },
    );
  }
}
