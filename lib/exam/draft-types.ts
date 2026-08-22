import type { ExamCode, McqOptions, QuestionType } from "@/lib/exam/types";

export type DraftEssayItem = {
  id: string;
  prompt: string;
  fingerprint: string;
  duplicate: boolean;
  keep: boolean;
};

export type DraftQuestionItem = {
  id: string;
  originalNumber: number;
  type: QuestionType;
  stem: string;
  options?: McqOptions;
  answer: string;
  clusterId?: string;
  clusterKind?: "passage" | "situation";
  passage?: string;
  clusterHeader?: string;
  clusterPosition?: number;
  fingerprint: string;
  duplicate: boolean;
  keep: boolean;
};

export type EssayDraftPayload = {
  kind: "essay";
  sourceFilename: string;
  items: DraftEssayItem[];
};

export type QuestionDraftPayload = {
  kind: "questions";
  examCode: ExamCode;
  sourceFilename: string;
  answerFilename: string;
  items: DraftQuestionItem[];
};

export type ContributionDraftPayload = EssayDraftPayload | QuestionDraftPayload;
