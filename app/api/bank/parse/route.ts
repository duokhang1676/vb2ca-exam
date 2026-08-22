import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/session";
import {
  ContributeError,
  contributeErrorResponse,
} from "@/lib/exam/contribute-error";
import { extractDocxText, isDocxFile, isPdfFile } from "@/lib/exam/document";
import { buildEssayDraft, buildQuestionDraft } from "@/lib/exam/draft";
import { asJson } from "@/lib/exam/json";
import { parseAnswerKey } from "@/lib/exam/parse-answers";
import { parseEssayDocument, parseQuestionsDocument } from "@/lib/exam/parse-pdf";
import { isExamCode } from "@/lib/exam/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  const { user, response } = await requireAuthUser();
  if (!user) return response;

  try {
    const form = await request.formData();
    const kind = String(form.get("kind") ?? "");
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new ContributeError(
        "INVALID_FILE_TYPE",
        "Cần upload file đề (PDF hoặc DOCX).",
        "Thiếu file đề",
        ["Chọn file PDF hoặc DOCX theo đúng phần đóng góp.", "Xem ví dụ format ngay trên form."],
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const supabase = getSupabaseAdmin();

    if (kind === "essay") {
      let essayPrompt: string;
      if (isPdfFile(file.name, file.type)) {
        essayPrompt = await parseEssayDocument({
          file: { bytes, mediaType: "application/pdf", filename: file.name },
        });
      } else if (isDocxFile(file.name, file.type)) {
        const text = await extractDocxText(bytes);
        essayPrompt = await parseEssayDocument({ text });
      } else {
        throw new ContributeError(
          "INVALID_FILE_TYPE",
          "Phần 1 chỉ nhận PDF hoặc DOCX.",
          "Sai loại file nghị luận",
          [
            "Chọn file .pdf hoặc .docx chứa đề nghị luận xã hội.",
            "Không upload TXT hoặc ảnh riêng.",
          ],
        );
      }

      const payload = await buildEssayDraft(essayPrompt, file.name);
      const { data: draft, error } = await supabase
        .from("contribution_drafts")
        .insert({
          user_id: user.id,
          kind: "essay",
          source_filename: file.name,
          payload: asJson(payload),
        })
        .select("id")
        .single();
      if (error || !draft) throw new Error(error?.message || "Không lưu được bản review.");
      return NextResponse.json({ draftId: draft.id });
    }

    if (kind === "questions") {
      const examCodeRaw = form.get("examCode");
      const answers = form.get("answers");
      if (!isExamCode(examCodeRaw)) {
        throw new ContributeError(
          "INVALID_FILE_TYPE",
          "Chọn mã đề CA1 hoặc CA4.",
          "Thiếu mã đề",
          ["Chọn CA1 hoặc CA4 trước khi nạp phần 2."],
        );
      }
      if (!(answers instanceof File)) {
        throw new ContributeError(
          "EMPTY_ANSWER_KEY",
          "Cần file đáp án TXT kèm file câu hỏi.",
          "Thiếu file đáp án",
          [
            "Upload thêm file .txt, mỗi dòng một câu.",
            "Tải file mẫu CA1 hoặc CA4 để đối chiếu.",
          ],
        );
      }

      let answerKey;
      try {
        answerKey = parseAnswerKey(await answers.text());
      } catch (error) {
        throw new ContributeError(
          "EMPTY_ANSWER_KEY",
          error instanceof Error
            ? error.message
            : "Không đọc được file đáp án.",
          "File đáp án không đúng format",
          [
            "Mỗi dòng: `1 A`, `46 72` hoặc `55 Năng lực pháp luật`.",
            "Tải file mẫu rồi lưu UTF-8.",
          ],
        );
      }

      let questions;
      if (isPdfFile(file.name, file.type)) {
        questions = await parseQuestionsDocument({
          examCode: examCodeRaw,
          answerKey,
          file: { bytes, mediaType: "application/pdf", filename: file.name },
        });
      } else if (isDocxFile(file.name, file.type)) {
        const text = await extractDocxText(bytes);
        questions = await parseQuestionsDocument({
          examCode: examCodeRaw,
          answerKey,
          text,
        });
      } else {
        throw new ContributeError(
          "INVALID_FILE_TYPE",
          "Phần 2 chỉ nhận PDF hoặc DOCX kèm TXT đáp án.",
          "Sai loại file câu hỏi",
          ["File câu hỏi phải là .pdf hoặc .docx.", "File đáp án phải là .txt."],
        );
      }

      const payload = await buildQuestionDraft({
        examCode: examCodeRaw,
        questions,
        answerKey,
        sourceFilename: file.name,
        answerFilename: answers.name,
      });
      const { data: draft, error } = await supabase
        .from("contribution_drafts")
        .insert({
          user_id: user.id,
          kind: "questions",
          exam_code: examCodeRaw,
          source_filename: file.name,
          answer_filename: answers.name,
          payload: asJson(payload),
        })
        .select("id")
        .single();
      if (error || !draft) throw new Error(error?.message || "Không lưu được bản review.");
      return NextResponse.json({ draftId: draft.id });
    }

    throw new ContributeError(
      "INVALID_FILE_TYPE",
      "Chọn phần 1 nghị luận hoặc phần 2 trắc nghiệm.",
      "Thiếu loại đóng góp",
      ["Dùng đúng form Phần 1 hoặc Phần 2 trên trang chủ."],
    );
  } catch (error) {
    console.error(error);
    return contributeErrorResponse(error, "Không trích xuất được file đóng góp.");
  }
}
