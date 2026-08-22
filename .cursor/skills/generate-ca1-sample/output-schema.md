# Output JSON

Match `Question` / `AnswerKey` in `lib/exam/types.ts`. `clusterId` may be temporary (`c1`, `c2`); import assigns real UUIDs.

```json
{
  "examCode": "CA1",
  "diversity": 6,
  "essayPrompt": "…đoạn văn bản… yêu cầu nghị luận tối thiểu 500 chữ…",
  "questions": [
    {
      "originalNumber": 1,
      "type": "mcq",
      "section": "independent",
      "stem": "Cho ma trận $A = \\begin{pmatrix} 1 & 2 \\\\ 0 & 3 \\end{pmatrix}$. …",
      "options": { "A": "…", "B": "…", "C": "…", "D": "…" }
    },
    {
      "originalNumber": 40,
      "type": "mcq",
      "section": "cluster",
      "clusterId": "c1",
      "clusterPosition": 1,
      "clusterKind": "passage",
      "passage": "Dữ liệu: …",
      "stem": "Giá trị của … là",
      "options": { "A": "…", "B": "…", "C": "…", "D": "…" }
    },
    {
      "originalNumber": 46,
      "type": "fill",
      "section": "fill",
      "stem": "Tính … (kết quả là số nguyên)."
    }
  ],
  "answerKey": {
    "1": "B",
    "40": "A",
    "46": "12"
  }
}
```

Rules:

- `questions.length === 50`, numbers 1–50 with no gaps
- MCQ answers: `A`–`D`
- Fill answers: numeric strings
- Title is **not** in this file; `saveGeneratedSampleExam` assigns `Đề minh họa CA1 - số N`
