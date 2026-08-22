import { ContributeReview } from "@/components/contribute-review";

export const dynamic = "force-dynamic";

export default async function ContributeReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-3xl">
      <ContributeReview draftId={id} />
    </div>
  );
}
