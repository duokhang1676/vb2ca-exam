"use client";

import { useState } from "react";
import { MathText } from "@/components/math-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function TopicBadge({ topic }: { topic?: string | null }) {
  const value = topic?.trim();
  if (!value) return null;
  return <Badge variant="outline">Dạng bài · {value}</Badge>;
}

export function SolutionReveal({
  solution,
  className,
  textClassName = "font-exam text-sm leading-7",
}: {
  solution?: string | null;
  className?: string;
  textClassName?: string;
}) {
  const value = solution?.trim();
  const [open, setOpen] = useState(false);
  if (!value) return null;

  return (
    <div className={cn("space-y-2", className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen((current) => !current)}
      >
        {open ? "Ẩn lời giải" : "Xem lời giải"}
      </Button>
      {open ? (
        <div className="rounded-lg bg-muted/50 p-3">
          <MathText className={textClassName} text={value} />
        </div>
      ) : null}
    </div>
  );
}
