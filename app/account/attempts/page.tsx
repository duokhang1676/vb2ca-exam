import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getAuthUser } from "@/lib/auth/session";
import { sectionModeShortLabel } from "@/lib/exam/constants";
import { isSectionMode } from "@/lib/exam/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function formatWhen(value: string): string {
  return new Date(value).toLocaleString("vi-VN");
}

export default async function AttemptHistoryPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login?next=/account/attempts");

  const supabase = getSupabaseAdmin();
  const { data: rows } = await supabase
    .from("attempts")
    .select("id, started_at, submitted_at, total_score, section_mode, exams(title, exam_code)")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false });

  const attempts = rows ?? [];

  if (attempts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Chưa có bài làm nào. Vào trang chủ để tạo đề CA1 hoặc CA4.
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      {attempts.map((attempt) => {
        const exam = Array.isArray(attempt.exams) ? attempt.exams[0] : attempt.exams;
        const submitted = Boolean(attempt.submitted_at);
        const href = submitted
          ? `/attempts/${attempt.id}/result`
          : `/attempts/${attempt.id}`;
        const sectionMode = isSectionMode(attempt.section_mode)
          ? attempt.section_mode
          : "full";
        return (
          <Link key={attempt.id} href={href}>
            <Card className="transition-colors hover:border-primary">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <p className="font-medium">{exam?.title ?? "Bài thi"}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatWhen(attempt.started_at)}
                    {submitted && attempt.submitted_at
                      ? ` · Nộp ${formatWhen(attempt.submitted_at)}`
                      : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {exam?.exam_code ? (
                    <Badge variant="outline">{exam.exam_code}</Badge>
                  ) : null}
                  <Badge variant="outline">{sectionModeShortLabel(sectionMode)}</Badge>
                  {submitted ? (
                    <Badge variant="secondary">
                      {Number(attempt.total_score ?? 0)} điểm
                    </Badge>
                  ) : (
                    <Badge>Đang làm</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
