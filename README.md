# Ôn thi VB2CA

Ngân hàng câu hỏi Văn bằng 2 Công an (CA1/CA4). Người dùng đóng góp nghị luận và trắc nghiệm, hệ thống tạo bài làm ngẫu nhiên hoặc đề minh họa 2026, làm bài 150 phút, chấm thang 100 (30 tự luận + 70 trắc nghiệm).

## Stack

- Next.js (App Router) + Tailwind + shadcn/ui
- Supabase (Postgres + Storage)
- Google Gemini 2.5 Flash (Google AI Studio)

## Chạy local

1. Copy `.env.example` thành `.env.local` và điền:
   - `GEMINI_API_KEY` từ [Google AI Studio](https://aistudio.google.com)
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (nên dùng service role; demo vẫn chạy với anon key nếu RLS đã mở)
2. Schema: `supabase/migrations/001_init.sql` và `002_question_bank.sql` — đã apply trên project `on-thi-vb2ca`.
3. `npm install` rồi `npm run dev`.

## Luồng

1. Chọn mã đề CA1 hoặc CA4, bấm **Tạo bài làm** hoặc **Dùng đề minh họa 2026**.
2. Đóng góp độc lập phần 1 (PDF/DOCX) và phần 2 (PDF/DOCX + TXT). Câu trùng bị loại.
3. Xem ngân hàng tại `/bank`.
4. Làm bài 150 phút, nộp, xem kết quả.

## Deploy Vercel

Kết nối GitHub repo, thêm các biến môi trường giống `.env.local`. Route parse/chấm/generate đặt `maxDuration = 120`.
