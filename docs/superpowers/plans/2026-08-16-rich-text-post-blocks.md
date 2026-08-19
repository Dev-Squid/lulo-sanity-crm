# Rich Content Blocks for Posts — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let editors place images, image galleries, tables, pull quotes and stat callouts inside a post body, with caption/label text authored bilingually inside each block.

**Architecture:** Portable Text blocks are objects identified by a `_type` string. The Sanity Studio widens `localeRichText`'s `of:` array to accept five new types; the React site maps each `_type` to a component. The `_type` strings are the entire contract between the two repos. No content migration; either repo may deploy first, because `@portabletext/react` renders unknown types as `display:none`.

**Tech Stack:** Sanity Studio v4 (`sanity ^4.10.2`), `@sanity/table@2.0.1`, React 19, TypeScript 5.8 (strict), Vite 6, `@portabletext/react@3.2.4`, `@sanity/image-url@^2.1.1`, `react-i18next`.

**Spec:** `docs/superpowers/specs/2026-08-16-rich-text-post-blocks-design.md`

## Repos

Two working directories. Every path in this plan is relative to one of them, and each task states which.

- **STUDIO** = `E:\repo\lulo-fundacion-animal\lulo-sanity-crm`
- **WEB** = `E:\repo\lulo-fundacion-animal\lulo-web`

## Global Constraints

- `_type` names are the cross-repo contract and must match exactly: `inlineImage`, `imageGallery`, `pullQuote`, `statCallout`, `table`.
- Pin `@sanity/table` to exactly `2.0.1` — no caret. Its peer deps are `sanity: ^3.0.0 || ^4.0.0 || ^5.0.0`, `react: ^18 || ^19`. Release `3.x` requires Sanity 5/6 and React `^19.2` and must not be used.
- `@sanity/image-url` is upgraded to `^2.1.1` in the **repo-root** `WEB/package.json`. `WEB/client/package.json` is not modified. Use the named export `createImageUrlBuilder`; the default export is deprecated in v2.
- `WEB/client/tsconfig.app.json` is strict in ways that shape the code. All of these are on:
  - `strict` — no implicit `any`.
  - `noUnusedLocals` **and** `noUnusedParameters` — an unused function parameter is a build error, not just a lint warning.
  - `verbatimModuleSyntax` — type-only imports **must** use `import type`, in a separate statement from value imports. Mixing them in one `import {}` fails the build.
  - `erasableSyntaxOnly` — no `enum`, no parameter properties, no `namespace`.
  - `moduleResolution: "bundler"` — this is why `@sanity/image-url@1.1.0` fails: with no `exports` and no `types` field, TypeScript finds no declarations at all.
  - `jsx: "react-jsx"` — a `React` import is not required for JSX. Import `React` only where `React.FC` is actually used, matching the existing components.
- Only the **base language (`en`)** is ever validation-required, so posts can be drafted in English and translated later without blocking publication.
- Existing `localeRichText` content must remain valid. When declaring `styles` on the block type, `normal`, `h1`, `h2`, `h3` **and `h4`** must all be listed — declaring `styles` replaces the default set. `h4` is not optional: a production GROQ query confirmed the published post "Veterinary Brigade in Usaquén: 23 Lives Filled with Love and Care" uses `h4` three times in **both** language arrays. Omitting it would make those headings unrepresentable in the editor.
- Decorators (marks) stay at the Sanity default (`strong`, `em`, `code`, `underline`, `strike-through`). Do not restrict them; that would make existing marks unremovable in the editor.
- Studio Prettier config: no semicolons, single quotes, no bracket spacing, print width 100. WEB uses semicolons and double quotes. Match the repo you are editing.
- Do not commit the unrelated pending changes already in the STUDIO working tree (the Sanity 3→4 bump in `package.json`/`package-lock.json`, and the deleted `CONTRIBUTOR_GUIDE.md` / `TECHNICAL_GUIDE.md`). Always `git add` explicit paths.
- Commit messages: the Bash tool is Git Bash. Use a heredoc (`git commit -F - <<'EOF'`), **not** PowerShell here-string syntax (`@'...'@`), which silently injects a literal `@` into the subject line.

## Verification approach — read this before Task 1

Neither repo has a test framework, and per the approved spec this work does not introduce one. There is no `vitest`, no `jest`, no test script. **Do not write test files — they cannot run.**

Each task's verification is therefore:

1. A **typecheck** and **lint** command that must exit 0.
2. An explicit **manual check** with a stated expected observation.

Where a step says "Expected:", that is the pass condition. If it does not hold, stop and report rather than proceeding.

The two verification command sets, used throughout:

**STUDIO:**
```bash
cd /e/repo/lulo-fundacion-animal/lulo-sanity-crm && npx tsc --noEmit && npx eslint schemaTypes sanity.config.ts sanity.cli.ts
```

Both are clean at baseline, so **exit 0 is the correct gate here** — unlike WEB.

Two practical notes. `eslint.config.mjs` is `[...studio]` with **no `ignores`**, so a bare
`npx eslint .` also walks the 680K bundled `dist/` output; always pass the source paths as
above. And this command is slow — allow up to **4 minutes** and do not treat a long run as a
hang.

**WEB:**
```bash
cd /e/repo/lulo-fundacion-animal/lulo-web/client && npx tsc -b; npx eslint .
```

### The WEB lint baseline is not zero

`npx eslint .` in WEB **already fails** before this work starts, with 5 pre-existing errors:

| File | Rule |
|---|---|
| `src/components/common/RichText.tsx:7` | `no-explicit-any` |
| `src/hooks/usePostsWithSearch.ts:17` | `no-explicit-any` |
| `src/hooks/useUpcomingEvents.ts:171` | `no-unused-vars` (`eventDate`) |
| `src/services/news.ts:9` | `no-explicit-any` |
| `src/services/newsletter.ts:122` | `no-unused-vars` (`error`) |

So the pass condition for WEB is **never "exit 0"** — it is **"no error outside this table"**. Task 3
deletes `RichText.tsx`, so from Task 3 onward the expected count drops to **4**. Fixing the other
four is out of scope; do not touch those files.

`tsc -b` **must** exit 0 — that one has no baseline of failures. The commands are separated by `;`
rather than `&&` so lint still runs when you want to see both results.

---

## Task 1: Studio block object types

**Repo:** STUDIO

**Files:**
- Create: `schemaTypes/blocks/inlineImage.ts`
- Create: `schemaTypes/blocks/imageGallery.ts`
- Create: `schemaTypes/blocks/pullQuote.ts`
- Create: `schemaTypes/blocks/statCallout.ts`
- Modify: `schemaTypes/index.ts`

**Interfaces:**
- Consumes: `localeString` and `localeText` types from `schemaTypes/localeStringType.ts` (already registered).
- Produces: four registered object types named `inlineImage`, `imageGallery`, `pullQuote`, `statCallout`. Task 2 references these by name in `localeRichText`. Their stored field shapes are consumed by Tasks 4 and 5 in WEB.

Stored shapes produced by this task (Tasks 4–5 depend on these exactly):

```jsonc
{"_type":"inlineImage","image":{"asset":{"_ref":"image-..."}},
 "alt":{"en":"...","es":"..."},"caption":{"en":"...","es":"..."},"size":"wide"}

{"_type":"imageGallery","images":[
 {"_key":"...","asset":{"_ref":"image-..."},"alt":{"en":"..."},"caption":{"en":"..."}}]}

{"_type":"pullQuote","quote":{"en":"...","es":"..."},"attribution":"Name"}

{"_type":"statCallout","value":"450","label":{"en":"...","es":"..."},"tone":"info"}
```

- [ ] **Step 1: Create `schemaTypes/blocks/inlineImage.ts`**

```ts
import {defineField, defineType} from 'sanity'

export const inlineImage = defineType({
  name: 'inlineImage',
  title: 'Image',
  type: 'object',
  fields: [
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      options: {hotspot: true},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'alt',
      title: 'Alternative text',
      type: 'localeString',
      description: 'Describes the image for screen readers and search engines. English is required.',
      validation: (rule) =>
        rule.custom((value?: {en?: string}) =>
          value?.en?.trim() ? true : 'English alternative text is required',
        ),
    }),
    defineField({
      name: 'caption',
      title: 'Caption',
      type: 'localeString',
      description: 'Optional. Shown beneath the image.',
    }),
    defineField({
      name: 'size',
      title: 'Size',
      type: 'string',
      options: {
        list: [
          {title: 'Inline (text width)', value: 'inline'},
          {title: 'Wide', value: 'wide'},
          {title: 'Full width', value: 'full'},
        ],
      },
      initialValue: 'wide',
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {media: 'image', caption: 'caption.en', alt: 'alt.en', size: 'size'},
    prepare({media, caption, alt, size}) {
      return {
        title: caption || alt || 'Image',
        subtitle: `Image • ${size || 'wide'}`,
        media,
      }
    },
  },
})
```

- [ ] **Step 2: Create `schemaTypes/blocks/imageGallery.ts`**

```ts
import {defineArrayMember, defineField, defineType} from 'sanity'

export const imageGallery = defineType({
  name: 'imageGallery',
  title: 'Image gallery',
  type: 'object',
  fields: [
    defineField({
      name: 'images',
      title: 'Images',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'image',
          options: {hotspot: true},
          fields: [
            {
              name: 'alt',
              title: 'Alternative text',
              type: 'localeString',
            },
            {
              name: 'caption',
              title: 'Caption',
              type: 'localeString',
            },
          ],
        }),
      ],
      validation: (rule) =>
        rule.required().min(2).max(6).error('A gallery holds between 2 and 6 images'),
    }),
  ],
  preview: {
    select: {images: 'images', media: 'images.0'},
    prepare({images, media}) {
      const count = Array.isArray(images) ? images.length : 0
      return {
        title: `Gallery (${count} image${count === 1 ? '' : 's'})`,
        subtitle: 'Image gallery',
        media,
      }
    },
  },
})
```

- [ ] **Step 3: Create `schemaTypes/blocks/pullQuote.ts`**

```ts
import {defineField, defineType} from 'sanity'

export const pullQuote = defineType({
  name: 'pullQuote',
  title: 'Pull quote',
  type: 'object',
  fields: [
    defineField({
      name: 'quote',
      title: 'Quote',
      type: 'localeText',
      validation: (rule) =>
        rule.custom((value?: {en?: string}) =>
          value?.en?.trim() ? true : 'English quote text is required',
        ),
    }),
    defineField({
      name: 'attribution',
      title: 'Attribution',
      type: 'string',
      description: 'Who said it. Personal names are not translated, so this is a single value.',
    }),
  ],
  preview: {
    select: {quote: 'quote.en', attribution: 'attribution'},
    prepare({quote, attribution}) {
      const text = (quote || '').replace(/\s+/g, ' ').trim()
      const clipped = text.length > 60 ? `${text.slice(0, 60)}…` : text
      return {
        title: clipped ? `“${clipped}”` : 'Pull quote',
        subtitle: attribution || 'Pull quote',
      }
    },
  },
})
```

- [ ] **Step 4: Create `schemaTypes/blocks/statCallout.ts`**

```ts
import {defineField, defineType} from 'sanity'

export const statCallout = defineType({
  name: 'statCallout',
  title: 'Stat callout',
  type: 'object',
  fields: [
    defineField({
      name: 'value',
      title: 'Value',
      type: 'string',
      description: 'The headline figure, for example "450" or "23".',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'label',
      title: 'Label',
      type: 'localeString',
      description: 'What the figure counts, for example "hearts reached". English is required.',
      validation: (rule) =>
        rule.custom((value?: {en?: string}) =>
          value?.en?.trim() ? true : 'English label is required',
        ),
    }),
    defineField({
      name: 'tone',
      title: 'Tone',
      type: 'string',
      options: {
        list: [
          {title: 'Info', value: 'info'},
          {title: 'Success', value: 'success'},
          {title: 'Warning', value: 'warning'},
        ],
      },
      initialValue: 'info',
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {value: 'value', label: 'label.en', tone: 'tone'},
    prepare({value, label, tone}) {
      return {
        title: `${value || '—'} ${label || ''}`.trim(),
        subtitle: `Stat callout • ${tone || 'info'}`,
      }
    },
  },
})
```

- [ ] **Step 5: Register the four types in `schemaTypes/index.ts`**

Replace the whole file with:

```ts
import {localeString, localeText, localeRichText} from './localeStringType'
import {postType} from './postType'
import {eventType} from './eventType'
import {pageMetrics} from './pageMetrics'
import featureFlags from './featureFlags'
import {inlineImage} from './blocks/inlineImage'
import {imageGallery} from './blocks/imageGallery'
import {pullQuote} from './blocks/pullQuote'
import {statCallout} from './blocks/statCallout'

export const schemaTypes = [
  postType,
  eventType,
  localeString,
  localeText,
  localeRichText,
  pageMetrics,
  featureFlags,
  inlineImage,
  imageGallery,
  pullQuote,
  statCallout,
]
```

- [ ] **Step 6: Typecheck and lint**

```bash
cd /e/repo/lulo-fundacion-animal/lulo-sanity-crm && npx tsc --noEmit && npx eslint schemaTypes sanity.config.ts sanity.cli.ts
```

Expected: both exit 0, no output from `tsc`. Allow up to 4 minutes — the lint step is slow.

- [ ] **Step 7: Verify the Studio boots with no schema errors**

```bash
cd /e/repo/lulo-fundacion-animal/lulo-sanity-crm && npm run dev
```

Open `http://localhost:3333`. Expected: the Studio loads to the Content pane with **no red schema-error banner**. The four new types are registered but not yet insertable anywhere — that is correct at this stage. Stop the dev server afterwards.

- [ ] **Step 8: Commit**

```bash
cd /e/repo/lulo-fundacion-animal/lulo-sanity-crm && git add schemaTypes/blocks schemaTypes/index.ts && git commit -F - <<'EOF'
Add rich content block object types

Adds inlineImage, imageGallery, pullQuote and statCallout object types
with bilingual caption/label fields. Registered but not yet insertable;
wiring into localeRichText follows.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

## Task 2: Studio — table plugin and wiring into `localeRichText`

**Repo:** STUDIO

**Files:**
- Modify: `package.json` (dependencies only)
- Modify: `sanity.config.ts:13`
- Modify: `schemaTypes/localeStringType.ts:29-47`

**Interfaces:**
- Consumes: the four object type names registered in Task 1.
- Produces: `post.body` accepts all five block types in both languages. WEB Tasks 4–5 render them. The `table` plugin contributes types `table` and `tableRow` with stored shape `{"_type":"table","rows":[{"_type":"tableRow","_key":"...","cells":["a","b"]}]}`.

- [ ] **Step 1: Install the pinned table plugin**

```bash
cd /e/repo/lulo-fundacion-animal/lulo-sanity-crm && npm install --save-exact @sanity/table@2.0.1
```

Expected: installs without a peer-dependency error. Confirm `package.json` now shows `"@sanity/table": "2.0.1"` with **no caret**.

- [ ] **Step 2: Register the plugin in `sanity.config.ts`**

Add the import after the `visionTool` import:

```ts
import {table} from '@sanity/table'
```

Change line 13 from:

```ts
  plugins: [structureTool(), visionTool()],
```

to:

```ts
  plugins: [structureTool(), visionTool(), table()],
```

- [ ] **Step 3: Widen `localeRichText` in `schemaTypes/localeStringType.ts`**

Replace the `localeRichText` export (lines 29–47) with:

```ts
const richTextMembers = () => [
  {
    type: 'block',
    styles: [
      {title: 'Normal', value: 'normal'},
      {title: 'H1', value: 'h1'},
      {title: 'H2', value: 'h2'},
      {title: 'H3', value: 'h3'},
      {title: 'H4', value: 'h4'},
      {title: 'Quote', value: 'blockquote'},
    ],
  },
  {type: 'inlineImage'},
  {type: 'imageGallery'},
  {type: 'pullQuote'},
  {type: 'statCallout'},
  {type: 'table'},
]

export const localeRichText = defineType({
  title: 'Localized rich text',
  name: 'localeRichText',
  type: 'object',
  fieldsets: [
    {
      title: 'Translations',
      name: 'translations',
      options: {collapsible: true},
    },
  ],
  fields: supportedLanguages.map((lang) => ({
    title: lang.title,
    name: lang.id,
    type: 'array',
    of: richTextMembers(),
    fieldset: lang.isDefault ? undefined : 'translations',
  })),
})
```

`richTextMembers` is a **function**, called once per language, so the two language fields never share one array instance. Sharing a schema definition object across fields risks Sanity annotating it twice.

Note the `styles` list deliberately repeats `normal`, `h1`, `h2`, `h3` and `h4`: declaring `styles` replaces Sanity's defaults, so omitting them would strip formatting already used in existing posts. `h4` is included on evidence, not caution — a production query found one published post using it three times per language.

`h5` and `h6` are deliberately omitted: the same query confirmed no content uses them.

- [ ] **Step 4: Typecheck and lint**

```bash
cd /e/repo/lulo-fundacion-animal/lulo-sanity-crm && npx tsc --noEmit && npx eslint schemaTypes sanity.config.ts sanity.cli.ts
```

Expected: both exit 0. Allow up to 4 minutes — the lint step is slow.

- [ ] **Step 5: Verify all five block types are insertable**

```bash
cd /e/repo/lulo-fundacion-animal/lulo-sanity-crm && npm run dev
```

In the Studio, open Post → any existing draft → Body → English. Click the "Add item" / insert menu on the array.

Expected, all five present: **Image**, **Image gallery**, **Pull quote**, **Stat callout**, **Table**. Insert one of each and confirm:
- Each shows a meaningful preview row in the array, not "Untitled".
- The block style dropdown offers Normal, H1, H2, H3 and Quote.
- The Table block renders a grid with add-row / add-column buttons.
- Existing paragraphs in the post are unchanged and still editable.

Then **discard the draft changes** — do not publish this scratch content. Stop the dev server.

- [ ] **Step 6: Commit**

```bash
cd /e/repo/lulo-fundacion-animal/lulo-sanity-crm && git add package.json package-lock.json sanity.config.ts schemaTypes/localeStringType.ts && git commit -F - <<'EOF'
Allow rich blocks and tables in post bodies

Pins @sanity/table at 2.0.1 (the 3.x line requires Sanity 5/6) and
widens localeRichText to accept inlineImage, imageGallery, pullQuote,
statCallout and table, plus a blockquote block style.

Existing content stays valid: the styles list repeats the defaults that
were previously implicit.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

**Careful:** `package-lock.json` already has unrelated pending changes from the Sanity 3→4 bump. If `git diff --cached package-lock.json` shows unrelated churn beyond the `@sanity/table` addition, that is expected and acceptable — but do **not** `git add package.json` with `git add -A`; the explicit paths above are required so the deleted guide files stay uncommitted.

---

## Task 3: Web — restructure `RichText` with zero visual change

**Repo:** WEB

This task is a pure refactor. Existing posts must render **byte-identically**. No new block types are handled yet. That is what makes it a clean review gate.

**Files:**
- Modify: `package.json` (root — `@sanity/image-url` version only)
- Create: `client/src/components/common/richtext/pick.ts`
- Create: `client/src/components/common/richtext/imageUrl.ts`
- Create: `client/src/components/common/richtext/components.tsx`
- Create: `client/src/components/common/richtext/RichText.tsx`
- Delete: `client/src/components/common/RichText.tsx`
- Modify: `client/src/components/common/PostDetail.tsx:3`
- Modify: `client/src/styles/richtext.css`

**Interfaces:**
- Consumes: nothing from earlier tasks (STUDIO tasks are independent).
- Produces:
  - `pick(field: LocaleField, lang: string): string` and `type LocaleField = {en?: string; es?: string} | undefined` — used by Tasks 4 and 5.
  - `urlFor(source: SanityImageSource): ImageUrlBuilder` — used by Tasks 4 and 5.
  - `buildComponents(lang: string): PortableTextComponents` — Tasks 4 and 5 add entries to its `types` map.
  - `RichText` default export, now emitting a root `.rt` class.

- [ ] **Step 1: Upgrade `@sanity/image-url` in the root `package.json`**

```bash
cd /e/repo/lulo-fundacion-animal/lulo-web && npm install --save @sanity/image-url@^2.1.1
```

Expected: `WEB/package.json` dependencies show `"@sanity/image-url": "^2.1.1"`.

Why: `1.1.0` declares `main: lib/node/index.js` with no `types` field and puts its `.d.ts` files in `lib/types/`, so TypeScript resolves no declarations and `strict` mode fails with `TS7016`. `2.1.1` declares `types: ./lib/index.d.ts`, has no peer dependencies, and needs Node `>=20.19.0` (local Node is v21.5.0). The package is currently unused in `src/`, so this upgrade cannot regress anything.

`client/package.json` is **not** modified — `@sanity/image-url` resolves upward from the root `node_modules`, exactly as `@sanity/client` and `@portabletext/react` already do.

- [ ] **Step 2: Create `client/src/components/common/richtext/pick.ts`**

```ts
export type LocaleField = { en?: string; es?: string } | undefined;

/**
 * Resolves a localeString / localeText object to a plain string.
 * Falls back to the other language rather than rendering nothing, so a
 * half-translated post still shows text.
 */
export function pick(field: LocaleField, lang: string): string {
  if (!field) return "";
  // The browser language detector can yield regional codes such as "es-CO".
  const base = lang.split("-")[0];
  if (base === "es") return field.es ?? field.en ?? "";
  return field.en ?? field.es ?? "";
}
```

- [ ] **Step 3: Create `client/src/components/common/richtext/imageUrl.ts`**

```ts
import { createImageUrlBuilder } from "@sanity/image-url";
import type { SanityImageSource } from "@sanity/image-url";
import { client } from "../../../sanity/client";

const builder = createImageUrlBuilder(client);

export function urlFor(source: SanityImageSource) {
  return builder.image(source);
}
```

Two notes on this file:

- `createImageUrlBuilder` is the **named** export. v2 still has a default export but marks it `@deprecated`.
- `createImageUrlBuilder` accepts `SanityClientLike | SanityProjectDetails | SanityModernClientLike`. If `@sanity/client` v7's client does not structurally satisfy any of those and `tsc` complains, do **not** cast to `any` — pass the project details explicitly instead, which is fully typed:

  ```ts
  const builder = createImageUrlBuilder({
    projectId: client.config().projectId!,
    dataset: client.config().dataset!,
  });
  ```

- [ ] **Step 4: Create `client/src/components/common/richtext/components.tsx`**

This carries over every handler from the old file unchanged, and adds only the `blockquote` style plus the three previously unhandled decorators. `lang` is a parameter because `@portabletext/react` gives type components a fixed prop shape — passing the language as a closure is how block components receive it.

```tsx
import type { ReactNode } from "react";
import type { PortableTextComponents } from "@portabletext/react";

export function buildComponents(lang: string): PortableTextComponents {
  // `lang` is unused until block types are added in Task 4. tsconfig.app.json sets
  // noUnusedParameters, so an untouched parameter is a build error — this discards
  // it without disabling the rule. Removed in Task 4 when lang is genuinely used.
  void lang;

  return {
    block: {
      h1: ({ children }: { children: ReactNode }) => <h1 className="rt-h1">{children}</h1>,
      h2: ({ children }: { children: ReactNode }) => <h2 className="rt-h2">{children}</h2>,
      h3: ({ children }: { children: ReactNode }) => <h3 className="rt-h3">{children}</h3>,
      h4: ({ children }: { children: ReactNode }) => <h4 className="rt-h4">{children}</h4>,
      normal: ({ children }: { children: ReactNode }) => <p className="rt-p">{children}</p>,
      blockquote: ({ children }: { children: ReactNode }) => (
        <blockquote className="rt-blockquote">{children}</blockquote>
      ),
    },
    marks: {
      strong: ({ children }: { children: ReactNode }) => (
        <strong className="rt-strong">{children}</strong>
      ),
      em: ({ children }: { children: ReactNode }) => <em className="rt-em">{children}</em>,
      code: ({ children }: { children: ReactNode }) => <code className="rt-code">{children}</code>,
      underline: ({ children }: { children: ReactNode }) => (
        <span className="rt-underline">{children}</span>
      ),
      "strike-through": ({ children }: { children: ReactNode }) => (
        <span className="rt-strike">{children}</span>
      ),
      link: ({ value, children }: { value?: { href?: string }; children: ReactNode }) => {
        const href = value?.href || "#";
        const rel = href.startsWith("/") ? undefined : "noopener noreferrer";
        const target = href.startsWith("/") ? undefined : "_blank";
        return (
          <a href={href} target={target} rel={rel} className="rt-link">
            {children}
          </a>
        );
      },
    },
    list: {
      bullet: ({ children }: { children: ReactNode }) => <ul className="rt-ul">{children}</ul>,
      number: ({ children }: { children: ReactNode }) => <ol className="rt-ol">{children}</ol>,
    },
    listItem: {
      bullet: ({ children }: { children: ReactNode }) => <li className="rt-li">{children}</li>,
      number: ({ children }: { children: ReactNode }) => <li className="rt-li">{children}</li>,
    },
  };
}
```

- [ ] **Step 5: Create `client/src/components/common/richtext/RichText.tsx`**

```tsx
import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { PortableText } from "@portabletext/react";
import type { ArbitraryTypedObject, PortableTextBlock } from "@portabletext/types";
import { buildComponents } from "./components";

interface RichTextProps {
  value: (PortableTextBlock | ArbitraryTypedObject)[];
  className?: string;
}

const RichText: React.FC<RichTextProps> = ({ value, className }) => {
  const { i18n } = useTranslation();
  const lang = i18n.language || "en";
  const components = useMemo(() => buildComponents(lang), [lang]);

  if (!value || !Array.isArray(value) || value.length === 0) return null;

  return (
    <div className={className ? `rt ${className}` : "rt"}>
      <PortableText value={value} components={components} />
    </div>
  );
};

export default RichText;
```

`useMemo` sits above the early return so hook order stays stable across renders.

The prop type is **not** carried over from the old file. The old `value: any[]` is one of the
five baseline lint errors, and reproducing it would keep the count at 5 instead of dropping it
to 4. `(PortableTextBlock | ArbitraryTypedObject)[]` is exactly `PortableTextProps`' own default
generic, so it accepts both standard text blocks and the custom block types added later.
`ArbitraryTypedObject` is what makes `inlineImage`, `table` and friends type-legal.

`@portabletext/types@2.0.15` resolves from the repo root alongside `@portabletext/react` and
declares a proper `types` entry point, so no dependency change is needed. The caller passes
`post.bodyBlocks`, typed `any[]` in `services/news.ts`, which remains assignable.

- [ ] **Step 6: Point `PostDetail` at the new location**

In `client/src/components/common/PostDetail.tsx`, change line 3 from:

```tsx
import RichText from "./RichText";
```

to:

```tsx
import RichText from "./richtext/RichText";
```

Leave lines 4–5 (the two CSS imports) exactly as they are — their **order matters**, see Step 8.

- [ ] **Step 7: Delete the old component**

```bash
cd /e/repo/lulo-fundacion-animal/lulo-web/client && rm src/components/common/RichText.tsx
```

There is exactly one consumer, so no re-export shim is needed.

- [ ] **Step 8: Rescope `client/src/styles/richtext.css` to `.rt`**

Replace the whole file with:

```css
/* Rich text (Portable Text) rendering.
   Scoped to .rt, which the RichText component always emits, so these styles
   work wherever RichText is used rather than only inside post detail. */
.rt {
  line-height: 1.55;
  font-size: 0.95rem;
}

.rt .rt-h1 { font-size: 2rem; margin: 1.5rem 0 1rem; line-height: 1.2; }
.rt .rt-h2 { font-size: 1.6rem; margin: 1.4rem 0 .85rem; line-height: 1.3; }
.rt .rt-h3 { font-size: 1.3rem; margin: 1.2rem 0 .7rem; line-height: 1.3; }
.rt .rt-h4 { font-size: 1.1rem; margin: 1.1rem 0 .6rem; line-height: 1.35; }
.rt .rt-p { margin: 0 0 1rem; }
.rt .rt-ul, .rt .rt-ol { margin: 0 0 1rem 1.25rem; padding: 0; }
.rt .rt-li { margin: .35rem 0; }
.rt .rt-strong { font-weight: 600; }
.rt .rt-em { font-style: italic; }
.rt .rt-link { color: var(--color-primary); text-decoration: underline; }
.rt .rt-underline { text-decoration: underline; }
.rt .rt-strike { text-decoration: line-through; }

.rt .rt-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.875em;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 0.1em 0.35em;
}

.rt .rt-blockquote {
  margin: var(--space-6) 0;
  padding: var(--space-2) 0 var(--space-2) var(--space-5);
  border-left: 3px solid var(--color-border);
  color: var(--color-text-secondary);
  font-style: italic;
}
```

The old file scoped everything under `.post-detail__content-text`, which meant `RichText` only styled correctly on the post detail page. `RichText` now emits `.rt` alongside the caller's `className`, so both classes land on the same element.

**Font-size check.** `.post-detail__content-text` is *also* defined in `PostDetail.css:76` with `font-size: var(--text-base)` (`1rem`). Both selectors are specificity `(0,1,0)`, so import order decides — and `PostDetail.tsx` imports `PostDetail.css` first, `richtext.css` second, so `.rt`'s `0.95rem` wins. That is what renders today, so nothing changes. Step 10 verifies this rather than trusting it.

- [ ] **Step 9: Typecheck and lint**

```bash
cd /e/repo/lulo-fundacion-animal/lulo-web/client && npx tsc -b; npx eslint .
```

Expected: `tsc -b` exits 0. `eslint` reports **exactly 4 errors** — the baseline table minus
`RichText.tsx`, which this task deleted. If it still reports 5, check whether the new
`RichText.tsx` reintroduced `any`.

If `tsc` reports `TS7016` on `@sanity/image-url`, Step 1 did not take effect — re-run it before
continuing.

- [ ] **Step 10: Verify an existing post is visually unchanged**

```bash
cd /e/repo/lulo-fundacion-animal/lulo-web/client && npm run dev
```

Open any existing published post detail page.

Expected:
- Headings, paragraphs, lists, bold, italic and links render exactly as before.
- Devtools → inspect the rich text wrapper `div`: it carries **both** `rt` and `post-detail__content-text`, and computed `font-size` is **`15.2px`** (`0.95rem`). If it computes to `16px`, the CSS import order regressed — stop and report.
- Browser console shows no new errors or warnings.
- Switching language still swaps the post body.

Stop the dev server.

- [ ] **Step 11: Commit**

```bash
cd /e/repo/lulo-fundacion-animal/lulo-web && git add package.json package-lock.json client/src/components/common/richtext client/src/components/common/RichText.tsx client/src/components/common/PostDetail.tsx client/src/styles/richtext.css && git commit -F - <<'EOF'
Restructure RichText into a folder, no visual change

Splits the single RichText component into richtext/ with a locale
resolver, an image URL builder and a components factory, in preparation
for custom Portable Text block types.

Rescopes richtext.css from .post-detail__content-text to .rt so the
component styles correctly wherever it is used. Adds blockquote and the
three previously unrendered decorators. Upgrades @sanity/image-url to
2.1.1, which ships resolvable type declarations.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

## Task 4: Web — inline image and gallery blocks

**Repo:** WEB

**Files:**
- Create: `client/src/components/common/richtext/blocks/InlineImage.tsx`
- Create: `client/src/components/common/richtext/blocks/ImageGallery.tsx`
- Modify: `client/src/components/common/richtext/components.tsx`
- Modify: `client/src/styles/richtext.css` (append)

**Interfaces:**
- Consumes: `pick` / `LocaleField` from `../pick`; `urlFor` from `../imageUrl`; `buildComponents(lang)` from `../components` (all from Task 3). Stored shapes for `inlineImage` and `imageGallery` from Task 1.
- Produces: `types.inlineImage` and `types.imageGallery` entries in the components map. Task 5 adds three more entries to the same map.

- [ ] **Step 1: Create `client/src/components/common/richtext/blocks/InlineImage.tsx`**

```tsx
import React from "react";
import type { LocaleField } from "../pick";
import { pick } from "../pick";
import { urlFor } from "../imageUrl";

export interface InlineImageValue {
  image?: { asset?: { _ref?: string } };
  alt?: LocaleField;
  caption?: LocaleField;
  size?: "inline" | "wide" | "full";
}

interface Props {
  value: InlineImageValue;
  lang: string;
}

const InlineImage: React.FC<Props> = ({ value, lang }) => {
  if (!value?.image?.asset?._ref) return null;

  const alt = pick(value.alt, lang);
  const caption = pick(value.caption, lang);
  const size = value.size ?? "wide";
  const src = urlFor(value.image).width(1200).fit("max").auto("format").url();

  return (
    <figure className={`rt-figure rt-figure--${size}`}>
      <img src={src} alt={alt} loading="lazy" className="rt-figure__img" />
      {caption && <figcaption className="rt-figcaption">{caption}</figcaption>}
    </figure>
  );
};

export default InlineImage;
```

The `asset._ref` guard matters: GROQ projects `body` raw, so the asset arrives as an unresolved reference. A block saved without an image would otherwise throw inside `urlFor`.

- [ ] **Step 2: Create `client/src/components/common/richtext/blocks/ImageGallery.tsx`**

```tsx
import React from "react";
import type { LocaleField } from "../pick";
import { pick } from "../pick";
import { urlFor } from "../imageUrl";

export interface GalleryItem {
  _key?: string;
  asset?: { _ref?: string };
  alt?: LocaleField;
  caption?: LocaleField;
}

export interface ImageGalleryValue {
  images?: GalleryItem[];
}

interface Props {
  value: ImageGalleryValue;
  lang: string;
}

const ImageGallery: React.FC<Props> = ({ value, lang }) => {
  const images = (value?.images ?? []).filter((item) => item?.asset?._ref);
  if (images.length === 0) return null;

  return (
    <div className="rt-gallery">
      {images.map((item, index) => {
        const alt = pick(item.alt, lang);
        const caption = pick(item.caption, lang);
        const src = urlFor(item).width(800).fit("max").auto("format").url();
        return (
          <figure className="rt-gallery__item" key={item._key ?? index}>
            <img src={src} alt={alt} loading="lazy" className="rt-gallery__img" />
            {caption && <figcaption className="rt-figcaption">{caption}</figcaption>}
          </figure>
        );
      })}
    </div>
  );
};

export default ImageGallery;
```

Gallery items are `type: 'image'` with extra fields, so `asset`, `alt` and `caption` sit at the item's top level — `urlFor(item)` is correct, not `urlFor(item.image)`.

- [ ] **Step 3: Wire both into `components.tsx`**

Add the imports at the top, below the existing ones:

```tsx
import InlineImage from "./blocks/InlineImage";
import ImageGallery from "./blocks/ImageGallery";
import type { InlineImageValue } from "./blocks/InlineImage";
import type { ImageGalleryValue } from "./blocks/ImageGallery";
```

Remove the `void lang;` line and its two comment lines added in Task 3 — `lang` is genuinely used now.

Add a `types` key to the returned object, as a sibling of `block`, `marks`, `list` and `listItem`:

```tsx
    types: {
      inlineImage: ({ value }: { value: InlineImageValue }) => (
        <InlineImage value={value} lang={lang} />
      ),
      imageGallery: ({ value }: { value: ImageGalleryValue }) => (
        <ImageGallery value={value} lang={lang} />
      ),
    },
```

- [ ] **Step 4: Append image styles to `client/src/styles/richtext.css`**

```css
/* --- Inline image --- */
.rt .rt-figure { margin: var(--space-8) 0; }
.rt .rt-figure--inline { max-width: 100%; }
.rt .rt-figure--wide { max-width: 100%; }
.rt .rt-figure--full { max-width: 100%; }

.rt .rt-figure__img {
  display: block;
  width: 100%;
  height: auto;
  border-radius: var(--radius-lg);
}

.rt .rt-figcaption {
  margin-top: var(--space-2);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  text-align: center;
}

/* --- Image gallery --- */
.rt .rt-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--space-4);
  margin: var(--space-8) 0;
}

.rt .rt-gallery__item { margin: 0; }

.rt .rt-gallery__img {
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  border-radius: var(--radius-md);
}

@media (min-width: 768px) {
  .rt .rt-figure--wide { max-width: 120%; margin-left: -10%; margin-right: -10%; }
  .rt .rt-figure--full { max-width: 140%; margin-left: -20%; margin-right: -20%; }
}
```

The `--wide` and `--full` breakouts only apply from 768px up; below that all three sizes are full-bleed within the text column, which is the only sensible mobile behaviour.

- [ ] **Step 5: Typecheck and lint**

```bash
cd /e/repo/lulo-fundacion-animal/lulo-web/client && npx tsc -b; npx eslint .
```

Expected: `tsc -b` exits 0, and `eslint` still reports **exactly the same 4 baseline errors** — no
new file appears in its output.

- [ ] **Step 6: Verify rendering**

Requires Task 2 to be done and a scratch post containing an image and a gallery to be **published** in the Studio (drafts are not served to the site).

```bash
cd /e/repo/lulo-fundacion-animal/lulo-web/client && npm run dev
```

Expected on the scratch post:
- The inline image renders with its caption beneath, centred and smaller than body text.
- All three `size` values render without horizontal page overflow at 1280px and at 375px.
- The gallery renders as a grid, reflowing to fewer columns as the window narrows.
- Devtools → Network: image requests carry `?w=1200&fit=max&auto=format` (or `w=800` for gallery items) — confirming `urlFor` built the URL rather than a raw asset CDN path.
- Switching language changes the captions.

- [ ] **Step 7: Commit**

```bash
cd /e/repo/lulo-fundacion-animal/lulo-web && git add client/src/components/common/richtext client/src/styles/richtext.css && git commit -F - <<'EOF'
Render inline image and gallery blocks

Adds InlineImage and ImageGallery Portable Text components with
bilingual alt text and captions, responsive sizing and lazy loading.
Image URLs are built through @sanity/image-url so the raw asset
reference from GROQ needs no dereferencing.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

## Task 5: Web — pull quote, stat callout and table blocks

**Repo:** WEB

**Files:**
- Create: `client/src/components/common/richtext/blocks/PullQuote.tsx`
- Create: `client/src/components/common/richtext/blocks/StatCallout.tsx`
- Create: `client/src/components/common/richtext/blocks/TableBlock.tsx`
- Modify: `client/src/components/common/richtext/components.tsx`
- Modify: `client/src/styles/richtext.css` (append)

**Interfaces:**
- Consumes: `pick` / `LocaleField` from `../pick` (Task 3); the components map from Task 4. Stored shapes for `pullQuote` and `statCallout` from Task 1, and for `table` from Task 2.
- Produces: `types.pullQuote`, `types.statCallout` and `types.table` entries, completing the map.

- [ ] **Step 1: Create `client/src/components/common/richtext/blocks/PullQuote.tsx`**

```tsx
import React from "react";
import type { LocaleField } from "../pick";
import { pick } from "../pick";

export interface PullQuoteValue {
  quote?: LocaleField;
  attribution?: string;
}

interface Props {
  value: PullQuoteValue;
  lang: string;
}

const PullQuote: React.FC<Props> = ({ value, lang }) => {
  const quote = pick(value?.quote, lang);
  if (!quote) return null;

  return (
    <figure className="rt-quote">
      <blockquote className="rt-quote__text">{quote}</blockquote>
      {value.attribution && (
        <figcaption className="rt-quote__attr">{value.attribution}</figcaption>
      )}
    </figure>
  );
};

export default PullQuote;
```

- [ ] **Step 2: Create `client/src/components/common/richtext/blocks/StatCallout.tsx`**

```tsx
import React from "react";
import type { LocaleField } from "../pick";
import { pick } from "../pick";

export interface StatCalloutValue {
  value?: string;
  label?: LocaleField;
  tone?: "info" | "success" | "warning";
}

interface Props {
  value: StatCalloutValue;
  lang: string;
}

const StatCallout: React.FC<Props> = ({ value, lang }) => {
  const label = pick(value?.label, lang);
  if (!value?.value && !label) return null;

  const tone = value?.tone ?? "info";

  return (
    <div className={`rt-stat rt-stat--${tone}`}>
      <span className="rt-stat__value">{value?.value}</span>
      <span className="rt-stat__label">{label}</span>
    </div>
  );
};

export default StatCallout;
```

Note the shadowing: the Portable Text prop is called `value`, and the block's own headline figure is also called `value`, hence `value.value`. This is intentional — renaming the field would break the contract with Task 1.

- [ ] **Step 3: Create `client/src/components/common/richtext/blocks/TableBlock.tsx`**

```tsx
import React from "react";

export interface TableRowValue {
  _key?: string;
  cells?: string[];
}

export interface TableBlockValue {
  rows?: TableRowValue[];
}

interface Props {
  value: TableBlockValue;
}

const TableBlock: React.FC<Props> = ({ value }) => {
  const rows = value?.rows ?? [];
  if (rows.length === 0) return null;

  const [head, ...body] = rows;

  return (
    <div className="rt-table-wrap">
      <table className="rt-table">
        <thead>
          <tr>
            {(head.cells ?? []).map((cell, index) => (
              <th key={index} scope="col">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, rowIndex) => (
            <tr key={row._key ?? rowIndex}>
              {(row.cells ?? []).map((cell, cellIndex) => (
                <td key={cellIndex}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TableBlock;
```

No `lang` prop: `@sanity/table` stores cells as plain strings, so a table is authored once per language array and its text is already in the right language.

- [ ] **Step 4: Wire all three into `components.tsx`**

Add imports below the Task 4 imports:

```tsx
import PullQuote from "./blocks/PullQuote";
import StatCallout from "./blocks/StatCallout";
import TableBlock from "./blocks/TableBlock";
import type { PullQuoteValue } from "./blocks/PullQuote";
import type { StatCalloutValue } from "./blocks/StatCallout";
import type { TableBlockValue } from "./blocks/TableBlock";
```

Add three entries to the existing `types` map, after `imageGallery`:

```tsx
      pullQuote: ({ value }: { value: PullQuoteValue }) => (
        <PullQuote value={value} lang={lang} />
      ),
      statCallout: ({ value }: { value: StatCalloutValue }) => (
        <StatCallout value={value} lang={lang} />
      ),
      table: ({ value }: { value: TableBlockValue }) => <TableBlock value={value} />,
```

- [ ] **Step 5: Append styles to `client/src/styles/richtext.css`**

```css
/* --- Pull quote --- */
.rt .rt-quote {
  margin: var(--space-8) 0;
  padding: var(--space-5) var(--space-6);
  border-left: 4px solid var(--color-primary);
  background: var(--color-surface);
  border-radius: 0 var(--radius-lg) var(--radius-lg) 0;
}

.rt .rt-quote__text {
  margin: 0;
  font-family: var(--font-secondary);
  font-size: var(--text-lg);
  line-height: 1.5;
  color: var(--color-text-primary);
}

.rt .rt-quote__attr {
  margin-top: var(--space-3);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.rt .rt-quote__attr::before { content: "— "; }

/* --- Stat callout --- */
.rt .rt-stat {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  margin: var(--space-8) 0;
  padding: var(--space-5) var(--space-6);
  border-radius: var(--radius-xl);
  border-left: 4px solid var(--color-primary);
  background: var(--color-surface);
}

.rt .rt-stat__value {
  font-size: var(--text-4xl);
  font-weight: 700;
  line-height: 1.1;
  color: var(--color-text-primary);
}

.rt .rt-stat__label {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.rt .rt-stat--info { border-left-color: var(--color-primary); }
.rt .rt-stat--success { border-left-color: var(--color-success); }
.rt .rt-stat--warning { border-left-color: var(--color-warning); }

/* --- Table --- */
.rt .rt-table-wrap {
  margin: var(--space-8) 0;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.rt .rt-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}

.rt .rt-table th,
.rt .rt-table td {
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-border);
  text-align: left;
  vertical-align: top;
}

.rt .rt-table th {
  background: var(--color-surface);
  font-weight: 600;
  color: var(--color-text-primary);
  white-space: nowrap;
}
```

- [ ] **Step 6: Typecheck and lint**

```bash
cd /e/repo/lulo-fundacion-animal/lulo-web/client && npx tsc -b; npx eslint .
```

Expected: `tsc -b` exits 0, and `eslint` still reports **exactly the same 4 baseline errors** — no
new file appears in its output.

- [ ] **Step 7: Verify rendering**

Add a pull quote, a stat callout of each tone, and a table (one header row plus at least two body rows, at least six columns) to the published scratch post, then:

```bash
cd /e/repo/lulo-fundacion-animal/lulo-web/client && npm run dev
```

Expected:
- The pull quote shows its text with an em-dash-prefixed attribution.
- Each stat callout tone shows a different left border colour (teal / green / amber).
- The table's first row renders as a header with a tinted background.
- At a **375px** viewport the wide table scrolls horizontally **inside its own container** — the page itself must not scroll sideways. Confirm by checking `document.documentElement.scrollWidth === document.documentElement.clientWidth` in the console.

- [ ] **Step 8: Commit**

```bash
cd /e/repo/lulo-fundacion-animal/lulo-web && git add client/src/components/common/richtext client/src/styles/richtext.css && git commit -F - <<'EOF'
Render pull quote, stat callout and table blocks

Completes the Portable Text type map. Tables render their first row as
a header and scroll horizontally within their own container so wide
tables do not break the page layout on mobile.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

## Task 6: End-to-end bilingual verification and cleanup

**Repo:** both

**Files:** none created or modified — this task is verification only, plus deletion of scratch content.

**Interfaces:**
- Consumes: everything from Tasks 1–5.
- Produces: a confirmed-working feature and a clean dataset.

- [ ] **Step 1: Build both repos from clean**

```bash
cd /e/repo/lulo-fundacion-animal/lulo-web/client && npm run build
```

Expected: exits 0. `tsc -b`, the Vite build and the sitemap script all succeed.

```bash
cd /e/repo/lulo-fundacion-animal/lulo-sanity-crm && npm run build
```

Expected: exits 0.

- [ ] **Step 2: Author a complete bilingual scratch post**

In the Studio, create a post titled `ZZ Scratch — rich blocks` and fill **both** `body.en` and `body.es` with, in order: a paragraph, an H2, a blockquote-styled paragraph, a bulleted list, an inline image with caption, a gallery of three images, a pull quote, a stat callout, and a table. Publish it.

- [ ] **Step 3: Verify both languages render**

Open the scratch post with the site language set to English, then switch to Spanish.

Expected:
- All nine content pieces render in both languages.
- Image captions, gallery captions, the pull quote and the stat callout label all change with the language toggle.
- The language switch does not require a page reload.
- Console shows no errors, and no `[@portabletext/react] Unknown block type` warnings.

- [ ] **Step 4: Verify an untouched existing post still renders**

Open a post that predates this work.

Expected: renders exactly as it did before Task 3, wrapper computed `font-size` still `15.2px`. This is the backwards-compatibility gate — no migration was run, so old `body` arrays must still work unchanged.

- [ ] **Step 5: Verify partial-translation fallback**

In the Studio, add an inline image to `body.en` only and publish. View the post in Spanish.

Expected: the Spanish body renders without that image and without errors — the two language arrays are independent, which is the designed behaviour, not a bug. Then add a block whose caption has English text but no Spanish; in Spanish the caption should fall back to the English string rather than rendering empty.

- [ ] **Step 6: Delete the scratch post**

Delete `ZZ Scratch — rich blocks` from the Studio, including its draft.

Expected: it no longer appears in the Post list or on the site's news archive.

- [ ] **Step 7: Confirm no unrelated changes were committed**

```bash
cd /e/repo/lulo-fundacion-animal/lulo-sanity-crm && git status --short && git log --oneline -3
```

Expected: `CONTRIBUTOR_GUIDE.md` and `TECHNICAL_GUIDE.md` still show as uncommitted deletions, and the Sanity 3→4 `package.json` bump is either still uncommitted or was carried only as part of the `@sanity/table` install. No commit from this plan touches those guide files.

```bash
cd /e/repo/lulo-fundacion-animal/lulo-web && git status --short && git log --oneline -3
```

Expected: a clean tree apart from anything that was already dirty before this work.

---

## Deferred

Explicitly out of scope, per the spec: video embeds, a gallery carousel (even though `swiper` is already a dependency), fenced code blocks, document-level i18n, and the Sanity 5/6 upgrade.

`h4` was originally deferred here but was pulled into scope during execution: a production query found a published post relying on it. `h5` and `h6` remain out of scope — no content uses them.
