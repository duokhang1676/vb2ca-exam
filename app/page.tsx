import { ContributePanel } from "@/components/contribute-panel";
import { HomeExamPanel } from "@/components/home-exam-panel";
import { getAuthUser } from "@/lib/auth/session";
import { listSampleExams } from "@/lib/exam/sample";

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
          Đóng góp câu hỏi vào ngân hàng dùng chung, rồi tạo bài làm CA1 hoặc
          CA4. Phần 1 nghị luận xã hội dùng chung; phần 2 lấy ngẫu nhiên theo mã
          đề. 150 phút, thang điểm 100.
        </p>
      </div>
      <HomeExamPanel
        signedIn={signedIn}
        samples={{ CA1: ca1Samples, CA4: ca4Samples }}
      />
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Đóng góp vào ngân hàng</h2>
        <p className="text-sm text-muted-foreground">
          Nạp độc lập phần 1 hoặc phần 2. Hệ thống OCR, bạn review/sửa rồi mới
          đưa vào ngân hàng.
        </p>
        <ContributePanel signedIn={signedIn} />
      </div>
    </div>
  );
}
