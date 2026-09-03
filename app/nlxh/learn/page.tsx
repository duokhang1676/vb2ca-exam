import { NlxhLearn } from "@/components/nlxh-learn";

export const dynamic = "force-dynamic";

export default async function NlxhLearnPage({
  searchParams,
}: {
  searchParams: Promise<{
    mode?: string;
    skill?: string;
    essayId?: string;
    level?: string;
  }>;
}) {
  const params = await searchParams;
  const mode =
    params.mode === "free" || params.mode === "daily" ? params.mode : "guided";
  return (
    <NlxhLearn
      mode={mode}
      skill={params.skill}
      essayId={params.essayId}
      level={params.level}
    />
  );
}
