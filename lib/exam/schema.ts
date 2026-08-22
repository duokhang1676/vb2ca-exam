import { z } from "zod";

const parsedQuestionSchema = z.object({
  originalNumber: z.number().int().min(1).max(80),
  type: z.enum(["mcq", "numeric", "fill"]),
  stem: z.string().min(1),
  options: z
    .object({
      A: z.string().min(1),
      B: z.string().min(1),
      C: z.string().min(1),
      D: z.string().min(1),
    })
    .optional(),
});

export const parsedExamSchema = z.object({
  title: z.string().min(1),
  essayPrompt: z.string().min(1),
  questions: z.array(parsedQuestionSchema).min(1),
});

export const parsedEssaySchema = z.object({
  essayPrompt: z.string().min(1),
});

export const parsedQuestionsSchema = z.object({
  questions: z.array(parsedQuestionSchema).min(1),
});

export const essayGradeSchema = z.object({
  score: z.number().min(0).max(30),
  feedback: z.string().min(1),
});

export const nearDuplicateSchema = z.object({
  duplicateNewIndexes: z.array(z.number().int().min(0)),
});

export type ParsedExam = z.infer<typeof parsedExamSchema>;
export type ParsedEssay = z.infer<typeof parsedEssaySchema>;
export type ParsedQuestions = z.infer<typeof parsedQuestionsSchema>;
export type EssayGrade = z.infer<typeof essayGradeSchema>;
