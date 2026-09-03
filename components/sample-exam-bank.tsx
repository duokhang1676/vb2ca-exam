"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, LoaderCircle, Plus, Trash2 } from "lucide-react";
import {
  BankEssayFields,
  BankQuestionFields,
  EditToolbar,
  useBankSave,
} from "@/components/bank-item-editor";
import { MarkButton } from "@/components/mark-button";
import { MathText } from "@/components/math-text";
import { SolutionReveal, TopicBadge } from "@/components/question-meta";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OPTION_LETTERS, questionTypeLabel, sectionModeShortLabel } from "@/lib/exam/constants";
import { persistQuestionMark } from "@/lib/exam/persist-mark";
import type { SampleGroup, SampleGroupItem } from "@/lib/exam/sample-groups";
import { toDisplayBlocks } from "@/lib/exam/shuffle";
import {
  isMcq,
  isSectionMode,
  type AnswerKey,
  type ExamCode,
  type Question,
  type SectionMode,
} from "@/lib/exam/types";
import { cn } from "@/lib/utils";

const UNGROUPED = "ungrouped";

export type BankSampleView = {
  id: string;
  title: string;
  examCode: ExamCode;
  kind: "official" | "generated";
  number: number;
  essayPrompt: string;
  essayTopic?: string;
  essaySolution?: string;
  questions: Question[];
  answerKey: AnswerKey;
  essayMarked?: boolean;
  markedNumbers?: number[];
  essayFingerprint?: string;
  questionFingerprints?: Record<number, string>;
};

type Slot = {
  examId: string;
  sectionMode: SectionMode;
  containerId: string;
};

function itemKey(examId: string, mode: SectionMode) {
  return `${examId}::${mode}`;
}

function parseItemKey(id: string): { examId: string; sectionMode: SectionMode } | null {
  const separator = id.lastIndexOf("::");
  if (separator <= 0) return null;
  const examId = id.slice(0, separator);
  const mode = id.slice(separator + 2);
  if (!examId || !isSectionMode(mode)) return null;
  return { examId, sectionMode: mode };
}

function mergePartsInSameGroup(groups: SampleGroup[]): SampleGroup[] {
  return groups.map((group) => {
    const byExam = new Map<string, SampleGroupItem[]>();
    for (const item of group.items) {
      const list = byExam.get(item.examId) ?? [];
      list.push(item);
      byExam.set(item.examId, list);
    }
    const items: SampleGroupItem[] = [];
    const seen = new Set<string>();
    for (const item of group.items) {
      if (seen.has(item.examId)) continue;
      seen.add(item.examId);
      const list = byExam.get(item.examId) ?? [];
      const hasPart1 = list.some((entry) => entry.sectionMode === "part1");
      const hasPart2 = list.some((entry) => entry.sectionMode === "part2");
      const hasFull = list.some((entry) => entry.sectionMode === "full");
      if (!hasFull && hasPart1 && hasPart2) {
        items.push({ examId: item.examId, sectionMode: "full" });
      } else {
        items.push(...list);
      }
    }
    return { ...group, items };
  });
}

function slotsFrom(samples: BankSampleView[], groups: SampleGroup[]): Slot[] {
  const membership = new Map<string, string>();
  for (const group of groups) {
    for (const item of group.items) {
      membership.set(itemKey(item.examId, item.sectionMode), group.id);
    }
  }
  const slots: Slot[] = [];
  for (const sample of samples) {
    const hasPart1 = Boolean(sample.essayPrompt.trim());
    const hasPart2 = sample.questions.length > 0;
    const full = membership.get(itemKey(sample.id, "full"));
    const part1 = membership.get(itemKey(sample.id, "part1"));
    const part2 = membership.get(itemKey(sample.id, "part2"));
    if (full) {
      slots.push({ examId: sample.id, sectionMode: "full", containerId: full });
      continue;
    }
    if (part1 || part2) {
      if (hasPart1) {
        slots.push({
          examId: sample.id,
          sectionMode: "part1",
          containerId: part1 ?? UNGROUPED,
        });
      }
      if (hasPart2) {
        slots.push({
          examId: sample.id,
          sectionMode: "part2",
          containerId: part2 ?? UNGROUPED,
        });
      }
      continue;
    }
    slots.push({ examId: sample.id, sectionMode: "full", containerId: UNGROUPED });
  }
  return slots;
}

function placeItem(
  groups: SampleGroup[],
  examId: string,
  mode: SectionMode,
  dest: string,
  destIndex: number,
): SampleGroup[] {
  const sourceGroup = groups.find((group) =>
    group.items.some(
      (item) =>
        item.examId === examId &&
        (item.sectionMode === mode || item.sectionMode === "full"),
    ),
  );
  const hadFull = groups.some((group) =>
    group.items.some(
      (item) => item.examId === examId && item.sectionMode === "full",
    ),
  );
  let next = groups.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (item.examId !== examId) return true;
      if (mode === "full") return false;
      if (item.sectionMode === "full" || item.sectionMode === mode) return false;
      return true;
    }),
  }));
  if (dest !== UNGROUPED) {
    next = next.map((group) => {
      if (group.id !== dest) return group;
      const items = [...group.items];
      const index = Math.max(0, Math.min(destIndex, items.length));
      items.splice(index, 0, { examId, sectionMode: mode });
      return { ...group, items };
    });
  }
  if (hadFull && mode !== "full" && sourceGroup && sourceGroup.id !== dest) {
    const other: SectionMode = mode === "part1" ? "part2" : "part1";
    next = next.map((group) =>
      group.id === sourceGroup.id
        ? { ...group, items: [...group.items, { examId, sectionMode: other }] }
        : group,
    );
  }
  return next;
}

export function SampleExamBank({
  samples,
  signedIn,
  examCode,
}: {
  samples: BankSampleView[];
  signedIn: boolean;
  examCode: ExamCode;
}) {
  const [items, setItems] = useState(samples);
  const [groups, setGroups] = useState<SampleGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(signedIn);
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  useEffect(() => {
    if (!signedIn) {
      setLoadingGroups(false);
      return;
    }
    let cancelled = false;
    fetch(`/api/sample-groups?examCode=${examCode}`)
      .then(async (response) => {
        const data = (await response.json()) as { groups?: SampleGroup[] };
        if (!cancelled) setGroups(data.groups ?? []);
      })
      .catch(() => {
        if (!cancelled) setGroups([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingGroups(false);
      });
    return () => {
      cancelled = true;
    };
  }, [examCode, signedIn]);

  const sampleMap = useMemo(
    () => new Map(items.map((sample) => [sample.id, sample])),
    [items],
  );
  const slots = useMemo(() => slotsFrom(items, groups), [items, groups]);

  async function persist(next: SampleGroup[]) {
    const response = await fetch("/api/sample-groups/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        examCode,
        groups: next.map((group) => ({
          id: group.id,
          items: group.items,
        })),
      }),
    });
    const data = (await response.json()) as {
      groups?: SampleGroup[];
      error?: string;
    };
    if (!response.ok) {
      const refreshed = await fetch(`/api/sample-groups?examCode=${examCode}`);
      const json = (await refreshed.json()) as { groups?: SampleGroup[] };
      setGroups(json.groups ?? []);
      return;
    }
    if (data.groups) setGroups(data.groups);
  }

  function applyGroups(next: SampleGroup[]) {
    const merged = mergePartsInSameGroup(next);
    setGroups(merged);
    void persist(merged);
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over || !signedIn) return;
    const parsed = parseItemKey(String(active.id));
    if (!parsed) return;

    const overId = String(over.id);
    const overContainer =
      (over.data.current?.containerId as string | undefined) ??
      (overId === UNGROUPED || groups.some((group) => group.id === overId)
        ? overId
        : null);
    if (!overContainer) return;

    const destSlots = slots.filter((slot) => slot.containerId === overContainer);
    let destIndex = destSlots.length;
    const overParsed = parseItemKey(overId);
    if (overParsed) {
      const index = destSlots.findIndex(
        (slot) =>
          slot.examId === overParsed.examId &&
          slot.sectionMode === overParsed.sectionMode,
      );
      destIndex = index < 0 ? destSlots.length : index;
    }

    const activeSlot = slots.find(
      (slot) =>
        slot.examId === parsed.examId && slot.sectionMode === parsed.sectionMode,
    );
    if (
      activeSlot &&
      activeSlot.containerId === overContainer &&
      overContainer !== UNGROUPED &&
      activeSlot.sectionMode === parsed.sectionMode
    ) {
      const group = groups.find((item) => item.id === overContainer);
      if (group) {
        const oldIndex = group.items.findIndex(
          (item) =>
            item.examId === parsed.examId && item.sectionMode === parsed.sectionMode,
        );
        if (oldIndex >= 0 && destIndex !== oldIndex) {
          const moved = groups.map((item) =>
            item.id === overContainer
              ? {
                  ...item,
                  items: arrayMove(
                    item.items,
                    oldIndex,
                    Math.min(destIndex, item.items.length - 1),
                  ),
                }
              : item,
          );
          applyGroups(moved);
        }
      }
      return;
    }

    applyGroups(
      placeItem(groups, parsed.examId, parsed.sectionMode, overContainer, destIndex),
    );
  }

  async function createGroup() {
    const response = await fetch("/api/sample-groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ examCode, name: "Nhóm mới" }),
    });
    const data = (await response.json()) as { group?: SampleGroup };
    if (data.group) setGroups((current) => [...current, data.group!]);
  }

  async function renameGroup(id: string, name: string) {
    const response = await fetch(`/api/sample-groups/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = (await response.json()) as { group?: SampleGroup };
    if (data.group) {
      setGroups((current) =>
        current.map((group) => (group.id === id ? { ...group, name: data.group!.name } : group)),
      );
    }
  }

  async function removeGroup(id: string) {
    if (!window.confirm("Xóa nhóm này? Các đề sẽ trở về Chưa nhóm.")) return;
    const response = await fetch(`/api/sample-groups/${id}`, { method: "DELETE" });
    if (!response.ok) return;
    setGroups((current) => current.filter((group) => group.id !== id));
  }

  function renderSlot(slot: Slot, draggable: boolean) {
    const sample = sampleMap.get(slot.examId);
    if (!sample) return null;
    const card = (
      <SampleExamCard
        sample={sample}
        signedIn={signedIn}
        sectionMode={slot.sectionMode}
        containerId={slot.containerId}
        showPartHandles={draggable && slot.sectionMode === "full"}
        onSaved={(updated) =>
          setItems((current) =>
            current.map((item) => (item.id === updated.id ? updated : item)),
          )
        }
        onDeleted={(id) => {
          setItems((current) => current.filter((item) => item.id !== id));
          const next = groups.map((group) => ({
            ...group,
            items: group.items.filter((item) => item.examId !== id),
          }));
          applyGroups(next);
        }}
      />
    );
    if (!draggable) return card;
    return (
      <SortableSample
        key={itemKey(slot.examId, slot.sectionMode)}
        id={itemKey(slot.examId, slot.sectionMode)}
        containerId={slot.containerId}
      >
        {card}
      </SortableSample>
    );
  }

  const ungroupedIds = slots
    .filter((slot) => slot.containerId === UNGROUPED)
    .map((slot) => itemKey(slot.examId, slot.sectionMode));
  const activeParsed = activeId ? parseItemKey(activeId) : null;
  const activeSample = activeParsed ? sampleMap.get(activeParsed.examId) : null;

  return (
    <div className="space-y-4">
      {signedIn ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Kéo thả đề hoặc từng phần vào nhóm. Nhóm chỉ áp dụng cho mã {examCode}.
          </p>
          <Button type="button" size="sm" variant="outline" onClick={() => void createGroup()}>
            <Plus />
            Tạo nhóm
          </Button>
        </div>
      ) : null}

      {loadingGroups ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="animate-spin" /> Đang tải nhóm...
        </p>
      ) : null}

      {items.length === 0 && groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Chưa có đề minh họa. Hãy đóng góp từ trang chủ bằng file JSON.
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid gap-4">
            <DropColumn
              id={UNGROUPED}
              title="Chưa nhóm"
              empty={ungroupedIds.length === 0}
              emptyText="Kéo đề minh họa ra đây."
            >
              <SortableContext items={ungroupedIds} strategy={verticalListSortingStrategy}>
                <div className="grid gap-3">
                  {slots
                    .filter((slot) => slot.containerId === UNGROUPED)
                    .map((slot) => renderSlot(slot, signedIn))}
                </div>
              </SortableContext>
            </DropColumn>

            {groups.map((group) => {
              const ids = group.items.map((item) => itemKey(item.examId, item.sectionMode));
              return (
                <DropColumn
                  key={group.id}
                  id={group.id}
                  title={
                    <GroupTitle
                      name={group.name}
                      onRename={(name) => void renameGroup(group.id, name)}
                      onDelete={() => void removeGroup(group.id)}
                    />
                  }
                  empty={ids.length === 0}
                  emptyText="Kéo đề hoặc từng phần vào nhóm này."
                >
                  <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                    <div className="grid gap-3">
                      {slots
                        .filter((slot) => slot.containerId === group.id)
                        .map((slot) => renderSlot(slot, signedIn))}
                    </div>
                  </SortableContext>
                </DropColumn>
              );
            })}
          </div>
          <DragOverlay>
            {activeSample && activeParsed ? (
              <div className="rounded-xl border bg-background px-3 py-2 text-sm shadow-lg">
                {activeSample.title}
                {activeParsed.sectionMode !== "full"
                  ? ` · ${sectionModeShortLabel(activeParsed.sectionMode)}`
                  : ""}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}

function DropColumn({
  id,
  title,
  empty,
  emptyText,
  children,
}: {
  id: string;
  title: ReactNode;
  empty: boolean;
  emptyText: string;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { containerId: id, type: "container" },
  });
  return (
    <section
      ref={setNodeRef}
      className={cn(
        "space-y-3 rounded-xl border p-3",
        isOver ? "border-primary bg-primary/5" : "border-border",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        {typeof title === "string" ? (
          <h2 className="text-sm font-medium">{title}</h2>
        ) : (
          title
        )}
      </div>
      {children}
      {empty ? <p className="text-xs text-muted-foreground">{emptyText}</p> : null}
    </section>
  );
}

function GroupTitle({
  name,
  onRename,
  onDelete,
}: {
  name: string;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [value, setValue] = useState(name);
  useEffect(() => setValue(name), [name]);
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => {
          const next = value.trim();
          if (!next) {
            setValue(name);
            return;
          }
          if (next !== name) onRename(next);
        }}
        className="h-8 max-w-xs"
        aria-label="Tên nhóm"
      />
      <Button type="button" variant="outline" size="sm" onClick={onDelete}>
        <Trash2 />
        Xóa nhóm
      </Button>
    </div>
  );
}

function SortableSample({
  id,
  containerId,
  children,
}: {
  id: string;
  containerId: string;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id,
      data: { containerId, type: "item" },
    });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="relative">
      <button
        type="button"
        className="absolute left-2 top-3 z-10 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Kéo đề"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <div className="pl-8">{children}</div>
    </div>
  );
}

function PartHandle({
  examId,
  sectionMode,
  containerId,
}: {
  examId: string;
  sectionMode: SectionMode;
  containerId: string;
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: itemKey(examId, sectionMode),
    data: { containerId, type: "item" },
  });
  return (
    <button
      type="button"
      ref={setNodeRef}
      className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
      aria-label={`Kéo ${sectionModeShortLabel(sectionMode)}`}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="size-4" />
    </button>
  );
}

function SampleExamCard({
  sample,
  signedIn,
  sectionMode,
  containerId,
  showPartHandles,
  onSaved,
  onDeleted,
}: {
  sample: BankSampleView;
  signedIn: boolean;
  sectionMode: SectionMode;
  containerId: string;
  showPartHandles: boolean;
  onSaved: (sample: BankSampleView) => void;
  onDeleted: (id: string) => void;
}) {
  const editable = signedIn && sample.kind !== "official";
  const [open, setOpen] = useState(false);
  const [onlyMarked, setOnlyMarked] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(sample.title);
  const [essayPrompt, setEssayPrompt] = useState(sample.essayPrompt);
  const [essayTopic, setEssayTopic] = useState(sample.essayTopic ?? "");
  const [essaySolution, setEssaySolution] = useState(sample.essaySolution ?? "");
  const [questions, setQuestions] = useState(sample.questions);
  const [answerKey, setAnswerKey] = useState(sample.answerKey);
  const { busy, alertNode, setAlert, save } = useBankSave();
  const marked = new Set(sample.markedNumbers ?? []);
  const hasMarked =
    Boolean(sample.essayMarked) || (sample.markedNumbers?.length ?? 0) > 0;
  const markedCount =
    (sample.markedNumbers?.length ?? 0) + (sample.essayMarked ? 1 : 0);
  const canMark = signedIn && !editing;

  function persistMark(params: {
    kind: "essay" | "question";
    fingerprint?: string;
    marked: boolean;
  }) {
    void persistQuestionMark({
      kind: params.kind,
      fingerprint: params.fingerprint,
      examCode: sample.examCode,
      marked: params.marked,
    });
  }

  function toggleEssayMark() {
    const next = !sample.essayMarked;
    onSaved({ ...sample, essayMarked: next });
    persistMark({
      kind: "essay",
      fingerprint: sample.essayFingerprint,
      marked: next,
    });
  }

  function toggleQuestionMark(originalNumber: number) {
    const current = new Set(sample.markedNumbers ?? []);
    const nextMarked = !current.has(originalNumber);
    if (nextMarked) current.add(originalNumber);
    else current.delete(originalNumber);
    onSaved({ ...sample, markedNumbers: Array.from(current) });
    persistMark({
      kind: "question",
      fingerprint: sample.questionFingerprints?.[originalNumber],
      marked: nextMarked,
    });
  }

  function resetDraft() {
    setTitle(sample.title);
    setEssayPrompt(sample.essayPrompt);
    setEssayTopic(sample.essayTopic ?? "");
    setEssaySolution(sample.essaySolution ?? "");
    setQuestions(sample.questions);
    setAnswerKey(sample.answerKey);
    setAlert(null);
  }

  async function patchSample(next: {
    title: string;
    essayPrompt: string;
    essayTopic: string;
    essaySolution: string;
    questions: Question[];
    answerKey: AnswerKey;
  }) {
    const data = await save<{
      title: string;
      essayPrompt: string;
      essayTopic: string;
      essaySolution: string;
      questions: Question[];
      answerKey: AnswerKey;
    }>(() =>
      fetch(`/api/exams/sample/${sample.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      }),
    );
    if (!data) return null;
    setTitle(data.title);
    setEssayPrompt(data.essayPrompt);
    setEssayTopic(data.essayTopic ?? "");
    setEssaySolution(data.essaySolution ?? "");
    setQuestions(data.questions);
    setAnswerKey(data.answerKey);
    onSaved({
      ...sample,
      title: data.title,
      essayPrompt: data.essayPrompt,
      essayTopic: data.essayTopic,
      essaySolution: data.essaySolution,
      questions: data.questions,
      answerKey: data.answerKey,
    });
    return data;
  }

  async function onSave() {
    const data = await patchSample({
      title,
      essayPrompt,
      essayTopic,
      essaySolution,
      questions,
      answerKey,
    });
    if (!data) return;
    setEditing(false);
  }

  async function onDeleteQuestion(originalNumber: number) {
    if (questions.length <= 1 && !essayPrompt.trim()) {
      setAlert({
        tone: "error",
        title: "Không xóa được câu",
        message: "Đề minh họa cần phần 1 hoặc ít nhất 1 câu phần 2.",
      });
      setOpen(true);
      return;
    }
    if (!window.confirm(`Xóa câu ${originalNumber} khỏi đề minh họa?`)) return;
    const nextQuestions = questions.filter(
      (question) => question.originalNumber !== originalNumber,
    );
    const nextAnswerKey = { ...answerKey };
    delete nextAnswerKey[String(originalNumber)];
    setOpen(true);
    await patchSample({
      title,
      essayPrompt,
      essayTopic,
      essaySolution,
      questions: nextQuestions,
      answerKey: nextAnswerKey,
    });
  }

  async function onDelete() {
    if (!window.confirm(`Xóa ${sample.title}? Câu hỏi của đề này trong ngân hàng cũng sẽ bị xóa.`)) {
      return;
    }
    const data = await save<{ ok?: boolean }>(() =>
      fetch(`/api/exams/sample/${sample.id}`, { method: "DELETE" }),
    );
    if (!data) return;
    onDeleted(sample.id);
  }

  const showEssay =
    sectionMode !== "part2" &&
    Boolean(essayPrompt.trim()) &&
    (!onlyMarked || Boolean(sample.essayMarked));
  const visibleQuestions = (
    sectionMode === "part1" ? [] : questions
  ).filter((question) => !onlyMarked || marked.has(question.originalNumber));
  const indexed = visibleQuestions.map((question, index) => ({
    ...question,
    displayIndex: index + 1,
  }));
  const blocks = toDisplayBlocks(indexed);
  const emptyMarked =
    open && onlyMarked && !showEssay && visibleQuestions.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="flex min-w-0 flex-wrap items-center gap-2">
            {editing ? (
              <span className="grid min-w-[12rem] flex-1 gap-1">
                <Label htmlFor={`sample-title-${sample.id}`} className="sr-only">
                  Tên đề
                </Label>
                <Input
                  id={`sample-title-${sample.id}`}
                  value={title}
                  disabled={busy}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </span>
            ) : (
              <span>{sample.title}</span>
            )}
            <Badge variant="outline">{sample.examCode}</Badge>
            {sectionMode !== "full" ? (
              <Badge>{sectionModeShortLabel(sectionMode)}</Badge>
            ) : null}
            {sample.kind === "official" ? (
              <Badge variant="secondary">Chính thức</Badge>
            ) : (
              <Badge variant="secondary">Số {sample.number}</Badge>
            )}
            {markedCount > 0 ? (
              <Badge variant="outline">Đánh dấu {markedCount}</Badge>
            ) : null}
          </span>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setOpen((value) => {
                  const next = !value;
                  if (!next) setOnlyMarked(false);
                  return next;
                })
              }
            >
              {open ? "Thu gọn" : "Xem đề"}
            </Button>
            {open ? (
              <Button
                type="button"
                variant={onlyMarked ? "default" : "outline"}
                size="sm"
                onClick={() => setOnlyMarked((value) => !value)}
              >
                Chỉ câu đánh dấu
              </Button>
            ) : null}
            {hasMarked ? (
              <Button type="button" variant="outline" size="sm" asChild>
                <Link href={`/bank/samples/${sample.id}/drill`}>
                  Luyện tập câu đánh dấu
                </Link>
              </Button>
            ) : (
              <Button type="button" variant="outline" size="sm" disabled>
                Luyện tập câu đánh dấu
              </Button>
            )}
            {editable ? (
              <>
                <EditToolbar
                  signedIn={signedIn}
                  editing={editing}
                  busy={busy}
                  onEdit={() => {
                    resetDraft();
                    setEditing(true);
                    setOpen(true);
                  }}
                  onCancel={() => {
                    resetDraft();
                    setEditing(false);
                  }}
                  onSave={onSave}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy || editing}
                  onClick={() => void onDelete()}
                >
                  {busy ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
                  Xóa
                </Button>
              </>
            ) : null}
          </div>
        </CardTitle>
      </CardHeader>
      {open ? (
        <CardContent className="space-y-4">
          {alertNode}
          {emptyMarked ? (
            <p className="text-sm text-muted-foreground">
              Chưa có câu nào được đánh dấu trong đề này.
            </p>
          ) : null}
          {sectionMode !== "part2" ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                {showPartHandles ? (
                  <PartHandle
                    examId={sample.id}
                    sectionMode="part1"
                    containerId={containerId}
                  />
                ) : null}
                <p className="text-sm font-medium">Phần 1 · Nghị luận</p>
                <TopicBadge topic={essayTopic} />
                {canMark && essayPrompt.trim() ? (
                  <MarkButton
                    marked={Boolean(sample.essayMarked)}
                    disabled={busy}
                    onClick={toggleEssayMark}
                  />
                ) : sample.essayMarked ? (
                  <Badge>Đã đánh dấu</Badge>
                ) : null}
              </div>
              {editing ? (
                <BankEssayFields
                  prompt={essayPrompt}
                  topic={essayTopic}
                  solution={essaySolution}
                  disabled={busy}
                  onChange={(next) => {
                    setEssayPrompt(next.prompt);
                    setEssayTopic(next.topic);
                    setEssaySolution(next.solution);
                  }}
                />
              ) : showEssay ? (
                <>
                  <MathText className="font-exam text-sm leading-7" text={essayPrompt} />
                  <SolutionReveal solution={essaySolution || sample.essaySolution} />
                </>
              ) : essayPrompt.trim() && onlyMarked ? null : (
                <p className="text-sm text-muted-foreground">Đề này không có phần 1.</p>
              )}
            </div>
          ) : null}
          {sectionMode === "part1" ? null : blocks.length === 0 && !onlyMarked ? (
            <p className="text-sm text-muted-foreground">Đề này không có phần 2.</p>
          ) : (
            <div className="space-y-3">
              {showPartHandles ? (
                <div className="flex items-center gap-2">
                  <PartHandle
                    examId={sample.id}
                    sectionMode="part2"
                    containerId={containerId}
                  />
                  <p className="text-sm font-medium">Phần 2 · Trắc nghiệm</p>
                </div>
              ) : null}
              {blocks.map((block, blockIndex) => (
            <div key={`sample-block-${blockIndex}`} className="space-y-3">
              <p className="text-sm font-medium">
                {block.kind === "independent"
                  ? `Phần 2 · Trắc nghiệm độc lập (${block.questions.length} câu)`
                  : block.header}
              </p>
              {block.kind === "cluster" && block.passage ? (
                <MathText
                  className="font-exam rounded-lg bg-muted/50 p-3 text-sm leading-7"
                  text={block.passage}
                />
              ) : null}
              {block.questions.map((question) => {
                const answer = answerKey[String(question.originalNumber)] ?? "";
                const isMarked = marked.has(question.originalNumber);
                return (
                  <div key={question.originalNumber} className="rounded-lg border p-3">
                    <p className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="flex flex-wrap items-center gap-2">
                        <span>
                          Câu {question.displayIndex} · {questionTypeLabel(question.type)}
                        </span>
                        <TopicBadge topic={question.topic} />
                        {!canMark && isMarked ? <Badge>Đã đánh dấu</Badge> : null}
                      </span>
                      <span className="flex flex-wrap items-center gap-2">
                        {canMark ? (
                          <MarkButton
                            marked={isMarked}
                            disabled={busy}
                            onClick={() => toggleQuestionMark(question.originalNumber)}
                          />
                        ) : null}
                        {editable ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={busy}
                            onClick={() => void onDeleteQuestion(question.originalNumber)}
                          >
                            {busy ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
                            Xóa câu
                          </Button>
                        ) : null}
                      </span>
                    </p>
                    {editing ? (
                      <BankQuestionFields
                        type={question.type}
                        stem={questions.find((item) => item.originalNumber === question.originalNumber)?.stem ?? ""}
                        options={
                          questions.find((item) => item.originalNumber === question.originalNumber)
                            ?.options
                        }
                        answer={answer}
                        topic={
                          questions.find((item) => item.originalNumber === question.originalNumber)
                            ?.topic ?? ""
                        }
                        solution={
                          questions.find((item) => item.originalNumber === question.originalNumber)
                            ?.solution ?? ""
                        }
                        disabled={busy}
                        onChange={(next) => {
                          setQuestions((current) =>
                            current.map((item) =>
                              item.originalNumber === question.originalNumber
                                ? {
                                    ...item,
                                    stem: next.stem,
                                    options: next.options,
                                    topic: next.topic,
                                    solution: next.solution,
                                  }
                                : item,
                            ),
                          );
                          setAnswerKey((current) => ({
                            ...current,
                            [String(question.originalNumber)]: next.answer,
                          }));
                        }}
                      />
                    ) : (
                      <div className="space-y-2">
                        <MathText className="font-exam text-sm leading-7" text={question.stem} />
                        {isMcq(question.type) && question.options
                          ? OPTION_LETTERS.map((letter) => (
                              <p
                                key={letter}
                                className={cn(
                                  "flex items-start gap-2 text-sm",
                                  letter === answer
                                    ? "font-medium text-emerald-700"
                                    : "text-muted-foreground",
                                )}
                              >
                                <span>{letter}.</span>
                                <MathText inline className="flex-1" text={question.options?.[letter] ?? ""} />
                              </p>
                            ))
                          : null}
                        <p className="text-sm">
                          Đáp án:{" "}
                          <MathText inline className="font-medium text-primary" text={answer} />
                        </p>
                        <SolutionReveal solution={question.solution} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
              ))}
            </div>
          )}
        </CardContent>
      ) : null}
    </Card>
  );
}
