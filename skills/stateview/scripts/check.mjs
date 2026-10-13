#!/usr/bin/env node
/**
 * Checks Stateview state manifests (review.json). Errors mean the manifest
 * doesn't match the types in src/stateview/manifest.ts and the viewer can't
 * trust it; warnings are composition rules a person might break on purpose.
 * The agent runs this after writing a manifest, and CI runs it on every change.
 *
 *   node check.mjs <file-or-dir>... [--json] [--strict]
 *
 * A directory is searched for files named review.json. Exits 1 on errors (or
 * on warnings with --strict), 2 on usage errors, else 0. Plain Node >= 20 with
 * no dependencies, so it runs in any repo.
 */

import { readFileSync, readdirSync, realpathSync, statSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const INPUT_ID = /^[A-Za-z][A-Za-z0-9_-]*$/;
const CLASSES = ["who", "config", "data", "system", "moment", "environment"];
const SOURCES = ["prop", "flag", "entitlement", "api", "viewport"];
const ORIGINS = new Set(["design", "code-only"]);
const SKIP_DIRS = new Set(["node_modules", ".next", ".git"]);

/** Limits behind the composition warnings. */
const MAX_CHANGES = 3;
const MIN_ITEMS = 3;
const MAX_ITEMS = 15;
const MAX_SECTIONS = 9;
const MAX_TITLE = 60;

const isObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const isText = (value) => typeof value === "string" && value.trim() !== "";
const isKebab = (value) => typeof value === "string" && KEBAB.test(value);
const isStringArray = (value) => Array.isArray(value) && value.every((entry) => typeof entry === "string");
const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;
const length = (value) => (Array.isArray(value) ? value.length : 0);
const ids = (inputs) => inputs.map((input) => input.id).join(", ");

/** Extends a JSON path: at("sections[3]", "items") → "sections[3].items", at("items", 1) → "items[1]". */
function at(path, key) {
  if (typeof key === "number") return `${path}[${key}]`;
  if (!/^[A-Za-z_$][\w$]*$/.test(key)) return `${path}[${JSON.stringify(key)}]`;
  return path ? `${path}.${key}` : key;
}

/** A short rendering of a value for messages: "admin", 5, [...]. */
function show(value) {
  const text = JSON.stringify(value) ?? String(value);
  return text.length > 40 ? `${text.slice(0, 37)}…` : text;
}

/** Message suffix saying what was actually there. */
const got = (value) => (value === undefined ? ", but it's missing" : ` (got ${show(value)})`);

function collector() {
  const errors = [];
  const warnings = [];
  return {
    errors,
    warnings,
    error: (rule, path, message) => errors.push({ rule, path, message }),
    warn: (rule, path, message) => warnings.push({ rule, path, message }),
    /** Reports an error unless `ok`, and returns `ok` so callers can skip checks that depend on it. */
    expect(ok, rule, path, message) {
      if (!ok) errors.push({ rule, path, message });
      return ok;
    },
  };
}

/** Checks one parsed manifest. Pure: no I/O. */
export function checkManifest(manifest) {
  const f = collector();
  if (!isObject(manifest)) {
    f.error("shape", "$", "The manifest should be a JSON object with id, version, route, screen, scope, baseline, inputs and sections.");
    return { errors: f.errors, warnings: f.warnings, summary: summarize({}) };
  }
  checkShape(manifest, f);
  const model = checkInputs(manifest, f);
  model.baseline = checkBaseline(manifest, model, f);
  const entries = checkSections(manifest, model, f);
  checkComposition(manifest, entries, model, f);
  return { errors: f.errors, warnings: f.warnings, summary: summarize(manifest) };
}

// ---------- errors

function checkShape(m, f) {
  f.expect(isKebab(m.id), "shape", "id", `id should be kebab-case, like "team-members"${got(m.id)}.`);
  f.expect(Number.isInteger(m.version) && m.version >= 1, "shape", "version", `version should be a whole number of 1 or more${got(m.version)}.`);
  f.expect(typeof m.route === "string" && m.route.startsWith("/"), "shape", "route", `route should be the path that renders the screen, starting with "/"${got(m.route)}.`);
  f.expect(isText(m.screen), "shape", "screen", `screen should name the screen under review, like "Team settings › Members"${got(m.screen)}.`);
  if (f.expect(isObject(m.scope), "shape", "scope", `scope should be an object with repo and branch${got(m.scope)}.`)) {
    const { repo, icon, branch, base } = m.scope;
    f.expect(isText(repo), "shape", "scope.repo", `scope.repo should name the repository, like "acme-web"${got(repo)}.`);
    if (icon !== undefined) {
      f.expect(typeof icon === "string" && icon.startsWith("/"), "shape", "scope.icon", `scope.icon should be the app's favicon as a path, like "/favicon.ico", or left out${got(icon)}.`);
    }
    f.expect(typeof branch === "string", "shape", "scope.branch", `scope.branch should be the branch name${got(branch)}.`);
    if (base !== undefined) {
      f.expect(typeof base === "string", "shape", "scope.base", `scope.base should be the branch it merges into, like "main", or left out${got(base)}.`);
    }
  }
  if (f.expect(isObject(m.baseline), "shape", "baseline", `baseline should be an object with a value for every input${got(m.baseline)}.`)) {
    for (const [key, value] of Object.entries(m.baseline)) {
      f.expect(typeof value === "string", "shape", at("baseline", key), `baseline values should be strings${got(value)}.`);
    }
  }
  f.expect(Array.isArray(m.inputs) && m.inputs.length > 0, "shape", "inputs", `inputs should list at least one input${got(m.inputs)}.`);
  f.expect(Array.isArray(m.sections) && m.sections.length > 0, "shape", "sections", `sections should list at least one section${got(m.sections)}.`);
}

/**
 * Validates each input and returns the model later rules need:
 * `inputs` maps id → input (with its index) for inputs whose id and values are
 * usable, `declared` holds every id that was written down at all. Both are null
 * when `inputs` isn't an array, so set and baseline checks skip instead of
 * reporting every key as unknown.
 */
function checkInputs(m, f) {
  if (!Array.isArray(m.inputs)) return { inputs: null, declared: null };
  const inputs = new Map();
  const declared = new Set();
  let environment = null;
  m.inputs.forEach((input, index) => {
    const path = at("inputs", index);
    if (!f.expect(isObject(input), "input", path, "Each input should be an object with id, label, class, source and values.")) return;
    const { id, label, values } = input;
    let usable = f.expect(typeof id === "string" && INPUT_ID.test(id), "input", at(path, "id"), `Input id should start with a letter and use only letters, digits, - and _, like "membersRequest"${got(id)}.`);
    if (usable) {
      usable = f.expect(!declared.has(id), "input", at(path, "id"), `Input id "${id}" is already used; give each input its own id.`);
      declared.add(id);
    }
    f.expect(isText(label), "input", at(path, "label"), `Input label should be the name shown in the state panel, like "Members request"${got(label)}.`);
    f.expect(CLASSES.includes(input.class), "input", at(path, "class"), `class should be one of ${CLASSES.join(", ")}${got(input.class)}.`);
    f.expect(SOURCES.includes(input.source), "input", at(path, "source"), `source should be one of ${SOURCES.join(", ")}${got(input.source)}.`);
    usable = checkValues(values, at(path, "values"), f) && usable;
    if (input.labels !== undefined) checkLabels(input.labels, values, at(path, "labels"), f);
    if (input.class === "environment") {
      if (environment) f.error("environment", at(path, "class"), `Only one input can have class "environment", and ${environment} already does; merge them into one input.`);
      else environment = path;
    }
    if (usable) inputs.set(id, { ...input, index });
  });
  return { inputs, declared };
}

/** Returns whether `values` can be used to check sets (a non-empty array); reports every problem with it. */
function checkValues(values, path, f) {
  if (!f.expect(Array.isArray(values) && values.length > 0, "input", path, `values should list every value this input can take, like ["ready", "loading"]${got(values)}.`)) return false;
  const seen = new Set();
  values.forEach((value, index) => {
    if (!f.expect(isText(value), "input", at(path, index), `Each value should be a non-empty string${got(value)}.`)) return;
    f.expect(!seen.has(value), "input", at(path, index), `"${value}" is listed twice; remove the duplicate.`);
    seen.add(value);
  });
  return true;
}

/** Optional display names: each key a value of the input, each name a non-empty string. */
function checkLabels(labels, values, path, f) {
  if (!f.expect(isObject(labels), "input", path, `labels should map values to display names, like { "many-long": "Many" }${got(labels)}.`)) return;
  for (const [value, label] of Object.entries(labels)) {
    if (Array.isArray(values) && !values.includes(value)) f.error("input", at(path, value), `labels names "${value}", which isn't one of this input's values; remove it or fix the spelling.`);
    f.expect(isText(label), "input", at(path, value), `A label should be the name shown for the value, like "Many"${got(label)}.`);
  }
}

/** Returns the baseline when it covers exactly the declared inputs with valid values, else null. */
function checkBaseline(m, model, f) {
  if (!isObject(m.baseline) || !model.inputs) return null;
  let ok = true;
  for (const input of model.inputs.values()) {
    const value = m.baseline[input.id];
    if (value === undefined) {
      ok = f.expect(false, "baseline", "baseline", `baseline has no value for "${input.id}"; set it to one of ${input.values.join(", ")}.`);
    } else if (typeof value !== "string") {
      ok = false; // already reported by shape
    } else if (!input.values.includes(value)) {
      ok = f.expect(false, "baseline", at("baseline", input.id), `"${value}" isn't one of ${input.id}'s values (${input.values.join(", ")}).`);
    }
  }
  for (const key of Object.keys(m.baseline)) {
    if (!model.declared.has(key)) ok = f.expect(false, "baseline", at("baseline", key), `baseline sets "${key}", which isn't a declared input; remove it or add the input.`);
  }
  return ok ? m.baseline : null;
}

/**
 * Validates sections and items, and returns one entry per usable item:
 * `{ item, path, frames }`, where each frame is `{ path, step, set, broken }`,
 * `set` keeps only the keys that passed the set check, and `broken` marks a
 * frame whose set had errors.
 */
function checkSections(m, model, f) {
  const entries = [];
  if (!Array.isArray(m.sections)) return entries;
  const sectionIds = new Set();
  const itemIds = new Set();
  m.sections.forEach((section, s) => {
    const path = at("sections", s);
    if (!f.expect(isObject(section), "section", path, "Each section should be an object with id, title, why and items.")) return;
    checkId(section.id, at(path, "id"), sectionIds, "section", "Section", "loading-errors", f);
    f.expect(isText(section.title), "section", at(path, "title"), `Section title should be a short heading, like "Loading & errors"${got(section.title)}.`);
    f.expect(isText(section.why), "section", at(path, "why"), `Section why should say in one sentence why these states matter${got(section.why)}.`);
    const itemsPath = at(path, "items");
    if (!f.expect(Array.isArray(section.items) && section.items.length > 0, "section", itemsPath, `A section needs at least one item; add one or remove the section${got(section.items)}.`)) return;
    section.items.forEach((item, i) => {
      const entry = checkItem(item, at(itemsPath, i), itemIds, model, f);
      if (entry) entries.push(entry);
    });
  });
  return entries;
}

/** Kebab-case and unique within `seen`. */
function checkId(id, path, seen, rule, noun, example, f) {
  if (!f.expect(isKebab(id), rule, path, `${noun} id should be kebab-case, like "${example}"${got(id)}.`)) return;
  f.expect(!seen.has(id), rule, path, `${noun} id "${id}" is already used; give each ${noun.toLowerCase()} its own id.`);
  seen.add(id);
}

function checkItem(item, path, itemIds, model, f) {
  if (!f.expect(isObject(item), "item", path, "Each item should be an object with kind, id, title, why, origin and a set or steps.")) return null;
  checkId(item.id, at(path, "id"), itemIds, "item", "Item", "members-loading", f);
  f.expect(isText(item.title), "item", at(path, "title"), `Item title should name the state, like "Members list loading"${got(item.title)}.`);
  f.expect(isText(item.why), "item", at(path, "why"), `Item why should be one sentence about a person doing something${got(item.why)}.`);
  f.expect(ORIGINS.has(item.origin), "item", at(path, "origin"), `origin should be "design" or "code-only"${got(item.origin)}.`);
  if (item.kind === "state") return { item, path, frames: stateFrames(item, path, model, f) };
  if (item.kind === "sequence") return { item, path, frames: sequenceFrames(item, path, model, f) };
  f.error("item", at(path, "kind"), `kind should be "state" or "sequence"${got(item.kind)}.`);
  return null;
}

function stateFrames(item, path, model, f) {
  if (item.checks !== undefined) {
    f.expect(isStringArray(item.checks), "item", at(path, "checks"), `checks should be a list of strings, like ["Typing clears it"]${got(item.checks)}.`);
  }
  const setPath = at(path, "set");
  if (!f.expect(isObject(item.set), "item", setPath, `A state needs a set object of the inputs it changes; use {} for the baseline${got(item.set)}.`)) return [];
  return [{ path, step: null, ...checkSet(item.set, setPath, model, f) }];
}

function sequenceFrames(item, path, model, f) {
  const stepsPath = at(path, "steps");
  if (!f.expect(Array.isArray(item.steps) && item.steps.length >= 2, "item", stepsPath, `A sequence needs at least 2 steps; make a single step a state instead${got(item.steps)}.`)) return [];
  const titles = new Set();
  const frames = [];
  item.steps.forEach((step, n) => {
    const stepPath = at(stepsPath, n);
    if (!f.expect(isObject(step), "item", stepPath, "Each step should be an object with a title and a set.")) return;
    if (f.expect(isText(step.title), "item", at(stepPath, "title"), `Step title should name the moment, like "Submitting"${got(step.title)}.`)) {
      f.expect(!titles.has(step.title), "item", at(stepPath, "title"), `Step title "${step.title}" is already used in this sequence; give each step its own title.`);
      titles.add(step.title);
    }
    const setPath = at(stepPath, "set");
    if (f.expect(isObject(step.set), "item", setPath, `A step needs a set object of the inputs it changes; use {} for the baseline${got(step.set)}.`)) {
      frames.push({ path: stepPath, step: n, ...checkSet(step.set, setPath, model, f) });
    }
  });
  return frames;
}

/**
 * Reports unknown keys and invalid values. Returns `{ set, broken }`: the valid
 * entries, and whether any were dropped. A broken frame is left out of the
 * comparisons, since without its bad key it would look like some other state.
 */
function checkSet(set, path, model, f) {
  const valid = {};
  if (!model.inputs) return { set: valid, broken: true };
  let ok = true;
  for (const [key, value] of Object.entries(set)) {
    const input = model.inputs.get(key);
    if (!input) {
      ok = false;
      // Declared but malformed inputs were reported already; don't cascade.
      if (!model.declared.has(key)) f.error("set", at(path, key), `"${key}" isn't a declared input; use one of ${[...model.declared].join(", ")} or add it to inputs.`);
    } else if (f.expect(input.values.includes(value), "set", at(path, key), `${show(value)} isn't one of ${key}'s values (${input.values.join(", ")}).`)) {
      valid[key] = value;
    } else {
      ok = false;
    }
  }
  return { set: valid, broken: !ok };
}

// ---------- warnings

function checkComposition(m, entries, model, f) {
  checkBudget(m, f);
  checkBaselineFirst(m, f);
  checkTitles(entries, f);
  checkEnvironmentValues(model, f);
  if (model.inputs && model.baseline) checkFrames(entries, model, f);
}

function checkBudget(m, f) {
  const { items, sections } = summarize(m);
  if (items > MAX_ITEMS) f.warn("budget", "sections", `This manifest has ${items} items; keep it to ${MAX_ITEMS} or fewer and name the rest in your report as not covered.`);
  if (items < MIN_ITEMS) f.warn("budget", "sections", `This manifest has ${plural(items, "item")}; a review needs at least ${MIN_ITEMS}: the baseline plus the states the change affects.`);
  if (sections > MAX_SECTIONS) f.warn("budget", "sections", `This manifest has ${sections} sections; keep it to ${MAX_SECTIONS} or fewer by merging related ones.`);
}

function checkBaselineFirst(m, f) {
  const first = Array.isArray(m.sections) && isObject(m.sections[0]) && Array.isArray(m.sections[0].items) ? m.sections[0].items[0] : undefined;
  if (first === undefined) return;
  const isBaseline = isObject(first) && first.kind === "state" && isObject(first.set) && Object.keys(first.set).length === 0;
  if (!isBaseline) f.warn("baseline-first", "sections[0].items[0]", "The first item should be the baseline: a state with an empty set, so the review starts from the screen most people see.");
}

function checkTitles(entries, f) {
  const tooLong = (title, path) => {
    if (typeof title === "string" && title.length > MAX_TITLE) {
      f.warn("title-length", path, `This title is ${title.length} characters; keep it to ${MAX_TITLE} or fewer so it fits the state panel.`);
    }
  };
  for (const { item, path } of entries) {
    tooLong(item.title, at(path, "title"));
    if (item.kind === "sequence" && Array.isArray(item.steps)) {
      item.steps.forEach((step, n) => tooLong(step?.title, at(at(at(path, "steps"), n), "title")));
    }
  }
}

function checkEnvironmentValues(model, f) {
  if (!model.inputs) return;
  for (const input of model.inputs.values()) {
    if (input.class === "environment" && !input.values.includes("mobile")) {
      f.warn("environment-values", at(at("inputs", input.index), "values"), `${input.id} has no "mobile" value, so no frame will render in the phone frame; add "mobile" if the layout changes on phones.`);
    }
  }
}

/** Rules that compare each frame's resolved inputs with the baseline and with other frames. */
function checkFrames(entries, model, f) {
  const { baseline } = model;
  const inputs = [...model.inputs.values()];
  const used = new Set();
  const states = new Map(); // resolved inputs → id of the first state that shows them
  for (const { item, path, frames } of entries) {
    const flags = new Set();
    let previous = null;
    for (const frame of frames) {
      const values = { ...baseline, ...frame.set };
      const changed = inputs.filter((input) => values[input.id] !== baseline[input.id]);
      changed.forEach((input) => used.add(input.id));
      changed.filter((input) => input.source === "flag").forEach((input) => flags.add(input.id));
      if (frame.broken) {
        previous = null;
        continue;
      }
      checkChangeCount(changed, frame.path, f);
      const key = changed.map((input) => `${input.id}=${values[input.id]}`).join("&");
      if (frame.step === null) {
        checkNoopSet(frame.set, at(path, "set"), baseline, f);
        if (states.has(key)) f.warn("duplicate-state", path, `This state shows the same inputs as "${states.get(key)}"; drop one or change what it sets.`);
        else states.set(key, item.id);
      } else if (previous && previous.step === frame.step - 1 && previous.key === key) {
        f.warn("repeated-step", frame.path, "This step shows the same inputs as the step before it; drop it or change what it sets.");
      }
      previous = { step: frame.step, key };
    }
    if (flags.size > 0 && item.origin === "design") {
      f.warn("flag-origin", at(path, "origin"), `This item changes the flag ${[...flags].join(", ")}, so its origin should be "code-only"; flag-gated states aren't in the design.`);
    }
  }
  for (const input of inputs) {
    if (!used.has(input.id)) {
      f.warn("unused-input", at("inputs", input.index), `No state changes ${input.id} from its baseline ("${baseline[input.id]}"); add a state that does, or drop the input.`);
    }
  }
}

/** too-many-changes, stacked-system and stacked-moment for one frame. */
function checkChangeCount(changed, path, f) {
  if (changed.length > MAX_CHANGES) {
    f.warn("too-many-changes", path, `This frame changes ${changed.length} inputs from the baseline (${ids(changed)}); vary one or two axes, at most ${MAX_CHANGES}, and name the rest in your report as not covered.`);
  }
  const system = changed.filter((input) => input.class === "system");
  if (system.length > 1) {
    f.warn("stacked-system", path, `This frame changes ${system.length} request states at once (${ids(system)}); show one per frame unless they really happen together.`);
  }
  const moment = changed.filter((input) => input.class === "moment");
  if (moment.length > 1) {
    f.warn("stacked-moment", path, `This frame changes ${moment.length} moments at once (${ids(moment)}); show one per frame unless they really happen together.`);
  }
}

function checkNoopSet(set, path, baseline, f) {
  for (const [key, value] of Object.entries(set)) {
    if (baseline[key] === value) f.warn("noop-set", at(path, key), `${key} is already "${value}" in the baseline, so this changes nothing; drop it from set.`);
  }
}

// ---------- summary

/** Counts that survive a malformed manifest. `items` counts states and sequences. */
function summarize(m) {
  const sections = Array.isArray(m.sections) ? m.sections.filter(isObject) : [];
  const items = sections.flatMap((section) => (Array.isArray(section.items) ? section.items.filter(isObject) : []));
  const frames = items.reduce((count, item) => count + (item.kind === "sequence" && Array.isArray(item.steps) ? item.steps.length : 1), 0);
  return {
    items: items.length,
    frames,
    sections: sections.length,
    inputs: length(m.inputs),
  };
}

// ---------- CLI

/** Reads, parses and checks one file. Invalid JSON is a finding, not a crash. */
export function checkFile(file) {
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    const message = error instanceof SyntaxError ? `This file isn't valid JSON: ${error.message}. Fix the syntax and run the check again.` : `Couldn't read this file: ${error.message}.`;
    return { file, errors: [{ rule: "json", path: "$", message }], warnings: [], summary: null };
  }
  return { file, ...checkManifest(manifest) };
}

/** Every review.json under `dir`, skipping dependency and build folders. */
function findManifests(dir) {
  const found = [];
  const entries = readdirSync(dir, { withFileTypes: true }).toSorted((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory() && !SKIP_DIRS.has(entry.name)) found.push(...findManifests(path));
    else if (entry.isFile() && entry.name === "review.json") found.push(path);
  }
  return found;
}

function formatResult({ file, errors, warnings, summary }) {
  const lines = [file];
  for (const finding of errors) lines.push(`error  ${finding.path}  ${finding.message}`);
  for (const finding of warnings) lines.push(`warn   ${finding.path}  ${finding.message}`);
  if (summary) {
    const { items, frames, sections, inputs } = summary;
    lines.push(`${plural(items, "state")} (${plural(frames, "frame")}) in ${plural(sections, "section")} · ${plural(inputs, "input")}`);
  }
  const counts = [errors.length && plural(errors.length, "error"), warnings.length && plural(warnings.length, "warning")].filter(Boolean);
  lines.push(counts.length ? counts.join(", ") : "✓ no problems");
  return lines.join("\n");
}

function usage(problem) {
  console.error(`${problem}\nUsage: node check.mjs <file-or-dir>... [--json] [--strict]`);
  return 2;
}

/** Runs the CLI and returns the exit code. */
export function main(args) {
  const options = args.filter((arg) => arg.startsWith("--"));
  const targets = args.filter((arg) => !arg.startsWith("--"));
  const unknown = options.find((option) => option !== "--json" && option !== "--strict");
  if (unknown) return usage(`Unknown option ${unknown}.`);
  if (targets.length === 0) return usage("Name a review.json file, or a directory to search for them.");

  const files = [];
  for (const target of targets) {
    let stat;
    try {
      stat = statSync(target);
    } catch {
      return usage(`Can't find ${target}.`);
    }
    if (!stat.isDirectory()) files.push(target);
    else {
      const found = findManifests(target);
      if (found.length === 0) return usage(`No review.json files under ${target}.`);
      files.push(...found);
    }
  }

  const results = files.map(checkFile);
  if (options.includes("--json")) console.log(JSON.stringify(results, null, 2));
  else console.log(results.map(formatResult).join("\n\n"));
  const strict = options.includes("--strict");
  return results.some((result) => result.errors.length > 0 || (strict && result.warnings.length > 0)) ? 1 : 0;
}

/** True when this file is the script Node was asked to run, not an import. */
function isEntry() {
  if (!process.argv[1]) return false;
  try {
    return import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;
  } catch {
    return false;
  }
}

if (isEntry()) process.exitCode = main(process.argv.slice(2));
