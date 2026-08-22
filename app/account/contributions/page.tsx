import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getAuthUser } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function sectionLabel(kind: string, examCode: string | null): string {
  if (kind === "essay") return "Phần 1 · Nghị luận";
  return `Phần 2 · ${examCode ?? ""}`.trim();
}

export default async function ContributionHistoryPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login?next=/account/contributions");

  const supabase = getSupabaseAdmin();
  const { data: rows } = await supabase
    .from("contributions")
    .select(
      "id, kind, exam_code, source_filename, answer_filename, added_count, skipped_count, created_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const contributions = rows ?? [];

  if (contributions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Chưa có lần đóng góp nào. Nạp đề hoặc câu hỏi từ trang chủ, review rồi xác nhận.
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      {contributions.map((item) => (
        <Card key={item.id}>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div>
              <p className="font-medium">{item.source_filename ?? "File đóng góp"}</p>
              <p className="text-sm text-muted-foreground">
                {item.answer_filename ? `Đáp án: ${item.answer_filename} · ` : ""}
                {new Date(item.created_at).toLocaleString("vi-VN")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{sectionLabel(item.kind, item.exam_code)}</Badge>
              <Badge variant="secondary">+{item.added_count} câu</Badge>
              {item.skipped_count > 0 ? (
                <Badge variant="outline">Bỏ trùng {item.skipped_count}</Badge>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
