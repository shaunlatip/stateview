import Image from "next/image";
import { cn } from "./cn";

/** A project mark showing its favicon, the way Projects and New Project show them: 32px in lists, 20px in pills. */
export function ProjectAvatar({ favicon, small = false }: { favicon: string; small?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-gw-background-100 shadow-gw-hairline",
        small ? "size-5" : "size-8",
      )}
    >
      {favicon === "curio" ? (
        <span className={cn("gw-curio rounded-full ring-2 ring-gw-background-100", small ? "size-3" : "size-5")} />
      ) : (
        <span aria-hidden className={small ? "text-gw-emoji-10" : "text-gw-emoji-16"}>
          {favicon}
        </span>
      )}
    </span>
  );
}

/*
 * Official app icons from each vendor's brand kit, repo or app bundle.
 * "bleed" icons already fill their square; "inset" are macOS icons with a
 * built-in margin, scaled up to fill; "mark" is a bare logo on a neutral tile.
 */
type Icon = { src: string; srcDark?: string; fit: "bleed" | "inset" | "mark" };

const ICONS: Record<string, Icon> = {
  "claude-code": { src: "claude-code.svg", fit: "bleed" },
  codex: { src: "codex.png", srcDark: "codex-dark.png", fit: "inset" },
  cursor: { src: "cursor.png", fit: "bleed" },
  copilot: { src: "copilot.svg", srcDark: "copilot-white.svg", fit: "mark" },
  opencode: { src: "opencode.png", fit: "bleed" },
  cline: { src: "cline.png", fit: "bleed" },
  zed: { src: "zed.png", fit: "inset" },
  aider: { src: "aider.png", fit: "bleed" },
};

const SIZES = { 28: "size-7", 36: "size-9" } as const;

/** App-icon tile for a coding agent. */
export function AgentIcon({
  flag,
  name,
  size = 28,
  raised = false,
  decorative = false,
}: {
  flag: string;
  name: string;
  size?: keyof typeof SIZES;
  raised?: boolean;
  /** The name is already written beside the icon, so the icon stays silent. */
  decorative?: boolean;
}) {
  const icon = ICONS[flag];
  const mark = icon?.fit === "mark";
  const img = (src: string, extra?: string) => (
    <Image
      src={`/examples/ai-gateway/agents/${src}`}
      alt=""
      width={size}
      height={size}
      unoptimized
      className={cn("size-full object-contain", icon?.fit === "inset" && "gw-icon-inset", mark && "gw-icon-mark", extra)}
    />
  );
  return (
    <span
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : name}
      aria-hidden={decorative || undefined}
      className={cn(
        "gw-agent-icon-radius relative inline-flex shrink-0 overflow-hidden",
        raised ? "gw-icon-shadow" : "shadow-gw-hairline-300",
        mark && "bg-gw-background-100",
        SIZES[size],
      )}
    >
      {icon ? (
        icon.srcDark ? (
          <>
            {img(icon.src, "gw-dark:hidden")}
            {img(icon.srcDark, "hidden gw-dark:block")}
          </>
        ) : (
          img(icon.src)
        )
      ) : null}
    </span>
  );
}
