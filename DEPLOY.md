# MoneyLens — Deploy Guide

> How to take the latest `app.js` (from the shared document above) and get it live on GitHub Pages in under 5 minutes.

---

## What changed in the latest version

| Area | Change |
|---|---|
| **PDF upload** | PDF.js loaded dynamically from CDN; upload a PDF → text extracted automatically → parser runs instantly |
| **Categories** | 16 built-in categories with emoji + color; unlimited custom categories (+ emoji picker + color picker + live preview) |
| **Chart detail sheet** | Tapping the donut opens a bottom sheet with: stats grid, large donut, horizontal category bars with %, monthly trend, avg order insight, top 8 purchases, create-category CTA |
| **Import flow** | Textarea starts empty (no ghost Blinkit text); Demo button loads sample; ✕ clears; PDF shows in textarea + auto-parses |
| **Orders screen** | Edit panel includes both Category dropdown (with all categories including custom) and Amount field |
| **Parsed card** | Shows ALL items (scrollable), not just first 5 |
| **Analytics** | Price insights computed from real data; category totals filter out mis-parsed total lines |
| **Amazon parsing** | Product name extracted from "Arriving" section; multi-line price handled; deduplication added |
| **Insights** | Fully dynamic — no hardcoded price alerts |

---

## Step 1 — Update `web/app.js`

Open `web/app.js` in your editor. **Delete all existing content** and paste the complete new version from the document shared above (the one starting with `// ─── Colour tokens`).

The file is fully self-contained — no imports, no external dependencies, no build step needed for the JS itself.

---

## Step 2 — No `index.html` changes needed

The new `app.js` loads PDF.js dynamically via a script tag it injects itself. You do **not** need to touch `web/index.html`.

---

## Step 3 — Verify CSS is up to date

The new features use mostly inline styles, so the CSS changes are minimal. Open `web/styles.css` and confirm the `.donut-wrap` rule has `cursor: pointer` — if not, add it:

```css
/* Find this rule and add cursor:pointer */
.donut-wrap {
  position: relative;
  width: 110px;
  height: 110px;
  cursor: pointer;   /* ← add this line */
}
```

Everything else (chart sheet, add-category modal, parsed card scroll) uses inline styles and needs no CSS change.

---

## Step 4 — Build

```bash
npm run build
```

This runs `scripts/build-web.mjs` which:
1. Deletes `docs/` and `dist/`
2. Copies `web/` → `docs/` (GitHub Pages root)
3. Copies `web/` → `dist/` (local preview root)

---

## Step 5 — Preview locally (optional)

```bash
npm run preview
# → http://127.0.0.1:4173
```

Open in a browser, test:
- [ ] Dashboard donut is tappable → opens chart sheet
- [ ] Import tab starts with empty textarea
- [ ] "Demo" button loads Blinkit sample and parses it
- [ ] Upload a PDF → text appears in textarea → result card shows below
- [ ] Orders → click a row → see Category + Amount fields
- [ ] Orders → "Create custom category" → emoji + color picker works

---

## Step 6 — Commit and push

```bash
git add web/app.js docs/
git commit -m "feat: PDF auto-parse, chart detail sheet, custom categories, dynamic insights"
git push origin main
```

GitHub Actions (`.github/workflows/deploy.yml`) deploys `docs/` to Pages automatically. The deploy usually completes within 30 seconds.

---

## Step 7 — Bump service worker cache (important)

After a significant JS change, old clients may serve a cached `app.js`. Open `docs/service-worker.js` (it will be generated from `web/service-worker.js` by the build) and increment the cache version:

```js
// Find:
const CACHE_NAME = "money-lens-v4";
// Change to:
const CACHE_NAME = "money-lens-v5";
```

Then rebuild and push again. Alternatively, run `npm run build && git add -A && git commit --amend --no-edit && git push -f origin main` to amend the previous commit.

---

## Rollback

If something breaks, the previous version is in git history:

```bash
git revert HEAD   # creates a revert commit and auto-deploys
# or
git reset --hard HEAD~1 && git push -f origin main
```

---

## iOS app

No iOS changes are included in this update. The iOS app and web app are independent codebases sharing a domain model design, not code. To update the iOS app with equivalent features:

1. Expand `SpendCategory` enum with the new categories
2. Update `ReceiptImportParser` with the expanded blocked list and Amazon fallback
3. Add `CategoryLearner.shared.learn()` in the review sheet confirmation handler
4. Add `SpendingAnalyzer.priceIncreaseInsights()` call in `InsightsView`
5. Add custom category persistence to `UserDefaults`

---

## Environment notes

- PDF.js CDN (`cdnjs.cloudflare.com`) must be reachable for PDF upload to work. Offline (service worker cached) use won't support first-time PDF upload.
- The app uses `crypto.randomUUID()` — requires HTTPS or localhost (not plain HTTP on a remote server).
- `localStorage` is per-origin. Data from `user.github.io/moneylens` and `localhost:4173` is separate.
