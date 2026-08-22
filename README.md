# Ôn thi VB2CA

Ngân hàng câu hỏi Văn bằng 2 Công an (CA1/CA4). Người dùng đăng nhập, đóng góp nghị luận và trắc nghiệm (review OCR trước khi nạp), tạo bài làm ngẫu nhiên hoặc đề minh họa 2026, làm bài 150 phút, chấm thang 100 (30 tự luận + 70 trắc nghiệm).

## Stack

- Next.js (App Router) + Tailwind + shadcn/ui
- Supabase (Postgres + Auth + Storage)
- Google Gemini 2.5 Flash (Google AI Studio)

## Chạy local

1. Copy `.env.example` thành `.env.local` và điền:
   - `GEMINI_API_KEY` từ [Google AI Studio](https://aistudio.google.com)
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
2. Schema: chạy các file trong `supabase/migrations/` trên project `on-thi-vb2ca`, gồm `004_auth_and_contributions.sql`.
3. Trên Supabase Dashboard: bật Auth provider **Email**. Có thể tắt *Confirm email* để đăng ký xong vào luôn; nếu bật confirm thì callback là `/auth/callback`.
4. `npm install` rồi `npm run dev`.

## Luồng

1. Đăng ký / đăng nhập.
2. Chọn mã đề CA1 hoặc CA4, bấm **Tạo bài làm** hoặc **Dùng đề minh họa 2026**.
3. Đóng góp phần 1 (PDF/DOCX) hoặc phần 2 (PDF/DOCX + TXT): hệ thống OCR, bạn review/sửa/bỏ câu, rồi xác nhận nạp.
4. Xem ngân hàng tại `/bank`. Hồ sơ, lịch sử thi và lịch sử đóng góp tại `/account`.
5. Làm bài 150 phút, nộp, xem kết quả.

## Deploy Vercel

Kết nối GitHub repo, thêm các biến môi trường giống `.env.local`. Route parse/chấm/generate đặt `maxDuration = 120`.
