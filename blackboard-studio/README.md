# Blackboard Studio 9.0

A rebuilt offline workspace for converting images into 16 × 16 blackboard plans.
Based on your supplied **Blackboard Converter v8.5**. The UI and application controller are new; the 28-preset image engine is retained, separated, and corrected.

## Start here

Open **Blackboard-Studio.html** in a modern desktop browser. No installation, server, account, internet connection, external fonts, or runtime dependencies are required. The browser needs Canvas, Web Workers, Blob URLs, and native dialogs. Actual browser compatibility and mobile visual layout have not been verified in this environment.

1. Choose, drop, or paste an image, or click **Try a sample**.
2. Set the wall dimensions. **Apply** uses the resolution target and image aspect ratio. Each board stays exactly 16 × 16 pixels.
3. Choose one of 28 styles. Search by name or category, or compare whole-image thumbnails.
4. Use **Fine-tune** for the active style, tonal adjustments, cleanup, and two-style mixing.
5. Open **Export** for the build plan, clean PNG sheet, or wall layout.
6. Use **Save project** to download the source image plus all settings. **Open project** restores that `.blackboard.json` file. A build-plan JSON is a different format and cannot be opened as a project.

Images stay in memory on your computer. There is no cloud upload, analytics, autosave, or localStorage usage. Save a project before closing the tab. History retains up to 80 settings snapshots for the current source; opening another image or project starts a new history.

## What changed

| Area | Upgrade |
| --- | --- |
| Interface | New dark studio layout, clear setup stages, dedicated preview and inspector, collapsible advanced controls, responsive CSS, system fonts. |
| Rendering | Isolated Web Workers, debounced updates, job cancellation, stale-result rejection, progress and errors. Export is disabled while the current image is pending. |
| Styles | All 28 choices preserved; searchable categories and whole-image gallery thumbnails. The inherited approximate “Blue Noise” effect is honestly named **Grain**. |
| Editing | Working settings-based Undo/Redo, keyboard shortcuts, reliable reset, remembered per-style parameters, visible numeric values. |
| Image placement | Correct contain/cover geometry, alpha compositing onto white, safe board bounds, aspect-preserving preview zoom. |
| Processing | Corrected gap closing, floating-point blur intermediates, integral-image local statistics, diffusion weights/direction, Bayer ordering, and inactive controls. |
| Mixing | Real spatial blend, union, intersection, and A + dark fill from B. |
| Exports | Consistent binary meaning, clean native-resolution PNGs independent of grid/source/compare views, clipboard fallback, safe file names. |
| Projects | Portable JSON with the source image and validated settings, file-type/size checks, image decode errors, and protection against superseded image loads. |
| Suggestions | A cancellable, reduced-resolution heuristic comparing coarse tone similarity. It is not AI and does not guarantee the best artistic result. |
| Accessibility | Actual labelled form controls, button/checkbox semantics, focus styling, native dialogs, status announcements, and reduced-motion styling. Not a formal accessibility audit. |

Read **CHANGELOG.md** for the concrete v8.5 defects corrected.

## Export meaning and compatibility

- **Plan JSON:** retains `kind: supplementaries-blackboard-plan`, `version: 2`, output dimensions, per-board `(x, y)`, pixel counts, and sixteen 16-character binary row strings. `1` means draw black; `0` means leave white. Coordinates start at the top-left.
- **Inversion:** source inversion is processed once. Plan metadata sets `invert: false` because the row bytes already contain the result, and records the source choice separately. **Flip final pixels** is explicit and affects both preview and export.
- **Chalk:** an alternate preview/PNG palette. Plan rows remain a black-on-white instruction map; the JSON does not claim a chalk-colour game export.
- **Wall JSON:** preserves the supplied BG2-labelled block-list structure and `supplementaries:blackboard` states. No compatibility with a particular Building Gadgets 2 release has been verified. This is not a claim of native schematic support.
- Existing version-2 plan fields are retained, but the actual in-game importer has not been tested. The app intentionally does not reproduce the old accidental polarity reversal.
- PNG export omits grid, zoom, comparison split, and original-source view. The PNG palette can match the preview or be forced to mask/chalk.

## Limits

Raster imports: PNG, JPEG, WebP, GIF, BMP, and AVIF, subject to browser decoder support; 25 MB / 32 megapixels maximum. GIFs are frozen to a static decoded frame. SVG import is intentionally excluded. Projects: 50 MB maximum. Walls: 1–200 boards on each axis, up to 3,200 × 3,200 pixels. Large renders may consume substantial memory; use smaller dimensions if a browser runs out. Cancel terminates the worker and restores the last completed render's settings when one exists.

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| Ctrl / ⌘ Z | Undo |
| Ctrl / ⌘ Shift Z or Ctrl / ⌘ Y | Redo |
| Ctrl / ⌘ S | Save project |
| G | Toggle board grid |
| F | Fit preview |
| ? | Shortcut help |
| Enter on preview | Inspect first board |
| Escape | Close dialog |

## Source structure

- `src/index.html` — semantic UI template.
- `src/styles.css` — design and responsive layout.
- `src/engine.js` — pure conversion, settings validation, palette, and export functions.
- `src/worker.js` — render, gallery, and suggestion jobs.
- `src/app.js` — source handling, history, worker lifecycle, preview, dialogs, and downloads.
- `build.py` — zero-dependency builder that inlines the sources into one HTML file.
- `tests/` — processing, worker, and controller regression tests.
- `reference/original-v8.5.html` — untouched copy of your supplied project.

The source template is not the runnable entry point. After editing the source, rebuild:

```sh
python3 build.py
```

No framework migration was necessary: Canvas does the image work and Workers keep it off the UI thread. Keeping plain JavaScript makes the downloaded HTML usable without a development server while still providing maintainable source modules.

## Validation

**52 automated tests passed**: 41 engine checks, 4 real-worker checks, and 7 controller integration checks. They cover every preset, binary semantics, every exported row, gap repair, local variance, blending, project round trips, history/reset, image upload, board inspection, contain/cover geometry, stale exports, all gallery thumbnails, and PNG/plan equality with preview overlays enabled.

Controller tests run in **jsdom with native canvas and Node worker threads**. This is an emulated DOM, not a real browser. Desktop/mobile visual inspection, actual clipboard/download permissions, file-URL Web Worker behavior, accessibility-tool testing, and the in-game import were **not verified**. A local browser executable was unavailable and the remote browser prohibited local-file navigation.

Run dependency-free engine and worker tests with Node.js:

```sh
node --test tests/engine.test.cjs tests/worker.test.cjs
```

For controller tests, install the development-only dependencies (Node 24+ recommended for the pinned jsdom release):

```sh
npm install
npm test
```

Neither dependency is included in, or required by, the standalone app. Manual browser checklist: open the HTML directly, try a sample and an uploaded image, resize to a phone-width viewport, cancel a large render, test clipboard/downloads, save/reopen a project, and import a small plan into the actual game integration.
