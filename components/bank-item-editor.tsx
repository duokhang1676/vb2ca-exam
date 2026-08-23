"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import {
  alertFromApiError,
  ContributeAlert,
  type ContributeAlertPayload,
} from "@/components/contribute-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { OPTION_LETTERS } from "@/lib/exam/constants";
import { isMcq, type McqOptions, type QuestionType } from "@/lib/exam/types";

export function EditToolbar({
  signedIn,
  editing,
  busy,
  onEdit,
  onCancel,
  onSave,
}: {
  signedIn: boolean;
  editing: boolean;
  busy: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  if (!signedIn) return null;
  if (!editing) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={onEdit}>
        Sửa
      </Button>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" size="sm" disabled={busy} onClick={onSave}>
        {busy ? <LoaderCircle className="animate-spin" /> : null}
        Lưu
      </Button>
      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={onCancel}>
        Hủy
      </Button>
    </div>
  );
}

export function BankEssayFields({
  prompt,
  disabled,
  onChange,
}: {
  prompt: string;
  disabled: boolean;
  onChange: (prompt: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label>Đề nghị luận</Label>
      <Textarea
        className="min-h-40 font-exam text-base"
        disabled={disabled}
        value={prompt}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function BankPassageFields({
  passage,
  disabled,
  onChange,
}: {
  passage: string;
  disabled: boolean;
  onChange: (passage: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label>Đoạn thông tin / tình huống</Label>
      <Textarea
        className="min-h-28 font-exam"
        disabled={disabled}
        value={passage}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function BankQuestionFields({
  type,
  stem,
  options,
  answer,
  disabled,
  onChange,
}: {
  type: QuestionType;
  stem: string;
  options?: McqOptions;
  answer: string;
  disabled: boolean;
  onChange: (next: { stem: string; options?: McqOptions; answer: string }) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-2">
        <Label>Đề bài</Label>
        <Textarea
          className="font-exam"
          disabled={disabled}
          value={stem}
          onChange={(event) =>
            onChange({ stem: event.target.value, options, answer })
          }
        />
      </div>
      {isMcq(type) ? (
        <div className="grid gap-2">
          {OPTION_LETTERS.map((letter) => (
            <div key={letter} className="flex items-center gap-2">
              <span className="w-6 font-exam font-medium">{letter}.</span>
              <Input
                className="font-exam"
                disabled={disabled}
                value={options?.[letter] ?? ""}
                onChange={(event) =>
                  onChange({
                    stem,
                    answer,
                    options: {
                      A: options?.A ?? "",
                      B: options?.B ?? "",
                      C: options?.C ?? "",
                      D: options?.D ?? "",
                      [letter]: event.target.value,
                    },
                  })
                }
              />
            </div>
          ))}
        </div>
      ) : null}
      <div className="grid max-w-md gap-2">
        <Label>Đáp án</Label>
        <Input
          className="font-exam"
          disabled={disabled}
          value={answer}
          onChange={(event) =>
            onChange({ stem, options, answer: event.target.value })
          }
        />
      </div>
    </div>
  );
}

export function useBankSave() {
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<ContributeAlertPayload | null>(null);

  async function save<T>(request: () => Promise<Response>): Promise<T | null> {
    setBusy(true);
    setAlert(null);
    try {
      const response = await request();
      const data = (await response.json()) as T & {
        error?: string;
        title?: string;
        steps?: string[];
      };
      if (!response.ok) {
        setAlert(alertFromApiError(data));
        return null;
      }
      return data;
    } catch {
      setAlert({
        tone: "error",
        title: "Không lưu được",
        message: "Kiểm tra kết nối mạng rồi thử lại.",
      });
      return null;
    } finally {
      setBusy(false);
    }
  }

  return {
    busy,
    alert,
    setAlert,
    save,
    alertNode: alert ? <ContributeAlert {...alert} /> : null,
  };
}
