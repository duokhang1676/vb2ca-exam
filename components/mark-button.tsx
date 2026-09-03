"use client";

import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function MarkButton({
  marked,
  disabled,
  onClick,
}: {
  marked: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant={marked ? "default" : "outline"}
      size="sm"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={marked}
    >
      <Bookmark className={cn("size-4", marked && "fill-current")} />
      {marked ? "Đã đánh dấu" : "Đánh dấu"}
    </Button>
  );
}
