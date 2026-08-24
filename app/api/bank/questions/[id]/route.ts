import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/session";
import { deleteQuestion, updateQuestion } from "@/lib/exam/bank";
import {
  ContributeError,
  contributeErrorResponse,
} from "@/lib/exam/contribute-error";
import type { McqOptions } from "@/lib/exam/types";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { user, response } = await requireAuthUser();
  if (!user) return response;
  const { id } = await params;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      stem?: unknown;
      options?: McqOptions | null;
      answer?: unknown;
      topic?: unknown;
      solution?: unknown;
    };
    if (typeof body.stem !== "string" || typeof body.answer !== "string") {
      throw new ContributeError(
        "INVALID_CONTENT",
        "Thiếu đề bài hoặc đáp án.",
        "Nội dung chưa hợp lệ",
        ["Điền đề bài và đáp án rồi bấm Lưu."],
      );
    }
    const question = await updateQuestion(id, {
      stem: body.stem,
      options: body.options,
      answer: body.answer,
      topic: typeof body.topic === "string" ? body.topic : "",
      solution: typeof body.solution === "string" ? body.solution : "",
    });
    return NextResponse.json(question);
  } catch (error) {
    return contributeErrorResponse(error, "Không lưu được câu hỏi.");
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const { user, response } = await requireAuthUser();
  if (!user) return response;
  const { id } = await params;

  try {
    const result = await deleteQuestion(id);
    return NextResponse.json(result);
  } catch (error) {
    return contributeErrorResponse(error, "Không xóa được câu hỏi.");
  }
}
