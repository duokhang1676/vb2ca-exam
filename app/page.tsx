import { ContributePanel } from "@/components/contribute-panel";
import { HomeExamPanel } from "@/components/home-exam-panel";

export default function HomePage() {
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
      <HomeExamPanel />
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Đóng góp vào ngân hàng</h2>
        <p className="text-sm text-muted-foreground">
          Có thể nạp độc lập phần 1 hoặc phần 2. Hệ thống gán id, loại câu trùng,
          chỉ giữ câu mới.
        </p>
        <ContributePanel />
      </div>
    </div>
  );
}
