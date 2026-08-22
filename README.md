# Ôn thi VB2CA

Demo tạo bài thi Văn bằng 2 Công an từ file đề PDF + đáp án TXT. Gemini đọc đề, thí sinh làm bài 150 phút, hệ thống chấm trắc nghiệm và chấm nghị luận bằng AI (thang 100 = 30 tự luận + 70 trắc nghiệm).

## Stack

- Next.js (App Router) + Tailwind + shadcn/ui
- Supabase (Postgres + Storage)
- Google Gemini 2.5 Flash (Google AI Studio)

## Chạy local

1. Copy `.env.example` thành `.env.local` và điền:
   - `GEMINI_API_KEY` từ [Google AI Studio](https://aistudio.google.com)
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (nên dùng service role; demo vẫn chạy với anon key nếu RLS đã mở)
2. Schema nằm ở `supabase/migrations/001_init.sql` — đã apply trên project `on-thi-vb2ca`.
3. `npm install` rồi `npm run dev`.

## Luồng

1. Upload PDF + TXT, hoặc bấm **Dùng đề mẫu CA1** (`fixtures/de-ca1.pdf`, `fixtures/dapanca1.txt`).
2. Xem trước đề đã parse.
3. Bắt đầu làm bài: đảo thứ tự câu và đáp án, đếm ngược 150 phút, tự lưu 30 giây/lần.
4. Nộp bài: điểm trắc nghiệm + nhận xét AI phần luận.

## Deploy Vercel

Kết nối GitHub repo, thêm các biến môi trường giống `.env.local`. Route parse/chấm đặt `maxDuration = 60`.
