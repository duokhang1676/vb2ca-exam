"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FileUp, LoaderCircle } from "lucide-react";
import {
  alertFromApiError,
  ContributeAlert,
  type ContributeAlertPayload,
} from "@/components/contribute-alert";
import {
  ContributeProgress,
  ESSAY_PARSE_STEPS,
  QUESTION_PARSE_STEPS,
  SAMPLE_JSON_STEPS,
} from "@/components/contribute-progress";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ExamCode } from "@/lib/exam/types";
import { cn } from "@/lib/utils";

export function ContributePanel({ signedIn }: { signedIn: boolean }) {
  if (!signedIn) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Đóng góp đề minh họa</CardTitle>
          <CardDescription>
            Cần đăng nhập để upload file JSON đề minh họa CA1 hoặc CA4.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/login?next=/">Đăng nhập để đóng góp</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const showPartContribute = false;

  return (
    <div className="grid gap-4">
      {showPartContribute ? (
        <div className="grid gap-4 md:grid-cols-2">
          <EssayContributeForm />
          <QuestionContributeForm />
        </div>
      ) : null}
      <SampleContributeForm />
    </div>
  );
}

function FormatHelp({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <details className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
      <summary className="cursor-pointer font-medium">{title}</summary>
      <div className="mt-2 space-y-2 text-muted-foreground">{children}</div>
    </details>
  );
}

function EssayContributeForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<ContributeAlertPayload | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAlert(null);
    setBusy(true);
    try {
      const form = new FormData(event.currentTarget);
      form.set("kind", "essay");
      const response = await fetch("/api/bank/parse", { method: "POST", body: form });
      const data = (await response.json()) as {
        draftId?: string;
        error?: string;
        title?: string;
        steps?: string[];
      };
      if (!response.ok || !data.draftId) {
        setAlert(alertFromApiError(data));
        return;
      }
      router.push(`/contribute/review/${data.draftId}`);
    } catch {
      setAlert({
        tone: "error",
        title: "Không gửi được file",
        message: "Kiểm tra kết nối mạng rồi thử lại.",
        steps: ["Giữ nguyên file đã chọn.", "Đăng nhập lại nếu phiên hết hạn."],
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Đóng góp phần 1</CardTitle>
        <CardDescription>
          Nghị luận xã hội dùng chung CA1 và CA4. Hệ thống OCR trước, bạn review rồi mới nạp.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="essay-file">File đề nghị luận</Label>
            <Input
              id="essay-file"
              name="file"
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              required
              disabled={busy}
            />
            <FormatHelp title="Xem ví dụ format PDF/DOCX nghị luận">
              <p>Chỉ gồm Phần 1 — nghị luận xã hội. Bỏ phần trắc nghiệm nếu file là đề đầy đủ.</p>
              <ul className="list-disc pl-5">
                <li>Một đề: nguyên văn yêu cầu làm bài + ngữ liệu.</li>
                <li>Nhiều đề trong một file: ngăn cách bằng một dòng <code>---</code>.</li>
                <li>PDF nên có chữ chọn được. File scan ảnh thuần dễ OCR sai.</li>
              </ul>
            </FormatHelp>
          </div>
          {alert ? <ContributeAlert {...alert} /> : null}
          <Button type="submit" disabled={busy}>
            {busy ? <LoaderCircle className="animate-spin" /> : <FileUp />}
            {busy ? "Đang trích xuất..." : "Nạp vào ngân hàng"}
          </Button>
          <ContributeProgress active={busy} steps={ESSAY_PARSE_STEPS} />
        </form>
      </CardContent>
    </Card>
  );
}

function QuestionContributeForm() {
  const router = useRouter();
  const [examCode, setExamCode] = useState<ExamCode>("CA1");
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<ContributeAlertPayload | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAlert(null);
    setBusy(true);
    try {
      const form = new FormData(event.currentTarget);
      form.set("kind", "questions");
      form.set("examCode", examCode);
      const response = await fetch("/api/bank/parse", { method: "POST", body: form });
      const data = (await response.json()) as {
        draftId?: string;
        error?: string;
        title?: string;
        steps?: string[];
      };
      if (!response.ok || !data.draftId) {
        setAlert(alertFromApiError(data));
        return;
      }
      router.push(`/contribute/review/${data.draftId}`);
    } catch {
      setAlert({
        tone: "error",
        title: "Không gửi được file",
        message: "Kiểm tra kết nối mạng rồi thử lại.",
        steps: ["Giữ nguyên hai file đã chọn.", "Đăng nhập lại nếu phiên hết hạn."],
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Đóng góp phần 2</CardTitle>
        <CardDescription>
          Chọn mã đề, upload PDF/DOCX câu hỏi và TXT đáp án. Review câu OCR trước khi nạp.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
            {(["CA1", "CA4"] as const).map((code) => (
              <button
                key={code}
                type="button"
                disabled={busy}
                onClick={() => setExamCode(code)}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium",
                  examCode === code
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground",
                )}
              >
                {code}
              </button>
            ))}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="question-file">File câu hỏi (PDF/DOCX)</Label>
            <Input
              id="question-file"
              name="file"
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              required
              disabled={busy}
            />
            <FormatHelp title="Xem ví dụ format PDF/DOCX phần 2">
              <ul className="list-disc pl-5">
                <li>Câu đánh số thứ tự, trắc nghiệm có đủ A B C D.</li>
                <li>Cụm đọc hiểu/tình huống (thường 3 câu) giữ nguyên đoạn thông tin chung.</li>
                <li>Câu điền đáp án để cuối file, không có 4 lựa chọn.</li>
                <li>Không đưa file đáp án vào PDF — đáp án nằm ở file TXT riêng.</li>
              </ul>
            </FormatHelp>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="answer-file">File đáp án (TXT)</Label>
            <Input
              id="answer-file"
              name="answers"
              type="file"
              accept="text/plain,.txt"
              required
              disabled={busy}
            />
            <FormatHelp title="Xem ví dụ format TXT đáp án">
              <p>Mỗi dòng một câu, UTF-8, không tiêu đề:</p>
              <pre className="overflow-x-auto rounded-md bg-background p-2 font-mono text-xs text-foreground">{`1 A
2 B
46 72
55 Năng lực pháp luật`}</pre>
              <p>
                Tải mẫu:{" "}
                <a className="text-primary underline" href="/samples/dapanca1.txt" download>
                  CA1
                </a>
                {" · "}
                <a className="text-primary underline" href="/samples/dapanca4.txt" download>
                  CA4
                </a>
              </p>
            </FormatHelp>
          </div>
          {alert ? <ContributeAlert {...alert} /> : null}
          <Button type="submit" disabled={busy}>
            {busy ? <LoaderCircle className="animate-spin" /> : <FileUp />}
            {busy ? "Đang trích xuất..." : "Nạp vào ngân hàng"}
          </Button>
          <ContributeProgress active={busy} steps={QUESTION_PARSE_STEPS} />
        </form>
      </CardContent>
    </Card>
  );
}

function SampleContributeForm() {
  const router = useRouter();
  const [examCode, setExamCode] = useState<ExamCode>("CA1");
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<ContributeAlertPayload | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAlert(null);
    setBusy(true);
    try {
      const form = new FormData(event.currentTarget);
      form.set("examCode", examCode);
      const response = await fetch("/api/samples/parse", { method: "POST", body: form });
      const data = (await response.json()) as {
        examId?: string;
        title?: string;
        added?: number;
        skipped?: number;
        error?: string;
        steps?: string[];
      };
      if (!response.ok || !data.examId) {
        setAlert(alertFromApiError(data));
        return;
      }
      const added = Number(data.added ?? 0);
      const skipped = Number(data.skipped ?? 0);
      router.push(`/bank?tab=sample&added=${added}&skipped=${skipped}`);
    } catch {
      setAlert({
        tone: "error",
        title: "Không gửi được file",
        message: "Kiểm tra kết nối mạng rồi thử lại.",
        steps: ["Giữ nguyên file JSON đã chọn.", "Đăng nhập lại nếu phiên hết hạn."],
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Đóng góp đề minh họa</CardTitle>
        <CardDescription>
          {examCode === "CA1"
            ? "Upload file JSON đề CA1 (essayPrompt, 50 câu và answerKey). Hệ thống lưu đề minh họa với số tăng dần."
            : "Upload file JSON đề CA4 (essayPrompt, 60 câu và answerKey). Hệ thống lưu đề minh họa với số tăng dần."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
            {(["CA1", "CA4"] as const).map((code) => (
              <button
                key={code}
                type="button"
                disabled={busy}
                onClick={() => setExamCode(code)}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium",
                  examCode === code
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground",
                )}
              >
                {code}
              </button>
            ))}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sample-file">File đề JSON</Label>
            <Input
              id="sample-file"
              key={`${examCode}-json`}
              name="file"
              type="file"
              accept=".json,application/json"
              required
              disabled={busy}
            />
            {examCode === "CA1" ? (
              <FormatHelp title="Yêu cầu file JSON CA1">
                <ul className="list-disc pl-5">
                  <li>Đúng cấu trúc: examCode, essayPrompt, questions (50 câu), answerKey.</li>
                  <li>Câu 1–39 trắc nghiệm độc lập, 40–45 thuộc 2 cụm đọc hiểu, 46–50 điền đáp án.</li>
                  <li>Đối chiếu file mẫu fixtures/generated/ca1-so-2.json.</li>
                </ul>
              </FormatHelp>
            ) : (
              <FormatHelp title="Yêu cầu file JSON CA4">
                <ul className="list-disc pl-5">
                  <li>Đúng cấu trúc: examCode, essayPrompt, questions (60 câu), answerKey.</li>
                  <li>Câu 1–54 trắc nghiệm (cụm tình huống 49–54 nếu có), 55–60 điền chữ.</li>
                  <li>Đối chiếu file mẫu fixtures/generated/ca4-so-2.json.</li>
                </ul>
              </FormatHelp>
            )}
          </div>
          {alert ? <ContributeAlert {...alert} /> : null}
          <Button type="submit" disabled={busy}>
            {busy ? <LoaderCircle className="animate-spin" /> : <FileUp />}
            {busy ? "Đang đọc file..." : "Tạo đề minh họa"}
          </Button>
          <ContributeProgress active={busy} steps={SAMPLE_JSON_STEPS} />
        </form>
      </CardContent>
    </Card>
  );
}
