import { readFile } from "node:fs/promises";
import path from "node:path";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { importParsedIntoBank } from "./bank";
import { EXAM_SPECS, SAMPLE_FILES, SAMPLE_TITLES } from "./constants";
import { parseAnswerKeyJson, parseQuestions } from "./json";
import { parseAnswerKey } from "./parse-answers";
import { parseExamPdf } from "./parse-pdf";
import { persistExam } from "./persist-exam";
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
    .select("id, questions")
    .eq("title", title)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing.data?.id) {
    const hasClusters = parseQuestions(existing.data.questions).some((question) =>
      Boolean(question.clusterId),
    );
    if (hasClusters) {
      await seedBankFromSample(examCode).catch((error) => {
        console.error("seed bank from sample failed", error);
      });
      return { examId: existing.data.id };
    }
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
  const spec = EXAM_SPECS[examCode];
  const [{ count: essayCount }, { count: questionCount }, { count: clusterCount }] =
    await Promise.all([
      supabase.from("essays").select("id", { count: "exact", head: true }),
      supabase
        .from("questions")
        .select("id", { count: "exact", head: true })
        .eq("exam_code", examCode),
      supabase
        .from("question_clusters")
        .select("id", { count: "exact", head: true })
        .eq("exam_code", examCode),
    ]);

  if (
    (essayCount ?? 0) > 0 &&
    (questionCount ?? 0) > 0 &&
    (clusterCount ?? 0) >= spec.clusters
  ) {
    return;
  }

  const title = SAMPLE_TITLES[examCode];
  const { data: exam } = await supabase
    .from("exams")
    .select("essay_prompt, questions, answer_key")
    .eq("title", title)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (exam) {
    const questions = parseQuestions(exam.questions);
    if (questions.some((question) => Boolean(question.clusterId))) {
      await importParsedIntoBank({
        examCode,
        essayPrompt: exam.essay_prompt,
        questions,
        answerKey: parseAnswerKeyJson(exam.answer_key),
        sourceFilename: SAMPLE_FILES[examCode].pdf,
      });
      return;
    }
  }

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
