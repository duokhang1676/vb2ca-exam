import { asJson } from "@/lib/exam/json";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  FRAMEWORK_VERSION,
  PATH_VERSION,
  PROMPT_VERSION,
  isPracticeMode,
  isQuestionType,
  type PathEnrollment,
  type PracticeMode,
  type QuestionAnalysis,
  type SeedData,
  type SkillProgress,
} from "./types";
import { seedDataSchema } from "./schemas";
import { masteryFromScores } from "./curriculum";

export type EssayRow = {
  id: string;
  prompt: string;
  fingerprint: string;
  topic: string | null;
  solution: string | null;
};

export function mapAnalysis(row: {
  id: string;
  essay_id: string;
  question_type: string;
  main_topic: string;
  core_issue: string;
  keywords: string[];
  suggested_position: string | null;
  framework_version: string;
  source: string;
}): QuestionAnalysis | null {
  if (!isQuestionType(row.question_type)) return null;
  return {
    id: row.id,
    essayId: row.essay_id,
    questionType: row.question_type,
    mainTopic: row.main_topic,
    coreIssue: row.core_issue,
    keywords: row.keywords ?? [],
    suggestedPosition: row.suggested_position ?? undefined,
    frameworkVersion: row.framework_version,
    source: row.source as QuestionAnalysis["source"],
  };
}

export async function listEssays(): Promise<EssayRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("essays")
    .select("id, prompt, fingerprint, topic, solution")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getEssay(id: string): Promise<EssayRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("essays")
    .select("id, prompt, fingerprint, topic, solution")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function getAnalysis(essayId: string): Promise<QuestionAnalysis | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("nlxh_question_analyses")
    .select(
      "id, essay_id, question_type, main_topic, core_issue, keywords, suggested_position, framework_version, source",
    )
    .eq("essay_id", essayId)
    .eq("framework_version", FRAMEWORK_VERSION)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapAnalysis(data) : null;
}

export async function getSeed(params: {
  essayId: string;
  mode: PracticeMode;
  level: number;
}): Promise<{ id: string; data: SeedData } | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("nlxh_exercise_seeds")
    .select("id, data")
    .eq("essay_id", params.essayId)
    .eq("practice_mode", params.mode)
    .eq("level", params.level)
    .eq("framework_version", FRAMEWORK_VERSION)
    .eq("prompt_version", PROMPT_VERSION)
    .eq("status", "valid")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const parsed = seedDataSchema.safeParse(data.data);
  if (!parsed.success) return null;
  return { id: data.id, data: parsed.data };
}

export async function upsertAnalysis(params: {
  essayId: string;
  analysis: Omit<QuestionAnalysis, "id" | "essayId" | "frameworkVersion">;
  model?: string;
}): Promise<QuestionAnalysis> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("nlxh_question_analyses")
    .upsert(
      {
        essay_id: params.essayId,
        question_type: params.analysis.questionType,
        main_topic: params.analysis.mainTopic,
        core_issue: params.analysis.coreIssue,
        keywords: params.analysis.keywords,
        suggested_position: params.analysis.suggestedPosition ?? null,
        framework_version: FRAMEWORK_VERSION,
        source: params.analysis.source,
        ai_model: params.model ?? null,
      },
      { onConflict: "essay_id,framework_version" },
    )
    .select(
      "id, essay_id, question_type, main_topic, core_issue, keywords, suggested_position, framework_version, source",
    )
    .single();
  if (error || !data) throw new Error(error?.message || "Không lưu được phân tích đề.");
  const mapped = mapAnalysis(data);
  if (!mapped) throw new Error("Phân tích đề không hợp lệ.");
  return mapped;
}

export async function upsertSeed(params: {
  essayId: string;
  mode: PracticeMode;
  level: number;
  data: SeedData;
  model?: string;
}): Promise<{ id: string; data: SeedData }> {
  const parsed = seedDataSchema.parse(params.data);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("nlxh_exercise_seeds")
    .upsert(
      {
        essay_id: params.essayId,
        practice_mode: params.mode,
        level: params.level,
        data: asJson(parsed),
        framework_version: FRAMEWORK_VERSION,
        prompt_version: PROMPT_VERSION,
        ai_model: params.model ?? null,
        status: "valid",
      },
      { onConflict: "essay_id,practice_mode,level,framework_version,prompt_version" },
    )
    .select("id, data")
    .single();
  if (error || !data) throw new Error(error?.message || "Không lưu được seed.");
  return { id: data.id, data: parsed };
}

export async function getEnrollment(userId: string): Promise<PathEnrollment | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("nlxh_path_enrollments")
    .select(
      "user_id, path_version, current_step_id, current_essay_id, remedial_skill, remedial_return_step_id, status",
    )
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    userId: data.user_id,
    pathVersion: data.path_version,
    currentStepId: data.current_step_id,
    currentEssayId: data.current_essay_id,
    remedialSkill: isPracticeMode(data.remedial_skill) ? data.remedial_skill : null,
    remedialReturnStepId: data.remedial_return_step_id,
    status: data.status === "completed" ? "completed" : "active",
  };
}

export async function saveEnrollment(enrollment: PathEnrollment): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("nlxh_path_enrollments").upsert({
    user_id: enrollment.userId,
    path_version: enrollment.pathVersion || PATH_VERSION,
    current_step_id: enrollment.currentStepId,
    current_essay_id: enrollment.currentEssayId,
    remedial_skill: enrollment.remedialSkill,
    remedial_return_step_id: enrollment.remedialReturnStepId,
    status: enrollment.status,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

export async function listProgress(userId: string): Promise<SkillProgress[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("nlxh_skill_progress")
    .select("skill, attempts, average_score, recent_average_score, best_score, mastery")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return (data ?? []).flatMap((row) => {
    if (!isPracticeMode(row.skill)) return [];
    return [
      {
        skill: row.skill,
        attempts: row.attempts,
        averageScore: Number(row.average_score),
        recentAverageScore: Number(row.recent_average_score),
        bestScore: Number(row.best_score),
        mastery: masteryFromScores({
          attempts: row.attempts,
          recentAverage: Number(row.recent_average_score),
        }),
      },
    ];
  });
}

export async function recordUsage(params: {
  userId?: string;
  action: string;
  model?: string;
  cached: boolean;
  source: "gemini" | "external_pack" | "local";
  inputTokens?: number;
  outputTokens?: number;
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase.from("nlxh_ai_usage").insert({
    user_id: params.userId ?? null,
    action: params.action,
    model: params.model ?? null,
    cached: params.cached,
    source: params.source,
    input_tokens: params.inputTokens ?? null,
    output_tokens: params.outputTokens ?? null,
  });
}
