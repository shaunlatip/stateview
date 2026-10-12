/**
 * Tests for check.mjs. Each test clones the sample manifest, breaks one rule
 * and asserts the finding. Run: node --test skills/stateview/scripts/
 */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { checkManifest } from "./check.mjs";

const script = fileURLToPath(new URL("./check.mjs", import.meta.url));
const samplePath = fileURLToPath(new URL("../../../src/sample-app/review.json", import.meta.url));
const sample = JSON.parse(readFileSync(samplePath, "utf8"));

/** Clones the sample, applies `mutate`, and returns the check result. */
function check(mutate) {
  const manifest = structuredClone(sample);
  mutate(manifest);
  return checkManifest(manifest);
}

const item = (m, section, index) => m.sections.find((s) => s.id === section).items[index];
const input = (m, id) => m.inputs.find((i) => i.id === id);

/** Asserts exactly one finding of `rule` (errors or warnings), at `path` when given, and returns it. */
function only(findings, rule, path) {
  const matches = findings.filter((finding) => finding.rule === rule);
  assert.equal(matches.length, 1, `expected one ${rule}, got ${JSON.stringify(findings, null, 2)}`);
  if (path) assert.equal(matches[0].path, path);
  return matches[0];
}

test("the sample manifest is clean", () => {
  const { errors, warnings, summary } = checkManifest(sample);
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
  assert.deepEqual(summary, { items: 13, frames: 16, sections: 9, inputs: 10, uncovered: 3, excluded: 1 });
});

// ---------- errors

test("shape", () => {
  const { errors } = check((m) => {
    m.id = "Team Members";
    m.version = "1";
    delete m.scope.repo;
  });
  assert.deepEqual(errors.map((e) => e.path), ["id", "version", "scope.repo"]);
  assert.ok(errors.every((e) => e.rule === "shape"));
});

test("input", () => {
  const { errors } = check((m) => {
    input(m, "plan").class = "account";
    input(m, "invites").values = ["some", "none", "none"];
    input(m, "members").labels = { "many-short": "Many", one: "" };
  });
  assert.deepEqual(errors.map((e) => [e.rule, e.path]), [
    ["input", "inputs[1].class"],
    ["input", 'inputs[3].labels["many-short"]'],
    ["input", "inputs[3].labels.one"],
    ["input", "inputs[4].values[2]"],
  ]);
});

test("environment", () => {
  const { errors } = check((m) => (input(m, "inviteDraft").class = "environment"));
  only(errors, "environment", "inputs[9].class");
});

test("baseline", () => {
  const { errors } = check((m) => {
    delete m.baseline.plan;
    m.baseline.role = "admin";
    m.baseline.theme = "dark";
  });
  assert.deepEqual(errors.map((e) => [e.rule, e.path]), [
    ["baseline", "baseline.role"],
    ["baseline", "baseline"],
    ["baseline", "baseline.theme"],
  ]);
});

test("section", () => {
  const { errors } = check((m) => {
    m.sections[1].id = "happy-path";
    m.sections[2].items = [];
  });
  assert.deepEqual(errors.map((e) => [e.rule, e.path]), [
    ["section", "sections[1].id"],
    ["section", "sections[2].items"],
  ]);
});

test("uncovered", () => {
  const { errors } = check((m) => {
    m.uncovered[0].title = "";
    m.uncovered[1].set = {};
    m.uncovered[2].set.role = "admin";
    m.uncovered.push("Phone in dark mode");
  });
  assert.deepEqual(errors.map((e) => [e.rule, e.path]), [
    ["uncovered", "uncovered[0].title"],
    ["uncovered", "uncovered[1].set"],
    ["set", "uncovered[2].set.role"],
    ["uncovered", "uncovered[3]"],
  ]);
});

test("item", () => {
  const { errors } = check((m) => {
    item(m, "nearby", 0).id = "typical-team";
    item(m, "main-flows", 0).steps.splice(1);
    item(m, "roles", 0).origin = "figma";
  });
  assert.deepEqual(errors.map((e) => [e.rule, e.path]), [
    ["item", "sections[2].items[0].steps"],
    ["item", "sections[3].items[0].origin"],
    ["item", "sections[8].items[0].id"],
  ]);
});

test("set", () => {
  const { errors } = check((m) => {
    item(m, "roles", 1).set.role = "admin";
    item(m, "main-flows", 0).steps[1].set.theme = "dark";
  });
  const bad = only(errors.filter((e) => e.path.startsWith("sections[3]")), "set", "sections[3].items[1].set.role");
  assert.equal(bad.message, `"admin" isn't one of role's values (owner, member, viewer).`);
  only(errors.filter((e) => e.path.startsWith("sections[2]")), "set", "sections[2].items[0].steps[1].set.theme");
});

test("errors don't cascade", () => {
  const { errors } = check((m) => (m.inputs = "role"));
  assert.deepEqual(errors.map((e) => e.path), ["inputs"]);
  // Without its bad key this state would look like the baseline; no duplicate-state on top.
  const { warnings } = check((m) => (item(m, "roles", 1).set.role = "admin"));
  assert.deepEqual(warnings, []);
});

// ---------- warnings

test("baseline-first", () => {
  const { warnings } = check((m) => (m.sections[0].items[0].set = { members: "one" }));
  only(warnings, "baseline-first", "sections[0].items[0]");
});

test("noop-set (states only)", () => {
  const { warnings } = check((m) => {
    item(m, "roles", 0).set.plan = "pro";
    item(m, "main-flows", 0).steps[1].set.role = "owner";
  });
  only(warnings, "noop-set", "sections[3].items[0].set.plan");
});

test("too-many-changes", () => {
  const { warnings } = check((m) => Object.assign(item(m, "plan-flags", 0).set, { role: "viewer" }));
  only(warnings, "too-many-changes", "sections[4].items[0]");
});

test("stacked-system", () => {
  const { warnings } = check((m) => (item(m, "loading-errors", 0).set.removeRequest = "error"));
  only(warnings, "stacked-system", "sections[5].items[0]");
});

test("stacked-moment", () => {
  const { warnings } = check((m) => {
    m.inputs.push({ id: "menu", label: "Row menu", class: "moment", source: "prop", values: ["closed", "open"] });
    m.baseline.menu = "closed";
    item(m, "loading-errors", 1).set.menu = "open";
  });
  only(warnings, "stacked-moment", "sections[5].items[1]");
});

test("duplicate-state (but a step may equal a state)", () => {
  const { warnings } = check((m) => (item(m, "nearby", 0).set = { role: "member" }));
  only(warnings, "duplicate-state", "sections[8].items[0]");
});

test("repeated-step", () => {
  const { warnings } = check((m) => (item(m, "main-flows", 0).steps[2].set = { inviteDraft: "filled" }));
  only(warnings, "repeated-step", "sections[2].items[0].steps[2]");
});

test("flag-origin", () => {
  const { warnings } = check((m) => (item(m, "plan-flags", 1).origin = "design"));
  only(warnings, "flag-origin", "sections[4].items[1].origin");
});

test("unused-input", () => {
  const { warnings } = check((m) => m.sections.splice(7, 1));
  only(warnings, "unused-input", "inputs[9]");
  assert.ok(warnings.every((w) => w.rule === "unused-input"));
});

test("environment-values", () => {
  const { warnings } = check((m) => {
    input(m, "breakpoint").values = ["desktop", "phone"];
    item(m, "breakpoints", 0).set.breakpoint = "phone";
  });
  only(warnings, "environment-values", "inputs[9].values");
});

test("budget", () => {
  const { warnings } = check((m) => (m.sections = m.sections.slice(0, 2)));
  only(warnings, "budget", "sections");
});

test("title-length", () => {
  const { warnings } = check((m) => (item(m, "main-flows", 0).steps[0].title = "x".repeat(61)));
  only(warnings, "title-length", "sections[2].items[0].steps[0].title");
});

// ---------- CLI

const run = (...args) => spawnSync(process.execPath, [script, ...args], { encoding: "utf8" });

test("CLI: clean file exits 0; usage errors exit 2", () => {
  const clean = run(samplePath);
  assert.equal(clean.status, 0);
  assert.match(clean.stdout, /13 states \(16 frames\) in 9 sections · 10 inputs · 3 not covered · 1 excluded\n✓ no problems/);
  assert.equal(run().status, 2);
  assert.equal(run("missing.json").status, 2);
});

test("CLI: invalid JSON is a finding; --strict fails on warnings; directories are searched", () => {
  const dir = mkdtempSync(join(tmpdir(), "stateview-check-"));
  writeFileSync(join(dir, "review.json"), "{ nope");
  const broken = run(dir, "--json");
  assert.equal(broken.status, 1);
  assert.equal(JSON.parse(broken.stdout)[0].errors[0].rule, "json");

  const warned = structuredClone(sample);
  warned.sections[0].items[0].set = { members: "one" };
  writeFileSync(join(dir, "review.json"), JSON.stringify(warned));
  assert.equal(run(dir).status, 0);
  assert.equal(run(dir, "--strict").status, 1);
});
