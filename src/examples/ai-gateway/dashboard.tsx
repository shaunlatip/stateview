"use client";

import type { CSSProperties, ReactNode } from "react";
import { ProjectAvatar } from "./avatars";
import { Button } from "./components/ui/button";
import { useGateway } from "./context";
import { CREDIT_BALANCE, REQUEST_ROWS, USAGE } from "./fixtures";
import { IconChevronDown, IconChevronLeft, IconChevronRight, IconCoins, IconPlus, IconSearch } from "./icons";

type Series = { color: string; points: number[] };

// Flat series with late spikes, matching the shape in the after-first-request capture.
function spikes(len: number, at: [number, number][]) {
  const pts = Array.from({ length: len }, () => 0);
  for (const [i, v] of at) pts[i] = v;
  return pts;
}

function Chart({ label, series, ticks, max }: { label: string; series: Series[]; ticks: string[]; max: number }) {
  const w = 600;
  const h = 128;
  return (
    <div className="flex gap-2">
      <div aria-hidden className="flex h-32 flex-col justify-between text-right text-gw-label-12 text-gw-gray-900 tabular-nums">
        {ticks.map((t) => (
          <span key={t} className="-translate-y-2 first:translate-y-0 last:translate-y-0">
            {t}
          </span>
        ))}
      </div>
      <div className="relative flex-1">
        <svg role="img" aria-label={label} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-32 w-full overflow-visible">
          {ticks.map((t, i) => (
            <line
              key={t}
              x1={0}
              x2={w}
              y1={(i / (ticks.length - 1)) * h}
              y2={(i / (ticks.length - 1)) * h}
              className="stroke-gw-gray-alpha-200"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {series.map((s) => (
            <polyline
              key={s.color}
              fill="none"
              className={s.color}
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
              points={s.points.map((v, i) => `${(i / (s.points.length - 1)) * w},${h - (v / max) * h}`).join(" ")}
            />
          ))}
        </svg>
        <div aria-hidden className="mt-1 flex justify-between text-gw-label-12 text-gw-gray-900">
          <span>12h ago</span>
          <span>2m ago</span>
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, value, children }: { title: string; value: string; children: ReactNode }) {
  return (
    <div className="gw-material-base flex flex-col gap-3 p-4">
      <div>
        <button type="button" className="flex cursor-pointer items-center gap-1 rounded-gw-sm text-gw-copy-14 text-gw-gray-900 hover:text-gw-gray-1000">
          {title} <IconChevronDown size={14} />
        </button>
        <p className="text-sm leading-none font-medium text-gw-gray-1000 tabular-nums">{value}</p>
      </div>
      {children}
    </div>
  );
}

const AMBER = "stroke-gw-amber-700";
const BLUE = "stroke-gw-blue-700";
const GREEN = "stroke-gw-green-700";

const control = "flex h-10 cursor-pointer items-center justify-between rounded-gw-md bg-gw-background-100 px-3 text-gw-copy-14 text-gw-gray-1000 shadow-gw-hairline outline-none focus-visible:shadow-gw-focus-border";
const segmented = "flex rounded-gw-md bg-gw-background-100 p-1 shadow-gw-hairline";
const segment = "px-3 text-gw-copy-14 leading-7";

// Rebuilt from ai-gateway:overview:after-first-request.html.
export function OverviewDashboard() {
  const { projects, goTo } = useGateway();
  const notConnected = projects.filter((p) => p.state !== "connected").length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-medium text-gw-gray-1000">Usage</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="quiet" size="sm" onClick={() => goTo("quick-start")}>
            <IconPlus /> Connect Another
          </Button>
          <Button variant="secondary" size="sm">
            Add Drain
          </Button>
          <Button variant="secondary" size="sm">
            Open in Observability
          </Button>
          <Button size="sm">
            <IconCoins /> {CREDIT_BALANCE} Credit
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button type="button" className={`${control} w-45 min-w-0`}>
          All environments <IconChevronDown size={14} className="text-gw-gray-900" />
        </button>
        <button type="button" className={`${control} w-57 min-w-0`}>
          Last 12 hours <IconChevronDown size={14} className="text-gw-gray-900" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 @3xl:grid-cols-2">
        <ChartCard title="Spend by Model" value={USAGE.spend}>
          <Chart
            label="Spend by model over the last 12 hours"
            max={0.11}
            ticks={["$0.10", "$0.05", "$0"]}
            series={[
              { color: BLUE, points: spikes(60, [[54, 0.02]]) },
              { color: AMBER, points: spikes(60, [[58, 0.1]]) },
            ]}
          />
        </ChartCard>
        <ChartCard title="P50 TTFT by Model" value={USAGE.ttft}>
          <Chart label="P50 time to first token over the last 12 hours" max={2} ticks={["2.00s", "1.00s", "0.00s"]} series={[{ color: BLUE, points: spikes(60, [[50, 0.02]]) }]} />
        </ChartCard>
        <ChartCard title="Requests by Model" value={USAGE.requests}>
          <Chart
            label="Requests by model over the last 12 hours"
            max={6}
            ticks={["6", "4", "2", "0"]}
            series={[
              { color: BLUE, points: spikes(60, [[54, 1]]) },
              { color: AMBER, points: spikes(60, [[58, 6]]) },
              { color: GREEN, points: spikes(60, [[58, 2]]) },
            ]}
          />
        </ChartCard>
        <ChartCard title="All Tokens" value={USAGE.tokens}>
          <Chart label="Tokens over the last 12 hours" max={100} ticks={["100K", "50K", "0"]} series={[{ color: BLUE, points: spikes(60, [[58, 95]]) }]} />
        </ChartCard>
      </div>

      <div className="flex items-center justify-between pt-6">
        <h2 className="text-lg font-medium text-gw-gray-1000">Requests</h2>
        <div className={segmented}>
          <span className={`${segment} rounded-gw-sm bg-gw-gray-200 text-gw-gray-1000`}>Summary</span>
          <span className={`${segment} text-gw-gray-900`}>Log</span>
        </div>
      </div>

      <div className="flex gap-2">
        <div className={segmented}>
          <span className={`${segment} rounded-gw-sm bg-gw-gray-200 text-gw-gray-1000`}>Projects</span>
          <span className={`${segment} whitespace-nowrap text-gw-gray-900`}>API Keys</span>
        </div>
        <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-gw-md bg-gw-background-100 px-3 text-gw-gray-800 shadow-gw-hairline">
          <IconSearch /> <span className="text-gw-copy-14">Search</span>
        </div>
      </div>

      <div className="gw-material-base overflow-hidden">
        <div className="overflow-x-auto">
          <div role="table" aria-label="Requests by project" className="gw-requests-min">
            <div role="row" className="gw-requests-grid grid h-12 items-center gap-4 border-b border-gw-gray-alpha-400 px-4 text-gw-copy-14 text-gw-gray-1000">
              <span role="columnheader">Project</span>
              <span role="columnheader" className="text-right">
                Requests
              </span>
              <span role="columnheader" className="text-right">
                Avg Tokens/s
              </span>
              <span role="columnheader">P50 Duration</span>
              <span role="columnheader">P50 TTFT</span>
              <span role="columnheader" className="text-right">
                Cost
              </span>
              <span role="columnheader">
                <span className="sr-only">Details</span>
              </span>
            </div>
            {REQUEST_ROWS.map((r) => (
              <div
                role="row"
                key={r.project}
                className="gw-requests-grid grid h-11 items-center gap-4 border-b border-gw-gray-alpha-400 px-4 text-gw-copy-14 text-gw-gray-1000 tabular-nums last:border-b-0 hover:bg-gw-gray-alpha-100"
              >
                <span role="cell" className="flex min-w-0 items-center gap-2 whitespace-nowrap">
                  <ProjectAvatar favicon={r.favicon} small />
                  <span className="truncate" title={r.project}>
                    {r.project}
                  </span>
                </span>
                <span role="cell" className="text-right">
                  {r.requests}
                </span>
                <span role="cell" className="text-right">
                  {r.tps}
                </span>
                <span role="cell" className="relative">
                  <span className="gw-bar-width absolute -inset-y-0.5 left-0 rounded-gw-sm bg-gw-gray-alpha-200" style={{ "--gw-bar": `${r.p50Pct * 100}%` } as CSSProperties} />
                  <span className="relative pl-1">{r.p50}</span>
                </span>
                <span role="cell" className="relative">
                  <span className="gw-bar-width absolute -inset-y-0.5 left-0 rounded-gw-sm bg-gw-gray-alpha-200" style={{ "--gw-bar": `${r.ttftPct * 100}%` } as CSSProperties} />
                  <span className="relative pl-1">{r.ttft}</span>
                </span>
                <span role="cell" className="text-right">
                  {r.cost}
                </span>
                <span role="cell">
                  <IconChevronRight size={14} className="text-gw-gray-900" />
                </span>
              </div>
            ))}
          </div>
        </div>
        {notConnected > 0 ? (
          <button
            type="button"
            onClick={() => goTo("quick-start", "projects")}
            className="flex h-11 w-full cursor-pointer items-center gap-2 border-t border-gw-gray-alpha-400 px-4 text-left text-gw-copy-14 text-gw-gray-900 outline-none hover:bg-gw-gray-alpha-100 hover:text-gw-gray-1000 focus-visible:bg-gw-gray-alpha-100 focus-visible:text-gw-gray-1000"
          >
            <IconPlus size={14} />
            {notConnected} more projects on this team don’t use AI Gateway yet
          </button>
        ) : null}
        <div className="flex h-14 items-center justify-between border-t border-gw-gray-alpha-400 px-4">
          <span className="flex items-center gap-2 text-gw-button-14 text-gw-gray-1000">
            Show 10 <IconChevronDown size={14} className="text-gw-gray-900" />
          </span>
          <span className="flex items-center gap-3 text-gw-label-12 text-gw-gray-900">
            1 of 1
            <span aria-hidden className="flex gap-1">
              <span className="inline-flex size-7 items-center justify-center rounded-gw-md shadow-gw-hairline">
                <IconChevronLeft size={14} />
              </span>
              <span className="inline-flex size-7 items-center justify-center rounded-gw-md shadow-gw-hairline">
                <IconChevronRight size={14} />
              </span>
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
