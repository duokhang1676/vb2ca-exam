import { cn } from "@/lib/utils";

export type QuestionTocItem = {
  href: string;
  label: string;
  state: "empty" | "filled" | "correct" | "wrong";
  marked?: boolean;
};

export function tocItem(
  href: string,
  label: string,
  state: QuestionTocItem["state"],
  marked = false,
): QuestionTocItem {
  return { href, label, state, marked };
}

export function QuestionToc({ items }: { items: QuestionTocItem[] }) {
  return (
    <aside className="h-fit rounded-xl border bg-card p-3 lg:sticky lg:top-20 lg:self-start">
      <p className="mb-2 text-xs font-medium text-muted-foreground">Mục lục</p>
      <div className="grid grid-cols-5 gap-1.5">
        {items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={cn(
              "flex h-8 items-center justify-center rounded-md text-xs",
              item.state === "empty" && "bg-muted",
              item.state === "filled" && "bg-primary text-primary-foreground",
              item.state === "correct" && "bg-emerald-600 text-white",
              item.state === "wrong" &&
                "bg-destructive text-destructive-foreground",
              item.marked && "ring-2 ring-amber-500",
            )}
          >
            {item.label}
          </a>
        ))}
      </div>
    </aside>
  );
}
