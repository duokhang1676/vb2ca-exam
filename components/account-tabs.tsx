"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/account", label: "Hồ sơ" },
  { href: "/account/attempts", label: "Lịch sử làm bài" },
  { href: "/account/review", label: "Ôn tập" },
  { href: "/account/contributions", label: "Lịch sử đóng góp" },
];

export function AccountTabs() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-2">
      {TABS.map((tab) => {
        const active =
          tab.href === "/account"
            ? pathname === "/account"
            : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm font-medium",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "hover:bg-muted",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
