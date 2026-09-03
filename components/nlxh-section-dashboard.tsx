"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ContributeAlert } from "@/components/contribute-alert";
import {
  SECTION_CONFIG,
  SECTION_KEYS,
  type SectionHistoryItem,
  type SectionKey,
  type SectionPackRow,
  type SectionStats,
} from "@/lib/nlxh/section-types";

type EssayOption = { id: string; title: string | null; prompt: string };

type StatsResponse = {
  stats?: SectionStats[];
  essays?: EssayOption[];
  packs?: SectionPackRow[];
  error?: string;
};

export function NlxhSectionDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<SectionStats[]>([]);
  const [essays, setEssays] = useState<EssayOption[]>([]);
  const [packs, setPacks] = useState<SectionPackRow[]>([]);
  const [selected, setSelected] = useState<SectionKey[]>([]);
  const [essayId, setEssayId] = useState("");
  const [packId, setPackId] = useState("");
  const [historySection, setHistorySection] = useState<SectionKey | null>(null);
  const [history, setHistory] = useState<SectionHistoryItem[]>([]);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/nlxh/section/stats")
      .then((response) => response.json())
      .then((data: StatsResponse) => {
        setStats(data.stats ?? []);
        setEssays(data.essays ?? []);
        setPacks(data.packs ?? []);
        if (data.error) setError(data.error);
      })
      .catch(() => setError("Không tải được trang luyện tập theo phần."));
  }, []);

  function toggleSection(section: SectionKey) {
    setSelected((current) =>
      current.includes(section)
        ? current.filter((item) => item !== section)
        : [...current, section],
    );
  }

  async function openHistory(section: SectionKey) {
    setHistorySection(section);
    setHistoryBusy(true);
    const response = await fetch(`/api/nlxh/section/history/${section}`);
    const data = (await response.json()) as { items?: SectionHistoryItem[]; error?: string };
    setHistoryBusy(false);
    if (!response.ok) {
      setError(data.error || "Không tải được lịch sử.");
      return;
    }
    setHistory(data.items ?? []);
  }

  function startPractice() {
    if (selected.length === 0) {
      setError("Hãy chọn ít nhất một phần để luyện.");
      return;
    }
    const ordered = SECTION_KEYS.filter((key) => selected.includes(key));
    const params = new URLSearchParams({ sections: ordered.join(",") });
    if (packId) params.set("packId", packId);
    else if (essayId) params.set("essayId", essayId);
    router.push(`/nlxh/section/practice?${params.toString()}`);
  }

  const statsBySection = Object.fromEntries(
    stats.map((item) => [item.section, item]),
  ) as Partial<Record<SectionKey, SectionStats>>;

  return (
    <div className="mx-auto grid max-w-4xl gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Luyện tập theo phần</h1>
          <p className="text-sm text-muted-foreground">
            Chọn một hoặc nhiều phần của bài nghị luận, viết theo barem và nộp để AI chấm.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/nlxh/section/packs">Nạp đề từ chatbot</Link>
        </Button>
      </div>

      {error ? <ContributeAlert tone="error" message={error} /> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {SECTION_KEYS.map((section) => {
          const config = SECTION_CONFIG[section];
          const item = statsBySection[section];
          const attempts = item?.attempts ?? 0;
          const average = item?.averageScore;
          return (
            <Card key={section}>
              <CardHeader className="space-y-1">
                <CardTitle className="text-base">{config.label}</CardTitle>
                <CardDescription>
                  {config.wordMin}–{config.wordMax} chữ · {config.maxScore} điểm
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  {attempts} bài · TB {average == null ? "—" : average}/{config.maxScore}
                </p>
                <Button size="sm" variant="outline" onClick={() => openHistory(section)}>
                  Xem lịch sử
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {historySection ? (
        <Card>
          <CardHeader>
            <CardTitle>Lịch sử · {SECTION_CONFIG[historySection].label}</CardTitle>
            <CardDescription>Các lần đã nộp có chứa phần này.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {historyBusy ? (
              <p className="text-sm text-muted-foreground">Đang tải...</p>
            ) : history.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có bài làm.</p>
            ) : (
              history.map((item) => (
                <div key={item.id} className="rounded-lg border px-3 py-2 text-sm">
                  <p className="font-medium">
                    {item.score == null ? "Chưa có điểm" : `${item.score}/${item.maxScore}`}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {new Date(item.createdAt).toLocaleString("vi-VN")}
                    </span>
                  </p>
                  <p className="text-muted-foreground">{item.essayPrompt || "Đề luyện tập"}</p>
                </div>
              ))
            )}
            <Button variant="ghost" size="sm" onClick={() => setHistorySection(null)}>
              Đóng lịch sử
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Tạo bài luyện tập</CardTitle>
          <CardDescription>Chọn phần, rồi chọn đề ngân hàng hoặc đề từ chatbot.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Phần luyện</Label>
            <div className="flex flex-wrap gap-2">
              {SECTION_KEYS.map((section) => {
                const active = selected.includes(section);
                const config = SECTION_CONFIG[section];
                return (
                  <Button
                    key={section}
                    type="button"
                    size="sm"
                    variant={active ? "default" : "outline"}
                    aria-pressed={active}
                    onClick={() => toggleSection(section)}
                  >
                    {config.shortLabel}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-1">
            <Label>Đề thi ngân hàng</Label>
            <select
              className="h-9 rounded-lg border bg-background px-2 text-sm"
              value={essayId}
              onChange={(event) => {
                setEssayId(event.target.value);
                setPackId("");
              }}
            >
              <option value="">Ngẫu nhiên nếu không chọn đề chatbot</option>
              {essays.map((essay) => (
                <option key={essay.id} value={essay.id}>
                  {essay.title || essay.prompt}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-1">
            <Label>Danh sách đề từ chatbot</Label>
            <select
              className="h-9 rounded-lg border bg-background px-2 text-sm"
              value={packId}
              onChange={(event) => {
                setPackId(event.target.value);
                if (event.target.value) setEssayId("");
              }}
            >
              <option value="">Không dùng đề chatbot</option>
              {packs.map((pack) => (
                <option key={pack.id} value={pack.id}>
                  {pack.essayPrompt || "Đề chatbot"}
                </option>
              ))}
            </select>
            {packs.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Chưa có đề chatbot. Nạp JSON tại trang gói dữ liệu.
              </p>
            ) : null}
          </div>

          <Button onClick={startPractice}>Làm bài</Button>
        </CardContent>
      </Card>
    </div>
  );
}
