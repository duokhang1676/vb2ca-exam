import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function getAuthUser() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function requireAuthUser() {
  const user = await getAuthUser();
  if (!user) {
    return {
      user: null,
      response: NextResponse.json(
        {
          error: "Cần đăng nhập để tiếp tục.",
          code: "UNAUTHORIZED",
          title: "Chưa đăng nhập",
          steps: [
            "Mở trang Đăng nhập.",
            "Đăng nhập bằng email đã đăng ký.",
            "Thử lại thao tác vừa rồi.",
          ],
        },
        { status: 401 },
      ),
    } as const;
  }
  return { user, response: null } as const;
}
