# Nodra Night Neon

This design is **additive**. The original theme is preserved.

## Permanent theme switch

Open `dist/index.html` and change the theme value in the `<html>` tag:

- `data-theme="night-neon"` — purple-pink Nodra Night Neon.
- `data-theme="classic"` — original monochrome site, unchanged.

No other file needs to be modified to switch between the themes.

## Temporary per-visit preview

- `https://nodramesh.space/?theme=classic` — view the original theme for this page load.
- `https://nodramesh.space/?theme=night-neon` — view Night Neon.

The query parameter is not saved to local storage and does not affect other visitors.

## What changed

- `dist/night-neon.css` adds scoped styling for dark violet / dusty pink UI, hero / relay animations, news, hardware, and Mesh Playground.
- `dist/night-neon-palms.svg` provides broad filled palm fronds fixed at the sides of the viewport, with soft blur and reduced opacity with `pointer-events:none`.
- `dist/index.html` adds one theme attribute, stylesheet include, and the optional preview override.

`dist/styles.css`, `dist/playground.css`, `dist/site.js`, `dist/playground.js`, and Nodra application source code are not modified.

## Instant full restoration

The full pre-change source is also saved in the branch:

`backup/classic-before-night-neon-2026-11-19`

To fully discard the new theme files, revert the commit that introduced Night Neon or restore that branch using a normal Git workflow.

## Accessibility

Palms never intercept clicks and remain behind all main content. The overlay is softened on tablets / mobile. Existing reduced-motion behavior is preserved. No new animations or dependencies are added.
