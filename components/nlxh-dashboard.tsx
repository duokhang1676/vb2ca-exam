"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import type { SessionTask } from "@/lib/nlxh/session";
import { PRACTICE_MODE_LABELS, type SkillProgress } from "@/lib/nlxh/types";
import { NlxhGuides } from "@/components/nlxh-guides";

type StepRow = {
  id: string;
  title: string;
  skill: string;
  level: number;
  lastScore: number | null;
};

type ProgressResponse = {
  enrollment?: {
    currentStepId: string;
    status: string;
  };
  currentStepId?: string;
  progress?: SkillProgress[];
  steps?: StepRow[];
  error?: string;
};

export function NlxhDashboard() {
  const [task, setTask] = useState<SessionTask | null>(null);
  const [progress, setProgress] = useState<ProgressResponse | null>(null);

  useEffect(() => {
    fetch("/api/nlxh/session")
      .then((response) => response.json())
      .then((data: { task?: SessionTask }) => {
        if (data.task) setTask(data.task);
      })
      .catch(() => undefined);
    fetch("/api/nlxh/progress")
      .then((response) => response.json())
      .then((data: ProgressResponse) => setProgress(data))
      .catch(() => undefined);
  }, []);

  const percent = task
    ? Math.round((task.progressIndex / Math.max(task.progressTotal, 1)) * 100)
    : 0;
  const currentStepId =
    progress?.currentStepId ?? progress?.enrollment?.currentStepId ?? task?.stepId;
  const completed = progress?.enrollment?.status === "completed";
  const currentIndex = Math.max(
    0,
    (progress?.steps ?? []).findIndex((step) => step.id === currentStepId),
  );

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Luyện nghị luận xã hội</h1>
        <p className="text-sm text-muted-foreground">
          Hệ thống chỉ một nhiệm vụ mỗi lần: làm xong, đạt yêu cầu, rồi sang phần tiếp.
          Có thể xem và làm lại các phần đã mở.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nhiệm vụ hiện tại</CardTitle>
          <CardDescription>
            {task
              ? `${task.progressIndex + 1}/${task.progressTotal} · ${task.title}`
              : "Đang tải lộ trình..."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={percent} />
          {task?.enrollmentStatus === "completed" ? (
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/?sectionMode=part1">Thi thử phần 1</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/nlxh/free">Luyện tự do</Link>
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  await fetch("/api/nlxh/session", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "restart" }),
                  });
                  window.location.reload();
                }}
              >
                Học lại từ đầu
              </Button>
            </div>
          ) : (
            <Button asChild>
              <Link href="/nlxh/learn">Tiếp tục luyện</Link>
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Các phần luyện tập</CardTitle>
          <CardDescription>
            Phần đã mở có thể xem lại. Phần phía trước vẫn khóa theo lộ trình.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          {(progress?.steps ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Đang tải danh sách phần...</p>
          ) : (
            (progress?.steps ?? []).map((step, index) => {
              const status = completed
                ? "done"
                : index < currentIndex
                  ? "done"
                  : index === currentIndex
                    ? "current"
                    : "locked";
              return (
                <div
                  key={step.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
                >
                  <div>
                    <p className={status === "locked" ? "text-muted-foreground" : ""}>
                      {index + 1}. {step.title}
                    </p>
                    {step.lastScore != null ? (
                      <p className="text-xs text-muted-foreground">
                        Điểm gần nhất: {step.lastScore}/10
                      </p>
                    ) : null}
                  </div>
                  {status === "locked" ? (
                    <Badge variant="outline">Chưa mở</Badge>
                  ) : status === "current" ? (
                    <Button size="sm" asChild>
                      <Link href="/nlxh/learn">Tiếp tục</Link>
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/nlxh/learn?mode=review&stepId=${step.id}`}>
                        Xem / làm lại
                      </Link>
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <NlxhGuides />

      <div className="grid gap-3 sm:grid-cols-3">
        <Button variant="outline" asChild>
          <Link href="/nlxh/daily">15 phút mỗi ngày</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/nlxh/free">Luyện tự do</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/nlxh/packs">Gói chatbot ngoài</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kỹ năng</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {(progress?.progress ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có bài luyện kỹ năng.</p>
          ) : (
            (progress?.progress ?? []).map((item) => (
              <div key={item.skill} className="flex items-center justify-between gap-3 text-sm">
                <span>{PRACTICE_MODE_LABELS[item.skill]}</span>
                <span className="flex items-center gap-2">
                  <Badge variant="secondary">{item.mastery}</Badge>
                  {item.recentAverageScore}/10
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
