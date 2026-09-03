import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/session";
import { reorderSampleGroups } from "@/lib/exam/sample-groups";
import { isExamCode, isSectionMode } from "@/lib/exam/types";

export const runtime = "nodejs";

export async function PUT(request: Request) {
  const { user, response } = await requireAuthUser();
  if (!user) return response;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      examCode?: string;
      groups?: { id?: string; items?: { examId?: string; sectionMode?: string }[] }[];
    };
    const examCode = isExamCode(body.examCode) ? body.examCode : null;
    if (!examCode) {
      return NextResponse.json({ error: "Mã đề không hợp lệ." }, { status: 400 });
    }
    if (!Array.isArray(body.groups)) {
      return NextResponse.json({ error: "Danh sách nhóm không hợp lệ." }, { status: 400 });
    }

    const groups = body.groups.map((group) => {
      if (!group.id?.trim()) {
        throw new Error("Thiếu mã nhóm.");
      }
      return {
        id: group.id,
        items: (group.items ?? []).map((item) => {
          if (!item.examId?.trim() || !isSectionMode(item.sectionMode)) {
            throw new Error("Mục nhóm không hợp lệ.");
          }
          return { examId: item.examId, sectionMode: item.sectionMode };
        }),
      };
    });

    const next = await reorderSampleGroups({
      userId: user.id,
      examCode,
      groups,
    });
    return NextResponse.json({ groups: next });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Không lưu được thứ tự nhóm.",
      },
      { status: 500 },
    );
  }
}
