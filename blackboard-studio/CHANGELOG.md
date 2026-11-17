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
