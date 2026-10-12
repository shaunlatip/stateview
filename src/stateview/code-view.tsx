"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type Kind = "tag" | "attribute" | "string" | "punctuation" | "text";
type Token = { kind: Kind; value: string };
type Line = Token[];

const TOKEN_CLASS: Record<Kind, string> = {
  tag: "text-gui-code-tag",
  attribute: "text-gui-code-attribute",
  string: "text-gui-code-string",
  punctuation: "text-gui-code-muted",
  text: "text-gui-code-text",
};

// Prettier-style: a tag that fits in this many characters stays on one line
// (about one line of the composer's code column).
const ONE_LINE = 32;
const INDENT = "  ";

const token = (kind: Kind, value: string): Token => ({ kind, value });
const width = (tokens: Token[]) => tokens.reduce((sum, { value }) => sum + value.length, 0);

/**
 * The picked element's selector and HTML as an editor would show them:
 * syntax-highlighted, the HTML pretty-printed with line numbers, on the dark
 * code surface.
 */
export function CodeView({ selector, html }: { selector: string; html: string }) {
  return (
    // The focus ring goes around the whole block: the theme's ring doesn't show on the dark surface.
    <dl className="flex flex-col gap-gui-xs rounded-gui-s bg-gui-code-surface p-gui-s font-gui-data text-gui-xs text-gui-code-text ring-1 ring-gui-neutral-4-transparent has-focus-visible:gui-focus-ring">
      <div className="flex flex-col gap-gui-xxs">
        <dt className="font-gui-ui text-gui-code-muted">Selector</dt>
        <dd>
          <code className="block pl-gui-m font-gui-data whitespace-pre-wrap wrap-anywhere -indent-gui-m">
            <Tokens tokens={tokenizeSelector(selector)} />
          </code>
        </dd>
      </div>
      <div className="flex flex-col gap-gui-xxs">
        <dt className="font-gui-ui text-gui-code-muted">HTML</dt>
        <dd>
          <HtmlLines lines={formatHtml(html) ?? [[token("text", html)]]} />
        </dd>
      </div>
    </dl>
  );
}

function HtmlLines({ lines }: { lines: Line[] }) {
  const [scrollable, setScrollable] = useState(false);

  // Only a region that actually scrolls takes a tab stop.
  const observe = (node: HTMLDivElement | null) => {
    if (!node) return;
    const observer = new ResizeObserver(() => setScrollable(node.scrollHeight > node.clientHeight));
    observer.observe(node);
    if (node.firstElementChild) observer.observe(node.firstElementChild);
    return () => observer.disconnect();
  };

  return (
    <div
      ref={observe}
      role={scrollable ? "region" : undefined}
      aria-label={scrollable ? "HTML" : undefined}
      tabIndex={scrollable ? 0 : undefined}
      className="max-h-48 overflow-y-auto outline-none"
    >
      <pre className="font-gui-data">
        <code className="flex flex-col font-gui-data">
          {lines.map((line, index) => (
            // Lines are positional: the same snippet always prints the same lines.
            // oxlint-disable-next-line react/no-array-index-key -- lines have no identity beyond their number
            <span key={index} className="flex gap-gui-s">
              <span
                aria-hidden
                className={cn("shrink-0 text-right text-gui-code-muted tabular-nums select-none", lines.length < 10 ? "w-gui-s" : "w-gui-l")}
              >
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 pl-gui-xl whitespace-pre-wrap wrap-anywhere -indent-gui-xl">
                <Tokens tokens={line} />
              </span>
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}

/**
 * Each run of non-space text is an inline-block, so long lines wrap at spaces
 * the way an editor's soft wrap does, not at the hyphens inside class names.
 */
function Tokens({ tokens }: { tokens: Token[] }) {
  const runs: (string | Token[])[] = [];
  for (const { kind, value } of tokens) {
    for (const piece of value.split(/(\s+)/)) {
      if (!piece) continue;
      const last = runs.at(-1);
      if (/^\s/.test(piece)) runs.push(piece);
      else if (Array.isArray(last)) last.push(token(kind, piece));
      else runs.push([token(kind, piece)]);
    }
  }
  return runs.map((run, index) =>
    typeof run === "string" ? (
      // A single space between words collapses where the line wraps, so a wrapped line never starts with one.
      // oxlint-disable-next-line react/no-array-index-key -- runs are positional
      <span key={index} className={index > 0 && run === " " ? "whitespace-normal" : undefined}>
        {run}
      </span>
    ) : (
      // oxlint-disable-next-line react/no-array-index-key -- runs are positional
      <span key={index} className="inline-block max-w-full indent-0 align-top">
        {run.map((part, at) => (
          // oxlint-disable-next-line react/no-array-index-key -- tokens are positional
          <span key={at} className={TOKEN_CLASS[part.kind]}>
            {part.value}
          </span>
        ))}
      </span>
    ),
  );
}

// --- HTML ------------------------------------------------------------------------------

const OPEN_TAG = /^<([a-z][\w:.-]*)((?:\s+[^\s"'<>/=]+(?:="[^"]*")?)*)\s*(\/?)>/i;
const ATTRIBUTE = /\s+([^\s"'<>/=]+)(?:="([^"]*)")?/g;

/** Pretty-prints a one-element snippet; null when it isn't a tag we can read. */
function formatHtml(html: string): Line[] | null {
  const open = OPEN_TAG.exec(html);
  if (!open) return null;
  const [whole, tag, rawAttributes, slash] = open;
  const attributes = Array.from(rawAttributes.matchAll(ATTRIBUTE), ([, name, value]) =>
    value === undefined
      ? [token("attribute", name)]
      : [token("attribute", name), token("punctuation", '="'), token("string", value), token("punctuation", '"')],
  );
  const end = token("punctuation", `${slash}>`);
  const close = `</${tag}>`;
  const rest = html.slice(whole.length);
  const closed = rest.endsWith(close);
  const content = (closed ? rest.slice(0, -close.length) : rest).trim();

  const contentToken = token(content === "…" ? "punctuation" : "text", content);
  const closeTokens = [token("punctuation", "</"), token("tag", tag), token("punctuation", ">")];
  const flatOpen = [token("punctuation", "<"), token("tag", tag), ...attributes.flatMap((attribute) => [token("text", " "), ...attribute]), end];

  const oneLine = [...flatOpen, ...(content ? [contentToken] : []), ...(closed ? closeTokens : [])];
  if (width(oneLine) <= ONE_LINE) return [oneLine];

  const lines: Line[] =
    width(flatOpen) <= ONE_LINE || attributes.length === 0
      ? [flatOpen]
      : [
          [token("punctuation", "<"), token("tag", tag)],
          ...attributes.map((attribute, index) => [token("text", INDENT)].concat(attribute, index === attributes.length - 1 ? [end] : [])),
        ];
  if (content) lines.push([token("text", INDENT), contentToken]);
  if (closed) lines.push(closeTokens);
  return lines;
}

// --- Selector --------------------------------------------------------------------------

const IDENT = String.raw`(?:\\[0-9a-f]{1,6}\s?|\\.|[\w-]|[\u0080-￿])+`;
const COMBINATOR = /\s*[>+~,]\s*|\s+/y;
const ATTRIBUTE_SELECTOR = new RegExp(String.raw`\[(${IDENT})(?:([~|^$*]?=)(?:"([^"]*)"|'([^']*)'|(${IDENT})))?\]`, "iy");
const ID_OR_CLASS = new RegExp(String.raw`[#.]${IDENT}`, "iy");
const PSEUDO = new RegExp(String.raw`::?${IDENT}`, "iy");
const TYPE = new RegExp(String.raw`\*|${IDENT}`, "iy");

/** Splits a CSS selector into highlightable tokens; every character ends up in exactly one token. */
function tokenizeSelector(selector: string): Token[] {
  const tokens: Token[] = [];
  let at = 0;
  const match = (pattern: RegExp) => {
    pattern.lastIndex = at;
    const found = pattern.exec(selector);
    if (found) at = pattern.lastIndex;
    return found;
  };

  while (at < selector.length) {
    let found: RegExpExecArray | null;
    if ((found = match(COMBINATOR))) {
      tokens.push(token("punctuation", found[0]));
    } else if ((found = match(ATTRIBUTE_SELECTOR))) {
      const [, name, operator, doubleQuoted, singleQuoted, bare] = found;
      tokens.push(token("punctuation", "["), token("attribute", name));
      if (operator) {
        tokens.push(token("punctuation", operator));
        if (bare !== undefined) tokens.push(token("string", bare));
        else {
          const quote = doubleQuoted === undefined ? "'" : '"';
          tokens.push(token("punctuation", quote), token("string", doubleQuoted ?? singleQuoted), token("punctuation", quote));
        }
      }
      tokens.push(token("punctuation", "]"));
    } else if ((found = match(ID_OR_CLASS))) {
      tokens.push(token("attribute", found[0]));
    } else if ((found = match(PSEUDO))) {
      tokens.push(token("attribute", found[0]));
      if (selector[at] === "(") {
        const closing = matchingParen(selector, at);
        tokens.push(token("punctuation", "("));
        if (closing === -1) {
          tokens.push(token("text", selector.slice(at + 1)));
          at = selector.length;
        } else {
          if (closing > at + 1) tokens.push(token("text", selector.slice(at + 1, closing)));
          tokens.push(token("punctuation", ")"));
          at = closing + 1;
        }
      }
    } else if ((found = match(TYPE))) {
      tokens.push(token("tag", found[0]));
    } else {
      tokens.push(token("text", selector[at]));
      at += 1;
    }
  }
  return tokens;
}

function matchingParen(text: string, open: number) {
  let depth = 0;
  for (let index = open; index < text.length; index++) {
    if (text[index] === "(") depth++;
    else if (text[index] === ")" && --depth === 0) return index;
  }
  return -1;
}
