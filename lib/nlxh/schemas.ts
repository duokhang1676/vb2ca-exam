import { z } from "zod";
import { PRACTICE_MODES, QUESTION_TYPES } from "./types";

export const questionTypeSchema = z.enum(QUESTION_TYPES);
export const practiceModeSchema = z.enum(PRACTICE_MODES);

export const analysisSchema = z.object({
  questionType: questionTypeSchema,
  mainTopic: z.string().min(2).max(200),
  coreIssue: z.string().min(4).max(400),
  keywords: z.array(z.string().min(1).max(40)).min(1).max(8),
  suggestedPosition: z.string().max(300).optional(),
});

export const seedDataSchema = z.object({
  task: z.string().min(1).max(500),
  targetWords: z.string().max(40).optional(),
  requiredElements: z.array(z.string().min(1).max(120)).max(8).optional(),
  hints: z.array(z.string().min(1).max(200)).max(3).optional(),
  commonMistakes: z.array(z.string().min(1).max(160)).max(6).optional(),
  referenceIdeas: z.array(z.string().min(1).max(200)).max(8).optional(),
  scaffold: z.string().max(800).optional(),
  suggestedArguments: z.array(z.string().min(1).max(200)).max(8).optional(),
  distractors: z.array(z.string().min(1).max(200)).max(8).optional(),
  expectedIdeas: z.array(z.string().min(1).max(200)).max(8).optional(),
  choices: z
    .array(
      z.object({
        id: z.string().min(1).max(40),
        text: z.string().min(1).max(240),
        correct: z.boolean().optional(),
      }),
    )
    .max(10)
    .optional(),
  correctType: questionTypeSchema.optional(),
});

export const seedItemSchema = z.object({
  practiceMode: practiceModeSchema,
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  data: seedDataSchema,
});

export const referenceEssaySchema = z.object({
  essay: z.string().min(200).max(8000),
  outline: z.array(z.string().min(1).max(200)).min(4).max(16),
});

export const packItemSchema = z.object({
  essayFingerprint: z.string().min(8).max(128),
  analysis: analysisSchema,
  seeds: z.array(seedItemSchema).min(1).max(40),
  referenceEssay: referenceEssaySchema.optional(),
});

export const packSchema = z.object({
  version: z.literal(1),
  frameworkVersion: z.string().min(1).max(40),
  promptVersion: z.string().min(1).max(40),
  items: z.array(packItemSchema).min(1).max(20),
});

export const microGradeSchema = z.object({
  score: z.number().min(0).max(10),
  strengths: z.array(z.string().min(1).max(120)).max(2),
  weaknesses: z.array(z.string().min(1).max(120)).max(2),
  suggestedRevision: z.string().max(400).optional(),
});

export const fullEssayGradeSchema = z.object({
  overallScore: z.number().min(0).max(10),
  scores: z.object({
    taskResponse: z.number().min(0).max(10),
    structure: z.number().min(0).max(10),
    argumentation: z.number().min(0).max(10),
    analysis: z.number().min(0).max(10),
    criticalThinking: z.number().min(0).max(10),
    evidence: z.number().min(0).max(10),
    solutions: z.number().min(0).max(10),
    language: z.number().min(0).max(10),
    cohesion: z.number().min(0).max(10),
  }),
  strengths: z.array(z.string().min(1).max(160)).max(3),
  priorityFixes: z.array(z.string().min(1).max(160)).max(3),
  missingComponents: z.array(z.string().min(1).max(80)).max(6),
  nextPractice: z.array(practiceModeSchema).max(3),
  suggestedRevision: z.string().max(500).optional(),
});

export const externalGradeSchema = z.object({
  attemptId: z.string().uuid(),
  score: z.number().min(0).max(10).optional(),
  overallScore: z.number().min(0).max(10).optional(),
  strengths: z.array(z.string().min(1).max(160)).max(3).optional(),
  weaknesses: z.array(z.string().min(1).max(160)).max(3).optional(),
  suggestedRevision: z.string().max(500).optional(),
  scores: z.record(z.string(), z.number().min(0).max(10)).optional(),
  missingComponents: z.array(z.string().min(1).max(80)).max(6).optional(),
  priorityFixes: z.array(z.string().min(1).max(160)).max(3).optional(),
  nextPractice: z.array(practiceModeSchema).max(3).optional(),
});

export const attemptAnswerSchema = z.object({
  text: z.string().max(12000).optional(),
  selectedType: questionTypeSchema.optional(),
  fields: z.record(z.string(), z.string().max(800)).optional(),
  items: z.array(z.string().max(400)).max(12).optional(),
  selectedIds: z.array(z.string().max(40)).max(8).optional(),
  keywords: z.array(z.string().max(40)).max(8).optional(),
  keywordText: z.string().max(400).optional(),
});

export type PackPayload = z.infer<typeof packSchema>;
export type PackItem = z.infer<typeof packItemSchema>;
export type MicroGrade = z.infer<typeof microGradeSchema>;
export type FullEssayGrade = z.infer<typeof fullEssayGradeSchema>;
export type ExternalGrade = z.infer<typeof externalGradeSchema>;
