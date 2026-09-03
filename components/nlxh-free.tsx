"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  PRACTICE_MODE_LABELS,
  PRACTICE_MODES,
  type PracticeMode,
} from "@/lib/nlxh/types";

export function NlxhFree() {
  const router = useRouter();
  const [essays, setEssays] = useState<{ id: string; prompt: string }[]>([]);
  const [essayId, setEssayId] = useState("");
  const [skill, setSkill] = useState<PracticeMode>("introduction");
  const [level, setLevel] = useState("2");

  useEffect(() => {
    fetch("/api/nlxh/progress")
      .then((response) => response.json())
      .then((data: { essays?: { id: string; prompt: string }[] }) => {
        const list = data.essays ?? [];
        setEssays(list);
        if (list[0]) setEssayId(list[0].id);
      })
      .catch(() => undefined);
  }, []);

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Luyện tự do</h1>
        <p className="text-sm text-muted-foreground">
          Chọn đề và kỹ năng. Không làm thay đổi vị trí lộ trình bắt buộc.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Chọn bài</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-1">
            <Label>Đề</Label>
            <select
              className="h-9 rounded-lg border bg-background px-2 text-sm"
              value={essayId}
              onChange={(event) => setEssayId(event.target.value)}
            >
              {essays.map((essay) => (
                <option key={essay.id} value={essay.id}>
                  {essay.prompt}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1">
            <Label>Kỹ năng</Label>
            <select
              className="h-9 rounded-lg border bg-background px-2 text-sm"
              value={skill}
              onChange={(event) => setSkill(event.target.value as PracticeMode)}
            >
              {PRACTICE_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {PRACTICE_MODE_LABELS[mode]}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1">
            <Label>Cấp</Label>
            <select
              className="h-9 rounded-lg border bg-background px-2 text-sm"
              value={level}
              onChange={(event) => setLevel(event.target.value)}
            >
              <option value="1">L1 · Có khung</option>
              <option value="2">L2 · Có gợi ý</option>
              <option value="3">L3 · Tự viết</option>
            </select>
          </div>
          <Button
            onClick={() =>
              router.push(
                `/nlxh/learn?mode=free&essayId=${essayId}&skill=${skill}&level=${level}`,
              )
            }
            disabled={!essayId}
          >
            Bắt đầu
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
