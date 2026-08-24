import { notFound } from "next/navigation";
import { AutoStartExam } from "@/components/auto-start-exam";
import { isSectionMode } from "@/lib/exam/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function ExamStartPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ section?: string; shuffle?: string }>;
}) {
  const { id } = await params;
  const { section, shuffle } = await searchParams;
  const sectionMode = isSectionMode(section) ? section : "full";
  const shouldShuffle = shuffle !== "0" && shuffle !== "false";
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
    />
  );
}
