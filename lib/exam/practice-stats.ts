import { questionFingerprint, sha256 } from "./fingerprint";
import { parseQuestions } from "./json";
import {
  isMarkedFingerprint,
  listUserMarks,
  markSet,
} from "./marks";
import {
  isAttemptMode,
  isExamCode,
  isSectionMode,
  normalizeQuestionType,
  type ExamCode,
  type McqDetailItem,
  type McqOptions,
  type QuestionType,
  type SectionMode,
} from "./types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const UNCLASSIFIED_TOPIC = "Chưa phân loại";

export type PracticeSummary = {
  submitted: number;
  avgTotal: number | null;
  latestTotal: number | null;
  bestTotal: number | null;
  mcqCorrectRate: number | null;
  avgEssay: number | null;
  byCode: { CA1: number; CA4: number };
  bySection: { full: number; part1: number; part2: number };
  recentScores: number[];
  wrongTopics: { topic: string; count: number }[];
  markedCount: number;
};

export type PracticeInsightPayload = {
  submitted: number;
  avgTotal: number | null;
  latestTotal: number | null;
  bestTotal: number | null;
  mcqCorrectRate: number | null;
  byCode: { CA1: number; CA4: number };
  bySection: { full: number; part1: number; part2: number };
  recentScores: number[];
  wrongTopics: { topic: string; count: number }[];
  markedCount: number;
};

export type MarkedEssayItem = {
  fingerprint: string;
  prompt: string;
  topic?: string;
  solution?: string;
};

export type MarkedQuestionItem = {
  fingerprint: string;
  examCode: ExamCode;
  type: QuestionType;
  stem: string;
  options?: McqOptions;
  answer: string;
  topic?: string;
  solution?: string;
};

export type WrongQuestionItem = {
  fingerprint: string;
  examCode: ExamCode;
  type: QuestionType;
  stem: string;
  options?: McqOptions;
  topic?: string;
  userAnswer: string | null;
  correctDisplayAnswer: string;
  timesWrong: number;
};

export type PracticeReview = {
  summary: PracticeSummary;
  payload: PracticeInsightPayload;
  payloadHash: string;
  markedEssays: MarkedEssayItem[];
  markedQuestions: MarkedQuestionItem[];
  wrongQuestions: WrongQuestionItem[];
};

export function compactPracticePayload(
  summary: PracticeSummary,
): PracticeInsightPayload {
  return {
    submitted: summary.submitted,
    avgTotal: summary.avgTotal,
    latestTotal: summary.latestTotal,
    bestTotal: summary.bestTotal,
    mcqCorrectRate: summary.mcqCorrectRate,
    byCode: summary.byCode,
    bySection: summary.bySection,
    recentScores: summary.recentScores,
    wrongTopics: summary.wrongTopics.slice(0, 8),
    markedCount: summary.markedCount,
  };
}

export function practicePayloadHash(payload: PracticeInsightPayload): string {
  return sha256(JSON.stringify(payload));
}

function finiteNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function topicLabel(value?: string | null): string {
  const trimmed = value?.trim();
  return trimmed || UNCLASSIFIED_TOPIC;
}

export async function loadPracticeReview(userId: string): Promise<PracticeReview> {
  const supabase = getSupabaseAdmin();
  const [attemptsResult, essaysResult, questionsResult, marks] = await Promise.all([
    supabase
      .from("attempts")
      .select(
        "submitted_at, total_score, essay_score, mcq_detail, section_mode, attempt_mode, exams(exam_code, questions)",
      )
      .eq("user_id", userId)
      .not("submitted_at", "is", null)
      .order("submitted_at", { ascending: false }),
    supabase
      .from("essays")
      .select("prompt, fingerprint, topic, solution"),
    supabase
      .from("questions")
      .select("exam_code, type, stem, options, answer, fingerprint, topic, solution"),
    listUserMarks(userId),
  ]);
  if (attemptsResult.error) throw new Error(attemptsResult.error.message);
  if (essaysResult.error) throw new Error(essaysResult.error.message);
  if (questionsResult.error) throw new Error(questionsResult.error.message);

  const essayMarks = markSet(marks, "essay");
  const questionMarks = markSet(marks, "question");

  const markedEssays: MarkedEssayItem[] = (essaysResult.data ?? [])
    .filter((row) => essayMarks.has(row.fingerprint))
    .map((row) => ({
      fingerprint: row.fingerprint,
      prompt: row.prompt,
      topic: row.topic ?? undefined,
      solution: row.solution ?? undefined,
    }));

  const markedQuestions: MarkedQuestionItem[] = [];
  for (const row of questionsResult.data ?? []) {
    if (!isExamCode(row.exam_code)) continue;
    const type = normalizeQuestionType(row.type);
    const options = (row.options as McqOptions | null) ?? undefined;
    const computed = questionFingerprint({
      examCode: row.exam_code,
      type,
      stem: row.stem,
      options,
    });
    if (!isMarkedFingerprint(questionMarks, row.fingerprint, computed)) continue;
    markedQuestions.push({
      fingerprint: computed,
      examCode: row.exam_code,
      type,
      stem: row.stem,
      options,
      answer: row.answer,
      topic: row.topic ?? undefined,
      solution: row.solution ?? undefined,
    });
  }

  const byCode = { CA1: 0, CA4: 0 };
  const bySection: Record<SectionMode, number> = { full: 0, part1: 0, part2: 0 };
  const totals: number[] = [];
  const essayScores: number[] = [];
  let mcqCorrect = 0;
  let mcqTotal = 0;
  const topicCounts = new Map<string, number>();
  const wrongByFingerprint = new Map<string, WrongQuestionItem>();

  for (const row of attemptsResult.data ?? []) {
    const exam = Array.isArray(row.exams) ? row.exams[0] : row.exams;
    const rawCode = exam?.exam_code;
    const examCode: ExamCode = isExamCode(rawCode) ? rawCode : "CA1";
    byCode[examCode] += 1;
    const sectionMode = isSectionMode(row.section_mode) ? row.section_mode : "full";
    bySection[sectionMode] += 1;
    const total = finiteNumber(row.total_score);
    if (total != null) totals.push(total);

    const attemptMode = isAttemptMode(row.attempt_mode) ? row.attempt_mode : "exam";
    if (attemptMode !== "practice" && sectionMode !== "part2") {
      const essay = finiteNumber(row.essay_score);
      if (essay != null) essayScores.push(essay);
    }

    let examQuestions: ReturnType<typeof parseQuestions> = [];
    try {
      examQuestions = parseQuestions(exam?.questions ?? []);
    } catch {
      examQuestions = [];
    }
    const topicByNumber = new Map(
      examQuestions.map((question) => [question.originalNumber, question.topic]),
    );

    const detail = Array.isArray(row.mcq_detail)
      ? (row.mcq_detail as McqDetailItem[])
      : [];
    if (sectionMode !== "part1" && detail.length > 0) {
      mcqTotal += detail.length;
      for (const item of detail) {
        if (item.isCorrect) {
          mcqCorrect += 1;
          continue;
        }
        const type = normalizeQuestionType(item.type);
        const topic = topicLabel(topicByNumber.get(item.originalNumber) ?? item.topic);
        topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
        const fingerprint = questionFingerprint({
          examCode,
          type,
          stem: item.stem,
          options: item.options,
        });
        const existing = wrongByFingerprint.get(fingerprint);
        if (existing) {
          existing.timesWrong += 1;
          continue;
        }
        wrongByFingerprint.set(fingerprint, {
          fingerprint,
          examCode,
          type,
          stem: item.stem,
          options: item.options,
          topic: topic === UNCLASSIFIED_TOPIC ? undefined : topic,
          userAnswer: item.userAnswer,
          correctDisplayAnswer: item.correctDisplayAnswer,
          timesWrong: 1,
        });
      }
    }
  }

  const submitted = attemptsResult.data?.length ?? 0;
  const avgTotal =
    totals.length === 0
      ? null
      : Number((totals.reduce((sum, n) => sum + n, 0) / totals.length).toFixed(1));
  const latestTotal = totals[0] ?? null;
  const bestTotal = totals.length === 0 ? null : Math.max(...totals);
  const avgEssay =
    essayScores.length === 0
      ? null
      : Number(
          (essayScores.reduce((sum, n) => sum + n, 0) / essayScores.length).toFixed(1),
        );
  const mcqCorrectRate =
    mcqTotal === 0 ? null : Number((mcqCorrect / mcqTotal).toFixed(3));
  const wrongTopics = [...topicCounts.entries()]
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic, "vi"));
  const wrongQuestions = [...wrongByFingerprint.values()].sort(
    (a, b) => b.timesWrong - a.timesWrong || a.stem.localeCompare(b.stem, "vi"),
  );

  const summary: PracticeSummary = {
    submitted,
    avgTotal,
    latestTotal,
    bestTotal,
    mcqCorrectRate,
    avgEssay,
    byCode,
    bySection,
    recentScores: totals.slice(0, 10),
    wrongTopics,
    markedCount: markedEssays.length + markedQuestions.length,
  };
  const payload = compactPracticePayload(summary);

  return {
    summary,
    payload,
    payloadHash: practicePayloadHash(payload),
    markedEssays,
    markedQuestions,
    wrongQuestions,
  };
}
