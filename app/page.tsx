import { ContributePanel } from "@/components/contribute-panel";
import { HomeExamPanel } from "@/components/home-exam-panel";
import { Button } from "@/components/ui/button";
import { getAuthUser } from "@/lib/auth/session";
import { listSampleExams } from "@/lib/exam/sample";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getAuthUser();
  const signedIn = Boolean(user);
  const [ca1Samples, ca4Samples] = await Promise.all([
    listSampleExams("CA1"),
    listSampleExams("CA4"),
  ]);

  return (
    <div className="mx-auto grid max-w-3xl gap-8">
      <div className="space-y-3 text-center">
        <p className="text-sm font-medium text-primary">Kỳ thi Văn bằng 2 Công an</p>
        <h1 className="text-3xl font-semibold tracking-tight">Ôn thi VB2CA</h1>
        <p className="text-muted-foreground">
          Đóng góp đề minh họa JSON vào ngân hàng dùng chung, rồi tạo bài làm CA1
          hoặc CA4. Có thể làm toàn bộ, chỉ phần 1 hoặc chỉ phần 2 — theo chế độ
          thi thử (có giờ) hoặc luyện tập (không giới hạn thời gian, hiện đáp án
          ngay). Phần 1 nghị luận xã hội dùng chung; phần 2 lấy ngẫu nhiên theo
          mã đề.
        </p>
      </div>
      {signedIn ? (
        <div className="rounded-xl border bg-card p-4 text-sm">
          <p className="font-medium">Luyện nghị luận xã hội theo từng kỹ năng</p>
          <p className="mt-1 text-muted-foreground">
            Hệ thống chỉ định từng học phần: nhận diện đề, mở bài, luận điểm… rồi mới
            viết bài hoàn chỉnh.
          </p>
          <Button className="mt-3" asChild>
            <Link href="/nlxh">Vào lộ trình NLXH</Link>
          </Button>
        </div>
      ) : null}
      <HomeExamPanel
        signedIn={signedIn}
        samples={{ CA1: ca1Samples, CA4: ca4Samples }}
      />
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Đóng góp đề minh họa</h2>
        <p className="text-sm text-muted-foreground">
          Upload file JSON đề CA1 hoặc CA4. Hệ thống lưu đề minh họa và nạp câu
          hỏi vào ngân hàng.
        </p>
        <ContributePanel signedIn={signedIn} />
      </div>
    </div>
  );
}
