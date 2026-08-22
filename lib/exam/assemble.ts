import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { EXAM_SPECS } from "./constants";
import { persistExam } from "./persist-exam";
import {
  isMcq,
  normalizeQuestionType,
  type AnswerKey,
  type ExamCode,
  type McqOptions,
  type Question,
} from "./types";

function pickRandom<T>(items: T[], count: number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.max(0, count));
}

type BankQuestionRow = {
  type: string;
  stem: string;
  options: unknown;
  answer: string;
};

export async function assembleRandomExam(examCode: ExamCode) {
  const supabase = getSupabaseAdmin();
  const spec = EXAM_SPECS[examCode];

  const [essaysResult, questionsResult] = await Promise.all([
    supabase.from("essays").select("prompt"),
    supabase
      .from("questions")
      .select("type, stem, options, answer")
      .eq("exam_code", examCode),
  ]);

  if (essaysResult.error) throw new Error(essaysResult.error.message);
  if (questionsResult.error) throw new Error(questionsResult.error.message);

  const essays = essaysResult.data ?? [];
  const bank = (questionsResult.data ?? []) as BankQuestionRow[];

  if (essays.length === 0) {
    throw new Error(
      "Ngân hàng chưa có đề nghị luận xã hội. Hãy đóng góp Phần 1 hoặc dùng đề minh họa 2026.",
    );
  }
  if (bank.length === 0) {
    throw new Error(
      `Ngân hàng chưa có câu hỏi mã ${examCode}. Hãy đóng góp Phần 2 hoặc dùng đề minh họa 2026.`,
    );
  }

  const essayPrompt = pickRandom(essays, 1)[0].prompt;
  const mcqPool = bank.filter((row) => isMcq(row.type));
  const fillPool = bank.filter((row) => !isMcq(row.type));
  const selected = [
    ...pickRandom(mcqPool, spec.mcq),
    ...pickRandom(fillPool, spec.fill),
  ];

  if (selected.length === 0) {
    throw new Error(`Không lấy được câu hỏi mã ${examCode}.`);
  }

  const questions: Question[] = [];
  const answerKey: AnswerKey = {};

  selected.forEach((row, index) => {
    const originalNumber = index + 1;
    const type = normalizeQuestionType(row.type);
    questions.push({
      originalNumber,
      type,
      stem: row.stem,
      options: type === "mcq" ? (row.options as McqOptions) : undefined,
    });
    answerKey[String(originalNumber)] = row.answer;
  });

  const belowSpec = selected.length < spec.total;

  return persistExam({
    title: belowSpec
      ? `${examCode} — Đề ngẫu nhiên (${selected.length}/${spec.total} câu)`
      : `${examCode} — Đề ngẫu nhiên`,
    essayPrompt,
    questions,
    answerKey,
    examCode,
    source: "random",
  });
}
