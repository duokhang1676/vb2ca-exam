import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    {
      error: "Luồng đóng góp đã đổi: dùng POST /api/bank/parse rồi review trước khi nạp.",
      code: "INVALID_FILE_TYPE",
    },
    { status: 410 },
  );
}
