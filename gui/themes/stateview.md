# Stateview

Generated from the current project, including edits awaiting autosave. Return to the [theme index](../themes.md). Install the selected fonts and icons using the setup below; assets are acquired separately from their official sources.

## Font and icon setup

Follow [asset installation](../assets.md) when implementing this theme. Download and configure the selected free assets from their official sources; no font files or icon artwork are bundled. Weights below are the authored requests: load matching static faces or a variable range and report any unavailable weight. Register the exact family aliases below, or map the role tokens to the loader’s actual family.

| Selected font | Roles | Weights | Family stack | Setup |
| --- | --- | --- | --- | --- |
| <code>Timeless Grotesk</code> (free) | brand, ui, editorial | 300, 400, 600 | <code>"Timeless Grotesk", sans-serif</code> | Download and load [Timeless Grotesk](https://timeless.co/type) in the app. Use the vendor’s Grotesk cut; if using Timeless Sans variable files, pin STYL to 0, with ital 0 for upright or 100 for required italic faces. |
| <code>Geist Mono</code> (free) | data | 300, 400, 600 | <code>"Sidebar Geist Mono", monospace</code> | Download and load [Geist Mono](https://vercel.com/font) in the app. |

### Icons

Selected: [Phosphor](https://github.com/phosphor-icons/react), outlined. Install and wire the selected free pack (React: <code>@phosphor-icons/react</code>); reuse it if already installed. Use the official adapter for other frameworks.

Preserve icon size, color, weight, style, and accessible names. Match the selected style only where the pack supports it; Lucide’s official pack supplies outlines, so report a filled-style gap rather than claiming exact filled artwork. Keep existing package versions and add only missing packages using the receiving project’s package manager.

## Foundations

```json
{
  "name": "Stateview",
  "text": {
    "l": {
      "size": 23,
      "lineHeight": 31
    },
    "m": {
      "size": 15,
      "lineHeight": 23
    },
    "s": {
      "size": 13,
      "lineHeight": 19
    },
    "xl": {
      "size": 35,
      "lineHeight": 38
    },
    "xs": {
      "size": 12,
      "lineHeight": 15
    },
    "xxl": {
      "size": 46,
      "lineHeight": 50
    },
    "xxs": {
      "size": 10,
      "lineHeight": 13
    }
  },
  "fonts": {
    "ui": {
      "family": "\"Timeless Grotesk\", sans-serif",
      "weights": {
        "heavy": 600,
        "medium": 400,
        "regular": 300
      }
    },
    "brand": {
      "family": "\"Timeless Grotesk\", sans-serif",
      "weights": {
        "heavy": 600,
        "medium": 400,
        "regular": 300
      }
    },
    "editorial": {
      "family": "\"Timeless Grotesk\", sans-serif",
      "weights": {
        "heavy": 600,
        "medium": 400,
        "regular": 300
      }
    },
    "data": {
      "family": "\"Sidebar Geist Mono\", monospace",
      "weights": {
        "heavy": 600,
        "medium": 400,
        "regular": 300
      }
    }
  },
  "border": {
    "l": 2,
    "m": 1,
    "s": 1,
    "none": 0
  },
  "radius": {
    "l": 20,
    "m": 10,
    "s": 7,
    "xl": 30,
    "xs": 3,
    "full": 9999,
    "zero": 0
  },
  "shadows": {
    "l": {
      "x": 0,
      "y": 12,
      "blur": 30,
      "color": {
        "dark": "neutral-1",
        "light": "neutral-10"
      },
      "spread": 0,
      "opacity": 0
    },
    "m": {
      "x": 0,
      "y": 8,
      "blur": 24,
      "color": {
        "dark": "neutral-1",
        "light": "neutral-10"
      },
      "spread": 0,
      "opacity": 0
    },
    "s": {
      "x": 0,
      "y": 1,
      "blur": 2,
      "color": {
        "dark": "neutral-1",
        "light": "neutral-10"
      },
      "spread": 0,
      "opacity": 0
    }
  },
  "spacing": {
    "l": 22,
    "m": 14,
    "s": 11,
    "xl": 29,
    "xs": 7,
    "xxl": 43,
    "xxs": 4,
    "zero": 0
  },
  "animation": {
    "large": {
      "easing": [
        0.16,
        1,
        0.3,
        1
      ],
      "duration": 300
    },
    "easing": [
      0.2,
      0.8,
      0.2,
      1
    ],
    "duration": 150,
    "popupScale": 0.96,
    "pressDistance": 1
  },
  "iconStyle": "outlined",
  "iconFamily": "Phosphor",
  "neutralTone": "neutral",
  "colorEmphasis": 14.2822265625,
  "letterSpacing": {
    "l": 0.01,
    "m": 0,
    "s": -0.01,
    "xl": 0.02,
    "xs": -0.02
  },
  "primaryForeground": {},
  "primaryActionColor": "neutral-10"
}
```

## light CSS variables

Define these in the app’s existing theme scope for this mode. Keep component styles linked to the variables.

| Variable | Value |
| --- | --- |
| `--theme-name` | Stateview |
| `--theme-icon-family` | Phosphor |
| `--theme-icon-style` | outlined |
| `--toolbar-divider-bleed` | 1 |
| `--focus-ring-outline` | 2px solid color-mix(in srgb, #000000 50%, transparent) |
| `--icon-stroke-width` | 1.5 |
| `--icon-light-display` | inline |
| `--icon-regular-display` | none |
| `--icon-bold-display` | none |
| `--motion-duration` | 150ms |
| `--motion-easing` | cubic-bezier(0.2, 0.8, 0.2, 1) |
| `--motion-type` | easing |
| `--motion-visual-duration` | 0.15 |
| `--motion-bounce` | 0.2 |
| `--motion-enabled` | 1 |
| `--motion-small-iterations` | infinite |
| `--motion-large-duration` | 300ms |
| `--motion-large-easing` | cubic-bezier(0.16, 1, 0.3, 1) |
| `--motion-large-type` | easing |
| `--motion-large-visual-duration` | 0.3 |
| `--motion-large-bounce` | 0.2 |
| `--motion-large-iterations` | infinite |
| `--motion-popup-scale` | 0.96 |
| `--motion-press-distance` | 1px |
| `--option-badge-background` | #f0f0f0 |
| `--option-badge-foreground` | #000000 |
| `--navigation-active-foreground` | #000000 |
| `--emphasis-chart-fill` | transparent |
| `--emphasis-balance-background` | #f0f0f0 |
| `--emphasis-rewards-background` | #f0f0f0 |
| `--emphasis-icon-background` | #f0f0f0 |
| `--emphasis-icon-foreground` | #000000 |
| `--emphasis-type-background` | #f0f0f0 |
| `--emphasis-type-foreground` | #000000 |
| `--navigation-active-background` | #f0f0f0 |
| `--surface-raised-image` | none |
| `--surface-raised-shadow` | 0 0 0 0 transparent |
| `--surface-recessed-image` | none |
| `--surface-recessed-shadow` | 0 0 0 0 transparent |
| `--space-zero` | 0px |
| `--space-xxs` | 4px |
| `--space-xs` | 7px |
| `--space-s` | 11px |
| `--space-m` | 14px |
| `--space-l` | 22px |
| `--space-xl` | 29px |
| `--space-xxl` | 43px |
| `--tracking-xs` | -0.02em |
| `--tracking-s` | -0.01em |
| `--tracking-m` | 0em |
| `--tracking-l` | 0.01em |
| `--tracking-xl` | 0.02em |
| `--size-xxs` | 10px |
| `--line-xxs` | 13px |
| `--letter-spacing-xxs` | 0.02em |
| `--size-xs` | 12px |
| `--line-xs` | 15px |
| `--letter-spacing-xs` | 0.01em |
| `--size-s` | 13px |
| `--line-s` | 19px |
| `--letter-spacing-s` | 0.01em |
| `--size-m` | 15px |
| `--line-m` | 23px |
| `--letter-spacing-m` | 0em |
| `--size-l` | 23px |
| `--line-l` | 31px |
| `--letter-spacing-l` | -0.01em |
| `--size-xl` | 35px |
| `--line-xl` | 38px |
| `--letter-spacing-xl` | -0.01em |
| `--size-xxl` | 46px |
| `--line-xxl` | 50px |
| `--letter-spacing-xxl` | -0.02em |
| `--radius-zero` | 0px |
| `--radius-xs` | 3px |
| `--radius-s` | 7px |
| `--radius-m` | 10px |
| `--radius-l` | 20px |
| `--radius-xl` | 30px |
| `--radius-full` | 9999px |
| `--border-none` | 0px |
| `--border-s` | 1px |
| `--border-m` | 1px |
| `--border-l` | 2px |
| `--border-default-color` | rgb(0 0 0 / 0.1) |
| `--border-shadow-none` | 0 0 0 0 transparent |
| `--border-shadow-s` | 0 0 0 1px rgb(0 0 0 / 0.1) |
| `--border-shadow-m` | 0 0 0 1px rgb(0 0 0 / 0.1) |
| `--border-shadow-l` | 0 0 0 2px rgb(0 0 0 / 0.1) |
| `--font-ui` | "Timeless Grotesk", sans-serif |
| `--weight-ui-regular` | 300 |
| `--weight-ui-medium` | 400 |
| `--weight-ui-heavy` | 600 |
| `--font-brand` | "Timeless Grotesk", sans-serif |
| `--weight-brand-regular` | 300 |
| `--weight-brand-medium` | 400 |
| `--weight-brand-heavy` | 600 |
| `--font-editorial` | "Timeless Grotesk", sans-serif |
| `--weight-editorial-regular` | 300 |
| `--weight-editorial-medium` | 400 |
| `--weight-editorial-heavy` | 600 |
| `--font-data` | "Sidebar Geist Mono", monospace |
| `--weight-data-regular` | 300 |
| `--weight-data-medium` | 400 |
| `--weight-data-heavy` | 600 |
| `--color-none` | transparent |
| `--color-1` | #e0e708 |
| `--color-1-transparent` | #e0e70833 |
| `--color-2` | #00c9bb |
| `--color-2-transparent` | #00c9bb33 |
| `--color-3` | #E0E709 |
| `--color-3-transparent` | #E0E70933 |
| `--color-4` | #e864ff |
| `--color-4-transparent` | #e864ff33 |
| `--neutral-1` | #ffffff |
| `--neutral-1-transparent` | #ffffff33 |
| `--neutral-2` | #fafafa |
| `--neutral-2-transparent` | #fafafa33 |
| `--neutral-3` | #f0f0f0 |
| `--neutral-3-transparent` | #f0f0f033 |
| `--neutral-4` | #dddddd |
| `--neutral-4-transparent` | #dddddd33 |
| `--neutral-5` | #c5c5c5 |
| `--neutral-5-transparent` | #c5c5c533 |
| `--neutral-6` | #969696 |
| `--neutral-6-transparent` | #96969633 |
| `--neutral-7` | #6c6c6c |
| `--neutral-7-transparent` | #6c6c6c33 |
| `--neutral-8` | #454545 |
| `--neutral-8-transparent` | #45454533 |
| `--neutral-9` | #252525 |
| `--neutral-9-transparent` | #25252533 |
| `--neutral-10` | #000000 |
| `--neutral-10-transparent` | #00000033 |
| `--success` | #76ef6b |
| `--success-transparent` | #76ef6b33 |
| `--warning` | #ffa344 |
| `--warning-transparent` | #ffa34433 |
| `--error` | #ff5263 |
| `--error-transparent` | #ff526333 |
| `--shadow-none` | none |
| `--shadow-s` | 0px 1px 2px 0px #00000000 |
| `--shadow-m` | 0px 8px 24px 0px #00000000 |
| `--shadow-l` | 0px 12px 30px 0px #00000000 |
| `--cte-canvas` | #ffffff |
| `--cte-surface` | #fafafa |
| `--cte-surface-muted` | #f0f0f0 |
| `--cte-text` | #000000 |
| `--cte-text-muted` | #6c6c6c |
| `--cte-border` | rgb(0 0 0 / 0.1) |
| `--cte-accent` | #e0e708 |
| `--cte-accent-text` | #000000 |
| `--cte-danger` | #ff5263 |
| `--cte-focus` | #e0e708 |
| `--cte-font` | "Timeless Grotesk", sans-serif |
| `--cte-font-size` | 15px |
| `--cte-font-weight` | 300 |
| `--cte-line-height` | 23px |
| `--cte-letter-spacing` | 0em |
| `--cte-detail-font-size` | 15px |
| `--cte-detail-line-height` | 23px |
| `--cte-detail-letter-spacing` | 0em |

## dark CSS variables

Define these in the app’s existing theme scope for this mode. Keep component styles linked to the variables.

| Variable | Value |
| --- | --- |
| `--theme-name` | Stateview |
| `--theme-icon-family` | Phosphor |
| `--theme-icon-style` | outlined |
| `--toolbar-divider-bleed` | 1 |
| `--focus-ring-outline` | 2px solid color-mix(in srgb, #ffffff 50%, transparent) |
| `--icon-stroke-width` | 1.5 |
| `--icon-light-display` | inline |
| `--icon-regular-display` | none |
| `--icon-bold-display` | none |
| `--motion-duration` | 150ms |
| `--motion-easing` | cubic-bezier(0.2, 0.8, 0.2, 1) |
| `--motion-type` | easing |
| `--motion-visual-duration` | 0.15 |
| `--motion-bounce` | 0.2 |
| `--motion-enabled` | 1 |
| `--motion-small-iterations` | infinite |
| `--motion-large-duration` | 300ms |
| `--motion-large-easing` | cubic-bezier(0.16, 1, 0.3, 1) |
| `--motion-large-type` | easing |
| `--motion-large-visual-duration` | 0.3 |
| `--motion-large-bounce` | 0.2 |
| `--motion-large-iterations` | infinite |
| `--motion-popup-scale` | 0.96 |
| `--motion-press-distance` | 1px |
| `--option-badge-background` | #2b2b2b |
| `--option-badge-foreground` | #ffffff |
| `--navigation-active-foreground` | #ffffff |
| `--emphasis-chart-fill` | transparent |
| `--emphasis-balance-background` | #2b2b2b |
| `--emphasis-rewards-background` | #2b2b2b |
| `--emphasis-icon-background` | #2b2b2b |
| `--emphasis-icon-foreground` | #ffffff |
| `--emphasis-type-background` | #2b2b2b |
| `--emphasis-type-foreground` | #ffffff |
| `--navigation-active-background` | #2b2b2b |
| `--surface-raised-image` | none |
| `--surface-raised-shadow` | 0 0 0 0 transparent |
| `--surface-recessed-image` | none |
| `--surface-recessed-shadow` | 0 0 0 0 transparent |
| `--space-zero` | 0px |
| `--space-xxs` | 4px |
| `--space-xs` | 7px |
| `--space-s` | 11px |
| `--space-m` | 14px |
| `--space-l` | 22px |
| `--space-xl` | 29px |
| `--space-xxl` | 43px |
| `--tracking-xs` | -0.02em |
| `--tracking-s` | -0.01em |
| `--tracking-m` | 0em |
| `--tracking-l` | 0.01em |
| `--tracking-xl` | 0.02em |
| `--size-xxs` | 10px |
| `--line-xxs` | 13px |
| `--letter-spacing-xxs` | 0.02em |
| `--size-xs` | 12px |
| `--line-xs` | 15px |
| `--letter-spacing-xs` | 0.01em |
| `--size-s` | 13px |
| `--line-s` | 19px |
| `--letter-spacing-s` | 0.01em |
| `--size-m` | 15px |
| `--line-m` | 23px |
| `--letter-spacing-m` | 0em |
| `--size-l` | 23px |
| `--line-l` | 31px |
| `--letter-spacing-l` | -0.01em |
| `--size-xl` | 35px |
| `--line-xl` | 38px |
| `--letter-spacing-xl` | -0.01em |
| `--size-xxl` | 46px |
| `--line-xxl` | 50px |
| `--letter-spacing-xxl` | -0.02em |
| `--radius-zero` | 0px |
| `--radius-xs` | 3px |
| `--radius-s` | 7px |
| `--radius-m` | 10px |
| `--radius-l` | 20px |
| `--radius-xl` | 30px |
| `--radius-full` | 9999px |
| `--border-none` | 0px |
| `--border-s` | 1px |
| `--border-m` | 1px |
| `--border-l` | 2px |
| `--border-default-color` | rgb(0 0 0 / 0.1) |
| `--border-shadow-none` | 0 0 0 0 transparent |
| `--border-shadow-s` | 0 0 0 1px rgb(0 0 0 / 0.1) |
| `--border-shadow-m` | 0 0 0 1px rgb(0 0 0 / 0.1) |
| `--border-shadow-l` | 0 0 0 2px rgb(0 0 0 / 0.1) |
| `--font-ui` | "Timeless Grotesk", sans-serif |
| `--weight-ui-regular` | 300 |
| `--weight-ui-medium` | 400 |
| `--weight-ui-heavy` | 600 |
| `--font-brand` | "Timeless Grotesk", sans-serif |
| `--weight-brand-regular` | 300 |
| `--weight-brand-medium` | 400 |
| `--weight-brand-heavy` | 600 |
| `--font-editorial` | "Timeless Grotesk", sans-serif |
| `--weight-editorial-regular` | 300 |
| `--weight-editorial-medium` | 400 |
| `--weight-editorial-heavy` | 600 |
| `--font-data` | "Sidebar Geist Mono", monospace |
| `--weight-data-regular` | 300 |
| `--weight-data-medium` | 400 |
| `--weight-data-heavy` | 600 |
| `--color-none` | transparent |
| `--color-1` | #e0e708 |
| `--color-1-transparent` | #e0e70833 |
| `--color-2` | #00c9bb |
| `--color-2-transparent` | #00c9bb33 |
| `--color-3` | #f4f83b |
| `--color-3-transparent` | #f4f83b33 |
| `--color-4` | #e864ff |
| `--color-4-transparent` | #e864ff33 |
| `--neutral-1` | #000000 |
| `--neutral-1-transparent` | #00000033 |
| `--neutral-2` | #202020 |
| `--neutral-2-transparent` | #20202033 |
| `--neutral-3` | #2b2b2b |
| `--neutral-3-transparent` | #2b2b2b33 |
| `--neutral-4` | #383838 |
| `--neutral-4-transparent` | #38383833 |
| `--neutral-5` | #505050 |
| `--neutral-5-transparent` | #50505033 |
| `--neutral-6` | #777777 |
| `--neutral-6-transparent` | #77777733 |
| `--neutral-7` | #a3a3a3 |
| `--neutral-7-transparent` | #a3a3a333 |
| `--neutral-8` | #c6c6c6 |
| `--neutral-8-transparent` | #c6c6c633 |
| `--neutral-9` | #e5e5e5 |
| `--neutral-9-transparent` | #e5e5e533 |
| `--neutral-10` | #ffffff |
| `--neutral-10-transparent` | #ffffff33 |
| `--success` | #76ef6b |
| `--success-transparent` | #76ef6b33 |
| `--warning` | #ffa344 |
| `--warning-transparent` | #ffa34433 |
| `--error` | #ff5263 |
| `--error-transparent` | #ff526333 |
| `--shadow-none` | none |
| `--shadow-s` | 0px 1px 2px 0px #00000000 |
| `--shadow-m` | 0px 8px 24px 0px #00000000 |
| `--shadow-l` | 0px 12px 30px 0px #00000000 |
| `--cte-canvas` | #000000 |
| `--cte-surface` | #202020 |
| `--cte-surface-muted` | #2b2b2b |
| `--cte-text` | #ffffff |
| `--cte-text-muted` | #a3a3a3 |
| `--cte-border` | rgb(0 0 0 / 0.1) |
| `--cte-accent` | #e0e708 |
| `--cte-accent-text` | #000000 |
| `--cte-danger` | #ff5263 |
| `--cte-focus` | #e0e708 |
| `--cte-font` | "Timeless Grotesk", sans-serif |
| `--cte-font-size` | 15px |
| `--cte-font-weight` | 300 |
| `--cte-line-height` | 23px |
| `--cte-letter-spacing` | 0em |
| `--cte-detail-font-size` | 15px |
| `--cte-detail-line-height` | 23px |
| `--cte-detail-letter-spacing` | 0em |

## Authored component assignments

These are project edits. The [component reference](stateview-components.md) includes the effective assignments with defaults and shared parts resolved.

```json
{
  "componentTokens": {
    "switch:default:part:row:rest": {
      "gap": "s"
    },
    "switch:default:part:label:rest": {
      "textSize": "m"
    },
    "checkbox:default:part:label:rest": {
      "textSize": "m"
    },
    "switch:default:part:control:rest": {
      "controlSize": "xl"
    }
  },
  "componentVariants": {}
}
```
