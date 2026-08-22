---
name: generate-ca1-sample
description: >-
  Generates a new CA1 minh họa exam (Phần 1 nghị luận xã hội + Phần 2 Toán cao cấp,
  50 câu đúng cấu trúc CA1) from the existing bank and sample exams, then saves it
  as "Đề minh họa CA1 - số N" and imports it into the bank. Use when the user asks
  to tạo đề minh họa CA1, generate CA1 sample, thêm đề CA1, or passes diversity 0-10.
disable-model-invocation: true
---

# Generate CA1 sample exam

Create **one** new CA1 minh họa, persist it, and seed the question bank. Do not overwrite the official 2026 exam.

## Inputs

- `diversity`: integer 0–10. If omitted, default **5**. See [diversity.md](diversity.md).
- Always CA1. Do not generate CA4.

## Title

Official exam stays `Đề minh họa 2026 — CA1`.

New exams use **exactly**:

`Đề minh họa CA1 - số 2`, `Đề minh họa CA1 - số 3`, …

Call `nextGeneratedSampleNumber("CA1")` in `lib/exam/sample.ts` (max existing số N, then +1; first generated is 2). Do not fill gaps. Do not reuse a title.

## Checklist

```
Task Progress:
- [ ] 1. Read diversity (0–10, default 5) and [spec-ca1.md](spec-ca1.md)
- [ ] 2. Load bank: essays + CA1 questions + CA1 clusters
- [ ] 3. Load existing sample exams (source=sample, exam_code=CA1)
- [ ] 4. Compute next title via nextGeneratedSampleNumber
- [ ] 5. Write Phần 1 from bank essays + official NLXH rules
- [ ] 6. Write 50 Phần 2 items from existing minh họa structure + syllabus
- [ ] 7. Solve every item; fill answerKey
- [ ] 8. Diff against bank (fingerprint / Jaccard 0.55)
- [ ] 9. Save JSON + call saveGeneratedSampleExam
- [ ] 10. Report examId, title, added/skipped, topic matrix
```

## Do not

- Overwrite `Đề minh họa 2026 — CA1` or `getOrCreateSampleExam`.
- Skip reading the bank and existing samples.
- Leave the syllabus or CA1 frame (39 MCQ + 2 passage clusters × 3 + 5 numeric fill).
- Import items you have not solved.
- Go through OCR upload; call `saveGeneratedSampleExam` in `lib/exam/sample.ts`.

## Data sources

Read from Supabase (admin client or MCP), not invented:

- `essays.prompt` — Phần 1 tone, layout, used themes
- `questions` where `exam_code = 'CA1'`
- `question_clusters` where `exam_code = 'CA1'`
- `exams` where `exam_code = 'CA1'` and `source = 'sample'`

## Phần 1

Ground the new prompt in **existing bank essays**. Keep one core theme. Required wording and rules: [spec-ca1.md](spec-ca1.md).

The prompt must include:

1. One passage on politics, economy, or culture–society
2. Explicit task: văn nghị luận, tối thiểu 500 chữ, trình bày / đánh giá / phân tích / bình luận
3. Exactly one core theme from the official list
4. No Phần 2, no model answer

## Phần 2

Match existing minh họa structure. Cover every Toán cao cấp topic in [spec-ca1.md](spec-ca1.md). JSON shape: [output-schema.md](output-schema.md).

- Formulas: KaTeX `$...$` / `$$...$$`
- Clusters 40–45: `clusterKind: "passage"`; passage not repeated in stems
- Fills 46–50: numeric answers (like `72`, `0`, `19`)
- One correct MCQ option; plausible distractors
- Diversity 0 still **changes numbers/wording** so import is not skipped; keep problem type

## Save

1. Write `fixtures/generated/ca1-so-N.json` (schema in [output-schema.md](output-schema.md)).
2. Run:

```
npx tsx scripts/import-ca1-sample.ts fixtures/generated/ca1-so-N.json
```

That calls `saveGeneratedSampleExam` (persist `source: "sample"` + `importParsedIntoBank`).

If `tsx` cannot resolve `@/` paths, import `saveGeneratedSampleExam` from `lib/exam/sample.ts` in a short runner from the repo root.

## Report

- `title`, `examId`
- essays `added` / `skipped`
- questions `added` / `skipped`
- topic coverage table
- If skipped > 0: which items looked too close to the bank

After save, refresh `/`. The homepage **Đề minh họa** dropdown lists official `Đề minh họa 2026 — CA1` first, then `Đề minh họa CA1 - số 2`, `số 3`, …
