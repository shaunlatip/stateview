import type { AnnotatedElement } from "./annotations";

/**
 * Describes an element the reviewer picked inside the rendered screen, in the
 * terms a coding agent needs to find it again: a selector, a readable name,
 * its markup and the React components that render it.
 */

const VOID_TAGS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
const FORM_TAGS = new Set(["input", "select", "textarea"]);
// React's useId output across versions: `_r_1_`, `_R_abc_`, `«r1»`, `:r1:`.
const GENERATED_ID = /^_r_|[:«»]/i;
// Wrappers from Next and UI libraries. Matched by shape rather than by prefix, so app components like AppSidebar or ErrorBanner stay.
const FRAMEWORK_NAME = /^(Inner|Outer)[A-Z]|^(Head|HotReload|Suspense)$|(Router|Boundary|Handler|Provider|Context)$/;
const COMPONENT_NAME = /^[A-Z][A-Za-z0-9]{2,}$/;
// The walk up from the picked element stops at the first of these, so nothing above the app's screen is listed.
const STATEVIEW_WRAPPERS = new Set(["FocusView", "EmbeddedScreen", "ThemeScope", "Hub"]);
const MAX_COMPONENTS = 4;

type Fiber = { type: unknown; return: Fiber | null };

function clip(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

function collapse(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

/** Text content with a space at every element boundary, so `<p>Ana</p><p>ana@…</p>` reads "Ana ana@…". Stops once it has enough. */
function readableText(el: Element, limit = 120) {
  let text = "";
  const walk = (node: Node) => {
    for (const child of Array.from(node.childNodes)) {
      if (text.length > limit) return;
      if (child.nodeType === Node.TEXT_NODE) text += child.nodeValue;
      else if (child.nodeType === Node.ELEMENT_NODE) {
        text += " ";
        walk(child);
        text += " ";
      }
    }
  };
  walk(el);
  return collapse(text);
}

function accessibleName(el: Element) {
  const ariaLabel = el.getAttribute("aria-label")?.trim();
  if (ariaLabel) return ariaLabel;
  const labelledBy = el.getAttribute("aria-labelledby");
  if (labelledBy) {
    const text = labelledBy
      .split(/\s+/)
      .map((id) => el.ownerDocument.getElementById(id)?.textContent ?? "")
      .join(" ");
    if (collapse(text)) return collapse(text);
  }
  if (FORM_TAGS.has(el.localName)) {
    const labels = collapse(Array.from((el as HTMLInputElement).labels ?? [], (label) => label.textContent ?? "").join(" "));
    if (labels) return labels;
    const placeholder = el.getAttribute("placeholder")?.trim();
    if (placeholder) return placeholder;
  }
  for (const attribute of ["alt", "title"]) {
    const value = el.getAttribute(attribute)?.trim();
    if (value) return value;
  }
  return readableText(el);
}

/** A short name for the element, e.g. `button "Remove Ana Pérez"`. Cheap enough to call on every pointer move. */
export function elementLabel(el: Element): string {
  const name = clip(collapse(accessibleName(el)), 40);
  return name ? `${el.localName} "${name}"` : el.localName;
}

// What a person would call the element. Containers are named by the heading they sit under.
const ROLE_WORDS: Record<string, string> = {
  a: "link",
  button: "button",
  select: "dropdown",
  textarea: "text box",
  img: "image",
  svg: "icon",
  ul: "list",
  ol: "list",
  li: "list item",
  nav: "navigation",
  form: "form",
  table: "table",
  tr: "table row",
  header: "header",
  footer: "footer",
  main: "page",
  section: "section",
  article: "section",
  aside: "panel",
  dialog: "dialog",
};
const ARIA_ROLE_WORDS: Record<string, string> = { button: "button", link: "link", tab: "tab", checkbox: "checkbox", radio: "radio button", switch: "switch", dialog: "dialog", menuitem: "menu item", alert: "alert", status: "status message" };
const TEXT_TAGS = new Set(["p", "span", "small", "strong", "em", "b", "i", "label", "td", "th", "dt", "dd", "code", "time"]);
const HEADING = "h1, h2, h3, h4, h5, h6, [role='heading']";

function quoted(text: string, max = 32) {
  return `“${clip(collapse(text), max)}”`;
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function inputWord(el: Element) {
  const type = el.getAttribute("type");
  if (type === "checkbox") return "checkbox";
  if (type === "radio") return "radio button";
  if (type === "submit" || type === "button") return "button";
  return "field";
}

/**
 * The heading that names the part of the screen `el` is in: its own first heading, or else the
 * nearest heading before it in the closest ancestor that has one. Only the heading's lead text,
 * so a count badge beside it ("Pending invites 2") isn't read as part of the name.
 */
function contextHeading(el: Element) {
  const own = el.matches(HEADING) ? el : el.querySelector(HEADING);
  if (own) return leadText(own);
  for (let node = el.parentElement; node; node = node.parentElement) {
    const before = Array.from(node.querySelectorAll(HEADING)).filter((heading) => heading.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING);
    const heading = before.at(-1);
    const text = heading ? leadText(heading) : null;
    if (text) return text;
  }
  return null;
}

// Built from a string: apps that target es5 reject the `u` flag on a regex literal.
const LETTER = new RegExp(String.raw`\p{L}`, "u");

/** The first substantial piece of text inside `el`, skipping initials and icon labels. */
function leadText(el: Element) {
  const walker = el.ownerDocument.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = collapse(node.nodeValue ?? "");
    if (text.length > 2 && LETTER.test(text)) return text;
  }
  return null;
}

/**
 * A title a person can read at a glance: `Remove Daniel Kim button`, `“Members” heading`,
 * `“owner” text`, `Area in “Invite a teammate”`.
 */
export function elementTitle(el: Element): string {
  const tag = el.localName;
  const role = el.getAttribute("role");
  const labelled = el.getAttribute("aria-label") || el.getAttribute("aria-labelledby");
  const word = (role && ARIA_ROLE_WORDS[role]) ?? (tag === "input" ? inputWord(el) : ROLE_WORDS[tag]);

  if (/^h[1-6]$/.test(tag) || role === "heading") return `${quoted(el.textContent ?? "")} heading`;
  if (word && ["button", "link", "field", "checkbox", "radio button", "switch", "tab", "menu item", "dropdown", "text box"].includes(word)) {
    const name = collapse(accessibleName(el));
    return name ? `${clip(name, 40)} ${word}` : capitalize(word);
  }
  if (labelled) return `${clip(collapse(accessibleName(el)), 40)} ${word ?? "area"}`;
  if (TEXT_TAGS.has(tag) && el.childElementCount === 0) {
    const text = collapse(el.textContent ?? "");
    if (text) return `${quoted(text)} text`;
  }
  if (tag === "li" || tag === "tr") {
    const lead = leadText(el);
    if (lead) return `${capitalize(word)} ${quoted(lead)}`;
  }
  const heading = contextHeading(el);
  const noun = capitalize(word ?? (TEXT_TAGS.has(tag) ? "text" : "area"));
  return heading ? `${noun} in ${quoted(heading)}` : noun;
}

function quoteAttribute(value: string) {
  return `"${value.replace(/["\\]/g, "\\$&").replace(/\n/g, "\\a ")}"`;
}

function stableId(el: Element) {
  return el.id && !GENERATED_ID.test(el.id) ? el.id : null;
}

/** A selector that names the element on its own, if it carries a stable hook. */
function anchorOf(el: Element) {
  const id = stableId(el);
  if (id) return `#${CSS.escape(id)}`;
  const testId = el.getAttribute("data-testid");
  if (testId) return `[data-testid=${quoteAttribute(testId)}]`;
  const ariaLabel = el.getAttribute("aria-label");
  if (ariaLabel) return `${el.localName}[aria-label=${quoteAttribute(ariaLabel)}]`;
  const name = FORM_TAGS.has(el.localName) ? el.getAttribute("name") : null;
  if (name) return `${el.localName}[name=${quoteAttribute(name)}]`;
  return null;
}

function stepOf(el: Element) {
  const siblings = el.parentElement ? Array.from(el.parentElement.children).filter((child) => child.localName === el.localName) : [el];
  return siblings.length > 1 ? `${el.localName}:nth-of-type(${siblings.indexOf(el) + 1})` : el.localName;
}

/** A CSS selector that matches exactly `el` within `root`, anchored on the nearest stable id, test id or label. */
export function uniqueSelector(el: Element, root: Element): string {
  if (el === root) return ":scope";
  const matchesOnly = (selector: string) => {
    try {
      const matches = root.querySelectorAll(selector);
      return matches.length === 1 && matches[0] === el;
    } catch {
      return false;
    }
  };

  const steps: string[] = [];
  for (let node: Element | null = el; node && node !== root; node = node.parentElement) {
    const anchor = anchorOf(node);
    if (anchor && matchesOnly([anchor, ...steps].join(" > "))) return [anchor, ...steps].join(" > ");
    steps.unshift(stepOf(node));
    if (matchesOnly(steps.join(" > "))) return steps.join(" > ");
  }
  return `:scope > ${steps.join(" > ")}`;
}

/** The element's opening tag with its attributes, a short summary of its content and its closing tag. */
export function elementHtml(el: Element): string {
  const tag = el.localName;
  const attributes = Array.from(el.attributes)
    .filter((attribute) => attribute.name !== "data-reactroot")
    .map((attribute) => (attribute.value === "" ? ` ${attribute.name}` : ` ${attribute.name}="${clip(attribute.value, 200)}"`))
    .join("");
  const open = `<${tag}${attributes}>`;
  if (VOID_TAGS.has(tag)) return open;
  const content = el.childElementCount > 0 ? "…" : clip(collapse(el.textContent ?? ""), 80);
  return `${open}${content}</${tag}>`;
}

function fiberOf(el: Element) {
  const key = Object.keys(el).find((k) => k.startsWith("__reactFiber$"));
  return key ? ((el as unknown as Record<string, Fiber>)[key] ?? null) : null;
}

function componentName(type: unknown): string | null {
  if (typeof type === "function") {
    const { displayName } = type as { displayName?: unknown };
    return typeof displayName === "string" ? displayName : type.name;
  }
  if (type && typeof type === "object") {
    const { displayName, render, type: inner } = type as { displayName?: unknown; render?: unknown; type?: unknown };
    if (typeof displayName === "string") return displayName;
    if (render) return componentName(render);
    if (inner) return componentName(inner);
  }
  return null;
}

/** The React components that render `el`, outermost first, up to the four nearest. Empty without React's dev fiber names. */
export function reactComponents(el: Element): string[] {
  const names: string[] = [];
  for (let fiber = fiberOf(el); fiber; fiber = fiber.return) {
    const name = componentName(fiber.type);
    if (!name) continue;
    if (STATEVIEW_WRAPPERS.has(name)) break;
    if (!COMPONENT_NAME.test(name) || FRAMEWORK_NAME.test(name) || names[names.length - 1] === name) continue;
    names.push(name);
  }
  return names.slice(0, MAX_COMPONENTS).toReversed();
}

/** Everything a comment records about the element it's attached to. */
export function describeElement(el: Element, root: Element): AnnotatedElement {
  return {
    selector: uniqueSelector(el, root),
    title: elementTitle(el),
    label: elementLabel(el),
    html: elementHtml(el),
    components: reactComponents(el),
  };
}
