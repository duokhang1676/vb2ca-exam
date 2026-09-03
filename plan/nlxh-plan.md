# NLXH Training Plan — `nlxh-plan.md`

## 1. Mục tiêu

Xây dựng hệ thống luyện **Nghị luận xã hội — Phần 1** theo phương châm:

> **Luyện từng phần nhỏ → thành thạo từng kỹ năng → ghép các phần → lập dàn ý → viết bài hoàn chỉnh → thi thử.**

Ứng dụng hiện có:

- Danh sách đề NLXH.
- Gemini API đã được tích hợp trong hệ thống.
- Chưa có dữ liệu chi tiết cho từng dạng luyện tập.
- Đang sử dụng Gemini Free Tier nên cần tối ưu số lần gọi API và số token.

Hệ thống mới cần giúp người học:

1. Nhận diện đúng dạng đề.
2. Xác định vấn đề nghị luận.
3. Biết xây dựng mở bài.
4. Biết giải thích vấn đề.
5. Biết xây dựng luận điểm.
6. Biết phân tích nguyên nhân.
7. Biết phân tích ý nghĩa / hậu quả.
8. Biết sử dụng dẫn chứng.
9. Biết phản biện, mở rộng.
10. Biết đề xuất giải pháp.
11. Biết viết kết bài.
12. Biết lập dàn ý hoàn chỉnh.
13. Ghép các thành phần thành bài NLXH tối thiểu 500 chữ.
14. Luyện viết bài hoàn chỉnh trong điều kiện gần giống thi thật.

Gemini đóng vai trò:

- Tạo dữ liệu luyện tập khi dữ liệu chưa tồn tại.
- Tạo gợi ý theo từng bước.
- Đánh giá bài làm.
- Chỉ ra lỗi.
- Đề xuất cách sửa.
- Sinh dữ liệu chuẩn để tái sử dụng cho những lần luyện sau.

Gemini **không nên được gọi lại nếu cùng một đề + cùng một dạng luyện tập đã có dữ liệu phù hợp trong database/cache**.

---

# 2. Nguyên tắc sản phẩm

## 2.1. Không bắt đầu bằng viết cả bài

Người học không nên chỉ có luồng:

> Chọn đề → viết 500+ chữ → Gemini chấm.

Thay vào đó phải có:

> Chọn đề → luyện từng kỹ năng → luyện từng đoạn → lập dàn ý → ghép bài → viết bài hoàn chỉnh.

---

## 2.2. Một đề có thể được luyện nhiều lần theo nhiều kỹ năng

Ví dụ một đề về:

> “Trách nhiệm của người trẻ đối với cộng đồng.”

Có thể dùng để luyện:

- Nhận diện đề.
- Xác định vấn đề.
- Mở bài.
- Giải thích khái niệm.
- Xây luận điểm.
- Phân tích ý nghĩa.
- Dẫn chứng.
- Phản biện.
- Giải pháp.
- Kết bài.
- Lập dàn ý.
- Viết từng đoạn.
- Viết bài hoàn chỉnh.

---

## 2.3. Gemini chỉ sinh dữ liệu nền một lần khi có thể

Khái niệm chính:

```text
ExerciseSeed
```

Mỗi tổ hợp:

```text
questionId + practiceMode + frameworkVersion
```

có một bộ dữ liệu luyện tập nền.

Ví dụ:

```text
question_102
+
counter_argument
+
framework_v1
```

Nếu chưa có:

```text
Gemini → generate → validate → save database
```

Nếu đã có:

```text
database → reuse
```

Gemini chỉ cần gọi lại khi:

- Người học yêu cầu gợi ý cá nhân hóa.
- Cần chấm nội dung tự do.
- Cần sửa bài.
- Dữ liệu cũ lỗi.
- Framework được nâng version.
- Admin yêu cầu regenerate.

---

# 3. Các nhóm đề NLXH cần hỗ trợ

## 3.1. Dạng 1 — Nghị luận về tư tưởng, đạo lý

### D1-L1 — Phẩm chất / tư tưởng / lối sống tích cực

Ví dụ:

- Trách nhiệm.
- Bản lĩnh.
- Trung thực.
- Kỷ luật.
- Nhân ái.
- Khát vọng.
- Cống hiến.

Khung chính:

```text
Giải thích
→ Biểu hiện
→ Vai trò / ý nghĩa
→ Dẫn chứng
→ Phản đề
→ Bài học / giải pháp
```

---

### D1-L2 — Tư tưởng / lối sống tiêu cực

Ví dụ:

- Ích kỷ.
- Vô cảm.
- Thực dụng.
- Đổ lỗi.
- Ngại khó.
- Chạy theo danh vọng.
- Tiêu dùng phô trương.

Khung chính:

```text
Giải thích
→ Biểu hiện / thực trạng
→ Nguyên nhân
→ Hậu quả
→ Phê phán / phản biện
→ Giải pháp
→ Bài học cá nhân
```

---

### D1-L3 — Ý kiến / câu nói / quan niệm sống

Khung chính:

```text
Giải nghĩa từ khóa
→ Giải nghĩa toàn bộ nhận định
→ Xác định thông điệp
→ Phân tích tính đúng đắn
→ Dẫn chứng
→ Phản biện / giới hạn
→ Bài học nhận thức và hành động
```

---

# 4. Dạng 2 — Nghị luận về hiện tượng đời sống

## D2-L1 — Hiện tượng tiêu cực

Khung:

```text
Nêu hiện tượng
→ Thực trạng / biểu hiện
→ Nguyên nhân
→ Hậu quả
→ Phản biện
→ Giải pháp
→ Trách nhiệm cá nhân
```

---

## D2-L2 — Hiện tượng tích cực

Khung:

```text
Nêu hiện tượng
→ Biểu hiện
→ Nguyên nhân hình thành
→ Ý nghĩa / giá trị
→ Dẫn chứng
→ Mở rộng / cảnh báo hình thức hóa
→ Giải pháp nhân rộng
→ Trách nhiệm cá nhân
```

---

# 5. Bộ khung bài NLXH dùng chung

Ứng dụng cần có một `EssayFramework` dùng chung cho tất cả dạng đề.

Khung này là trục chính để người học luyện từng phần.

## 5.1. Khung tổng quát

```text
1. MỞ BÀI
   - Dẫn vào vấn đề.
   - Xác định vấn đề nghị luận.
   - Nêu quan điểm ban đầu.

2. GIẢI THÍCH
   - Giải thích từ khóa.
   - Giải thích nội dung vấn đề / thông điệp.

3. PHÂN TÍCH
   - Biểu hiện / thực trạng.
   - Nguyên nhân hoặc cơ sở hình thành.
   - Vai trò / ý nghĩa hoặc hậu quả.
   - Mối liên hệ cá nhân — cộng đồng — xã hội.

4. DẪN CHỨNG
   - Nêu dẫn chứng.
   - Phân tích dẫn chứng.
   - Kết nối dẫn chứng với luận điểm.

5. PHẢN BIỆN / MỞ RỘNG
   - Góc nhìn khác.
   - Giới hạn của nhận định.
   - Phê phán biểu hiện lệch lạc.
   - Tránh tư duy cực đoan.

6. GIẢI PHÁP / BÀI HỌC
   - Chủ thể.
   - Hành động.
   - Cách thực hiện.
   - Mục tiêu.
   - Trách nhiệm của cá nhân.

7. KẾT BÀI
   - Khẳng định lại vấn đề.
   - Nêu ý nghĩa.
   - Liên hệ trách nhiệm bản thân.
```

---

# 6. Cấu trúc bài mục tiêu

Mặc dù đề yêu cầu tối thiểu 500 chữ, hệ thống nên huấn luyện người học đạt khoảng:

```text
700–900 chữ
```

Gợi ý phân bổ:

| Phần | Số chữ gợi ý |
|---|---:|
| Mở bài | 60–90 |
| Giải thích | 80–120 |
| Phân tích chính | 180–250 |
| Dẫn chứng | 80–120 |
| Phản biện | 80–120 |
| Giải pháp / bài học | 120–180 |
| Kết bài | 50–80 |

Không bắt buộc người học phải đúng số chữ tuyệt đối.

---

# 7. Hệ thống chế độ luyện tập

## Level 0 — Học khung

Tên UI:

```text
Học cấu trúc bài
```

Mục tiêu:

- Làm quen 5 dạng đề.
- Hiểu vai trò từng phần.
- Biết thứ tự lập luận.
- Xem ví dụ ngắn.

Không cần gọi Gemini thường xuyên.

Dữ liệu này nên là **static content** trong ứng dụng.

---

# 8. Mode 1 — Nhận diện dạng đề

Tên:

```text
Nhận diện đề
```

Người học:

1. Đọc đề.
2. Chọn dạng:
   - D1-L1.
   - D1-L2.
   - D1-L3.
   - D2-L1.
   - D2-L2.
3. Xác định chủ đề.
4. Xác định vấn đề trung tâm.

Ví dụ output cần sinh lần đầu:

```json
{
  "questionType": "D1-L1",
  "mainTopic": "Trách nhiệm xã hội",
  "coreIssue": "Vai trò và trách nhiệm của người trẻ đối với cộng đồng",
  "keywords": [
    "trách nhiệm",
    "người trẻ",
    "cộng đồng"
  ]
}
```

Nếu dữ liệu này đã tồn tại thì không gọi Gemini.

---

# 9. Mode 2 — Xác định vấn đề nghị luận

Tên:

```text
Tìm vấn đề trọng tâm
```

Bài tập:

> Viết một câu trả lời cho câu hỏi:
>
> “Đề bài thực sự yêu cầu bàn luận vấn đề gì?”

Người học nên trả lời trong 1–2 câu.

Gemini đánh giá:

- Có đúng trọng tâm không.
- Có quá rộng không.
- Có quá hẹp không.
- Có bỏ sót từ khóa quan trọng không.

---

# 10. Mode 3 — Luyện mở bài

Tên:

```text
Mở bài
```

Mục tiêu:

Viết mở bài khoảng:

```text
60–90 chữ
```

Khung gợi ý:

```text
Bối cảnh
→ Vấn đề
→ Quan điểm
```

Có 3 cấp độ.

## Cấp 1 — Có khung

Hiển thị:

```text
Bối cảnh: ________

Vấn đề cần bàn luận: ________

Quan điểm của tôi: ________
```

Sau đó hệ thống ghép thành đoạn.

## Cấp 2 — Gợi ý từ khóa

Chỉ cho:

- 3 từ khóa.
- 1 câu hỏi định hướng.

## Cấp 3 — Tự viết

Không gợi ý.

Gemini chấm:

```text
- Đúng vấn đề
- Ngắn gọn
- Có quan điểm
- Không sáo rỗng
- Không kể lể
```

---

# 11. Mode 4 — Luyện giải thích

Tên:

```text
Giải thích vấn đề
```

Mục tiêu:

- Giải thích từ khóa.
- Giải thích thông điệp.
- Làm rõ phạm vi vấn đề.

Khung:

```text
Từ khóa X là gì?
→ Trong đề này X được hiểu như thế nào?
→ Vấn đề muốn nhấn mạnh điều gì?
```

Gemini cần sinh:

```json
{
  "keyTerms": [],
  "expectedIdeas": [],
  "commonMistakes": []
}
```

---

# 12. Mode 5 — Xây luận điểm

Tên:

```text
Xây luận điểm
```

Đây là mode ưu tiên cao.

Người học cần tạo:

```text
3–5 luận điểm
```

Ví dụ:

```text
Luận điểm 1:
Luận điểm 2:
Luận điểm 3:
Luận điểm 4:
```

Gemini đánh giá:

- Có đúng vấn đề không.
- Có trùng nhau không.
- Có logic không.
- Có thiếu phần quan trọng không.
- Thứ tự đã hợp lý chưa.

Hệ thống nên lưu:

```json
{
  "suggestedThesis": "",
  "suggestedArguments": [
    {
      "id": "arg1",
      "title": "",
      "purpose": "",
      "keyIdeas": []
    }
  ]
}
```

---

# 13. Mode 6 — Sắp xếp luận điểm

Tên:

```text
Sắp xếp lập luận
```

Ứng dụng đưa 5–7 luận điểm đã sinh.

Người học kéo thả để sắp xếp.

Có thể thêm:

- 1 luận điểm thừa.
- 1 luận điểm trùng.
- 1 luận điểm sai hướng.

Mục tiêu:

```text
Tư duy logic
```

Mode này gần như không cần Gemini sau khi ExerciseSeed đã tạo.

---

# 14. Mode 7 — Phân tích nguyên nhân

Tên:

```text
Đào nguyên nhân
```

Khung:

```text
Cá nhân
Gia đình
Nhà trường / tổ chức
Môi trường xã hội
Công nghệ / truyền thông
Điều kiện khách quan
```

Không phải đề nào cũng cần tất cả.

Người học cần chọn những tầng phù hợp.

Gemini sinh:

```json
{
  "causeGroups": [
    {
      "group": "individual",
      "ideas": []
    },
    {
      "group": "social",
      "ideas": []
    }
  ]
}
```

---

# 15. Mode 8 — Kỹ thuật “5 lần tại sao”

Tên:

```text
5 lần tại sao
```

Mục tiêu:

Tăng chiều sâu phân tích.

Ví dụ:

```text
Hiện tượng:
Người trẻ tiêu dùng vượt khả năng.

Tại sao 1?
→ Muốn thể hiện bản thân.

Tại sao 2?
→ Bị tác động bởi so sánh xã hội.

Tại sao 3?
→ Mạng xã hội khuếch đại hình ảnh thành công vật chất.
```

Có thể giới hạn:

```text
3–5 tầng
```

để tránh lan man.

---

# 16. Mode 9 — Ý nghĩa / vai trò

Tên:

```text
Phân tích ý nghĩa
```

Dùng cho:

- Phẩm chất tích cực.
- Hiện tượng tích cực.
- Quan niệm sống đúng.

Khung:

```text
Tác động đến cá nhân
→ cộng đồng
→ xã hội
→ dài hạn
```

Gemini đánh giá chiều sâu thay vì số lượng ý.

---

# 17. Mode 10 — Hậu quả

Tên:

```text
Phân tích hậu quả
```

Dùng cho hiện tượng / tư tưởng tiêu cực.

Khung:

```text
Hậu quả trực tiếp
→ hậu quả gián tiếp
→ cá nhân
→ gia đình
→ cộng đồng
→ xã hội
→ dài hạn
```

Không bắt buộc sử dụng tất cả.

---

# 18. Mode 11 — Dẫn chứng

Tên:

```text
Dẫn chứng 3 bước
```

Công thức:

```text
NÊU
→ PHÂN TÍCH
→ KẾT NỐI LUẬN ĐIỂM
```

Có thể có 2 kiểu.

## Kiểu A — Chọn dẫn chứng

Hệ thống cung cấp:

```text
4–6 dẫn chứng
```

Người học chọn dẫn chứng phù hợp.

## Kiểu B — Tự đưa dẫn chứng

Người học tự viết.

Gemini kiểm tra:

- Có liên quan không.
- Có quá chung chung không.
- Có hỗ trợ luận điểm không.

### Lưu ý

Không yêu cầu Gemini phải luôn sinh số liệu cụ thể hoặc sự kiện thời sự nếu không chắc chắn.

Ưu tiên:

```text
dẫn chứng khái quát an toàn
```

hoặc dữ liệu được quản trị viên bổ sung sau.

---

# 19. Mode 12 — Phản biện

Tên:

```text
Tư duy phản biện
```

Một trong những mode quan trọng nhất.

Khung 4 bước:

```text
1. Điều gì trong nhận định là đúng?
2. Điều gì chưa đầy đủ?
3. Khi nào nhận định không còn đúng?
4. Quan điểm cân bằng hơn là gì?
```

Ví dụ:

```text
“Chỉ cần nỗ lực thì ai cũng có thể thành công.”
```

Người học phải tránh:

```text
Đồng ý hoàn toàn
```

hoặc:

```text
Phản đối hoàn toàn
```

khi bản chất vấn đề cần góc nhìn cân bằng.

Gemini đánh giá:

- Có góc nhìn khác không.
- Có logic không.
- Có cực đoan không.
- Có quay về vấn đề chính không.

---

# 20. Mode 13 — Giải pháp

Tên:

```text
Giải pháp 4 bước
```

Công thức bắt buộc:

```text
CHỦ THỂ
→ HÀNH ĐỘNG
→ CÁCH THỰC HIỆN
→ MỤC TIÊU
```

Ví dụ UI:

```text
Chủ thể:
[................]

Cần làm gì:
[................]

Thực hiện bằng cách:
[................]

Nhằm:
[................]
```

Gemini cần đánh giá thêm:

```text
Giải pháp có xử lý nguyên nhân đã nêu không?
```

Đây là tiêu chí rất quan trọng.

---

# 21. Mode 14 — Bài học cá nhân

Tên:

```text
Trách nhiệm của tôi
```

Người học phải chuyển từ lời kêu gọi chung chung sang hành động cá nhân.

Khung:

```text
Nhận thức
→ thái độ
→ hành động
→ duy trì
```

Ví dụ:

```text
Không chỉ “mỗi người cần nâng cao ý thức”
```

mà cần:

```text
“Tôi cần hình thành thói quen kiểm chứng thông tin trước khi chia sẻ...”
```

---

# 22. Mode 15 — Kết bài

Tên:

```text
Kết bài
```

Mục tiêu:

```text
50–80 chữ
```

Khung:

```text
Khẳng định
→ ý nghĩa
→ trách nhiệm / thông điệp
```

Có 3 cấp giống mở bài.

---

# 23. Mode 16 — Viết từng đoạn thân bài

Tên:

```text
Viết từng đoạn
```

Người học chọn:

- Đoạn giải thích.
- Đoạn nguyên nhân.
- Đoạn vai trò.
- Đoạn hậu quả.
- Đoạn dẫn chứng.
- Đoạn phản biện.
- Đoạn giải pháp.

Mỗi bài chỉ yêu cầu:

```text
100–180 chữ
```

Mục tiêu:

```text
luyện một kỹ năng trong một thời gian ngắn
```

---

# 24. Mode 17 — Viết đoạn theo luận điểm

Tên:

```text
Triển khai luận điểm
```

Ứng dụng đưa:

```text
Luận điểm:
“Ý thức trách nhiệm giúp cá nhân trưởng thành.”
```

Người học viết:

```text
120–160 chữ
```

Khung:

```text
Câu chủ đề
→ giải thích
→ phân tích
→ ví dụ / dẫn chứng
→ câu kết nối
```

---

# 25. Mode 18 — Ghép đoạn

Tên:

```text
Ghép bài
```

Hệ thống đưa:

```text
6–8 đoạn bị xáo trộn
```

Người học sắp xếp.

Có thể có:

- Đoạn thừa.
- Đoạn sai chủ đề.
- Đoạn trùng ý.

Mục tiêu:

```text
nhìn thấy cấu trúc bài ở cấp độ toàn cục
```

---

# 26. Mode 19 — Sửa đoạn yếu

Tên:

```text
Bắt lỗi lập luận
```

Gemini sinh một đoạn cố tình có lỗi:

- Chung chung.
- Lặp ý.
- Không chứng minh.
- Không có logic nhân quả.
- Giải pháp sai nguyên nhân.
- Dẫn chứng không liên quan.
- Cực đoan.

Sau khi sinh lần đầu:

```text
save
```

Những lần sau:

```text
reuse
```

Người học:

1. Tìm lỗi.
2. Chọn loại lỗi.
3. Viết lại đoạn.

---

# 27. Mode 20 — Một vấn đề, nhiều góc nhìn

Tên:

```text
Nhiều góc nhìn
```

Ví dụ chủ đề:

```text
AI và việc làm
```

Người học phân tích từ:

```text
Cá nhân
Doanh nghiệp
Nhà nước
Xã hội
```

Hoặc:

```text
Lợi ích
Rủi ro
Ngắn hạn
Dài hạn
```

---

# 28. Mode 21 — Lập dàn ý tốc độ

Tên:

```text
Dàn ý 10 phút
```

Đây là mode ưu tiên cao.

Template:

```text
1. Dạng đề:
2. Vấn đề:
3. Quan điểm:
4. Giải thích:
5. Luận điểm 1:
6. Luận điểm 2:
7. Luận điểm 3:
8. Dẫn chứng:
9. Phản biện:
10. Giải pháp:
11. Kết luận:
```

Có timer.

Sau khi nộp:

Gemini đánh giá:

```text
completeness
logic
relevance
depth
counter_argument
solution_quality
```

---

# 29. Mode 22 — Hoàn thiện bài từ dàn ý

Tên:

```text
Từ dàn ý thành bài
```

Người học sử dụng dàn ý đã luyện.

Ứng dụng hiển thị từng phần theo thứ tự:

```text
Mở bài
↓
Giải thích
↓
Thân bài
↓
Phản biện
↓
Giải pháp
↓
Kết bài
```

Có thể viết từng block.

Sau khi hoàn thành mới ghép thành bài.

---

# 30. Mode 23 — Viết bài hoàn chỉnh

Tên:

```text
Viết bài hoàn chỉnh
```

Mục tiêu:

```text
500+ chữ
```

Khuyến nghị:

```text
700–900 chữ
```

Có:

- Bộ đếm chữ.
- Timer.
- Auto save.
- Dàn ý có thể bật/tắt.
- Gemini Hint có giới hạn.

---

# 31. Mode 24 — Thi thử

Tên:

```text
Thi thật
```

Trong mode này:

Không cho:

- Hint.
- Dàn ý.
- Gemini chat.
- Gợi ý luận điểm.

Chỉ có:

```text
Đề
Editor
Word count
Timer
Submit
```

Sau khi submit mới chấm.

---

# 32. Mode 25 — Luyện 15 phút mỗi ngày

Tên:

```text
15 phút mỗi ngày
```

Một session gồm:

```text
2 phút — nhận diện đề
3 phút — tạo 3 luận điểm
3 phút — phản biện
3 phút — giải pháp
4 phút — viết 1 đoạn ngắn
```

Không cần sử dụng 5 đề khác nhau.

Có thể dùng cùng một đề để giảm Gemini call.

---

# 33. Lộ trình học

Ứng dụng nên có progression.

## Giai đoạn 1

```text
Nhận diện đề
→ vấn đề
→ mở bài
→ kết bài
```

## Giai đoạn 2

```text
Giải thích
→ luận điểm
→ nguyên nhân
→ ý nghĩa / hậu quả
```

## Giai đoạn 3

```text
Dẫn chứng
→ phản biện
→ giải pháp
```

## Giai đoạn 4

```text
Viết từng đoạn
→ triển khai luận điểm
→ ghép đoạn
```

## Giai đoạn 5

```text
Dàn ý 10 phút
→ viết từ dàn ý
→ bài hoàn chỉnh
```

## Giai đoạn 6

```text
Thi thử
```

---

# 34. Cơ chế mở khóa

Có thể sử dụng:

```text
practiceCount
averageScore
```

Ví dụ:

```text
Mở bài:
3 lần luyện
+
averageScore >= 7
```

→ đánh dấu:

```text
Đã quen
```

Không nên khóa cứng toàn bộ app.

Người dùng vẫn có thể:

```text
Luyện tự do
```

---

# 35. Kiến trúc dữ liệu đề xuất

## Question

```ts
interface Question {
  id: string;
  title?: string;
  content: string;
  source?: string;
  createdAt: string;
}
```

---

# 36. QuestionAnalysis

Phân tích nền của đề.

```ts
interface QuestionAnalysis {
  questionId: string;

  questionType:
    | "D1_L1"
    | "D1_L2"
    | "D1_L3"
    | "D2_L1"
    | "D2_L2";

  mainTopic: string;

  coreIssue: string;

  keywords: string[];

  suggestedPosition?: string;

  frameworkVersion: string;

  aiModel?: string;

  generatedAt: string;
}
```

Gemini chỉ sinh nếu chưa có.

---

# 37. ExerciseSeed

```ts
interface ExerciseSeed {
  id: string;

  questionId: string;

  practiceMode: PracticeMode;

  frameworkVersion: string;

  data: unknown;

  aiModel?: string;

  promptVersion: string;

  generatedAt: string;

  status:
    | "valid"
    | "invalid"
    | "needs_review";
}
```

Unique key:

```text
questionId
+
practiceMode
+
frameworkVersion
+
promptVersion
```

---

# 38. PracticeMode

```ts
type PracticeMode =
  | "identify_type"
  | "identify_issue"
  | "introduction"
  | "explanation"
  | "build_arguments"
  | "sort_arguments"
  | "causes"
  | "five_whys"
  | "benefits"
  | "consequences"
  | "evidence"
  | "counter_argument"
  | "solutions"
  | "personal_lesson"
  | "conclusion"
  | "paragraph"
  | "argument_paragraph"
  | "reorder_paragraphs"
  | "fix_bad_paragraph"
  | "multi_perspective"
  | "outline"
  | "outline_to_essay"
  | "full_essay"
  | "mock_exam"
  | "daily_15";
```

---

# 39. PracticeAttempt

```ts
interface PracticeAttempt {
  id: string;

  userId: string;

  questionId: string;

  practiceMode: PracticeMode;

  exerciseSeedId?: string;

  answer: string;

  score?: number;

  rubricScores?: Record<string, number>;

  feedback?: PracticeFeedback;

  usedHintCount: number;

  durationSeconds?: number;

  wordCount?: number;

  createdAt: string;
}
```

---

# 40. PracticeFeedback

```ts
interface PracticeFeedback {
  summary: string;

  strengths: string[];

  weaknesses: string[];

  missingIdeas?: string[];

  suggestedRevision?: string;

  nextPractice?: PracticeMode;
}
```

---

# 41. SkillProgress

```ts
interface SkillProgress {
  userId: string;

  skill: PracticeMode;

  attempts: number;

  averageScore: number;

  recentAverageScore: number;

  bestScore: number;

  level:
    | "new"
    | "learning"
    | "familiar"
    | "mastered";

  updatedAt: string;
}
```

---

# 42. AI cache

Nên có cache key chuẩn:

```ts
const cacheKey = [
  questionId,
  practiceMode,
  frameworkVersion,
  promptVersion
].join(":");
```

Luồng:

```text
request practice
↓
find ExerciseSeed
↓
FOUND
→ return database data

NOT FOUND
→ call Gemini
→ validate JSON
→ save ExerciseSeed
→ return
```

---

# 43. Không regenerate tự động

Không được:

```text
mỗi lần mở bài tập
→ Gemini tạo bài mới
```

Phải:

```text
mỗi tổ hợp chỉ tạo 1 seed
```

Nếu muốn biến thể:

```text
variantIndex
```

Ví dụ:

```text
questionId: 10
mode: counter_argument
variant: 1
```

Sau này admin có thể tạo:

```text
variant 2
variant 3
```

---

# 44. Chiến lược tiết kiệm Gemini Free Tier

## Nguyên tắc 1

Static trước, AI sau.

Không dùng Gemini cho:

- Giải thích giao diện.
- Khung bài.
- Hướng dẫn cố định.
- Rubric cố định.
- Danh sách dạng đề.
- Các template.

---

## Nguyên tắc 2

Generate once, reuse many.

```text
question + mode
```

→ sinh seed một lần.

---

## Nguyên tắc 3

Chỉ gửi dữ liệu cần thiết

Không gửi toàn bộ lịch sử người dùng.

Ví dụ khi chấm mở bài chỉ gửi:

```text
question
coreIssue
userIntroduction
rubric
```

Không gửi:

```text
full question analysis
all exercises
all attempts
entire framework
```

---

# 45. Prompt tối giản

Không dùng system prompt dài hàng nghìn token cho mỗi request.

Thay vào đó:

```text
ROLE: Vietnamese social-essay evaluator.

TASK:
Evaluate the introduction.

QUESTION:
...

CORE ISSUE:
...

ANSWER:
...

RETURN JSON:
{
  score,
  strengths,
  weaknesses,
  suggestedRevision
}
```

---

# 46. Không yêu cầu Gemini viết giải thích dài

Feedback mặc định nên ngắn.

Ví dụ:

```json
{
  "score": 7.5,
  "strengths": [
    "Đúng vấn đề",
    "Có quan điểm"
  ],
  "weaknesses": [
    "Dẫn nhập dài",
    "Câu cuối chưa rõ"
  ],
  "suggestedRevision": "..."
}
```

---

# 47. Giới hạn output token

Các request nhỏ:

```text
maxOutputTokens: 300–600
```

Full essay evaluation:

```text
800–1200
```

Tùy Gemini SDK hiện có.

Không yêu cầu Gemini trả bài mẫu hoàn chỉnh trừ khi user chọn:

```text
Xem bài tham khảo
```

---

# 48. Hint theo tầng

Không gọi AI ngay khi bấm Hint nếu hint seed đã có.

ExerciseSeed nên sinh sẵn:

```json
{
  "hints": [
    "Gợi ý nhẹ",
    "Gợi ý rõ hơn",
    "Khung gần hoàn chỉnh"
  ]
}
```

User bấm:

```text
Hint 1
→ local/database
Hint 2
→ local/database
Hint 3
→ local/database
```

Không gọi Gemini 3 lần.

---

# 49. Chấm theo hai lớp

Để tiết kiệm token:

## Layer 1 — local rules

Kiểm tra:

- Word count.
- Có để trống không.
- Quá ngắn không.
- Có lặp nguyên văn câu hỏi không.
- Có đủ số luận điểm yêu cầu không.

## Layer 2 — Gemini

Chỉ gửi nội dung hợp lệ để chấm semantic.

---

# 50. Có thể trì hoãn Gemini evaluation trong một số mode

Ví dụ:

```text
sort_arguments
reorder_paragraphs
multiple choice
```

có đáp án seed.

Chấm local 100%.

Không gọi Gemini.

---

# 51. AI generation service

Nên tách thành service:

```text
NlxhAiService
```

Các method:

```ts
analyzeQuestion(questionId)

generateExerciseSeed(
  questionId,
  practiceMode
)

evaluatePracticeAttempt(
  questionId,
  practiceMode,
  answer
)

generateHint(
  ...
)
```

Nhưng `generateHint()` chỉ dùng khi seed không có hint phù hợp.

---

# 52. AI response luôn là JSON

Không dùng text tự do nếu có thể.

Ví dụ:

```json
{
  "version": 1,
  "mode": "introduction",
  "task": "...",
  "expectedIdeas": [],
  "hints": [],
  "rubric": []
}
```

Validate bằng:

- Zod.
- JSON Schema.
- Validator hiện có trong project.

Nếu parse lỗi:

```text
retry tối đa 1 lần
```

Không retry vô hạn.

---

# 53. Prompt versioning

Mỗi prompt có:

```text
promptVersion
```

Ví dụ:

```text
intro_v1
argument_v1
counter_v2
```

Khi prompt thay đổi mạnh:

```text
ExerciseSeed mới
```

Dữ liệu cũ vẫn giữ.

---

# 54. Framework versioning

```text
framework_v1
```

Nếu sau này đổi cấu trúc bài:

```text
framework_v2
```

Không làm hỏng seed cũ.

---

# 55. Question analysis là tài nguyên trung tâm

Khi người dùng lần đầu luyện bất kỳ mode nào của một đề:

Kiểm tra:

```text
QuestionAnalysis
```

Nếu chưa có:

Gemini sinh một lần:

```json
{
  "questionType": "",
  "mainTopic": "",
  "coreIssue": "",
  "keywords": [],
  "suggestedPosition": ""
}
```

Sau đó mọi mode dùng lại.

Điều này giúp giảm prompt token đáng kể.

---

# 56. ExerciseSeed nên kế thừa QuestionAnalysis

Ví dụ khi sinh `counter_argument`:

Không cần gửi raw logic dài.

Chỉ cần:

```text
QUESTION
TYPE
CORE ISSUE
POSITION
```

---

# 57. Rubric dùng chung

Rubric nên hard-code trong app.

## Introduction

```text
relevance
clarity
position
conciseness
```

## Arguments

```text
relevance
non_overlap
logic
coverage
```

## Counter argument

```text
alternative_view
balance
logic
relevance
```

## Solutions

```text
specificity
feasibility
cause_solution_match
responsibility
```

## Full essay

```text
task_response
structure
argumentation
analysis
critical_thinking
evidence
solutions
language
cohesion
```

---

# 58. Điểm số

Mỗi skill:

```text
0–10
```

Không cần quá chi tiết kiểu:

```text
7.37
```

Có thể round:

```text
0.5
```

Ví dụ:

```text
7.5
8.0
```

---

# 59. Màn hình Dashboard

Hiển thị:

```text
NLXH Progress
```

Các kỹ năng:

```text
Nhận diện đề       9.0
Mở bài             7.5
Giải thích          8.0
Luận điểm           6.5
Nguyên nhân         7.0
Dẫn chứng           6.0
Phản biện           5.5
Giải pháp           6.0
Kết bài             8.0
Dàn ý               6.5
Bài hoàn chỉnh      6.5
```

---

# 60. Nút “Luyện điểm yếu”

Hệ thống chọn:

```text
lowest 2–3 recent skill scores
```

Ví dụ:

```text
Phản biện
Giải pháp
Dẫn chứng
```

Tạo session:

```text
3 bài phản biện
2 bài giải pháp
1 bài dẫn chứng
```

Ưu tiên đề đã có seed để giảm Gemini request.

---

# 61. Thuật toán chọn bài tiết kiệm token

Pseudo:

```ts
function chooseExercise(user, skill) {
  const seededQuestions = findQuestionsWithExerciseSeed(skill);

  if (seededQuestions.length > 0) {
    return chooseBestForUser(seededQuestions);
  }

  const question = chooseQuestionWithoutSeed(skill);

  return generateSeedOnce(question, skill);
}
```

Ưu tiên:

```text
existing seed > new generation
```

---

# 62. Chế độ luyện theo đề

Trang đề có:

```text
Luyện đề này
```

Sau đó hiển thị progress:

```text
✓ Nhận diện
✓ Mở bài
✓ Giải thích
○ Luận điểm
○ Nguyên nhân
○ Phản biện
○ Giải pháp
○ Kết bài
○ Dàn ý
○ Bài hoàn chỉnh
```

Người học có thể hoàn thành một đề từ nhỏ đến lớn.

---

# 63. Chế độ luyện theo kỹ năng

Trang:

```text
Luyện kỹ năng
```

Người dùng chọn:

```text
Phản biện
```

Hệ thống lấy nhiều đề khác nhau.

Điều này giúp:

```text
generalization
```

tránh học thuộc một đề.

---

# 64. Chế độ luyện theo dạng đề

Filter:

```text
D1-L1
D1-L2
D1-L3
D2-L1
D2-L2
```

Sau đó chọn skill.

Ví dụ:

```text
D2-L1
+
Nguyên nhân
```

---

# 65. Chủ đề

QuestionAnalysis nên gắn một hoặc nhiều topic:

```text
Lí tưởng và trách nhiệm xã hội
Bản lĩnh và phẩm chất chính trị
Lao động và nghề nghiệp
Tiêu dùng và tài chính
Phát triển bền vững
Bản sắc và hội nhập
Cá nhân và cộng đồng
```

Có thể bổ sung:

```text
Công nghệ
Mạng xã hội
Giáo dục
Môi trường
Văn hóa ứng xử
```

---

# 66. UX Gemini Hint

Không nên để chatbot mở tự do trong màn luyện.

Thay bằng nút có chủ đích:

```text
Gợi ý
```

Menu:

```text
Gợi ý nhẹ
Gợi ý luận điểm
Gợi ý cách triển khai
Tôi đang bí
```

Ưu tiên lấy từ seed.

Nếu cần gọi Gemini:

chỉ gửi context của phần đang luyện.

---

# 67. UX khi chấm

Sau submit:

```text
Điểm: 7.5 / 10
```

Hiển thị tối đa:

```text
2 điểm tốt
2 điểm cần sửa
1 nhiệm vụ sửa lại
```

Không đổ ra feedback quá dài.

Nút:

```text
Sửa lại
```

Sau lần 2:

so sánh:

```text
Lần 1: 6.5
Lần 2: 8.0
```

Đây là vòng học quan trọng.

---

# 68. Mastery loop

Mỗi kỹ năng:

```text
Learn
→ Practice
→ Feedback
→ Rewrite
→ Repeat
→ Familiar
```

Không chỉ:

```text
Practice
→ Score
→ Next
```

---

# 69. Chế độ “Viết lại”

Sau khi Gemini chấm:

User có thể:

```text
Viết lại cùng bài
```

Lần này không cần Gemini tạo ExerciseSeed.

Chỉ chấm attempt mới.

---

# 70. Có thể dùng feedback cũ để giảm token

Khi sửa lần 2:

Không cần gửi toàn bộ lịch sử.

Chỉ gửi:

```text
question
practice mode
new answer
previous weaknesses
```

Không gửi:

```text
previous full Gemini response
```

---

# 71. Full essay evaluation

Khi chấm bài hoàn chỉnh, Gemini trả:

```json
{
  "overallScore": 7.5,

  "scores": {
    "taskResponse": 8,
    "structure": 8,
    "argumentation": 7,
    "analysis": 7,
    "criticalThinking": 6,
    "evidence": 7,
    "solutions": 7,
    "language": 8,
    "cohesion": 8
  },

  "strengths": [],

  "priorityFixes": [],

  "missingComponents": [],

  "nextPractice": [
    "counter_argument",
    "solutions"
  ]
}
```

Không yêu cầu Gemini rewrite toàn bộ bài mặc định.

---

# 72. “Sửa phần yếu” từ bài hoàn chỉnh

Sau full essay:

Nếu:

```text
criticalThinking = 5
solutions = 5.5
```

Hiển thị:

```text
Luyện lại phần yếu
```

→ mở:

```text
counter_argument
solutions
```

trên **chính đề vừa làm**.

Đây là vòng liên kết quan trọng:

```text
Full essay
→ detect weakness
→ micro practice
→ full essay again
```

---

# 73. Daily training session

Pseudo:

```text
1 warm-up
2 weak-skill exercises
1 paragraph
```

Ví dụ:

```text
Nhận diện — 2 phút
Phản biện — 4 phút
Giải pháp — 4 phút
Viết đoạn — 5 phút
```

---

# 74. Ưu tiên MVP

## P0 — Bắt buộc

1. QuestionAnalysis cache.
2. ExerciseSeed cache.
3. Nhận diện đề.
4. Mở bài.
5. Giải thích.
6. Xây luận điểm.
7. Phản biện.
8. Giải pháp.
9. Kết bài.
10. Dàn ý.
11. Viết bài hoàn chỉnh.
12. Gemini evaluation.
13. Skill progress.

---

## P1

1. Nguyên nhân.
2. Ý nghĩa.
3. Hậu quả.
4. Dẫn chứng.
5. Viết từng đoạn.
6. Viết đoạn theo luận điểm.
7. Sửa đoạn yếu.
8. Daily 15.

---

## P2

1. Drag/drop luận điểm.
2. Ghép đoạn.
3. 5 lần tại sao.
4. Nhiều góc nhìn.
5. Adaptive learning.
6. Mock exam analytics.

---

# 75. Luồng tạo ExerciseSeed

```text
User chọn đề
↓
User chọn mode
↓
GET QuestionAnalysis
↓
không tồn tại?
→ Gemini analyze
→ validate
→ save
↓
GET ExerciseSeed
↓
không tồn tại?
→ Gemini generate seed
→ validate
→ save
↓
render exercise
```

---

# 76. Luồng submit

```text
User submit
↓
local validation
↓
mode có đáp án deterministic?
YES
→ local grade

NO
→ Gemini semantic evaluation
↓
save PracticeAttempt
↓
update SkillProgress
↓
show feedback
```

---

# 77. API đề xuất

```text
GET /api/nlxh/questions/:id/analysis

POST /api/nlxh/questions/:id/analysis
```

---

```text
GET /api/nlxh/exercise
  ?questionId=
  &mode=
```

Nếu seed không tồn tại:

backend tự generate.

---

```text
POST /api/nlxh/attempt
```

Body:

```json
{
  "questionId": "",
  "practiceMode": "",
  "exerciseSeedId": "",
  "answer": ""
}
```

---

```text
GET /api/nlxh/progress
```

---

```text
GET /api/nlxh/recommendation
```

---

# 78. Không gọi Gemini trực tiếp từ client

Gemini API phải đi qua server.

Lý do:

- Bảo vệ API key.
- Cache.
- Rate limit.
- Logging.
- Token tracking.
- Retry.
- Validation.

---

# 79. Rate limit nội bộ

Free Tier nên có giới hạn.

Ví dụ:

```text
AI evaluation:
N request / phút / user
```

Nếu vượt:

```text
queue / thông báo thử lại
```

Không retry hàng loạt.

---

# 80. Token usage logging

Lưu nếu SDK hỗ trợ:

```ts
interface AiUsageLog {
  userId?: string;
  action: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  cached: boolean;
  createdAt: string;
}
```

Dashboard admin:

```text
Total calls
Cache hit rate
Generation calls
Evaluation calls
Estimated tokens
```

---

# 81. Mục tiêu cache hit

Khi database đã có nhiều dữ liệu:

```text
ExerciseSeed cache hit >= 80%
```

Gemini chủ yếu dùng cho:

```text
evaluation
```

thay vì:

```text
content generation
```

---

# 82. Seed sharing

ExerciseSeed không gắn user.

Một seed được dùng chung cho toàn bộ user.

```text
100 user
+
1 question
+
1 mode
=
1 generation
```

Không phải:

```text
100 generations
```

---

# 83. QuestionAnalysis cũng shared

Phân tích đề là dữ liệu dùng chung.

Không tạo lại theo user.

---

# 84. Có thể pre-generate dần

Không cần sinh toàn bộ database ngay.

Dùng chiến lược:

```text
lazy generation
```

Khi user lần đầu mở:

```text
generate
```

Sau đó:

```text
reuse forever
```

Admin sau này có thể chạy job:

```text
pre-generate top questions
```

---

# 85. Gemini prompt cho QuestionAnalysis

Mục tiêu response ngắn.

```text
Bạn là hệ thống phân tích đề Nghị luận xã hội tiếng Việt.

Hãy phân tích đề sau.

QUESTION:
{{question}}

Phân loại duy nhất:
D1_L1 = phẩm chất/tư tưởng tích cực
D1_L2 = tư tưởng/lối sống tiêu cực
D1_L3 = ý kiến/câu nói/quan niệm sống
D2_L1 = hiện tượng đời sống tiêu cực
D2_L2 = hiện tượng đời sống tích cực

Trả JSON, không markdown:

{
  "questionType": "",
  "mainTopic": "",
  "coreIssue": "",
  "keywords": [],
  "suggestedPosition": ""
}
```

---

# 86. Prompt generate ExerciseSeed

Dùng prompt riêng theo mode.

Không dùng một mega prompt cho tất cả.

Ví dụ `introduction`:

```text
QUESTION:
{{question}}

TYPE:
{{type}}

CORE ISSUE:
{{coreIssue}}

TASK:
Create reusable training data for writing an introduction.

Return JSON only:

{
  "task": "",
  "targetWords": "60-90",
  "requiredElements": [],
  "hints": [
    "",
    "",
    ""
  ],
  "commonMistakes": [],
  "referenceIdeas": []
}
```

---

# 87. Prompt đánh giá mở bài

```text
Evaluate only the introduction.

QUESTION:
{{shortQuestion}}

CORE ISSUE:
{{coreIssue}}

ANSWER:
{{answer}}

RUBRIC:
- relevance
- clarity
- position
- conciseness

Return JSON only:

{
  "score": 0,
  "strengths": [],
  "weaknesses": [],
  "suggestedRevision": ""
}
```

---

# 88. Prompt đánh giá luận điểm

```text
QUESTION:
{{question}}

CORE ISSUE:
{{coreIssue}}

USER ARGUMENTS:
{{arguments}}

Evaluate:
- relevance
- overlap
- logical order
- coverage

Return JSON only.
```

---

# 89. Prompt đánh giá phản biện

```text
CORE ISSUE:
{{coreIssue}}

USER COUNTER ARGUMENT:
{{answer}}

Evaluate:
- identifies another perspective
- avoids extreme thinking
- logical
- returns to core issue

Return short JSON only.
```

---

# 90. Prompt đánh giá giải pháp

```text
CORE ISSUE:
{{coreIssue}}

KNOWN CAUSES:
{{causes_if_available}}

USER SOLUTION:
{{answer}}

Evaluate:
- specific
- feasible
- correct actor
- method
- goal
- addresses causes

Return short JSON only.
```

Nếu causes không có:

không gửi trường đó.

---

# 91. Prompt full essay

Đây là request tốn token nhất.

Chỉ gọi khi user submit bài hoàn chỉnh.

Không gửi ExerciseSeed dài.

Chỉ gửi:

```text
question
questionType
coreIssue
essay
rubric
```

---

# 92. Không sinh bài mẫu tự động

Bài mẫu 700–900 chữ rất tốn token.

Chỉ tạo khi:

```text
user explicitly taps “Xem bài tham khảo”
```

Sau khi tạo:

```text
save ReferenceEssay
```

Người sau dùng lại.

---

# 93. ReferenceEssay

```ts
interface ReferenceEssay {
  questionId: string;

  frameworkVersion: string;

  essay: string;

  outline: string[];

  generatedAt: string;
}
```

Một đề chỉ cần:

```text
1–2 bài tham khảo
```

---

# 94. Dẫn chứng thời sự

Không phụ thuộc hoàn toàn Gemini để tạo dẫn chứng thời sự.

MVP:

```text
generic safe evidence
```

Sau này có thể bổ sung:

```text
EvidenceLibrary
```

được admin quản lý.

---

# 95. Tránh hallucination

Prompt phải yêu cầu:

```text
Không bịa số liệu, văn bản pháp luật, sự kiện hoặc nhân vật.
Nếu không chắc chắn, sử dụng dẫn chứng khái quát.
```

---

# 96. Error handling

Nếu Gemini lỗi:

```text
1. Check cache lần nữa.
2. Retry tối đa 1 lần.
3. Nếu vẫn lỗi:
   - cho user luyện bằng khung static nếu mode hỗ trợ.
   - không làm mất answer.
```

---

# 97. Loading UX

Khi seed đang generate lần đầu:

```text
Đang chuẩn bị bài luyện...
```

Sau đó seed được lưu.

Không nói:

```text
Gemini đang suy nghĩ
```

---

# 98. Admin tools

Nên có:

```text
Regenerate ExerciseSeed
Mark invalid
Edit generated data
View AI usage
View cache hit
```

Admin có thể sửa seed tốt hơn mà không cần AI.

---

# 99. Data quality

ExerciseSeed sau generation cần validate:

```text
not empty
correct mode
correct question
reasonable array lengths
valid JSON
```

Nếu mode `build_arguments`:

phải có ít nhất:

```text
3 suggested arguments
```

---

# 100. Hệ thống mastery

Gợi ý:

```text
new:
attempts = 0

learning:
attempts >= 1

familiar:
attempts >= 3
recentAverage >= 7

mastered:
attempts >= 5
recentAverage >= 8
```

Có thể điều chỉnh sau.

---

# 101. Recommendation engine MVP

Không cần AI.

Rule-based:

```text
if weakestSkill.score < 6:
    recommend weakestSkill

else if outline.score < 7:
    recommend outline

else:
    recommend fullEssay
```

---

# 102. Recommendation engine sau này

Có thể dùng:

```text
recent attempts
skill scores
question type coverage
```

Không cần gọi Gemini.

---

# 103. Coverage

Dashboard có thể cho biết:

```text
D1-L1  ███████░░ 70%
D1-L2  █████░░░░ 50%
D1-L3  ███░░░░░░ 30%
D2-L1  ██████░░░ 60%
D2-L2  ████░░░░░ 40%
```

---

# 104. Mục tiêu trải nghiệm cuối cùng

Một user mới:

```text
Ngày đầu:
học khung
↓
luyện mở bài
↓
luyện luận điểm
```

Sau vài ngày:

```text
luyện nguyên nhân
↓
phản biện
↓
giải pháp
```

Sau đó:

```text
viết từng đoạn
↓
dàn ý 10 phút
```

Cuối cùng:

```text
500+ chữ
↓
thi thử
```

---

# 105. User journey mẫu

Đề:

```text
Bàn về trách nhiệm của người trẻ trong xã hội hiện đại.
```

Session 1:

```text
Nhận diện dạng đề
```

Session 2:

```text
Mở bài
```

Session 3:

```text
3 luận điểm chính
```

Session 4:

```text
Phản biện
```

Session 5:

```text
Giải pháp
```

Session 6:

```text
Kết bài
```

Session 7:

```text
Dàn ý hoàn chỉnh
```

Session 8:

```text
Viết bài 700 chữ
```

Gemini chỉ sinh seed một lần cho mỗi session type.

---

# 106. Definition of Done — MVP

Một feature được xem là hoàn thành khi:

1. User có thể chọn đề.
2. User có thể chọn practice mode.
3. Backend tìm ExerciseSeed.
4. Nếu chưa có thì gọi Gemini một lần.
5. Response AI được validate.
6. Seed được save.
7. Lần mở sau không gọi lại Gemini.
8. User làm bài.
9. Answer được auto-save.
10. Submit có feedback.
11. Attempt được lưu.
12. SkillProgress được cập nhật.
13. User có thể “Viết lại”.
14. User có thể chuyển sang skill tiếp theo.

---

# 107. Thứ tự triển khai đề xuất cho Cursor

## Phase 1 — Data foundation

```text
QuestionAnalysis
ExerciseSeed
PracticeAttempt
SkillProgress
AI usage
```

---

## Phase 2 — Gemini infrastructure

```text
NlxhAiService
JSON schemas
cache
prompt version
framework version
token limits
retry
```

---

## Phase 3 — Core micro practice

Triển khai trước:

```text
identify_issue
introduction
build_arguments
counter_argument
solutions
conclusion
```

---

## Phase 4 — Outline

```text
outline
```

Đây là bước nối micro skill với full essay.

---

## Phase 5 — Full essay

```text
full_essay
```

---

## Phase 6 — Progress

```text
SkillProgress
weak skills
recommendation
```

---

## Phase 7 — Extended modes

```text
causes
benefits
consequences
evidence
paragraph
fix_bad_paragraph
daily_15
mock_exam
```

---

# 108. Nguyên tắc cuối cùng cho Cursor

Khi triển khai feature NLXH:

```text
DO NOT
```

- Gọi Gemini mỗi lần render.
- Sinh lại cùng một ExerciseSeed.
- Gửi full history vào prompt.
- Dùng một prompt cực dài cho mọi mode.
- Yêu cầu essay mẫu trong mọi lần chấm.
- Dùng Gemini cho logic có thể chấm local.
- Tạo dữ liệu riêng cho từng user nếu dữ liệu có thể chia sẻ.
- Retry API không giới hạn.

```text
DO
```

- Cache dữ liệu AI.
- Share generated content giữa user.
- Lazy generate.
- Prompt ngắn.
- JSON only.
- Validate response.
- Version prompt.
- Version framework.
- Theo dõi token usage.
- Ưu tiên local evaluation.
- Chỉ dùng AI cho semantic task.
- Luyện từ nhỏ đến lớn.

---

# 109. Triết lý cốt lõi

Toàn bộ module phải bám vào nguyên tắc:

> **Không yêu cầu người học biết viết ngay một bài nghị luận xã hội hoàn chỉnh.**

Thay vào đó:

```text
Biết mở bài
+
biết giải thích
+
biết tìm luận điểm
+
biết phân tích
+
biết dẫn chứng
+
biết phản biện
+
biết đề xuất giải pháp
+
biết kết bài
=
biết xây bài
```

Sau khi từng thành phần đã quen:

```text
Micro Skill
↓
Paragraph
↓
Outline
↓
Full Essay
↓
Mock Exam
```

Gemini chỉ đóng vai trò:

```text
Generate missing training data
+
Guide
+
Evaluate
```

Database đóng vai trò:

```text
Remember generated knowledge
+
Reuse
+
Reduce token cost
```

Đó phải là kiến trúc cốt lõi của tính năng NLXH.
