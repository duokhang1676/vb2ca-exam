import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { examUploadContentType } from "./document";
import { asJson, nullableText } from "./json";
import type { AnswerKey, ExamCode, ExamSource, Question } from "./types";

export async function persistExam(params: {
  title: string;
  essayPrompt: string;
  essayTopic?: string;
  essaySolution?: string;
  questions: Question[];
  answerKey: AnswerKey;
  examCode?: ExamCode;
  source?: ExamSource;
  pdf?: { bytes: Buffer; filename: string };
  answerFile?: { bytes: Buffer; filename: string };
}) {
  const supabase = getSupabaseAdmin();
  const stamp = Date.now();
  let pdfPath: string | null = null;
  let answerPath: string | null = null;

  if (params.pdf) {
    pdfPath = `${stamp}/${params.pdf.filename}`;
    const { error } = await supabase.storage
      .from("exam-uploads")
      .upload(pdfPath, params.pdf.bytes, {
        contentType: examUploadContentType(params.pdf.filename),
        upsert: false,
      });
    if (error) {
      console.error("pdf upload failed", error);
      pdfPath = null;
    }
  }

  if (params.answerFile) {
    answerPath = `${stamp}/${params.answerFile.filename}`;
    const { error } = await supabase.storage
      .from("exam-uploads")
      .upload(answerPath, params.answerFile.bytes, {
        contentType: "text/plain",
        upsert: false,
      });
    if (error) {
      console.error("answer upload failed", error);
      answerPath = null;
    }
  }

  const { data, error } = await supabase
    .from("exams")
    .insert({
      title: params.title,
      essay_prompt: params.essayPrompt,
      essay_topic: nullableText(params.essayTopic),
      essay_solution: nullableText(params.essaySolution),
      questions: asJson(params.questions),
      answer_key: asJson(params.answerKey),
      pdf_path: pdfPath,
      answer_path: answerPath,
      exam_code: params.examCode ?? null,
      source: params.source ?? null,
    })
    .select("id, title, essay_prompt, questions, exam_code, source, created_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Không lưu được đề thi vào database.");
  }

  return data;
}
