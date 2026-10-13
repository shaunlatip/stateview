"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "./cn";
import { IconCheck, IconCopy, IconFile, IconTerminal } from "./icons";

export type Lang = "ts" | "bash" | "env" | "text";

// Token colours measured in the captured Save Key modal: keywords pink-900, strings green-900,
// identifiers gray-1000, all in Geist Mono 13/20.
const KEYWORDS = new Set(["import", "from", "const", "await", "export", "async", "for", "of", "new", "return", "let", "function"]);

export function highlight(code: string, lang: Lang): ReactNode[] {
  if (lang === "text") return [<span key="0">{code}</span>];
  // The dashboard renders export lines fully in green (captured Terminal block).
  if (lang === "bash" && code.startsWith("export ")) return [<span key="0" className="text-gw-green-900">{code}</span>];
  const out: ReactNode[] = [];
  const re =
    lang === "ts"
      ? /('[^']*'|"[^"]*"|`[^`]*`|\/\/[^\n]*|\b[A-Za-z_][\w]*\b(?=\()|\b[A-Za-z_]\w*\b|\s+|.)/g
      : lang === "env"
        ? /(^[A-Z_][A-Z0-9_]*(?==)|=|[^\n]+|\n)/gm
        : /('[^']*'|"[^"]*"|(?<=^|\s)--?[\w-]+|^\$|^[\w.@/-]+|\s+|[^\s]+)/gm;
  let i = 0;
  for (const match of code.matchAll(re)) {
    const tok = match[0];
    const at = match.index ?? 0;
    let cls = "";
    if (lang === "ts") {
      if (/^['"`]/.test(tok)) cls = "text-gw-green-900";
      else if (tok.startsWith("//")) cls = "text-gw-gray-900";
      else if (KEYWORDS.has(tok)) cls = "text-gw-pink-900";
      else if (/^[A-Za-z_]\w*$/.test(tok) && code[at + tok.length] === "(") cls = "text-gw-purple-900";
    } else if (lang === "env") {
      if (/^[A-Z_][A-Z0-9_]*$/.test(tok)) cls = "text-gw-green-900";
    } else if (/^['"]/.test(tok)) cls = "text-gw-green-900";
    else if (/^--?[\w-]+$/.test(tok)) cls = "text-gw-gray-900";
    else if (tok === "$") cls = "text-gw-gray-900 select-none";
    else if (at === 0 || code[at - 1] === "\n") cls = "text-gw-purple-900";
    out.push(
      <span key={i++} className={cls}>
        {tok}
      </span>,
    );
  }
  return out;
}

/** Icon-only copy: the copy glyph blurs into a check for 1.4s, and a status says "Copied". */
export function CopyButton({ value, label = "Copy", onCopy, className }: { value: string; label?: string; onCopy?: () => void; className?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => {
        navigator.clipboard?.writeText(value).catch(() => {});
        setCopied(true);
        onCopy?.();
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setCopied(false), 1400);
      }}
      className={cn(
        "inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-gw-md text-gw-gray-900 transition-colors outline-none hover:bg-gw-gray-alpha-200 hover:text-gw-gray-1000 focus-visible:shadow-gw-focus-ring",
        className,
      )}
    >
      <span className="relative size-4">
        <IconCopy size={16} className={cn("gw-icon-swap absolute inset-0", copied && "gw-icon-hidden")} />
        <IconCheck size={16} className={cn("gw-icon-swap absolute inset-0", !copied && "gw-icon-hidden")} />
      </span>
      <span role="status" className="sr-only">
        {copied ? "Copied" : ""}
      </span>
    </button>
  );
}

/**
 * Captured structure: a 40px header on background-200 with a 1px gray-400 border and 8px radius,
 * a file or terminal glyph and a 13px gray-900 label, copy on the right. "bare" is one line with
 * the copy button beside it.
 */
export function CodeBlock({
  code,
  lang = "ts",
  filename,
  kind = filename ? "file" : "terminal",
}: {
  code: string;
  lang?: Lang;
  filename?: string;
  kind?: "file" | "terminal" | "bare";
}) {
  if (kind === "bare") {
    return (
      <div className="flex min-h-12 items-center justify-between gap-3 rounded-gw-lg border border-gw-gray-400 bg-gw-background-100 py-2 pr-2 pl-4">
        <pre className="min-w-0 overflow-x-auto font-mono text-gw-copy-13-mono whitespace-pre text-gw-gray-1000">{highlight(code, lang)}</pre>
        <CopyButton value={code} />
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-gw-lg border border-gw-gray-400 bg-gw-background-200">
      <div className="flex h-10 items-center justify-between border-b border-gw-gray-400 pr-1 pl-4">
        <span className="flex min-w-0 items-center gap-2 text-gw-label-13 text-gw-gray-900">
          {kind === "terminal" ? <IconTerminal size={16} /> : <IconFile size={14} />}
          <span className="truncate">{filename ?? "Terminal"}</span>
        </span>
        <CopyButton value={code} />
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-gw-copy-13-mono whitespace-pre text-gw-gray-1000">{highlight(code, lang)}</pre>
    </div>
  );
}
