"use client";

import { useMemo } from "react";
import katex from "katex";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br/>");
}

function renderLatex(tex: string, displayMode: boolean) {
  return katex.renderToString(tex, {
    throwOnError: false,
    displayMode,
    output: "html",
  });
}

function renderMixed(text: string) {
  const parts = text.split(
    /(\$\$[\s\S]+?\$\$|\$[^$\n]+\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\))/,
  );

  return parts
    .map((part) => {
      if (part.startsWith("$$") && part.endsWith("$$")) {
        return renderLatex(part.slice(2, -2), true);
      }
      if (part.startsWith("$") && part.endsWith("$")) {
        return renderLatex(part.slice(1, -1), false);
      }
      if (part.startsWith("\\[") && part.endsWith("\\]")) {
        return renderLatex(part.slice(2, -2), true);
      }
      if (part.startsWith("\\(") && part.endsWith("\\)")) {
        return renderLatex(part.slice(2, -2), false);
      }
      return escapeHtml(part);
    })
    .join("");
}

export function MathText({
  text,
  className,
  inline,
}: {
  text: string;
  className?: string;
  inline?: boolean;
}) {
  const html = useMemo(() => renderMixed(text), [text]);
  const Tag = inline ? "span" : "div";
  return (
    <Tag
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
