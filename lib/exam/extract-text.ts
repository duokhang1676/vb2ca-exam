import JSZip from "jszip";
import { extractTextItems } from "unpdf";
import { ContributeError } from "./contribute-error";
import { ommlToLatex } from "./omml-to-latex";

const MIN_CHARS = 400;
const REPLACEMENT = "\uFFFD";

function nativeParseError(message: string, steps?: string[]): ContributeError {
  return new ContributeError(
    "INVALID_CONTENT",
    message,
    "Không đọc được đề từ file",
    steps ?? [
      "Dùng PDF/DOCX có lớp chữ chọn được, không phải file scan ảnh.",
      "Đề cần đủ Phần 1 nghị luận và Phần 2 đánh số Câu 1, Câu 2, …",
      "Nếu PDF là ảnh, hãy dùng form OCR đóng góp phần 1/phần 2 hiện có.",
    ],
  );
}

export function assertReadableExamText(text: string): string {
  const trimmed = text.replace(/\u00a0/g, " ").trim();
  if (trimmed.length < MIN_CHARS) {
    throw nativeParseError(
      "File không có đủ chữ để đọc (có thể là PDF scan). Hãy dùng form OCR hiện có.",
    );
  }
  const replacements = (trimmed.match(new RegExp(REPLACEMENT, "g")) ?? []).length;
  if (replacements > 20 && replacements / trimmed.length > 0.02) {
    throw nativeParseError(
      "File có nhiều ký tự lỗi font. Hãy xuất lại PDF/DOCX có Unicode, hoặc dùng OCR.",
    );
  }
  if (!/Câu\s+\d+/i.test(trimmed)) {
    throw nativeParseError(
      "Không thấy câu hỏi đánh số (Câu 1, Câu 2, …). Kiểm tra file có phải đề đầy đủ không.",
    );
  }
  return trimmed;
}

export function normalizeExtractedMath(text: string): string {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function reconstructPage(
  items: Array<{
    str: string;
    x: number;
    y: number;
    height: number;
    hasEOL: boolean;
  }>,
): string {
  type Line = { y: number; parts: { x: number; str: string }[] };
  const lines: Line[] = [];
  for (const item of items) {
    const str = item.str.replace(/\u00a0/g, " ");
    if (!str && !item.hasEOL) continue;
    const tolerance = Math.max(item.height * 0.45, 2.5);
    let line = lines.find((candidate) => Math.abs(candidate.y - item.y) <= tolerance);
    if (!line) {
      line = { y: item.y, parts: [] };
      lines.push(line);
    }
    if (str) line.parts.push({ x: item.x, str });
    if (item.hasEOL) {
      line.parts.push({ x: Number.POSITIVE_INFINITY, str: "\n" });
    }
  }
  lines.sort((a, b) => b.y - a.y);
  return lines
    .map((line) =>
      line.parts
        .sort((a, b) => a.x - b.x)
        .map((part) => part.str)
        .join("")
        .replace(/[ \t]+/g, " ")
        .trim(),
    )
    .filter(Boolean)
    .join("\n");
}

export async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const { items, totalPages } = await extractTextItems(bytes);
  if (!totalPages || items.length === 0) {
    throw nativeParseError(
      "Không đọc được chữ từ PDF. Nếu file là ảnh scan, hãy dùng form OCR.",
    );
  }
  const text = items.map(reconstructPage).join("\n\n");
  return assertReadableExamText(normalizeExtractedMath(text));
}

function replaceMathBlocks(xml: string): { xml: string; blocks: string[] } {
  const blocks: string[] = [];
  let next = xml.replace(/<m:oMathPara\b[\s\S]*?<\/m:oMathPara>/gi, (match) => {
    const latex = ommlToLatex(match, true);
    blocks.push(latex);
    return ` MATHBLOCK${blocks.length - 1} `;
  });
  next = next.replace(/<m:oMath\b[\s\S]*?<\/m:oMath>/gi, (match) => {
    const latex = ommlToLatex(match, false);
    blocks.push(latex);
    return ` MATHBLOCK${blocks.length - 1} `;
  });
  return { xml: next, blocks };
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

export async function extractDocxExamText(bytes: Uint8Array): Promise<string> {
  const zip = await JSZip.loadAsync(bytes);
  const documentFile = zip.file("word/document.xml");
  if (!documentFile) {
    throw nativeParseError("File DOCX không hợp lệ (thiếu word/document.xml).");
  }
  let xml = await documentFile.async("string");
  xml = xml.replace(/<w:del\b[\s\S]*?<\/w:del>/gi, "");
  xml = xml.replace(/<w:instrText\b[\s\S]*?<\/w:instrText>/gi, "");
  const { xml: withMath, blocks } = replaceMathBlocks(xml);
  const withBreaks = withMath
    .replace(/<w:tab\b[^>]*\/?>/gi, "\t")
    .replace(/<w:br\b[^>]*\/?>/gi, "\n")
    .replace(/<w:cr\b[^>]*\/?>/gi, "\n")
    .replace(/<\/w:p>/gi, "\n")
    .replace(/<\/w:tr>/gi, "\n")
    .replace(/<\/w:tc>/gi, "\t");
  const withText = withBreaks.replace(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/gi, (_, inner: string) =>
    decodeXmlEntities(inner),
  );
  const stripped = withText.replace(/<[^>]+>/g, "");
  const restored = stripped.replace(/MATHBLOCK(\d+)/g, (_, index: string) => {
    return blocks[Number(index)] ?? "";
  });
  return assertReadableExamText(normalizeExtractedMath(decodeXmlEntities(restored)));
}

export async function extractExamFileText(params: {
  bytes: Uint8Array;
  filename: string;
  mimeType?: string;
}): Promise<string> {
  const name = params.filename.toLowerCase();
  if (name.endsWith(".pdf") || params.mimeType === "application/pdf") {
    return extractPdfText(params.bytes);
  }
  if (
    name.endsWith(".docx") ||
    params.mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return extractDocxExamText(params.bytes);
  }
  throw nativeParseError("Chỉ nhận PDF hoặc DOCX có chữ đọc được.");
}
