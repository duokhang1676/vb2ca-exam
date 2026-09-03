import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { EXAM_SPECS } from "./constants";
import { normalizeForHash } from "./fingerprint";
import { optionalText } from "./json";
import { persistExam } from "./persist-exam";
import {
  isClusterKind,
  isMcq,
  normalizeQuestionType,
  type AnswerKey,
  type ClusterKind,
  type ExamCode,
  type McqOptions,
  type Question,
  type SectionMode,
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
  id: string;
  type: string;
  stem: string;
  options: unknown;
  answer: string;
  cluster_id: string | null;
  cluster_position: number | null;
  topic: string | null;
  solution: string | null;
};

type BankClusterRow = {
  id: string;
  kind: string;
  passage: string;
};

function toQuestion(
  row: BankQuestionRow,
  originalNumber: number,
  extra?: Partial<Question>,
): { question: Question; answer: string } {
  const type = normalizeQuestionType(row.type);
  return {
    question: {
      originalNumber,
      type,
      stem: row.stem,
      options: type === "mcq" ? (row.options as McqOptions) : undefined,
      ...(optionalText(row.topic) ? { topic: optionalText(row.topic) } : {}),
      ...(optionalText(row.solution) ? { solution: optionalText(row.solution) } : {}),
      ...extra,
    },
    answer: row.answer,
  };
}

export async function assembleRandomExam(
  examCode: ExamCode,
  sectionMode: SectionMode = "full",
  essayId?: string,
) {
  const supabase = getSupabaseAdmin();
  const spec = EXAM_SPECS[examCode];

  const [essaysResult, questionsResult, clustersResult] = await Promise.all([
    supabase.from("essays").select("id, title, prompt, topic, solution"),
    supabase
      .from("questions")
      .select(
        "id, type, stem, options, answer, cluster_id, cluster_position, topic, solution",
      )
      .eq("exam_code", examCode),
    supabase
      .from("question_clusters")
      .select("id, kind, passage")
      .eq("exam_code", examCode),
  ]);

  if (essaysResult.error) throw new Error(essaysResult.error.message);
  if (questionsResult.error) throw new Error(questionsResult.error.message);
  if (clustersResult.error) throw new Error(clustersResult.error.message);

  const essays = essaysResult.data ?? [];
  const bank = (questionsResult.data ?? []) as BankQuestionRow[];
  const clusterRows = (clustersResult.data ?? []) as BankClusterRow[];

  if (essays.length === 0 && sectionMode !== "part2") {
    throw new Error(
      "Ngân hàng chưa có đề nghị luận xã hội. Hãy đóng góp Phần 1 hoặc dùng đề minh họa 2026.",
    );
  }
  if (bank.length === 0 && sectionMode !== "part1") {
    throw new Error(
      `Ngân hàng chưa có câu hỏi mã ${examCode}. Hãy đóng góp Phần 2 hoặc dùng đề minh họa 2026.`,
    );
  }

  const requestedEssay =
    sectionMode !== "part2" && essayId
      ? essays.find((essay) => essay.id === essayId) ?? null
      : null;
  if (sectionMode !== "part2" && essayId && !requestedEssay) {
    throw new Error("Không tìm thấy đề nghị luận đã chọn.");
  }
  const pickedEssay =
    sectionMode === "part2"
      ? null
      : requestedEssay ?? pickRandom(essays, 1)[0] ?? null;
  const essayPrompt = pickedEssay?.prompt ?? "";
  const clusteredStems = new Set(
    bank
      .filter((row) => row.cluster_id)
      .map((row) => normalizeForHash(row.stem)),
  );
  const independent = bank.filter(
    (row) =>
      !row.cluster_id &&
      isMcq(row.type) &&
      !clusteredStems.has(normalizeForHash(row.stem)),
  );
  const fillPool = bank.filter((row) => !isMcq(row.type));

  const completeClusters = clusterRows
    .map((cluster) => {
      const members = bank
        .filter((row) => row.cluster_id === cluster.id)
        .sort((a, b) => (a.cluster_position ?? 0) - (b.cluster_position ?? 0))
        .slice(0, spec.clusterSize);
      return { cluster, members };
    })
    .filter((item) => item.members.length >= spec.clusterSize);

  const selectedIndependent =
    sectionMode === "part1" ? [] : pickRandom(independent, spec.independentMcq);
  const selectedClusters =
    sectionMode === "part1" ? [] : pickRandom(completeClusters, spec.clusters);
  const selectedFill =
    sectionMode === "part1" ? [] : pickRandom(fillPool, spec.fill);

  const questions: Question[] = [];
  const answerKey: AnswerKey = {};
  let number = 1;

  for (const row of selectedIndependent) {
    const mapped = toQuestion(row, number, { section: "independent" });
    questions.push(mapped.question);
    answerKey[String(number)] = mapped.answer;
    number += 1;
  }

  for (const { cluster, members } of selectedClusters) {
    const kind: ClusterKind = isClusterKind(cluster.kind)
      ? cluster.kind
      : spec.clusterKind;
    members.forEach((row, index) => {
      const mapped = toQuestion(row, number, {
        section: "cluster",
        clusterId: cluster.id,
        clusterPosition: index + 1,
        clusterKind: kind,
        passage: cluster.passage,
      });
      questions.push(mapped.question);
      answerKey[String(number)] = mapped.answer;
      number += 1;
    });
  }

  for (const row of selectedFill) {
    const mapped = toQuestion(row, number, { section: "fill" });
    questions.push(mapped.question);
    answerKey[String(number)] = mapped.answer;
    number += 1;
  }

  if (questions.length === 0 && sectionMode !== "part1") {
    throw new Error(`Không lấy được câu hỏi mã ${examCode}.`);
  }

  const belowSpec = sectionMode !== "part1" && questions.length < spec.total;
  const sectionNote =
    sectionMode === "part1"
      ? " — Phần 1"
      : sectionMode === "part2"
        ? " — Phần 2"
        : "";
  const chosenTitle = optionalText(pickedEssay?.title);
  const examTitle = requestedEssay
    ? `${examCode} — ${chosenTitle ?? "Nghị luận"}${sectionNote}`
    : belowSpec
      ? `${examCode} — Đề ngẫu nhiên (${questions.length}/${spec.total} câu)${sectionNote}`
      : `${examCode} — Đề ngẫu nhiên${sectionNote}`;

  return persistExam({
    title: examTitle,
    essayPrompt,
    essayTopic: optionalText(pickedEssay?.topic),
    essaySolution: optionalText(pickedEssay?.solution),
    questions,
    answerKey,
    examCode,
    source: "random",
  });
}
