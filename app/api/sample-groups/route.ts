import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/session";
import {
  createSampleGroup,
  listSampleGroups,
} from "@/lib/exam/sample-groups";
import { isExamCode } from "@/lib/exam/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { user, response } = await requireAuthUser();
  if (!user) return response;

  const examCodeParam = new URL(request.url).searchParams.get("examCode");
  const examCode = isExamCode(examCodeParam) ? examCodeParam : "CA1";

  try {
    const groups = await listSampleGroups(user.id, examCode);
    return NextResponse.json({ groups });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Không tải được nhóm đề.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const { user, response } = await requireAuthUser();
  if (!user) return response;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      examCode?: string;
      name?: string;
    };
    const examCode = isExamCode(body.examCode) ? body.examCode : null;
    if (!examCode) {
      return NextResponse.json({ error: "Mã đề không hợp lệ." }, { status: 400 });
    }
    const group = await createSampleGroup({
      userId: user.id,
      examCode,
      name: body.name?.trim() || "Nhóm mới",
    });
    return NextResponse.json({ group });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Không tạo được nhóm.",
      },
      { status: 500 },
    );
  }
}
