import { AlertTriangle, CircleCheck, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export type ContributeAlertPayload = {
  tone?: "error" | "success" | "info";
  title?: string;
  message: string;
  steps?: string[];
};

export function ContributeAlert({
  tone = "error",
  title,
  message,
  steps,
}: ContributeAlertPayload) {
  const Icon = tone === "success" ? CircleCheck : tone === "info" ? Info : AlertTriangle;
  return (
    <div
      className={cn(
        "space-y-2 rounded-lg px-3 py-3 text-sm",
        tone === "error" && "bg-destructive/10 text-destructive",
        tone === "success" && "bg-primary/10 text-primary",
        tone === "info" && "bg-muted text-foreground",
      )}
    >
      <p className="flex items-start gap-2 font-medium">
        <Icon className="mt-0.5 size-4 shrink-0" />
        <span>{title || message}</span>
      </p>
      {title ? <p className={tone === "error" ? "text-destructive/90" : ""}>{message}</p> : null}
      {steps && steps.length > 0 ? (
        <ol className="list-decimal space-y-1 pl-7">
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

export function alertFromApiError(data: {
  error?: string;
  title?: string;
  steps?: string[];
}): ContributeAlertPayload {
  return {
    tone: "error",
    title: data.title,
    message: data.error || "Có lỗi xảy ra.",
    steps: data.steps,
  };
}
