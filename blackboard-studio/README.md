# Blackboard Studio 9.3.3

A rebuilt offline workspace for converting images into 16 × 16 blackboard plans.
Based on your supplied **Blackboard Converter v8.5**. The UI and application controller are new; the image engine is retained, separated, and corrected, and now has 29 styles.

## Start here

Open **Blackboard-Studio.html** in a modern desktop browser. No installation, server, account, internet connection, external fonts, or runtime dependencies are required. The browser needs Canvas, Web Workers, Blob URLs, and native dialogs. It has been checked in Chromium opened straight from the file, at desktop and phone widths.

1. Choose, drop, or paste an image, or click **Try a sample**.
2. Set the wall dimensions. **Apply** uses the resolution target and image aspect ratio. Each board stays exactly 16 × 16 pixels.
3. Choose one of 29 styles. Search by name or category, compare whole-image thumbnails, or use **Mega compare** to rank styles and tune the best one, with an A/B preview before applying.
4. Use **Fine-tune** for the active style, tonal adjustments, cleanup, and two-style mixing.
5. Open **Export** for the build plan, clean PNG sheet, or wall layout.
6. Use **Save project** to download the source image plus all settings. **Open project** restores that `.blackboard.json` file. A build-plan JSON is a different format and cannot be opened as a project.

Images stay on your computer; nothing is uploaded and there are no analytics. **Keep a local recovery draft** is off until you enable it; it then keeps one draft in this browser (IndexedDB), offered for restore but never loaded automatically. Otherwise, save a project before closing the tab. History retains up to 80 settings snapshots for the current source; opening another image or project starts a new history.

## What changed from v8.5

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
- **Wall JSON:** a Building Gadgets template (`name`, `statePosArrayList`, `requiredItems`) that places one north-facing `supplementaries:blackboard` per board.
- An in-game mod reads the plan JSON and Building Gadgets reads the wall JSON, so `tests/engine.test.cjs` pins both layouts: changing either format makes a test fail until it is updated deliberately. The app intentionally does not reproduce the old accidental polarity reversal.
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
- `src/search.js` — style search and scoring used by Mega compare and Suggest a style (runs in the worker).
- `src/worker.js` — render, gallery, suggestion, and style-search jobs.
- `src/viewport.js` — preview-only zoom maths.
- `src/drafts.js` — optional local recovery draft (IndexedDB).
- `src/app.js` — source handling, history, worker lifecycle, preview, dialogs, and downloads.
- `build.py` — zero-dependency builder that inlines the seven source files into one HTML file.
- `tests/` — processing, worker, and controller regression tests.
- `reference/original-v8.5.html` — untouched copy of your supplied project.

The source template is not the runnable entry point. After editing the source, rebuild:

```sh
python3 build.py
```

No framework migration was necessary: Canvas does the image work and Workers keep it off the UI thread. Keeping plain JavaScript makes the downloaded HTML usable without a development server while still providing maintainable source modules.

## Validation

**68 automated tests pass**: 56 engine checks, 5 real-worker checks, and 7 controller integration checks. They cover every preset, binary semantics, every exported row, the plan and wall JSON layouts, dither tone fidelity, denoise and Canny equivalence, gap repair, local variance, blending, style search, project round trips, history/reset, image upload, board inspection, contain/cover geometry, stale exports, all gallery thumbnails, and PNG/plan equality with preview overlays enabled.

Controller tests run in **jsdom with native canvas and Node worker threads**, an emulated DOM. Separately, the built file was opened from `file://` in headless Chromium: the sample renders, style search runs, exports download, the layout has no horizontal scroll at 1440 px or 390 px wide, and the console shows no errors. Firefox, Safari, clipboard permissions, and screen readers have not been checked.

Run dependency-free engine and worker tests with Node.js:

```sh
node --test tests/engine.test.cjs tests/worker.test.cjs
```

For controller tests, install the development-only dependencies (tested with Node 22):

```sh
npm install
npm test
```

Neither dependency is included in, or required by, the standalone app. Manual browser checklist: open the HTML directly, try a sample and an uploaded image, resize to a phone-width viewport, cancel a large render, test clipboard/downloads, save/reopen a project, and import a small plan into the actual game integration.
