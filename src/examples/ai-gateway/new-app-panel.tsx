"use client";

import Image from "next/image";
import { Anchor } from "./components/ui/anchor";
import { TEMPLATES } from "./fixtures";
import { IconArrowRight, IconChat, IconExternal, IconFile, IconImage, IconPlus, IconPulse } from "./icons";

const CHIPS = [
  { label: "Chatbot", icon: IconChat },
  { label: "Image generator", icon: IconImage },
  { label: "Document summarizer", icon: IconFile },
  { label: "Voice agent", icon: IconPulse },
];

// Preview frame measured on vercel.com/new/templates: pinned 55% down / 15% in, full card size,
// gray-300 border, rotated -6deg and straightening to -2deg on hover. It holds the template's image.
function Preview({ src }: { src: string }) {
  return (
    <div className="gw-template-preview absolute size-full overflow-hidden rounded-gw-md border border-gw-gray-300 bg-gw-background-100 group-hover:-rotate-2">
      <Image src={src} alt="" width={800} height={419} unoptimized className="block h-auto w-full" />
    </div>
  );
}

// Same pieces as New Project: the v0 prompt and suggestion chips in one card, then template cards
// side by side (not nested in another card), then the link to the full template gallery.
export function NewAppPanel() {
  return (
    <div className="flex flex-col gap-4">
      <section className="gw-material-base flex flex-col gap-4 p-6">
        {/* Says what happens after Enter: the app v0 makes is already wired to this gateway. */}
        <div className="flex flex-col items-center gap-1.5 pt-2 pb-1 text-center">
          <h2 className="text-gw-heading-20 text-gw-gray-1000">Build with v0</h2>
          <p className="text-gw-copy-14 text-gw-gray-900">Apps you build here deploy with AI Gateway already connected.</p>
        </div>
        <label className="flex h-10 items-center gap-2 rounded-gw-md bg-gw-background-100 px-3 shadow-gw-hairline focus-within:shadow-gw-focus-border">
          <IconPlus size={14} className="text-gw-gray-900" />
          <input
            placeholder="Ask v0 to build an AI app…"
            aria-label="Ask v0 to build an AI app"
            className="w-full bg-transparent text-gw-copy-14 text-gw-gray-1000 outline-none placeholder:text-gw-gray-700"
          />
        </label>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {CHIPS.map(({ label, icon: Icon }) => (
            <button
              key={label}
              type="button"
              className="flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-gw-background-100 px-3 text-gw-button-14 text-gw-gray-1000 shadow-gw-hairline transition-colors outline-none hover:bg-gw-gray-100 focus-visible:shadow-gw-focus-ring"
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </section>
      <div className="@container">
        <ul className="grid grid-cols-1 gap-4 @2xl:grid-cols-3">
          {TEMPLATES.map((t) => (
            <li key={t.id}>
              <Anchor
                href={t.href}
                target="_blank"
                rel="noreferrer"
                className="gw-material-base group relative block h-50 overflow-hidden outline-none focus-visible:shadow-gw-focus-ring"
              >
                <div className="flex flex-col gap-1.5 px-6 py-5">
                  <div className="flex items-center gap-1 pr-2.5">
                    <h3 title={t.title} className="gw-template-title truncate text-gw-gray-1000">
                      {t.title}
                    </h3>
                    {/* The arrow fades in on hover, rotated -50deg as on the real cards. */}
                    <IconArrowRight
                      size={16}
                      className="gw-template-arrow shrink-0 text-gw-gray-1000 opacity-0 transition-opacity duration-100 ease-in-out group-hover:opacity-100 group-focus-visible:opacity-100"
                    />
                  </div>
                  <p title={t.description} className="gw-template-description line-clamp-2 text-balance text-gw-gray-900">
                    {t.description}
                  </p>
                </div>
                <Preview src={t.image} />
              </Anchor>
            </li>
          ))}
        </ul>
      </div>
      <Anchor
        href="https://vercel.com/templates?type=ai"
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1 self-center rounded-gw-sm text-gw-copy-14 text-gw-gray-900 hover:text-gw-gray-1000"
      >
        Browse Templates <IconExternal size={16} />
      </Anchor>
    </div>
  );
}
