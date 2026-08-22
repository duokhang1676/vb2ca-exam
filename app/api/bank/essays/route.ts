import { NextResponse } from "next/server";
import { importEssays } from "@/lib/exam/bank";
import { extractDocxText, isDocxFile, isPdfFile } from "@/lib/exam/document";
import { parseEssayDocument } from "@/lib/exam/parse-pdf";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Cần upload file đề nghị luận (PDF hoặc DOCX)." },
        { status: 400 },
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    let essayPrompt: string;

    if (isPdfFile(file.name, file.type)) {
      essayPrompt = await parseEssayDocument({
        file: {
          bytes,
          mediaType: "application/pdf",
          filename: file.name,
        },
      });
    } else if (isDocxFile(file.name, file.type)) {
      const text = await extractDocxText(bytes);
      essayPrompt = await parseEssayDocument({ text });
    } else {
      return NextResponse.json(
        { error: "Phần 1 chỉ nhận PDF hoặc DOCX." },
        { status: 400 },
      );
    }

    const summary = await importEssays(essayPrompt, file.name);
    return NextResponse.json(summary);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không nạp được đề nghị luận.",
      },
      { status: 500 },
    );
  }
}
