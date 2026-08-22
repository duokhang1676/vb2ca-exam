import { ExamTaker } from "@/components/exam-taker";

export const dynamic = "force-dynamic";

export default async function AttemptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ExamTaker attemptId={id} />;
}
