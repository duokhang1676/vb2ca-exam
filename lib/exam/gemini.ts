import { createGoogleGenerativeAI } from "@ai-sdk/google";

export function getGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Thiếu GEMINI_API_KEY trong biến môi trường.");
  }
  return createGoogleGenerativeAI({ apiKey });
}

export const GEMINI_MODEL = "gemini-2.5-flash";
