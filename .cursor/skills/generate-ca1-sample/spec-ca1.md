# CA1 minh họa spec

## Phần 1 — Nghị luận xã hội (verbatim)

Đưa ra 01 đoạn văn bản về một trong các chủ đề chính trị, kinh tế, văn hóa - xã hội, yêu cầu thí sinh sử dụng thể loại văn nghị luận (tối thiểu 500 chữ) để trình bày, đánh giá, phân tích, bình luận về vấn đề được đưa ra.

Phần thi đánh giá Năng lực giải quyết vấn đề (bao hàm các năng lực khác như: năng lực tự chủ, tự chịu trách nhiệm; năng lực chuyên môn; tư duy logic; tư duy phản biện; phân tích và đánh giá…) và năng lực ngôn ngữ của thí sinh, với các vấn đề cốt lõi như: Lí tưởng và trách nhiệm xã hội, Bản lĩnh và phẩm chất chính trị, Lao động và nghề nghiệp, Tiêu dùng và tài chính, Phát triển bền vững, Bản sắc và hội nhập, Cá nhân và cộng đồng, …

## Phần 2 — Toán cao cấp (verbatim)

Các vấn đề trọng tâm của môn Toán cao cấp, gồm:

- Véc tơ, ma trận và các phép toán trên ma trận; Định thức và cách tính định thức; Hệ phương trình tuyến tính;
- Hàm số một biến số: Giới hạn và tính liên tục của hàm số; Phép tính vi phân của hàm một biến; Phép tính tích phân của hàm một biến;
- Hàm số nhiều biến số: Đạo hàm riêng và vi phân của hàm nhiều biến; Cực trị của hàm nhiều biến;
- Tích phân hàm nhiều biến: Tích phân hai lớp, các công thức đổi biến; Tích phân ba lớp, các công thức đổi biến; Tích phân đường.
- Chuỗi số, chuỗi lũy thừa: Chuỗi số dương; Chuỗi đan dấu; Chuỗi lũy thừa;
- Phương trình vi phân: Phương trình vi phân cấp một; Phương trình vi phân tuyến tính cấp hai với hệ số hằng.

## Frame (`EXAM_SPECS.CA1`)

| Block | Count | `originalNumber` | Fields |
|---|---|---|---|
| Independent MCQ | 39 | 1–39 | `type: "mcq"`, `section: "independent"`, options A–D |
| Passage clusters | 2 × 3 | 40–42, 43–45 | `section: "cluster"`, `clusterKind: "passage"`, shared `passage` |
| Numeric fill | 5 | 46–50 | `type: "fill"`, `section: "fill"`, no options |

Cluster header pattern: `Dựa vào thông tin dưới đây và trả lời các câu từ {start} đến {end}.`

Fill header pattern: `Câu trắc nghiệm trả lời ngắn. Thí sinh trả lời các câu từ {start} đến {end}.`

## Independent MCQ topic floor (39)

| Topic | Min |
|---|---|
| Véc tơ, ma trận, phép toán trên ma trận | 3 |
| Định thức | 2 |
| Hệ phương trình tuyến tính | 2 |
| Giới hạn và liên tục (một biến) | 3 |
| Vi phân hàm một biến | 3 |
| Tích phân hàm một biến | 3 |
| Đạo hàm riêng và vi phân nhiều biến | 2 |
| Cực trị hàm nhiều biến | 2 |
| Tích phân hai lớp + đổi biến | 2 |
| Tích phân ba lớp + đổi biến | 2 |
| Tích phân đường | 2 |
| Chuỗi số dương | 2 |
| Chuỗi đan dấu | 1 |
| Chuỗi lũy thừa | 2 |
| PTVP cấp một | 2 |
| PTVP tuyến tính cấp hai hệ số hằng | 2 |

Floor = 35. Remaining independent items plus clusters and fills cover thin topics. Nothing outside this syllabus.

## Quality

- Vietnamese stems; LaTeX for math
- Unique correct MCQ option
- Fill answers: simplified numbers
- Distinct from bank after `normalizeForHash` (Jaccard < 0.55 when possible)
