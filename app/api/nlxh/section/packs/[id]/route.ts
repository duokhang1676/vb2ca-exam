import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/session";
import { sectionHintsSchema } from "@/lib/nlxh/section-types";
import {
  deleteSectionPack,
  getSectionPack,
  updateSectionPack,
} from "@/lib/nlxh/section-store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireAuthUser();
  if (!user) return response;
  const { id } = await context.params;
  try {
    const pack = await getSectionPack(id);
    if (!pack) {
      return NextResponse.json({ error: "Không tìm thấy đề." }, { status: 404 });
    }
    return NextResponse.json({ pack });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không tải được đề." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireAuthUser();
  if (!user) return response;
  const { id } = await context.params;
  try {
    const body = (await request.json().catch(() => ({}))) as {
      title?: string;
      essayPrompt?: string;
      hints?: unknown;
    };
    const hints =
      body.hints == null ? undefined : sectionHintsSchema.safeParse(body.hints);
    if (hints && !hints.success) {
      return NextResponse.json(
        { error: "Gợi ý không khớp schema (mỗi phần đúng 3 gợi ý)." },
        { status: 400 },
      );
    }
    const pack = await updateSectionPack(id, {
      title: body.title,
      essayPrompt: body.essayPrompt,
      hints: hints?.data,
    });
    return NextResponse.json({ pack });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không cập nhật được đề." },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireAuthUser();
  if (!user) return response;
  const { id } = await context.params;
  try {
    await deleteSectionPack(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không xóa được đề." },
      { status: 400 },
    );
  }
}
