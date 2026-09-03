import { PracticeReview } from "@/components/practice-review";
import { getAuthUser } from "@/lib/auth/session";
import { loadPracticeReview } from "@/lib/exam/practice-stats";
import { practiceInsightSchema, type PracticeInsight } from "@/lib/exam/schema";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function parseCachedInsight(value: unknown): PracticeInsight | null {
  const parsed = practiceInsightSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export default async function AccountReviewPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login?next=/account/review");

  const supabase = getSupabaseAdmin();
  const [review, profileResult] = await Promise.all([
    loadPracticeReview(user.id),
    supabase
      .from("profiles")
      .select("practice_insight, practice_insight_at")
      .eq("id", user.id)
      .maybeSingle(),
  ]);
  if (profileResult.error) throw new Error(profileResult.error.message);

  return (
    <PracticeReview
      summary={review.summary}
      markedEssays={review.markedEssays}
      markedQuestions={review.markedQuestions}
      wrongQuestions={review.wrongQuestions}
      initialInsight={parseCachedInsight(profileResult.data?.practice_insight)}
      insightAt={profileResult.data?.practice_insight_at ?? null}
    />
  );
}
