import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/session";
import {
  ContributeError,
  contributeErrorResponse,
} from "@/lib/exam/contribute-error";
import { parseAnswerKeyJson, parseQuestions } from "@/lib/exam/json";
import { deleteSampleExam, updateSampleExam } from "@/lib/exam/sample";
import type { AnswerKey, Question } from "@/lib/exam/types";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { user, response } = await requireAuthUser();
  if (!user) return response;
  const { id } = await params;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      essayPrompt?: unknown;
      essayTopic?: unknown;
      essaySolution?: unknown;
      questions?: unknown;
      answerKey?: unknown;
      title?: unknown;
    };
    if (typeof body.essayPrompt !== "string") {
      throw new ContributeError(
        "INVALID_CONTENT",
        "Thiếu đề nghị luận.",
        "Nội dung chưa hợp lệ",
        ["Nhập đề phần 1 rồi bấm Lưu."],
      );
    }
    const questions = parseQuestions(body.questions) as Question[];
    const answerKey = parseAnswerKeyJson(body.answerKey) as AnswerKey;
    const updated = await updateSampleExam({
      examId: id,
      essayPrompt: body.essayPrompt,
      essayTopic: typeof body.essayTopic === "string" ? body.essayTopic : "",
      essaySolution: typeof body.essaySolution === "string" ? body.essaySolution : "",
      questions,
      answerKey,
      title: typeof body.title === "string" ? body.title : undefined,
    });
    return NextResponse.json({
      id: updated.id,
      title: updated.title,
      essayPrompt: updated.essay_prompt,
      essayTopic: updated.essay_topic ?? "",
      essaySolution: updated.essay_solution ?? "",
      questions: parseQuestions(updated.questions),
      answerKey: parseAnswerKeyJson(updated.answer_key),
    });
  } catch (error) {
    return contributeErrorResponse(error, "Không lưu được đề minh họa.");
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const { user, response } = await requireAuthUser();
  if (!user) return response;
  const { id } = await params;

  try {
    await deleteSampleExam(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return contributeErrorResponse(error, "Không xóa được đề minh họa.");
  }
}
