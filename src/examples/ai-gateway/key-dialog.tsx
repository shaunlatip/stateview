"use client";

import { useEffect, useId, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "./cn";
import { useInThumbnail } from "@/stateview/in-thumbnail";
import { CopyButton } from "./code-block";
import { Button } from "./components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "./components/ui/dialog";
import { Input } from "./components/ui/input";
import { OnePasswordMark } from "./components/ui/one-password-mark";
import { Select } from "./components/ui/select";
import { Switch } from "./components/ui/switch";
import { notify } from "./components/ui/toaster";
import { DEFAULT_KEY_NAME, FAKE_KEY, MASKED_KEY } from "./fixtures";
import { IconChevronDown, IconEye, IconEyeOff, IconWarning } from "./icons";

const EXPIRY_DAYS = ["7", "30", "60", "90"].map((d) => ({ value: d, label: `In ${d} days` }));

/** How long the canned "create" call takes to answer. */
const CREATE_DELAY = 900;

/** The date, weekday included, then the time with its zone, so "when does this stop working" has one answer. */
function expiryLabel(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const date = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZoneName: "short" });
  return `${date}, ${time}`;
}

/** Where the dialog starts: the create form (idle, waiting on the call, or after it failed) or the key itself. */
export type KeyStage = "create" | "creating" | "failed" | "save";

/*
 * Opened from "Get an API key": name it, then hand it over with somewhere to
 * put it. The key only ever lives in this dialog; once it exists, only "I've
 * saved this key" closes it, and that waits for proof the key was kept
 * (copied, copied as an .env line, or saved to 1Password).
 */
export function CreateKeyDialog({
  open,
  onOpenChange,
  onCreated,
  initialStage = "create",
  initialKept = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
  initialStage?: KeyStage;
  initialKept?: boolean;
}) {
  const still = useInThumbnail();
  const [stage, setStage] = useState<KeyStage>(initialStage);
  const [advanced, setAdvanced] = useState(false);
  const [expires, setExpires] = useState(false);
  const [days, setDays] = useState("30");
  const [shown, setShown] = useState(false);
  const [kept, setKept] = useState(initialKept);
  const showRef = useRef<HTMLButtonElement>(null);
  const hintId = useId();
  const errorId = useId();

  // The canned create call: answers with the key after a short wait. Frozen in a thumbnail.
  useEffect(() => {
    if (stage !== "creating" || still) return;
    const t = window.setTimeout(() => setStage("save"), CREATE_DELAY);
    return () => window.clearTimeout(t);
  }, [stage, still]);

  // The Create button unmounts with its stage, so focus moves to the key's first control.
  useEffect(() => {
    if (stage === "save" && open && !still) showRef.current?.focus();
  }, [stage, open, still]);

  const reset = () =>
    window.setTimeout(() => {
      setStage("create");
      setShown(false);
      setAdvanced(false);
      setExpires(false);
      setDays("30");
      setKept(false);
    }, 200);

  const close = (next: boolean) => {
    if (!next && stage === "save") return;
    onOpenChange(next);
    if (!next) reset();
  };

  const finish = () => {
    onOpenChange(false);
    reset();
    onCreated?.();
  };

  const busy = stage === "creating";

  return (
    <Dialog open={open} onOpenChange={close} locked={stage === "save"}>
      <DialogContent>
        {stage !== "save" ? (
          <div key="create" className="gw-slide-in-left flex min-h-0 flex-col">
            <div className="flex min-h-0 flex-col gap-6 overflow-y-auto p-6">
              <div className="flex flex-col gap-2">
                <DialogTitle>Create API Key</DialogTitle>
                <DialogDescription>Use it from any app, script, or tool.</DialogDescription>
              </div>
              <label className="flex flex-col gap-2">
                <span className="text-gw-label-13 text-gw-gray-900">Key name</span>
                <Input defaultValue={DEFAULT_KEY_NAME} readOnly={busy} aria-describedby={stage === "failed" ? errorId : undefined} />
              </label>
              <div className="flex flex-col gap-4">
                <button
                  type="button"
                  onClick={() => setAdvanced((a) => !a)}
                  aria-expanded={advanced}
                  className="flex w-fit cursor-pointer items-center gap-1 text-gw-copy-14 text-gw-gray-1000"
                >
                  Advanced configuration
                  <IconChevronDown size={14} className={cn("transition-transform duration-200", advanced && "rotate-180")} />
                </button>
                {advanced ? (
                  <div className="gw-fade-in flex flex-col gap-4 px-px pb-1">
                    <div className="flex h-8 items-center justify-between gap-3">
                      <span className="flex items-center gap-3">
                        <label htmlFor={`${errorId}-expires`} className="cursor-pointer text-gw-copy-14 text-gw-gray-1000">
                          Set expiration date
                        </label>
                        <Switch id={`${errorId}-expires`} checked={expires} onCheckedChange={setExpires} />
                      </span>
                      {expires ? <Select value={days} onValueChange={setDays} items={EXPIRY_DAYS} label="Expires after" /> : null}
                    </div>
                    <span className="flex items-center gap-3">
                      <label htmlFor={`${errorId}-budget`} className="cursor-pointer text-gw-copy-14 text-gw-gray-1000">
                        Spend budget
                      </label>
                      <Switch id={`${errorId}-budget`} />
                    </span>
                  </div>
                ) : null}
              </div>
              {stage === "failed" ? (
                <p id={errorId} role="alert" className="flex items-start gap-2 text-gw-copy-14 text-gw-red-900">
                  <IconWarning size={16} className="mt-0.5 shrink-0" />
                  The key couldn’t be created. Nothing was saved; try again in a moment.
                </p>
              ) : null}
            </div>
            <DialogFooter>
              <Button variant="secondary" size="sm" onClick={() => close(false)}>
                Cancel
              </Button>
              <Button size="sm" aria-disabled={busy || undefined} onClick={() => !busy && setStage("creating")}>
                {busy ? (
                  <>
                    <LoaderCircle size={14} aria-hidden className="animate-spin motion-reduce:animate-none" />
                    Creating API Key
                  </>
                ) : stage === "failed" ? (
                  "Try Again"
                ) : (
                  "Create API Key"
                )}
              </Button>
              <span role="status" className="sr-only">
                {busy ? "Creating API key" : ""}
              </span>
            </DialogFooter>
          </div>
        ) : (
          <div key="save" className="gw-slide-in-right flex min-h-0 flex-col">
            <div className="flex min-h-0 flex-col gap-5 overflow-y-auto p-6">
              {/* Title and subheader are today's copy, word for word. */}
              <div className="flex flex-col gap-2">
                <DialogTitle>Save Your AI Gateway API Key</DialogTitle>
                <DialogDescription>Copy and securely store this API Key. You won’t be able to view it again.</DialogDescription>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex h-10 items-center overflow-hidden rounded-gw-md shadow-gw-hairline">
                  <span className="flex-1 truncate px-3 font-mono text-gw-copy-13-mono text-gw-gray-1000">{shown ? FAKE_KEY : MASKED_KEY}</span>
                  <span className="flex h-full items-center border-l border-gw-gray-alpha-400 px-1">
                    <button
                      ref={showRef}
                      type="button"
                      aria-label={shown ? "Hide API Key" : "Show API Key"}
                      onClick={() => setShown((s) => !s)}
                      className="inline-flex size-8 cursor-pointer items-center justify-center rounded-gw-md text-gw-gray-1000 outline-none hover:bg-gw-gray-alpha-200 focus-visible:shadow-gw-focus-ring"
                    >
                      {shown ? <IconEyeOff /> : <IconEye />}
                    </button>
                    <CopyButton value={FAKE_KEY} label="Copy API key" className="text-gw-gray-1000" onCopy={() => setKept(true)} />
                  </span>
                </div>
                {expires ? (
                  <p className="text-gw-copy-13 text-gw-gray-900">
                    Expires on <span className="text-gw-gray-1000">{expiryLabel(Number(days))}</span>.
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setKept(true);
                    notify("Saved to 1Password");
                  }}
                >
                  <OnePasswordMark />
                  Save in 1Password
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard?.writeText(`AI_GATEWAY_API_KEY=${FAKE_KEY}`).catch(() => {});
                    setKept(true);
                    notify("Copied .env line");
                  }}
                >
                  Copy as .env line
                </Button>
              </div>
            </div>
            {/* Today's full-width confirm, held until the key has actually left the dialog. */}
            <div className="border-t border-gw-gray-alpha-400 p-3">
              {!kept ? (
                <p id={hintId} className="sr-only">
                  Copy the key or save it to 1Password to continue.
                </p>
              ) : null}
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                aria-disabled={!kept || undefined}
                aria-describedby={kept ? undefined : hintId}
                onClick={() => kept && finish()}
              >
                I’ve saved this key
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
