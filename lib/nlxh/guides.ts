import { DOCX_MIME, isDocxFile, isPdfFile } from "@/lib/exam/document";

export const GUIDE_BUCKET = "nlxh-guides";
export const GUIDE_MAX_BYTES = 15 * 1024 * 1024;

export type GuideRow = {
  id: string;
  title: string;
  storagePath: string;
  mime: string;
  originalName: string;
  createdBy: string;
  createdAt: string;
};

export function isGuideFile(name: string, type?: string): boolean {
  return isPdfFile(name, type) || isDocxFile(name, type);
}

export function guideMime(name: string, type?: string): string {
  if (isDocxFile(name, type)) return DOCX_MIME;
  return "application/pdf";
}

export function guidePublicUrl(storagePath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) {
    throw new Error("Thiếu NEXT_PUBLIC_SUPABASE_URL.");
  }
  return `${base}/storage/v1/object/public/${GUIDE_BUCKET}/${storagePath}`;
}

export function sanitizeGuideName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(0, 80);
}
