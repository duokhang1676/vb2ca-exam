import { notFound } from "next/navigation";
import { AutoStartExam } from "@/components/auto-start-exam";
import { isAttemptMode, isSectionMode } from "@/lib/exam/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function ExamStartPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ section?: string; shuffle?: string; mode?: string }>;
}) {
  const { id } = await params;
  const { section, shuffle, mode } = await searchParams;
  const sectionMode = isSectionMode(section) ? section : "full";
  const shouldShuffle = shuffle !== "0" && shuffle !== "false";
  const attemptMode = isAttemptMode(mode) ? mode : "exam";
  const supabase = getSupabaseAdmin();
  const { data: exam } = await supabase
    .from("exams")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (!exam) notFound();

  return (
    <AutoStartExam
      examId={exam.id}
      sectionMode={sectionMode}
      shuffle={shouldShuffle}
      attemptMode={attemptMode}
    />
  );
}
