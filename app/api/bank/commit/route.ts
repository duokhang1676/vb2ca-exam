import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/session";
import { importEssays, importQuestions } from "@/lib/exam/bank";
import {
  ContributeError,
  contributeErrorResponse,
} from "@/lib/exam/contribute-error";
import {
  keptEssayPrompt,
  keptQuestions,
  payloadFromUnknown,
  type ContributionDraftPayload,
} from "@/lib/exam/draft";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  const { user, response } = await requireAuthUser();
  if (!user) return response;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      draftId?: string;
      payload?: unknown;
    };
    if (!body.draftId) {
      throw new ContributeError(
        "DRAFT_EXPIRED",
        "Thiếu bản review. Hãy upload lại file.",
        "Không tìm thấy bản review",
        ["Quay lại trang chủ, upload file và nạp lại."],
      );
    }

    const supabase = getSupabaseAdmin();
    const { data: draft, error } = await supabase
      .from("contribution_drafts")
      .select("*")
      .eq("id", body.draftId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!draft || new Date(draft.expires_at).getTime() < Date.now()) {
      throw new ContributeError(
        "DRAFT_EXPIRED",
        "Bản review đã hết hạn hoặc không tồn tại.",
        "Bản review đã hết hạn",
        ["Upload lại file từ trang chủ.", "Xác nhận nạp trong vòng 2 giờ sau khi trích xuất."],
      );
    }

    const payload = payloadFromUnknown(body.payload ?? draft.payload);
    if (!payload) {
      throw new ContributeError(
        "COMMIT_EMPTY",
        "Dữ liệu review không hợp lệ.",
        "Không nạp được câu đã sửa",
        ["Tải lại trang review hoặc upload lại file."],
      );
    }

    const { data: contribution, error: contribError } = await supabase
      .from("contributions")
      .insert({
        user_id: user.id,
        kind: payload.kind,
        exam_code: payload.kind === "questions" ? payload.examCode : draft.exam_code,
        source_filename: payload.sourceFilename,
        answer_filename: payload.kind === "questions" ? payload.answerFilename : null,
        added_count: 0,
        skipped_count: 0,
      })
      .select("id")
      .single();
    if (contribError || !contribution) {
      throw new Error(contribError?.message || "Không ghi được lịch sử đóng góp.");
    }

    const attribution = { createdBy: user.id, contributionId: contribution.id };
    const summary =
      payload.kind === "essay"
        ? await commitEssays(payload, attribution)
        : await commitQuestions(payload, attribution);

    await supabase
      .from("contributions")
      .update({
        added_count: summary.added,
        skipped_count: summary.skipped,
      })
      .eq("id", contribution.id);

    await supabase.from("contribution_drafts").delete().eq("id", draft.id);

    return NextResponse.json({
      ...summary,
      code: summary.skipped > 0 && summary.added > 0 ? "COMMIT_PARTIAL" : undefined,
    });
  } catch (error) {
    console.error(error);
    if (
      error instanceof Error &&
      /Không tìm thấy đề|Không ghép được câu|Không tìm thấy/i.test(error.message)
    ) {
      return contributeErrorResponse(
        new ContributeError(
          "COMMIT_EMPTY",
          error.message,
          "Không còn câu hợp lệ để nạp",
          [
            "Giữ lại ít nhất một đề/câu (bỏ tick sẽ loại khỏi ngân hàng).",
            "Câu trống hoặc thiếu đáp án sẽ không được nạp.",
            "Sửa lại trên trang review rồi xác nhận.",
          ],
        ),
        error.message,
      );
    }
    return contributeErrorResponse(error, "Không nạp được vào ngân hàng.");
  }
}

async function commitEssays(
  payload: Extract<ContributionDraftPayload, { kind: "essay" }>,
  attribution: { createdBy: string; contributionId: string },
) {
  const prompt = keptEssayPrompt(payload);
  if (!prompt) {
    throw new ContributeError(
      "COMMIT_EMPTY",
      "Bạn đã bỏ hết đề. Không có gì để nạp.",
      "Chưa chọn đề nào",
      ["Bật giữ ít nhất một đề nghị luận.", "Sửa đề nếu OCR sai rồi xác nhận lại."],
    );
  }
  return importEssays(prompt, payload.sourceFilename, attribution);
}

async function commitQuestions(
  payload: Extract<ContributionDraftPayload, { kind: "questions" }>,
  attribution: { createdBy: string; contributionId: string },
) {
  const { questions, answerKey } = keptQuestions(payload);
  if (questions.length === 0) {
    throw new ContributeError(
      "COMMIT_EMPTY",
      "Bạn đã bỏ hết câu hỏi. Không có gì để nạp.",
      "Chưa chọn câu nào",
      ["Bật giữ ít nhất một câu.", "Điền đáp án cho câu điền/trắc nghiệm trước khi nạp."],
    );
  }
  return importQuestions({
    examCode: payload.examCode,
    questions,
    answerKey,
    attribution,
  });
}
