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
      questions?: unknown;
      answerKey?: unknown;
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
      questions,
      answerKey,
    });
    return NextResponse.json({
      id: updated.id,
      title: updated.title,
      essayPrompt: updated.essay_prompt,
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
