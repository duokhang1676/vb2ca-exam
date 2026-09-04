import { asJson } from "@/lib/exam/json";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { listEssays } from "./store";
import {
  isSectionKey,
  parseSectionKeys,
  sectionHintsSchema,
  sectionPackSchema,
  SECTION_CONFIG,
  SECTION_KEYS,
  type SectionGradeResult,
  type SectionHistoryItem,
  type SectionKey,
  type SectionPackPayload,
  type SectionPackRow,
  type SectionStats,
} from "./section-types";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function numberFromRecord(record: Record<string, unknown>, key: string): number | null {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function getSectionStats(userId: string): Promise<SectionStats[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("nlxh_section_attempts")
    .select("sections, scores")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);

  const totals = Object.fromEntries(
    SECTION_KEYS.map((key) => [key, { attempts: 0, sum: 0 }]),
  ) as Record<SectionKey, { attempts: number; sum: number }>;

  for (const row of data ?? []) {
    const sections = parseSectionKeys(row.sections);
    const scores = asRecord(row.scores);
    for (const section of sections) {
      const score = numberFromRecord(scores, section);
      totals[section].attempts += 1;
      if (score != null) totals[section].sum += score;
    }
  }

  return SECTION_KEYS.map((section) => {
    const { attempts, sum } = totals[section];
    return {
      section,
      attempts,
      averageScore: attempts > 0 ? Math.round((sum / attempts) * 10) / 10 : null,
      maxScore: SECTION_CONFIG[section].maxScore,
    };
  });
}

export async function getSectionHistory(
  userId: string,
  section: SectionKey,
  limit = 20,
): Promise<SectionHistoryItem[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("nlxh_section_attempts")
    .select("id, essay_prompt, scores, created_at")
    .eq("user_id", userId)
    .contains("sections", [section])
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const scores = asRecord(row.scores);
    return {
      id: row.id,
      createdAt: row.created_at,
      essayPrompt: String(row.essay_prompt ?? "").slice(0, 180),
      score: numberFromRecord(scores, section),
      maxScore: SECTION_CONFIG[section].maxScore,
      total: numberFromRecord(scores, "total"),
    };
  });
}

export async function insertSectionAttempt(params: {
  userId: string;
  essayId: string | null;
  essayPrompt: string;
  sections: SectionKey[];
  answers: Record<SectionKey, string>;
  grade: SectionGradeResult;
  hintCounts: Record<string, number>;
  sectionPackId?: string | null;
}): Promise<string> {
  const supabase = getSupabaseAdmin();
  const scores: Record<string, number> = { total: params.grade.total };
  for (const section of params.sections) {
    const score = params.grade.scores[section];
    if (typeof score === "number") scores[section] = score;
  }
  const { data, error } = await supabase
    .from("nlxh_section_attempts")
    .insert({
      user_id: params.userId,
      essay_id: params.essayId,
      essay_prompt: params.essayPrompt,
      sections: params.sections,
      answers: asJson(params.answers),
      scores: asJson(scores),
      feedback: asJson({
        ...params.grade.feedback,
        overall: params.grade.overall,
        suggestions: params.grade.suggestions,
      }),
      hint_counts: asJson(params.hintCounts),
      section_pack_id: params.sectionPackId ?? null,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message || "Không lưu được bài làm.");
  return data.id;
}

export async function listSectionPacks(): Promise<SectionPackRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("nlxh_section_packs")
    .select("id, title, serial_number, essay_id, essay_prompt, created_at")
    .order("serial_number", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title || `Đề NLXH số ${row.serial_number}`,
    serialNumber: row.serial_number,
    essayId: row.essay_id,
    essayPrompt: String(row.essay_prompt ?? "").slice(0, 180),
    createdAt: row.created_at,
  }));
}

export async function getSectionPack(id: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("nlxh_section_packs")
    .select("id, title, serial_number, essay_id, essay_prompt, hints")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const hints = sectionHintsSchema.safeParse(data.hints);
  if (!hints.success) return null;
  return {
    id: data.id,
    title: data.title || `Đề NLXH số ${data.serial_number}`,
    serialNumber: data.serial_number,
    essayId: data.essay_id as string | null,
    essayPrompt: String(data.essay_prompt ?? ""),
    hints: hints.data,
  };
}

export async function nextSectionPackSerial(): Promise<number> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("nlxh_section_packs")
    .select("serial_number")
    .order("serial_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.serial_number ?? 0) + 1;
}

export function parseSectionPackJson(raw: string): SectionPackPayload {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error("JSON không đọc được. Hãy dán đúng output từ chatbot.");
  }
  const pack = sectionPackSchema.safeParse(parsed);
  if (!pack.success) {
    throw new Error("JSON không khớp schema gói luyện tập theo phần.");
  }
  return pack.data;
}

export async function saveSectionPackDraft(userId: string, payload: SectionPackPayload) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("nlxh_section_pack_drafts")
    .insert({
      user_id: userId,
      payload: asJson(payload),
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message || "Không lưu được bản xem trước.");
  return data.id;
}

export async function getSectionPackDraft(userId: string, draftId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("nlxh_section_pack_drafts")
    .select("*")
    .eq("id", draftId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || new Date(data.expires_at).getTime() < Date.now()) {
    throw new Error("Bản xem trước đã hết hạn. Hãy import lại JSON.");
  }
  const pack = sectionPackSchema.safeParse(data.payload);
  if (!pack.success) throw new Error("Dữ liệu xem trước không hợp lệ.");
  return { id: data.id, pack: pack.data };
}

export async function commitSectionPack(userId: string, pack: SectionPackPayload) {
  const essays = await listEssays();
  const matched = pack.essayFingerprint
    ? essays.find((essay) => essay.fingerprint === pack.essayFingerprint)
    : essays.find((essay) => essay.prompt.trim() === pack.essayPrompt.trim());
  const serialNumber = await nextSectionPackSerial();
  const title = `Đề NLXH số ${serialNumber}`;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("nlxh_section_packs")
    .insert({
      essay_id: matched?.id ?? null,
      essay_prompt: pack.essayPrompt,
      essay_fingerprint: pack.essayFingerprint ?? matched?.fingerprint ?? null,
      hints: asJson(pack.hints),
      created_by: userId,
      title,
      serial_number: serialNumber,
    })
    .select("id, title, serial_number")
    .single();
  if (error || !data) throw new Error(error?.message || "Không nạp được gói đề.");
  return {
    packId: data.id,
    title: data.title,
    serialNumber: data.serial_number,
    essayId: matched?.id ?? null,
    matched: Boolean(matched),
  };
}

export async function updateSectionPack(
  id: string,
  patch: {
    title?: string;
    essayPrompt?: string;
    hints?: SectionPackPayload["hints"];
  },
) {
  const current = await getSectionPack(id);
  if (!current) throw new Error("Không tìm thấy đề.");
  const updates: {
    title?: string;
    essay_prompt?: string;
    hints?: ReturnType<typeof asJson>;
  } = {};
  if (typeof patch.title === "string") {
    const title = patch.title.trim();
    if (!title) throw new Error("Tên đề không được để trống.");
    if (title.length > 120) throw new Error("Tên đề tối đa 120 ký tự.");
    updates.title = title;
  }
  if (typeof patch.essayPrompt === "string") {
    const essayPrompt = patch.essayPrompt.trim();
    if (essayPrompt.length < 10) throw new Error("Đề bài quá ngắn.");
    if (essayPrompt.length > 8000) throw new Error("Đề bài quá dài.");
    updates.essay_prompt = essayPrompt;
  }
  if (patch.hints) {
    const hints = sectionHintsSchema.safeParse(patch.hints);
    if (!hints.success) throw new Error("Gợi ý không khớp schema (mỗi phần đúng 3 gợi ý).");
    updates.hints = asJson(hints.data);
  }
  if (Object.keys(updates).length === 0) return current;
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("nlxh_section_packs").update(updates).eq("id", id);
  if (error) throw new Error(error.message);
  const next = await getSectionPack(id);
  if (!next) throw new Error("Không đọc được đề sau khi cập nhật.");
  return next;
}

export async function deleteSectionPack(id: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("nlxh_section_packs")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Không tìm thấy đề.");
}

export function pickRandomEssayId(essayIds: string[]): string | null {
  if (essayIds.length === 0) return null;
  return essayIds[Math.floor(Math.random() * essayIds.length)] ?? null;
}

export function normalizeSelectedSections(value: unknown): SectionKey[] {
  if (typeof value === "string") {
    return value.split(",").map((item) => item.trim()).filter(isSectionKey);
  }
  return parseSectionKeys(value);
}
