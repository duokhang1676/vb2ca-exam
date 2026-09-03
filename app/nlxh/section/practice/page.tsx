import { NlxhSectionPractice } from "@/components/nlxh-section-practice";

export const dynamic = "force-dynamic";

export default async function NlxhSectionPracticePage({
  searchParams,
}: {
  searchParams: Promise<{
    sections?: string;
    essayId?: string;
    packId?: string;
  }>;
}) {
  const params = await searchParams;
  return (
    <NlxhSectionPractice
      sections={params.sections}
      essayId={params.essayId}
      packId={params.packId}
    />
  );
}
