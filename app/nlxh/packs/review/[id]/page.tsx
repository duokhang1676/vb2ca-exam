import { NlxhPackReview } from "@/components/nlxh-pack-review";

export const dynamic = "force-dynamic";

export default async function NlxhPackReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <NlxhPackReview draftId={id} />;
}
