# 25 — Legal and branding notes for the implementer

This document captures the IP and branding considerations that an implementing team must internalize before shipping. It is **not** legal advice; consult a lawyer for binding guidance on your specific situation. The points below are common-sense guardrails for a clean-room rebuild that interoperates with an existing ecosystem without infringing.

## 25.1 What you must NOT reuse

| Item | Reason |
|------|--------|
| The name "Obsidian" | Registered trademark of Dynalist Inc. The replica must have a different product name. |
| The Obsidian logo (the purple obsidian-gem mark) | Trademarked. Design your own mark. |
| Marketing copy from `obsidian.md` (taglines, hero text, page descriptions) | Copyrighted prose. Write your own. |
| Screenshots from `obsidian.md` or the help site | Copyrighted images. Take your own screenshots of the replica. |
| Verbatim text from the Obsidian help site (`help.obsidian.md`) | Copyrighted (Obsidian publishes it under its own terms; do not assume CC-licensed). Paraphrase, don't copy. |
| Verbatim text from the Obsidian developer docs (`docs.obsidian.md`) | Same as above. |
| The community plugin/theme directory's listings (the curated catalog itself) | The catalog is a compilation work owned by the directory operator. Build your own listing if you operate a directory. |
| The `obsidian://` URI scheme name | Choose your own scheme name (e.g. `<yourapp>://`) so URLs from the original Obsidian don't collide. |
| Source code from the Obsidian distribution | Proprietary. The replica must be a clean-room implementation written without reading the original's compiled source. |
| Any installer assets, splash images, or video clips from Obsidian | Copyrighted. |

## 25.2 What you MAY reuse

| Item | Why it's safe |
|------|---------------|
| The `.md` file format | Markdown is an open standard; Obsidian's flavor extends it but the *idea* of those extensions (wikilinks, callouts, embeds, block IDs) is not protectable. |
| The CSS variable names and values documented in `18_design_tokens.md` and `19_component_styling.md` | Obsidian deliberately publishes these for theme and plugin developers to target. The names form an interoperability surface. Defaults are short factual values that themes are expected to override. |
| The hotkey layout | Functional shortcuts (e.g. `Ctrl+P` for command palette) are not protectable. |
| The plugin API method names and shapes | Obsidian publishes the API as TypeScript definitions (the `obsidian` npm package's `.d.ts` is licensed for use by plugin authors). Implementing the same method names is what allows third-party plugins to run on your platform. |
| **JSON Canvas** (`.canvas` file format) | Published as an open standard at [jsoncanvas.org](https://jsoncanvas.org). The schema is explicitly intended for cross-implementation use. |
| The Bases YAML schema for `.base` files | A documented file format. The schema itself isn't protectable; mimicking it is what makes vaults portable. |
| Behavioral patterns of features | Features and ideas are not copyrightable; specific code expressing them is. |
| Lucide icon library | Open-source (ISC license). Use directly. |
| CodeMirror 6, markdown-it, KaTeX/MathJax, Mermaid, Prism, etc. | Open-source. Comply with each project's license (mostly MIT). |
| The general look-and-feel "vibe" (two sidebars, ribbon, command palette, graph view) | Visual conventions are not protectable absent trade-dress claims. The replica should still develop its own visual identity to avoid customer confusion. |

## 25.3 Compatibility wins, mimicry loses

Aim for **functional compatibility**, not visual identity. A user who knows Obsidian should be able to use the replica without retraining; that is the value proposition. But a side-by-side screenshot of the replica next to Obsidian should be visibly distinguishable: different brand, different logo, optionally different default theme accent. Trade dress (the overall look that consumers associate with a brand) is the gray area you want to stay away from.

## 25.4 Plugin and theme ecosystem

The original ecosystem is a major value driver. The replica should:

1. **Honor the API surface** so existing community plugins and themes run unchanged.
2. **Operate its own directory** if it wants to host plugins. Do not redistribute Obsidian's curated directory or its review approvals — those are work product owned by the directory operator.
3. **Acknowledge the source** in your documentation: "Compatible with the plugin API of Obsidian" or similar honest framing. Don't imply endorsement.

## 25.5 What the implementer must produce themselves

| Asset | Note |
|-------|------|
| Product name | A new, distinct, easily-distinguishable name. |
| Logo / wordmark | Original work. |
| Splash screen, app icon, favicon | Original work. |
| Default theme | Build from scratch using the documented CSS variable structure. |
| Marketing site copy | Original prose. |
| Tutorial / onboarding content | Original prose and screenshots (from your replica). |
| Translation files | If reusing translations, comply with the Obsidian translations repo's license; otherwise commission your own. |
| API TypeScript definitions | Publish your own — written from scratch or generated from your implementation — using the same identifiers as the public Obsidian API surface where compatibility matters. |

## 25.6 Network endpoints to NOT contact

The replica must not contact any Obsidian-operated endpoint without explicit user opt-in:

- `obsidian.md/*`
- `publish-01.obsidian.md/*` (Publish CDN)
- `releases.obsidian.md/*` (auto-update)
- The official community-plugin/theme manifest URLs.

If the replica wants an auto-update channel, host it yourself. If the replica wants a plugin marketplace, run your own.

## 25.7 Attribution practice

When the replica's documentation describes the file formats, plugin API, or CSS variables it shares with Obsidian, attribute them like this:

> "Compatible with the JSON Canvas open file format ([jsoncanvas.org](https://jsoncanvas.org))."
>
> "Implements the same plugin API surface as Obsidian's `obsidian.d.ts` so existing community plugins can run unchanged."

Do not write "Built on Obsidian" or "Powered by Obsidian" — these imply origination or endorsement.

## 25.8 Open-source dependencies

The replica must include a *Licenses* settings page (or About dialog) listing every third-party dependency and its license. Common ones:

| Package | License |
|---------|---------|
| CodeMirror | MIT |
| markdown-it | MIT |
| KaTeX | MIT |
| MathJax | Apache 2.0 |
| Mermaid | MIT |
| Prism | MIT |
| Lucide | ISC |
| moment.js (or Day.js) | MIT |
| js-yaml | MIT |
| chokidar | MIT |
| Electron / Tauri | MIT / MIT-Apache 2.0 dual |

## 25.9 Privacy posture

The replica should default to local-only behavior:

- No telemetry by default. If telemetry is offered, it must be **opt-in** with a clear in-app explanation.
- No automatic external network calls except: a single update check (which the user can disable) and explicit marketplace fetches.
- Document every endpoint contacted in a public privacy policy.
- The vault never leaves the user's device unless the user enables an explicit sync feature.

## 25.10 Trademark notice in docs

Whenever Obsidian (the original) is mentioned in your documentation, add a footnote:

> "Obsidian is a trademark of Dynalist Inc. This project is not affiliated with, sponsored by, or endorsed by Dynalist Inc."

Place this notice in the README, the website footer, and any blog post that compares the replica to Obsidian.

## 25.11 Final principle

Compatibility is the goal — confusion is the failure mode. A user must always know which app they're using. A reasonable consumer must never mistake the replica for Obsidian. If you keep that line clear, the rest of the legal posture mostly takes care of itself.