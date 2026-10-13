import type { AgentStatus } from "./agent-status";
import { formatAnnotations, orderAnnotations, type Annotation } from "./annotations";
import { changedInputs, frameHref, listFrames, type Frame, type Inputs, type Manifest } from "./manifest";
import { inputsKey } from "./overrides";

/**
 * What goes before copied comments: what they are, where to make the change
 * (the screen's components, not the fixtures that start each state), how to
 * check it, and what to report back so the reviewer can resolve the pins.
 * With the review's `statusPath`, the report goes in that file, which the
 * reviewer's open Stateview picks up live.
 */
export function agentBrief<T extends Inputs>(manifest: Manifest<T>, statusPath?: string) {
  const report = statusPath
    ? [
        `Then record what you did in \`${statusPath}\`. Read it first and merge: keep the entries already there and add or replace one per comment id (the \`Id\` under each heading), then set \`updatedAt\` to the current time:`,
        "",
        "```json",
        '{ "version": 1, "updatedAt": "<ISO 8601>", "comments": { "<comment id>": { "status": "fixed", "note": "One sentence on what changed.", "files": ["src/…"] } } }',
        "```",
        "",
        "`status` is `fixed` (changed as asked), `wontfix` (left as is, and the note says why) or `question` (the note asks the reviewer something). The reviewer has this review open in Stateview, which updates live when you save the file, so don't repeat the list in your reply; a one-line summary is enough.",
      ]
    : ["Then reply with one line per comment, as `<state> #<number>: <what you changed, in which file>`, or say why you left it. The reviewer uses that list to resolve the pins."];
  return [
    `# Review comments: ${manifest.screen}`,
    "",
    "A reviewer stepped through this screen's states in Stateview and left these comments. Each state is the app's real screen, started with the inputs listed under its heading (role, plan, data, request states). Those inputs come from the review's fixtures, so make each change in the screen's own components, not in the fixtures or the review.",
    "",
    "For each comment:",
    "1. Find the code. Start with the component names, then the element's text. Labels are often built from variables (`Remove ${name}`), so search for a fixed part of them. The selector only works inside the rendered screen, so use it in the browser, not to search files.",
    "2. Make the change the comment asks for, and no more. If the screen already does what it asks, leave the code and say where (`wontfix`). If the comment is a question, answer it, and change the code only if the answer is yes. If your change also affects something the comment didn't name (another control that shares the same check, say), keep it only if it follows from the comment, and mention it in your note.",
    "3. Check it. If you can open a browser, open the state's screen URL: that's the screen alone, as the reviewer saw it. (The state URL opens Stateview around it, with every other state as thumbnails and the screen in an iframe, so a count of elements on that page includes the thumbnails.) A change to a shared component shows in other states too, so look at those as well.",
    "",
    ...report,
    "",
    "",
  ].join("\n");
}

/**
 * A header for copied comments, so an agent can open exactly the state the
 * reviewer saw. `inputs` defaults to the state's own; pass the inputs on
 * screen when the reviewer changed some in the state panel.
 */
export function stateContext<T extends Inputs>(manifest: Manifest<T>, frame: Frame<T>, inputs: T = frame.inputs) {
  const changed = new Set<string>(changedInputs(manifest, inputs));
  // A changed input names the baseline's value too, so a comment about how two states differ can be read from the inputs alone.
  const list = manifest.inputs
    .map((input) => `${input.id}=${inputs[input.id]}${changed.has(input.id) ? ` (baseline: ${manifest.baseline[input.id]})` : ""}`)
    .join(", ");
  const href = frameHref(manifest, frame, inputs);
  const step = frame.step ? ` · step ${frame.step} of ${frame.stepCount}: ${frame.stepTitle}` : "";
  const edited = manifest.inputs.some((input) => inputs[input.id] !== frame.inputs[input.id]);
  return [
    `## State: ${frame.section.title} › ${frame.item.title}${step}${edited ? " (inputs changed by the reviewer)" : ""}`,
    // The state's link, plus any inputs changed in the state panel; `embed=1` is the screen alone, as the viewer's frame loads it.
    `State URL: ${window.location.origin}${href}`,
    `Screen URL: ${window.location.origin}${href}&embed=1`,
    `Inputs: ${list}`,
    "",
    "",
  ].join("\n");
}

/**
 * One state's open comments, in one block per set of inputs they were made
 * with, so each block's URL and inputs are what the reviewer saw when they
 * wrote it. Numbers count all of the state's comments, so they match its pins.
 */
export function formatState<T extends Inputs>(manifest: Manifest<T>, frame: Frame<T>, annotations: Annotation[], agentStatus?: AgentStatus) {
  const inputsOf = (annotation: Annotation) => ({ ...frame.inputs, ...annotation.inputs }) as T;
  const groups = new Map<string, T>();
  for (const annotation of orderAnnotations(annotations)) {
    if (annotation.status !== "open") continue;
    const inputs = inputsOf(annotation);
    groups.set(inputsKey(manifest, inputs), inputs);
  }
  return [...groups]
    .map(
      ([key, inputs]) =>
        stateContext(manifest, frame, inputs) +
        formatAnnotations(annotations, (annotation) => inputsKey(manifest, inputsOf(annotation)) === key, agentStatus),
    )
    .join("\n\n");
}

/** Every state's open comments, in review order, after the brief. */
export function formatReview<T extends Inputs>(manifest: Manifest<T>, annotations: Annotation[], statusPath?: string, agentStatus?: AgentStatus) {
  const states = listFrames(manifest)
    .map((frame) => formatState(manifest, frame, annotations.filter((a) => a.stateId === frame.key), agentStatus))
    .filter(Boolean)
    .join("\n\n");
  return agentBrief(manifest, statusPath) + states;
}
