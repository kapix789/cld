# 9.3.3 — bug fixes

Plan JSON and Building Gadgets wall JSON are unchanged apart from the `generator` string; this was checked by exporting 360-board walls from 9.3.2 and 9.3.3 and comparing them.

## Fixed

1. **Grain and IGN: Strength changed brightness.** The noise was not centred, so on mid grey, strength 10 gave 100% ink and strength 100 gave 0%, and light greys rendered blank at almost every setting. Noise is now centred on zero, so Strength changes only the texture.
2. **IGN drew horizontal streaks.** It now uses the standard interleaved gradient noise formula.
3. **Ordered and noise dithers lost shadows and highlights by default.** Bayer, Bayer 8×8, IGN and Grain defaulted to 55–60% strength, which turned dark greys solid black and light greys solid white (dark grey: 94% ink instead of 75%). Defaults are now 100%, which reproduces every grey level. Saved projects keep their stored values. Lower Strength for a punchier, higher-contrast look.
4. **Denoise was slow at large sizes.** Radius 4 took about 4.8 s on a 1600 × 1600 wall; it now takes about 0.5 s, with identical output.
5. **Canny could take tens of seconds.** Edge linking rescanned the whole image until nothing changed. On images with long faint edges this took 24.6 s at 1600 × 1600; it now takes 0.35 s, with identical output. Style search's Clean outlines goal also uses Canny.
6. **Zoom menu text was cut off** ("Fit · smoot"). The menu now sizes to its longest option.

## Project

- `src/` now matches the shipped HTML. The previous bundle's sources built 9.0, so running `build.py` would have overwritten 9.3.2.
- `build.py` inlines all seven source files in one pass and checks that every template token is present.
- Tests updated for 9.3.2 and extended to 68: format locks for plan and wall JSON, dither tone fidelity, median and Canny equivalence, Canny worst-case time, style search.

# 9.1 – 9.3.2 (reconstructed from the 9.3.2 build; original notes were not included)

- Added **Soft Ink** (29 styles).
- Added **Mega compare**: ranks styles, tunes the best one, optionally explores two-style mixes, rechecks finalists at full wall size, with goals (balanced, tonal fidelity, less noise, clean outlines), a draw-pixel budget, and an A/B preview.
- Added optional local recovery drafts (IndexedDB) and a pixel-exact "Fit · pixels" zoom.
- Wall JSON switched to the Building Gadgets `statePosArrayList` template format.
- XDoG: a uniform image now stays blank; Phi controls edge steepness. Anime Ink: Shadow Depth 0 now means outlines only. Sharpness and Detail boost combine into one bounded pass, and small texture is no longer amplified into ink.

# 9.0 — renewal of the supplied v8.5 project

## Functional defects fixed

1. **Image loading could crash.** The old `loadImage()` accessed `btnAuto` and `btnDeep`, which did not exist in its HTML. Top-level event registration also crashed on those missing elements, preventing the remaining initialization. The rebuilt controller only binds existing or explicitly created elements.
2. **Undo and Redo were placeholders.** They rerendered without restoring state. A bounded settings history now restores dimensions, controls, per-preset values, mixing, and export choices.
3. **Preset reset overwrote its own defaults.** The former slider configurator saved the visible values over freshly reset data. State now owns the values and the UI only reflects them.
4. **Contain/cover source rectangles were wrong.** Contain cropped content, while cover could read outside the source. Drawing now uses the minimum or maximum scale with centered destination placement.
5. **Fit zoom distorted images.** Setting both CSS axes to 100% ignored aspect ratio. Both now use the same computed scale.
6. **Compare at 100% could request a zero-width image region.** The new comparison code safely supports both endpoints and applies zoom and optional grid consistently.
7. **PNG export captured the preview canvas.** That included source view, split comparison, and grid lines. A separate export canvas now uses only the completed mask and selected PNG palette.
8. **Mask polarity disagreed with labels.** The old mask preview drew mask `1` as white while JSON described it as black; source inversion could introduce another export flip. Mask `1` consistently means black ink, with explicit source inversion and final output flipping.
9. **Mix controls were largely unwired and absent from the render pipeline.** Both styles now render and combine before cleanup.
10. **Gap repair did nothing.** Intersecting a dilation with the original mask returned the original. It now uses morphological closing.
11. **Detail boost referenced an undefined `extra`.** It now reads the validated setting.
12. **Sauvola squared values were clipped to eight bits.** Float64 summed-area statistics retain the necessary precision for mean and variance. Wolf also uses local mean/standard deviation and image minimum rather than subtracting effectively equivalent blurred signals.
13. **Subpixel Gaussian sigmas were ignored.** Blur now supports positive fractional sigma and uses floating-point intermediate values.
14. **Dithering had numerical defects.** Floyd–Steinberg diagonal weights and reverse-row diffusion directions are corrected. Sierra Lite weights sum to one. Atkinson no longer multiplies already weighted diffusion by an extra 0.25. Bayer 8 has all 64 unique ranks and ordered thresholds are centered.
15. **Some style parameters did nothing.** Threshold uses its own lab slider; Bradley post-blur, Adaptive smoothing, Hybrid tone levels/blend, and Halftone threshold now contribute. Unused style fields and irrelevant global controls are hidden. Bold no longer applies line weight twice.
16. **Gallery thumbnails showed only the first board.** The new gallery renders the whole fitted image at a bounded preview size with the same processing pipeline.
17. **Dimensions could exceed bounds through the linked axis.** Both axes are now clamped, including imported values; malformed image/project files produce visible errors.
18. **Long work blocked the UI or could become stale.** Workers are cancellable; newer renders invalidate older jobs; changing conversion settings cancels an in-progress suggestion. Exports wait for the current render.

## Intentional changes

- Replaced the original extremely long settings column with a staged source/wall/style sidebar and a separate inspector.
- Replaced nonfunctional Smart Crop with accurate, explicit Contain/Cover/Stretch modes. No semantic crop detection is claimed.
- Consolidated duplicate despeckle and one-pixel repair toggles into island-removal and gap-radius controls.
- Replaced ambiguous raw/WYSIWYG export polarity with consistent mask semantics and an explicit final pixel flip.
- Replaced the old optimizer with a small, cancellable tone-similarity search. It samples the image and refines style parameters; it does not claim globally optimal settings.
- Kept all 28 preset keys, but renamed the approximate `bluenoise` display name to Grain.
- Preserved the old plan and wall structures; labelled external game compatibility as unverified.
- Added an embedded landscape sample drawn locally with Canvas, project persistence through downloads, and an untouched original-file backup.

## Validation boundary

Automated tests cover processing, worker messages, and controller behavior under an emulated DOM. No real-browser screenshot/layout check or in-game import was possible here. See README.md for repeatable tests and the remaining manual checklist.
