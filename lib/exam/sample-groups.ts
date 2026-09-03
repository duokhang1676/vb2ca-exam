import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isExamCode, isSectionMode, type ExamCode, type SectionMode } from "./types";

export type SampleGroupItem = {
  examId: string;
  sectionMode: SectionMode;
};

export type SampleGroup = {
  id: string;
  name: string;
  examCode: ExamCode;
  sortOrder: number;
  items: SampleGroupItem[];
};

function asExamCode(value: string): ExamCode {
  if (!isExamCode(value)) throw new Error("Mã đề không hợp lệ.");
  return value;
}

function asSectionMode(value: string): SectionMode {
  if (!isSectionMode(value)) throw new Error("Phần đề không hợp lệ.");
  return value;
}

export async function listSampleGroups(
  userId: string,
  examCode: ExamCode,
): Promise<SampleGroup[]> {
  const supabase = getSupabaseAdmin();
  const { data: groups, error } = await supabase
    .from("sample_exam_groups")
    .select("id, name, exam_code, sort_order")
    .eq("user_id", userId)
    .eq("exam_code", examCode)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  if (!groups?.length) return [];

  const { data: items, error: itemsError } = await supabase
    .from("sample_exam_group_items")
    .select("group_id, exam_id, section_mode, sort_order")
    .eq("user_id", userId)
    .in(
      "group_id",
      groups.map((group) => group.id),
    )
    .order("sort_order", { ascending: true });
  if (itemsError) throw new Error(itemsError.message);

  const byGroup = new Map<string, SampleGroupItem[]>();
  for (const item of items ?? []) {
    const list = byGroup.get(item.group_id) ?? [];
    list.push({
      examId: item.exam_id,
      sectionMode: asSectionMode(item.section_mode),
    });
    byGroup.set(item.group_id, list);
  }

  return groups.map((group) => ({
    id: group.id,
    name: group.name,
    examCode: asExamCode(group.exam_code),
    sortOrder: group.sort_order,
    items: byGroup.get(group.id) ?? [],
  }));
}

export async function createSampleGroup(params: {
  userId: string;
  examCode: ExamCode;
  name: string;
}): Promise<SampleGroup> {
  const name = params.name.trim();
  if (!name) throw new Error("Tên nhóm không được để trống.");
  const supabase = getSupabaseAdmin();
  const { data: existing, error: countError } = await supabase
    .from("sample_exam_groups")
    .select("sort_order")
    .eq("user_id", params.userId)
    .eq("exam_code", params.examCode)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (countError) throw new Error(countError.message);

  const { data, error } = await supabase
    .from("sample_exam_groups")
    .insert({
      user_id: params.userId,
      exam_code: params.examCode,
      name,
      sort_order: (existing?.sort_order ?? -1) + 1,
    })
    .select("id, name, exam_code, sort_order")
    .single();
  if (error || !data) throw new Error(error?.message || "Không tạo được nhóm.");

  return {
    id: data.id,
    name: data.name,
    examCode: asExamCode(data.exam_code),
    sortOrder: data.sort_order,
    items: [],
  };
}

export async function renameSampleGroup(params: {
  userId: string;
  groupId: string;
  name: string;
}): Promise<SampleGroup> {
  const name = params.name.trim();
  if (!name) throw new Error("Tên nhóm không được để trống.");
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("sample_exam_groups")
    .update({ name })
    .eq("id", params.groupId)
    .eq("user_id", params.userId)
    .select("id, name, exam_code, sort_order")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Không tìm thấy nhóm.");

  const items = await listSampleGroups(params.userId, asExamCode(data.exam_code));
  const current = items.find((group) => group.id === data.id);
  return (
    current ?? {
      id: data.id,
      name: data.name,
      examCode: asExamCode(data.exam_code),
      sortOrder: data.sort_order,
      items: [],
    }
  );
}

export async function deleteSampleGroup(userId: string, groupId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("sample_exam_groups")
    .delete()
    .eq("id", groupId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Không tìm thấy nhóm.");
  return { ok: true };
}

export async function reorderSampleGroups(params: {
  userId: string;
  examCode: ExamCode;
  groups: { id: string; items: SampleGroupItem[] }[];
}): Promise<SampleGroup[]> {
  const supabase = getSupabaseAdmin();
  const current = await listSampleGroups(params.userId, params.examCode);
  const allowed = new Set(current.map((group) => group.id));
  if (params.groups.some((group) => !allowed.has(group.id))) {
    throw new Error("Nhóm không hợp lệ.");
  }
  if (params.groups.length !== current.length) {
    throw new Error("Danh sách nhóm không khớp.");
  }

  const seen = new Set<string>();
  const examIds = new Set<string>();
  for (const group of params.groups) {
    for (const item of group.items) {
      if (!isSectionMode(item.sectionMode)) {
        throw new Error("Phần đề không hợp lệ.");
      }
      const key = `${item.examId}:${item.sectionMode}`;
      if (seen.has(key)) {
        throw new Error("Một phần đề chỉ thuộc một nhóm.");
      }
      seen.add(key);
      examIds.add(item.examId);
    }
  }

  if (examIds.size > 0) {
    const { data: exams, error: examError } = await supabase
      .from("exams")
      .select("id, exam_code, source, title")
      .in("id", [...examIds]);
    if (examError) throw new Error(examError.message);
    const byId = new Map((exams ?? []).map((exam) => [exam.id, exam]));
    for (const examId of examIds) {
      const exam = byId.get(examId);
      if (
        !exam ||
        exam.source !== "sample" ||
        exam.exam_code !== params.examCode
      ) {
        throw new Error("Đề minh họa không hợp lệ.");
      }
    }
  }

  const groupIds = current.map((group) => group.id);
  const { error: deleteError } = await supabase
    .from("sample_exam_group_items")
    .delete()
    .in("group_id", groupIds)
    .eq("user_id", params.userId);
  if (deleteError) throw new Error(deleteError.message);

  const rows = params.groups.flatMap((group) => {
    return group.items.map((item, itemIndex) => ({
      group_id: group.id,
      user_id: params.userId,
      exam_id: item.examId,
      section_mode: item.sectionMode,
      sort_order: itemIndex,
    }));
  });

  if (rows.length > 0) {
    const { error: insertError } = await supabase
      .from("sample_exam_group_items")
      .insert(rows);
    if (insertError) throw new Error(insertError.message);
  }

  for (const [index, group] of params.groups.entries()) {
    const { error } = await supabase
      .from("sample_exam_groups")
      .update({ sort_order: index })
      .eq("id", group.id)
      .eq("user_id", params.userId);
    if (error) throw new Error(error.message);
  }

  return listSampleGroups(params.userId, params.examCode);
}
