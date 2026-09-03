import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/session";
import { deleteSampleGroup, renameSampleGroup } from "@/lib/exam/sample-groups";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { user, response } = await requireAuthUser();
  if (!user) return response;
  const { id } = await params;

  try {
    const body = (await request.json().catch(() => ({}))) as { name?: string };
    const group = await renameSampleGroup({
      userId: user.id,
      groupId: id,
      name: typeof body.name === "string" ? body.name : "",
    });
    return NextResponse.json({ group });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Không đổi được tên nhóm.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const { user, response } = await requireAuthUser();
  if (!user) return response;
  const { id } = await params;

  try {
    await deleteSampleGroup(user.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Không xóa được nhóm.",
      },
      { status: 500 },
    );
  }
}
