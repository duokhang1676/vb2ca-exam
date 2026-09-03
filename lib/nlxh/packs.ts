import { asJson } from "@/lib/exam/json";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { packSchema, type PackPayload } from "./schemas";
import { packExportPrompt } from "./prompts";
import {
  FRAMEWORK_VERSION,
  PROMPT_VERSION,
  isPracticeMode,
} from "./types";
import { listEssays, upsertAnalysis, upsertSeed } from "./store";

export async function essaysNeedingPack(limit = 5) {
  const essays = await listEssays();
  const supabase = getSupabaseAdmin();
  const { data: analyses } = await supabase
    .from("nlxh_question_analyses")
    .select("essay_id")
    .eq("framework_version", FRAMEWORK_VERSION);
  const hasAnalysis = new Set((analyses ?? []).map((row) => row.essay_id));
  const missing = essays.filter((essay) => !hasAnalysis.has(essay.id));
  return (missing.length > 0 ? missing : essays).slice(0, limit);
}

export async function buildPackPrompt(essayIds?: string[]) {
  const essays = await listEssays();
  const selected = essayIds?.length
    ? essays.filter((essay) => essayIds.includes(essay.id))
    : await essaysNeedingPack(5);
  if (selected.length === 0) {
    throw new Error("Không có đề nghị luận để tạo gói.");
  }
  return {
    prompt: packExportPrompt(
      selected.map((essay) => ({
        fingerprint: essay.fingerprint,
        prompt: essay.prompt,
      })),
    ),
    essays: selected.map((essay) => ({
      id: essay.id,
      fingerprint: essay.fingerprint,
      prompt: essay.prompt.slice(0, 180),
    })),
  };
}

export function parsePackJson(raw: string): PackPayload {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error("JSON không đọc được. Hãy dán đúng output từ chatbot.");
  }
  const pack = packSchema.safeParse(parsed);
  if (!pack.success) {
    throw new Error("JSON không khớp schema gói NLXH.");
  }
  return pack.data;
}

export async function savePackDraft(userId: string, payload: PackPayload) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("nlxh_pack_drafts")
    .insert({
      user_id: userId,
      payload: asJson(payload),
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message || "Không lưu được bản xem trước.");
  return data.id;
}

export async function getPackDraft(userId: string, draftId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("nlxh_pack_drafts")
    .select("*")
    .eq("id", draftId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || new Date(data.expires_at).getTime() < Date.now()) {
    throw new Error("Bản xem trước đã hết hạn. Hãy import lại JSON.");
  }
  const pack = packSchema.safeParse(data.payload);
  if (!pack.success) throw new Error("Dữ liệu xem trước không hợp lệ.");
  return { id: data.id, pack: pack.data };
}

export async function commitPack(userId: string, pack: PackPayload) {
  const essays = await listEssays();
  const byFingerprint = new Map(essays.map((essay) => [essay.fingerprint, essay]));
  let added = 0;
  let skipped = 0;

  for (const item of pack.items) {
    const essay = byFingerprint.get(item.essayFingerprint);
    if (!essay) {
      skipped += 1;
      continue;
    }
    await upsertAnalysis({
      essayId: essay.id,
      analysis: {
        questionType: item.analysis.questionType,
        mainTopic: item.analysis.mainTopic,
        coreIssue: item.analysis.coreIssue,
        keywords: item.analysis.keywords,
        suggestedPosition: item.analysis.suggestedPosition,
        source: "external_pack",
      },
    });
    for (const seed of item.seeds) {
      if (!isPracticeMode(seed.practiceMode)) continue;
      await upsertSeed({
        essayId: essay.id,
        mode: seed.practiceMode,
        level: seed.level,
        data: seed.data,
      });
      added += 1;
    }
    if (item.referenceEssay) {
      const supabase = getSupabaseAdmin();
      await supabase.from("nlxh_reference_essays").upsert(
        {
          essay_id: essay.id,
          framework_version: pack.frameworkVersion || FRAMEWORK_VERSION,
          essay: item.referenceEssay.essay,
          outline: item.referenceEssay.outline,
          source: "external_pack",
        },
        { onConflict: "essay_id,framework_version" },
      );
    }
  }

  await getSupabaseAdmin().from("nlxh_ai_usage").insert({
    user_id: userId,
    action: "import_pack",
    cached: false,
    source: "external_pack",
  });

  return { added, skipped, promptVersion: pack.promptVersion || PROMPT_VERSION };
}
