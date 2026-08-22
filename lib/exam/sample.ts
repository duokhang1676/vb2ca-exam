import { readFile } from "node:fs/promises";
import path from "node:path";
import { EXAM_SPECS, SAMPLE_FILES, SAMPLE_TITLES } from "./constants";
import { importParsedIntoBank } from "./bank";
import { parseAnswerKey } from "./parse-answers";
import { parseExamPdf } from "./parse-pdf";
import { persistExam } from "./persist-exam";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { ExamCode } from "./types";

export async function loadAndParseSample(examCode: ExamCode) {
  const fixtures = path.join(process.cwd(), "fixtures");
  const files = SAMPLE_FILES[examCode];
  const pdfBytes = await readFile(path.join(fixtures, files.pdf));
  const answerText = await readFile(path.join(fixtures, files.answers), "utf8");
  const answerKey = parseAnswerKey(answerText, EXAM_SPECS[examCode].total);
  const parsed = await parseExamPdf(new Uint8Array(pdfBytes), answerKey, examCode);
  return { pdfBytes, answerText, answerKey, parsed, files };
}

export async function getOrCreateSampleExam(examCode: ExamCode) {
  const supabase = getSupabaseAdmin();
  const title = SAMPLE_TITLES[examCode];
  const existing = await supabase
    .from("exams")
    .select("id")
    .eq("title", title)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing.data?.id) {
    await seedBankFromSample(examCode);
    return { examId: existing.data.id };
  }

  const { pdfBytes, answerText, answerKey, parsed, files } =
    await loadAndParseSample(examCode);

  const exam = await persistExam({
    title,
    essayPrompt: parsed.essayPrompt,
    questions: parsed.questions,
    answerKey,
    examCode,
    source: "sample",
    pdf: { bytes: pdfBytes, filename: files.pdf },
    answerFile: {
      bytes: Buffer.from(answerText, "utf8"),
      filename: files.answers,
    },
  });

  await importParsedIntoBank({
    examCode,
    essayPrompt: parsed.essayPrompt,
    questions: parsed.questions,
    answerKey,
    sourceFilename: files.pdf,
  }).catch((error) => {
    console.error("seed bank from sample failed", error);
  });

  return { examId: exam.id };
}

export async function seedBankFromSample(examCode: ExamCode): Promise<void> {
  const supabase = getSupabaseAdmin();
  const [{ count: essayCount }, { count: questionCount }] = await Promise.all([
    supabase.from("essays").select("id", { count: "exact", head: true }),
    supabase
      .from("questions")
      .select("id", { count: "exact", head: true })
      .eq("exam_code", examCode),
  ]);

  if ((essayCount ?? 0) > 0 && (questionCount ?? 0) > 0) return;

  const { answerKey, parsed, files } = await loadAndParseSample(examCode);
  await importParsedIntoBank({
    examCode,
    essayPrompt: parsed.essayPrompt,
    questions: parsed.questions,
    answerKey,
    sourceFilename: files.pdf,
  });
}

export async function ensureBankReady(examCode: ExamCode): Promise<void> {
  await seedBankFromSample(examCode);
}
