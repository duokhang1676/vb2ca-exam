import mammoth from "mammoth";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function isPdfFile(name: string, type?: string): boolean {
  return name.toLowerCase().endsWith(".pdf") || type === "application/pdf";
}

export function isDocxFile(name: string, type?: string): boolean {
  return name.toLowerCase().endsWith(".docx") || type === DOCX_MIME;
}

export async function extractDocxText(bytes: Uint8Array): Promise<string> {
  const result = await mammoth.extractRawText({
    buffer: Buffer.from(bytes),
  });
  const text = result.value.trim();
  if (!text) {
    throw new Error("File DOCX không có nội dung chữ để trích xuất.");
  }
  return text;
}
