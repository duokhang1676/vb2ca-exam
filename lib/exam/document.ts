import mammoth from "mammoth";

export const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function examUploadContentType(filename: string): string {
  const name = filename.toLowerCase();
  if (name.endsWith(".docx")) return DOCX_MIME;
  if (name.endsWith(".txt")) return "text/plain";
  return "application/pdf";
}

export function isPdfFile(name: string, type?: string): boolean {
  return name.toLowerCase().endsWith(".pdf") || type === "application/pdf";
}

export function isDocxFile(name: string, type?: string): boolean {
  return name.toLowerCase().endsWith(".docx") || type === DOCX_MIME;
}

export function isJsonFile(name: string, type?: string): boolean {
  return name.toLowerCase().endsWith(".json") || type === "application/json";
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

export async function convertDocxToHtml(bytes: Uint8Array): Promise<string> {
  const result = await mammoth.convertToHtml({
    buffer: Buffer.from(bytes),
  });
  return result.value.trim();
}
