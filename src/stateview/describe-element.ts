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
const FRAMEWORK_NAME = /^(Inner|Outer|Render|Hot|Error|Redirect|HTTPAccess|Loading|Scroll|Layout|Server|Client|Router|App|Root|Suspense|Template)|^Head$|(Provider|Context)$/;
const COMPONENT_NAME = /^[A-Z][A-Za-z0-9]{2,}$/;
const STATEVIEW_WRAPPERS = new Set(["FocusView", "ThemeScope", "Hub", "MembersReview"]);
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
    label: elementLabel(el),
    html: elementHtml(el),
    components: reactComponents(el),
  };
}
