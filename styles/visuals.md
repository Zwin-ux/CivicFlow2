# CivicCopy Visual Baselines

Use the existing Puppeteer harness (`scripts/visual/regress.js`) to track aesthetic regressions on the SBA demo shell.

## Capturing the baseline

```bash
# 1) Boot the API + static demo locally (port 3000 recommended)
npm run dev &

# 2) Capture/compare screenshot at 1280x800 once `.demo-ready` applies
VISUAL_BASE_URL="http://localhost:3000/demo-sba" node scripts/visual/regress.js
```

- The first run writes `tests/visual/baseline-demo-sba.png`.
- Subsequent runs compare against the baseline and emit `diff-demo-sba.png` if pixels diverge.
- Screenshots wait for the `.demo-ready` class so timelines/badges reflect live data before capture.

## Updating the baseline

When intentional UI changes land:

1. Delete `tests/visual/baseline-demo-sba.png`.
2. Re-run the script with the command above to generate a fresh baseline.
3. Inspect `current` vs `diff` output before committing.

Baseline viewport: **1280 × 800**, clip to the hero + columns (handled automatically in the script).
