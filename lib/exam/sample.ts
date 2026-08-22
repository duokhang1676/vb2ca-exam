import { readFile } from "node:fs/promises";
import path from "node:path";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { importParsedIntoBank } from "./bank";
import {
  EXAM_SPECS,
  SAMPLE_FILES,
  SAMPLE_TITLES,
  generatedSampleTitle,
  parseGeneratedSampleNumber,
} from "./constants";
import { parseAnswerKeyJson, parseQuestions } from "./json";
import { parseAnswerKey } from "./parse-answers";
import { parseExamPdf } from "./parse-pdf";
import { persistExam } from "./persist-exam";
import {
  normalizeQuestionType,
  type AnswerKey,
  type ExamCode,
  type Question,
  type SampleExamOption,
} from "./types";

export type { SampleExamOption };

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

export async function listSampleExams(
  examCode: ExamCode,
): Promise<SampleExamOption[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("exams")
    .select("id, title, created_at")
    .eq("exam_code", examCode)
    .eq("source", "sample")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const byTitle = new Map<string, { id: string; title: string }>();
  for (const row of data ?? []) {
    if (!byTitle.has(row.title)) {
      byTitle.set(row.title, { id: row.id, title: row.title });
    }
  }

  const officialTitle = SAMPLE_TITLES[examCode];
  const official = byTitle.get(officialTitle);
  const generated: SampleExamOption[] = [];
  const other: SampleExamOption[] = [];

  for (const row of byTitle.values()) {
    if (row.title === officialTitle) continue;
    const number = parseGeneratedSampleNumber(row.title, examCode);
    if (number != null) {
      generated.push({
        id: row.id,
        title: row.title,
        kind: "generated",
        number,
      });
    } else {
      other.push({
        id: row.id,
        title: row.title,
        kind: "generated",
        number: 0,
      });
    }
  }

  generated.sort((a, b) => a.number - b.number);
  other.sort((a, b) => a.title.localeCompare(b.title, "vi"));

  return [
    {
      id: official?.id ?? null,
      title: officialTitle,
      kind: "official",
      number: 1,
    },
    ...generated,
    ...other,
  ];
}

export async function nextGeneratedSampleNumber(
  examCode: ExamCode,
): Promise<number> {
  const options = await listSampleExams(examCode);
  const maxGenerated = options
    .filter((item) => item.kind === "generated" && item.number >= 2)
    .reduce((max, item) => Math.max(max, item.number), 1);
  return maxGenerated + 1;
}

export async function getExistingSampleExam(
  examCode: ExamCode,
  examId: string,
): Promise<{ examId: string }> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("exams")
    .select("id, exam_code, source")
    .eq("id", examId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (
    !data?.id ||
    data.exam_code !== examCode ||
    data.source !== "sample"
  ) {
    throw new Error("Không tìm thấy đề minh họa.");
  }
  return { examId: data.id };
}

function assertSampleStructure(
  examCode: ExamCode,
  questions: Question[],
  answerKey: AnswerKey,
) {
  const spec = EXAM_SPECS[examCode];
  if (questions.length !== spec.total) {
    throw new Error(
      `Đề ${examCode} phải có đúng ${spec.total} câu phần 2 (đang có ${questions.length}).`,
    );
  }

  const numbers = questions.map((question) => question.originalNumber).sort(
    (a, b) => a - b,
  );
  for (let i = 0; i < spec.total; i += 1) {
    if (numbers[i] !== i + 1) {
      throw new Error(`Thiếu hoặc trùng số câu phần 2 (cần 1–${spec.total}).`);
    }
  }

  const byNumber = new Map(
    questions.map((question) => [question.originalNumber, question]),
  );
  const independentEnd = spec.independentMcq;
  const clusterEnd = independentEnd + spec.clusters * spec.clusterSize;

  for (let n = 1; n <= independentEnd; n += 1) {
    const question = byNumber.get(n);
    if (
      !question ||
      normalizeQuestionType(question.type) !== "mcq" ||
      question.clusterId
    ) {
      throw new Error(`Câu ${n} phải là trắc nghiệm độc lập.`);
    }
  }
  for (let n = independentEnd + 1; n <= clusterEnd; n += 1) {
    const question = byNumber.get(n);
    if (
      !question ||
      normalizeQuestionType(question.type) !== "mcq" ||
      !question.clusterId
    ) {
      throw new Error(`Câu ${n} phải thuộc cụm thông tin/tình huống.`);
    }
    if (!question.passage?.trim()) {
      throw new Error(`Câu ${n} thiếu đoạn thông tin của cụm.`);
    }
  }
  for (let n = clusterEnd + 1; n <= spec.total; n += 1) {
    const question = byNumber.get(n);
    if (!question || normalizeQuestionType(question.type) === "mcq") {
      throw new Error(`Câu ${n} phải là câu điền đáp án.`);
    }
  }

  for (const question of questions) {
    const answer = answerKey[String(question.originalNumber)]?.trim();
    if (!answer) {
      throw new Error(`Thiếu đáp án câu ${question.originalNumber}.`);
    }
  }
}

export async function saveGeneratedSampleExam(params: {
  examCode: ExamCode;
  essayPrompt: string;
  questions: Question[];
  answerKey: AnswerKey;
  diversity?: number;
}) {
  const prompt = params.essayPrompt.trim();
  if (prompt.length < 80) {
    throw new Error("Đề nghị luận quá ngắn.");
  }

  assertSampleStructure(params.examCode, params.questions, params.answerKey);

  const number = await nextGeneratedSampleNumber(params.examCode);
  const title = generatedSampleTitle(params.examCode, number);
  const exam = await persistExam({
    title,
    essayPrompt: prompt,
    questions: params.questions,
    answerKey: params.answerKey,
    examCode: params.examCode,
    source: "sample",
  });

  const imported = await importParsedIntoBank({
    examCode: params.examCode,
    essayPrompt: prompt,
    questions: params.questions,
    answerKey: params.answerKey,
    sourceFilename: `${title}.json`,
  });

  return {
    examId: exam.id,
    title,
    number,
    diversity: params.diversity,
    imported,
  };
}
