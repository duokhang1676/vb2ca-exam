"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SessionTask } from "@/lib/nlxh/session";
import { PRACTICE_MODE_LABELS } from "@/lib/nlxh/types";

export function NlxhDaily() {
  const [tasks, setTasks] = useState<SessionTask[]>([]);

  useEffect(() => {
    fetch("/api/nlxh/session?mode=daily")
      .then((response) => response.json())
      .then((data: { tasks?: SessionTask[] }) => setTasks(data.tasks ?? []))
      .catch(() => undefined);
  }, []);

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Luyện 15 phút</h1>
        <p className="text-sm text-muted-foreground">
          Một phiên ngắn: nhận diện, kỹ năng yếu, và viết đoạn. Không thay đổi lộ trình chính.
        </p>
      </div>
      {tasks.map((task, index) => (
        <Card key={`${task.skill}-${index}`}>
          <CardHeader>
            <CardTitle>
              {index + 1}.{" "}
              {task.skill === "framework"
                ? task.title
                : PRACTICE_MODE_LABELS[task.skill]}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link
                href={`/nlxh/learn?mode=daily&skill=${task.skill}&level=${task.level}${
                  task.essay ? `&essayId=${task.essay.id}` : ""
                }`}
              >
                Làm ngay
              </Link>
            </Button>
          </CardContent>
        </Card>
      ))}
      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">Đang soạn phiên luyện...</p>
      ) : null}
    </div>
  );
}
