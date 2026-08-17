# Rich content blocks for Sanity posts

**Date:** 2026-08-16
**Status:** Approved design
**Repos affected:** `lulo-sanity-crm` (Studio), `lulo-web` (React site)

## Problem

Post bodies are visually flat. `localeRichText` is declared as `of: [{type: 'block'}]`
(`schemaTypes/localeStringType.ts:44`), so an editor can only produce headings, paragraphs,
lists and inline marks. There is no way to place an image inside an article, present tabular
results from a veterinary brigade, or break up long text with a quote or an impact figure.

The frontend renderer (`lulo-web/client/src/components/common/RichText.tsx`) mirrors this
limitation: it defines handlers for `block`, `marks` and `list`, but no `types` handler, so
any non-text block added to the schema would render as nothing.

## Goals

- Editors can insert images, image galleries, tables, pull quotes and stat callouts into a post body.
- Bilingual text inside those blocks (captions, alt text, labels) is authored once per block.
- Existing posts continue to render unchanged, with no content migration.
- The two repos can be deployed independently, in either order.

## Non-goals

- Video embeds, image carousels, `h4`, code blocks.
- Document-level i18n (one post document per language).
- Upgrading the Studio from Sanity 4 to Sanity 5/6.

## Decisions

Three decisions were settled during design:

**1. Which blocks.** All four candidates are in scope: inline image with caption, image
gallery, table, and pull quote + stat callout.

**2. Bilingual handling — localize inside the block.** `post.body` stays per-language, as
today. Text fields *inside* the new block objects (`alt`, `caption`, `label`, `quote`) are
`localeString` / `localeText`, so a block carries both languages as a self-contained unit. The
editor places the block in both `body.en` and `body.es`, but copy-pasting it between the two
arrays carries the translation with it. No migration, no plugin, works with current data.

Rejected: fully independent per-language strings (every caption typed twice, no structural
link); shared media with localized text blocks (Portable Text blocks cannot hold a
`localeString`, so this needs a custom object wrapper per paragraph — heavy migration, worse
writing experience); document-level i18n (full migration plus frontend query rewrites).

**3. Tables — pin `@sanity/table@2.0.1`.** The current release (`3.1.14`) declares
`peerDependencies: {sanity: "^5 || ^6.0.0-0", react: "^19.2"}`; this Studio is on `sanity ^4.10.2`
and `react ^19.1`. Version `2.0.1` declares `{sanity: "^3.0.0 || ^4.0.0 || ^5.0.0", react: "^18 || ^19"}`
— verified by unpacking the published tarball, not from `npm view` on a neighbouring version.
It provides a grid UI with add/remove row and column controls. Its cells are plain strings and
cannot hold a `localeString`, so a table is built once per language array — acceptable, since
these tables are mostly numbers, species names and dates.

Because `2.0.1` already covers Sanity 5, the pin only becomes a blocker at a Sanity **6**
upgrade, not a Sanity 5 one.

The plugin registers **two** schema types, `table` and `tableRow`. Stored shape:

```json
{"_type": "table", "rows": [{"_type": "tableRow", "_key": "...", "cells": ["a", "b"]}]}
```

Rejected: hand-rolled table object (nested array-of-arrays editing UI is painful past 3×3);
skipping tables; upgrading the Studio first (turns content modelling into a framework migration).

## Architecture

Portable Text blocks are objects identified by a `_type` string. The Studio decides which
`_type`s can be inserted into an array; the frontend maps each `_type` to a React component.
**The `_type` strings are the entire contract between the repos.**

`localeRichText` is referenced by exactly one field — `post.body`
(`schemaTypes/postType.ts:32`). Nothing else in the schema is affected.

Deploy ordering is unconstrained. `@portabletext/react@3.2.4` renders unknown types through
`DefaultUnknownType`, which emits `<div style={{display:'none'}}>` plus a console warning. A
block inserted before the frontend supports it is invisible with zero layout impact.

## Studio changes (`lulo-sanity-crm`)

### New dependency

Add `"@sanity/table": "2.0.1"` (exact pin, no caret) to `package.json` and register its plugin
in `sanity.config.ts`. It contributes a `table` object schema type, intended for use inside
arrays; no existing schema type uses that name.

### New folder `schemaTypes/blocks/`

One file per object type, each exporting a `defineType` and each defining a `preview` so the
Portable Text editor shows a meaningful summary rather than "Untitled".

Where a table below says a field such as `alt.en` is required, `rule.required()` is not
sufficient — on a `localeString` field it only asserts that the wrapping object exists, not
that a given language is filled in. These use a custom rule instead:

```ts
validation: (rule) =>
  rule.custom((value?: {en?: string}) =>
    value?.en?.trim() ? true : 'English text is required'
  ),
```

Only the base language (`en`) is enforced, so a post can be drafted in English and translated
later without validation errors blocking publication.

**`inlineImage.ts`** — `_type: 'inlineImage'`, title "Image"

| Field | Type | Notes |
|---|---|---|
| `image` | `image`, `options: {hotspot: true}` | required |
| `alt` | `localeString` | `alt.en` required (accessibility) |
| `caption` | `localeString` | optional |
| `size` | `string`, list `inline` / `wide` / `full` | `initialValue: 'wide'` |

Preview: image thumbnail as media, `caption.en` as title, falling back to `alt.en`.

**`imageGallery.ts`** — `_type: 'imageGallery'`, title "Image gallery"

| Field | Type | Notes |
|---|---|---|
| `images` | array of object `{image, alt: localeString, caption: localeString}` | `rule.min(2).max(6)` |

Preview: first image as media, title `Gallery (N images)`.

**`pullQuote.ts`** — `_type: 'pullQuote'`, title "Pull quote"

| Field | Type | Notes |
|---|---|---|
| `quote` | `localeText` | `quote.en` required |
| `attribution` | `string` | optional; personal names are not translated |

Preview: `quote.en`, truncated.

**`statCallout.ts`** — `_type: 'statCallout'`, title "Stat callout"

| Field | Type | Notes |
|---|---|---|
| `value` | `string` | required, e.g. `"450"` |
| `label` | `localeString` | `label.en` required, e.g. `"hearts reached"` |
| `tone` | `string`, list `info` / `success` / `warning` | `initialValue: 'info'` |

Preview: `${value} — ${label.en}`.

### `localeStringType.ts`

`localeRichText`'s per-language field changes from `of: [{type: 'block'}]` to:

```ts
of: [
  {
    type: 'block',
    styles: [
      {title: 'Normal', value: 'normal'},
      {title: 'H1', value: 'h1'},
      {title: 'H2', value: 'h2'},
      {title: 'H3', value: 'h3'},
      {title: 'Quote', value: 'blockquote'},
    ],
  },
  {type: 'inlineImage'},
  {type: 'imageGallery'},
  {type: 'pullQuote'},
  {type: 'statCallout'},
  {type: 'table'},
]
```

The `styles` array must list `normal`, `h1`, `h2` and `h3` explicitly — declaring `styles` at
all replaces the default set, and omitting them would remove formatting already in use.
`blockquote` is the only addition.

Decorators (marks) are **left at the Sanity default** — `strong`, `em`, `code`, `underline`,
`strike-through`. Restricting them would make any such mark in existing content impossible to
remove in the editor. Instead the frontend gains renderers for the three currently unhandled
decorators, so no formatting silently no-ops.

### `schemaTypes/index.ts`

Register the four new object types alongside the existing exports.

## Frontend changes (`lulo-web/client`)

### Dependency

`@sanity/image-url` is already declared in the **repo-root** `package.json` and already
resolves from `client/` by upward module resolution — the same arrangement `@sanity/client`
and `@portabletext/react` use today. No new dependency is added, and `client/package.json` is
not touched.

It must, however, be **upgraded from `^1.1.0` to `^2.1.1` in the root `package.json`**.
Version `1.1.0` declares `main: lib/node/index.js` with no `types` field, and its `.d.ts`
files sit in `lib/types/`, so TypeScript resolves no declarations — under `tsconfig.app.json`'s
`strict: true` that is a `TS7016` build failure. Version `2.1.1` declares
`types: ./lib/index.d.ts`, has no peer dependencies, and requires Node `>=20.19.0` (local Node
is v21.5.0). The package is currently unused in `src/`, so the upgrade cannot regress anything.

Use the **named** export — `createImageUrlBuilder` — since v2 deprecates the default export.
`SanityImageSource` is exported from the package root.

This avoids GROQ changes: `usePostsWithSearch.ts:59` projects `body` raw, so nested images
arrive as unresolved `asset._ref`. The URL builder resolves a ref directly and adds width, fit
and format parameters — worth having on photo-heavy posts over mobile connections.

Note `tsconfig.app.json` also sets `noUnusedLocals: true`, so no unused imports may be left
behind during the refactor.

### `RichText.tsx` becomes `richtext/`

The current single file holds an inline `PortableTextComponents` map. Adding five block types
plus locale resolution would push it past the size where it is comfortable to reason about, so
it is split:

```
src/components/common/richtext/
  RichText.tsx          entry point; resolves current language
  components.tsx        the PortableTextComponents map
  pick.ts               locale field resolution
  imageUrl.ts           @sanity/image-url builder bound to the Sanity client
  blocks/
    InlineImage.tsx
    ImageGallery.tsx
    PullQuote.tsx
    StatCallout.tsx
    TableBlock.tsx
```

`RichText` reads the active language via `useTranslation()` from `react-i18next` (already a
dependency, used by the post hooks). No prop is threaded through, so `PostDetail` changes by
exactly one line: its import path. The old `RichText.tsx` is deleted rather than kept as a
re-export shim — there is a single consumer.

`pick.ts` resolves a locale object to a string:

```ts
export type LocaleField = {en?: string; es?: string} | undefined

export function pick(field: LocaleField, lang: string): string {
  if (!field) return ''
  const base = lang.split('-')[0] as 'en' | 'es'
  return field[base] ?? field.en ?? field.es ?? ''
}
```

The `split('-')` handles regional codes such as `es-CO` from the browser language detector.

### `components.tsx`

Preserves every existing handler unchanged — `h1`, `h2`, `h3`, `normal`, `strong`, `em`,
`link`, `bullet`, `number`, `listItem`. Adds:

- `block.blockquote` → `<blockquote className="rt-blockquote">`
- `marks.code`, `marks.underline`, `marks['strike-through']`
- `types.inlineImage`, `types.imageGallery`, `types.pullQuote`, `types.statCallout`, `types.table`

`TableBlock` renders `@sanity/table`'s stored shape: `{rows: [{_key, cells: string[]}]}`. The
first row is rendered as `<thead>`; remaining rows as `<tbody>`. The table is wrapped in a
`div.rt-table-wrap` with `overflow-x: auto` so wide tables scroll on mobile instead of
breaking the page layout.

## Styling

New rules in `src/styles/richtext.css`, using the existing tokens from
`src/styles/design-system.css` (`--color-primary`, `--color-surface`, `--color-border`,
`--color-text-secondary`, `--color-success`, `--color-warning`) so blocks match the rest of the
site rather than looking bolted on.

New classes: `rt-figure` (with `--inline` / `--wide` / `--full` modifiers), `rt-figcaption`,
`rt-gallery`, `rt-gallery__item`, `rt-quote`, `rt-quote__attr`, `rt-stat` (with `--info` /
`--success` / `--warning`), `rt-stat__value`, `rt-stat__label`, `rt-table-wrap`, `rt-table`,
`rt-blockquote`, `rt-code`, `rt-underline`, `rt-strike`.

The gallery is a CSS grid: `grid-template-columns: repeat(auto-fit, minmax(180px, 1fr))`.
Carousel is out of scope even though `swiper` is already a dependency.

### Rescoping

Every rule in `richtext.css` is currently scoped `.post-detail__content-text .rt-*`, so
`RichText` only styles correctly on the post detail page despite being a generic component.
`RichText` will emit a root `.rt` class in addition to the caller's `className`, and the CSS
rescopes to `.rt`.

This is the only change that could visibly regress existing pages, so the mechanism is worth
stating precisely. `.post-detail__content-text` is defined in two files:
`PostDetail.css:76` sets `font-size: var(--text-base)`, and `richtext.css` sets
`font-size: 0.95rem`. Specificity is equal, so import order decides, and `PostDetail.tsx`
imports `PostDetail.css` first and `richtext.css` second — `0.95rem` is what renders today.

After rescoping, both `.rt` and `.post-detail__content-text` sit on the same element, both at
specificity `(0,1,0)`, still resolved by the same import order — `0.95rem` still wins. The
outcome is unchanged and the ordering dependency is the one that already exists, not a new
one. Because it is decided by order rather than specificity, it must be confirmed visually
rather than by reasoning alone.

## Backwards compatibility

- **Content:** no migration. Portable Text arrays are heterogeneous; widening `of:` changes
  what can be inserted, not what is already stored. Existing `body.en` / `body.es` arrays are
  untouched and remain valid.
- **Block styles:** adding `blockquote` does not affect blocks carrying `style: 'normal'`.
- **Deploy order:** either repo may ship first (see Architecture).
- **GROQ:** unchanged in both `usePostsWithSearch.ts` and `usePost.ts`.
- **SEO and search:** `pt::text()` ignores non-text block types, so `bodyText` — used for meta
  descriptions and search — behaves identically on existing posts.
- **Plain-text fallback:** the `post.bodyPlain` branch at `PostDetail.tsx:37` is not touched.
- **Rollback:** reverting the frontend makes new blocks invisible again; no content is lost.
  Reverting the Studio schema while new blocks exist leaves them in the documents but shows
  them as unknown types in the editor — recoverable, not destructive.

## Verification

Neither repo has a test framework, and this work does not introduce one.

1. `npm run build` (`tsc -b` + vite) and `npm run lint` clean in `lulo-web/client`;
   `npx tsc --noEmit` and `npm run lint` clean in `lulo-sanity-crm`.
2. Studio starts (`npm run dev`) and all five block types are insertable in `post.body`, each
   showing a meaningful preview in the array.
3. A scratch post containing all five block types renders correctly on the site in **both**
   `en` and `es`, including captions and labels resolving to the active language.
4. Language toggle on that post switches block text without a reload.
5. An existing pre-change post renders identically to before — verified against the current
   deployed page, with body font size confirmed as `0.95rem` in devtools.
6. A wide table scrolls horizontally at a 375px viewport instead of overflowing the layout.
7. The scratch post is deleted after verification.

## Risks

| Risk | Mitigation |
|---|---|
| CSS rescoping changes post detail typography | Explicit devtools check in verification step 5 |
| `@sanity/table@2.0.1` pin blocks a Sanity 6 upgrade | Accepted and reversible; the pin already covers Sanity 5, and block data is plain JSON, so a future upgrade swaps the plugin without touching content |
| Editor forgets to mirror a block into the second language | Blocks are self-contained and copy-pasteable between the two arrays; no technical guard |
| Unresolved image refs if a block is rendered outside `PortableText` | All image URL construction goes through `imageUrl.ts` |

## Out of scope

Video embeds, gallery carousel, `h4`, code blocks, document-level i18n, the Sanity 5/6
upgrade, and the unrelated pending changes already in the working tree (the Sanity 3→4
dependency bump and the deleted guide files).
