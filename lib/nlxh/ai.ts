import { generateObject } from "ai";
import { GEMINI_MODEL, getGemini } from "@/lib/exam/gemini";
import {
  analysisSchema,
  fullEssayGradeSchema,
  microGradeSchema,
  seedDataSchema,
} from "./schemas";
import {
  analysisPrompt,
  evaluatePrompt,
  fullEssayEvaluatePrompt,
  seedPrompt,
} from "./prompts";
import { recordUsage } from "./store";
import type {
  PracticeMode,
  QuestionAnalysis,
  SeedData,
} from "./types";

function hasGeminiKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export async function generateAnalysisWithGemini(params: {
  question: string;
  userId?: string;
}): Promise<QuestionAnalysis | null> {
  if (!hasGeminiKey()) return null;
  try {
    const google = getGemini();
    const { object } = await generateObject({
      model: google(GEMINI_MODEL),
      schema: analysisSchema,
      messages: [{ role: "user", content: analysisPrompt(params.question) }],
    });
    await recordUsage({
      userId: params.userId,
      action: "analyze_question",
      model: GEMINI_MODEL,
      cached: false,
      source: "gemini",
    });
    return {
      essayId: "",
      questionType: object.questionType,
      mainTopic: object.mainTopic,
      coreIssue: object.coreIssue,
      keywords: object.keywords,
      suggestedPosition: object.suggestedPosition,
      frameworkVersion: "framework_v1",
      source: "gemini",
    };
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function generateSeedWithGemini(params: {
  question: string;
  analysis: QuestionAnalysis;
  mode: PracticeMode;
  level: number;
  userId?: string;
}): Promise<SeedData | null> {
  if (!hasGeminiKey()) return null;
  try {
    const google = getGemini();
    const { object } = await generateObject({
      model: google(GEMINI_MODEL),
      schema: seedDataSchema,
      messages: [{ role: "user", content: seedPrompt(params) }],
    });
    await recordUsage({
      userId: params.userId,
      action: `seed_${params.mode}`,
      model: GEMINI_MODEL,
      cached: false,
      source: "gemini",
    });
    return object;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function evaluateWithGemini(params: {
  question: string;
  analysis: QuestionAnalysis | null;
  mode: PracticeMode;
  answer: string;
  previousWeaknesses?: string[];
  userId?: string;
}): Promise<{
  score: number;
  strengths: string[];
  weaknesses: string[];
  suggestedRevision?: string;
} | null> {
  if (!hasGeminiKey()) return null;
  try {
    const google = getGemini();
    const { object } = await generateObject({
      model: google(GEMINI_MODEL),
      schema: microGradeSchema,
      messages: [{ role: "user", content: evaluatePrompt(params) }],
    });
    await recordUsage({
      userId: params.userId,
      action: `eval_${params.mode}`,
      model: GEMINI_MODEL,
      cached: false,
      source: "gemini",
    });
    return object;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function evaluateFullEssayWithGemini(params: {
  question: string;
  analysis: QuestionAnalysis | null;
  answer: string;
  userId?: string;
}): Promise<{
  overallScore: number;
  scores: Record<string, number>;
  strengths: string[];
  priorityFixes: string[];
  missingComponents: string[];
  nextPractice: PracticeMode[];
} | null> {
  if (!hasGeminiKey()) return null;
  try {
    const google = getGemini();
    const { object } = await generateObject({
      model: google(GEMINI_MODEL),
      schema: fullEssayGradeSchema,
      messages: [{ role: "user", content: fullEssayEvaluatePrompt(params) }],
    });
    await recordUsage({
      userId: params.userId,
      action: "eval_full_essay",
      model: GEMINI_MODEL,
      cached: false,
      source: "gemini",
    });
    return object;
  } catch (error) {
    console.error(error);
    return null;
  }
}
