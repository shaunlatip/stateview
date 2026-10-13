"use client";

import { useState } from "react";
import { Button } from "./components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "./components/ui/dialog";
import { Input } from "./components/ui/input";
import { useGateway } from "./context";
import { CREDIT_BALANCE } from "./fixtures";
import { IconCoins } from "./icons";

// Copy and fields follow the ai-gateway:add-card capture ("Add a Card").
function AddCardDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (open: boolean) => void; onDone: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <div className="flex flex-col gap-6 overflow-y-auto p-6">
          <div className="flex flex-col gap-2">
            <DialogTitle>Add a Card</DialogTitle>
            <DialogDescription>Your card won’t be charged. It unlocks $5 of free AI Gateway credit every month.</DialogDescription>
          </div>
          <label className="flex flex-col gap-2">
            <span className="text-gw-label-13 text-gw-gray-900">Card number</span>
            <Input placeholder="1234 1234 1234 1234" inputMode="numeric" autoComplete="cc-number" />
          </label>
          <div className="grid grid-cols-3 gap-3">
            <label className="flex min-w-0 flex-col gap-2">
              <span className="text-gw-label-13 text-gw-gray-900">Expiration</span>
              <Input placeholder="MM / YY" autoComplete="cc-exp" />
            </label>
            <label className="flex min-w-0 flex-col gap-2">
              <span className="text-gw-label-13 text-gw-gray-900">CVC</span>
              <Input placeholder="CVC" autoComplete="cc-csc" />
            </label>
            <label className="flex min-w-0 flex-col gap-2">
              <span className="text-gw-label-13 text-gw-gray-900">Postal code</span>
              <Input placeholder="94107" autoComplete="postal-code" />
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => {
              onOpenChange(false);
              onDone();
            }}
          >
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Step 1, shared by every path: requests draw on credit, so it comes before choosing a path.
export function CreditStep() {
  const { team, hasCredit, addCredit, state } = useGateway();
  const [open, setOpen] = useState(state.cardDialog === "open" && !hasCredit);
  const fresh = team === "new";

  return (
    <section className="gw-material-base overflow-hidden">
      {!hasCredit ? (
        <div className="flex items-center justify-between gap-6 px-6 py-5">
          <div className="flex flex-col gap-0.5">
            <h3 className="text-gw-heading-14 text-gw-gray-1000">Get $5 of free credit every month</h3>
            <p className="text-gw-copy-13 text-gw-gray-900">Add a card to start. It won’t be charged.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="secondary" size="sm">
              Buy Credit
            </Button>
            <Button size="sm" onClick={() => setOpen(true)}>
              Add a Card
            </Button>
          </div>
        </div>
      ) : (
        <div key="ready" className="gw-enter flex items-center justify-between gap-6 px-6 py-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-gw-gray-100 text-gw-gray-900 shadow-gw-hairline">
              <IconCoins size={16} />
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <h3 className="text-gw-heading-14 text-gw-gray-1000 tabular-nums">{fresh ? "$5.00 free credit" : `${CREDIT_BALANCE} credit`}</h3>
              <p className="text-gw-copy-13 text-gw-gray-900">{fresh ? "Resets monthly, free-tier models" : "Paid tier, all models unlocked"}</p>
            </div>
          </div>
          <Button variant="secondary" size="sm">
            {fresh ? "Buy Credit" : "Top Up"}
          </Button>
        </div>
      )}
      <AddCardDialog open={open} onOpenChange={setOpen} onDone={addCredit} />
    </section>
  );
}
