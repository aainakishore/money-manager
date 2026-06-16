# MoneyLens — LLM Context File

> Drop this file into your context window before asking an LLM to work on MoneyLens.
> It summarises the full repo in one file so the LLM doesn't need to read every file.

---

## What this project is

MoneyLens is an **item-level personal spending tracker** for Indian users. It understands *what you bought*, not just *what you paid*. A ₹948 Blinkit transaction becomes: milk ₹136, almonds ₹349 (Supplements), dettol ₹135 (Beauty), bread ₹52.

It has two codebases:
1. **Web PWA** (`web/` → deployed to `docs/` via GitHub Pages)
2. **iOS native app** (`MoneyLens/` — SwiftUI + Swift Package domain layer)

Both share the same logical data model and parsing strategy but are implemented independently.

---

## Repo structure (key files only)

```
web/app.js              ← ENTIRE web app: state, parsers, analytics, all UI
web/styles.css          ← CSS; mostly token-based dark theme
web/index.html          ← minimal shell; no framework
web/service-worker.js   ← offline cache (bump CACHE_NAME after big JS changes)
docs/                   ← auto-generated from web/ by `npm run build`; never edit directly

MoneyLens/Domain/
  SpendingModels.swift        ← SpendTransaction, LineItem, CategorySpend etc.
  SpendCategory.swift         ← enum of categories with SF Symbols
  SpendingAnalyzer.swift      ← monthlyTotal, categoryBreakdown, priceIncreaseInsights
  ReceiptImportParser.swift   ← same 3-parser logic as web/app.js
  CategoryLearner.swift       ← UserDefaults-backed learned keyword→category rules
  SampleData.swift            ← June 2026 test transactions

MoneyLens/Services/
  SpendingStore.swift         ← ObservableObject, JSON file persistence
  ReceiptTextRecognizer.swift ← Vision OCR wrapper

MoneyLens/Views/              ← SwiftUI screens
  MoneyLensTheme.swift        ← design tokens, reusable card/section components

ARCHITECTURE.md    ← full technical architecture (file structure, data flow, key functions)
PRODUCT.md         ← business context, target user, feature areas, roadmap
PARSER.md          ← parser logic, format detection, category inference, edge cases
DATA_MODEL.md      ← schemas for all data types and localStorage keys
DEPLOY.md          ← step-by-step deploy guide for the web app
LLM_CONTEXT.md     ← this file
```

---

## The web app in 60 seconds

**Architecture:** No framework. One `state` object, one `render()` function (replaces `#app` innerHTML), one `bindEvents()` after each render.

**Parser pipeline:**
```
text → detectFormat() → "upi"|"pdf"|"order"
     → parseUPIPayment()    ← Google Pay/PhonePe screenshots
     → parsePDFInvoice()    ← Blinkit/Zomato GST tax invoices
     → parseOrderSummary()  ← Swiggy OCR, Amazon email, Zomato email
```

**PDF handling:** PDF.js loaded dynamically from CDN on first use. Upload PDF → text extracted → `parseReceipt()` runs automatically → parsed card shown.

**Category system:**
- `BUILTIN_CATEGORIES`: 16 categories `{ id, name, emoji, color }`
- Custom categories: user-created, stored in `localStorage["moneylens.custom_cats"]`
- `allCategories()` merges both
- Inference: learned rules → keyword rules → heuristics → fallback "Shopping" (low confidence)

**Key analytics functions:**
- `totalsByCategory()` — sums item prices by category; filters items where `price >= tx.amount` to prevent double-counting
- `totalsByMerchant()` — sums tx.amount per merchant
- `computePriceInsights()` — finds items that cost more in a later order

**localStorage keys:**
- `moneylens.transactions` — array of SpendTransaction objects
- `moneylens.learned_categories` — `[keyword, categoryId][]` Map entries
- `moneylens.custom_cats` — user-created categories

**Charts:** Clicking the donut opens `showChartDetailSheet()` — a bottom-sheet overlay with a large donut, category % bars, monthly trend, top purchases, and a custom-category CTA. `showAddCategoryModal()` has emoji picker, color picker, and live preview.

---

## The iOS app in 60 seconds

**Architecture:** `SpendingStore` (ObservableObject) → all views via `@EnvironmentObject`. Navigation: `TabView` → 4 `NavigationStack`s.

**Domain layer** (`MoneyLensCore` Swift Package):
- `SpendingAnalyzer` — pure functions, testable, calendar-aware
- `ReceiptImportParser` — same logic as web parser, plus `preJoinMultiLineItems()` for multi-line OCR
- `CategoryLearner` — singleton, UserDefaults, `learn(keyword:category:)` + `category(for:)`

**Persistence:** JSON file at `~/Documents/moneylens_transactions.json`. Atomic write. ISO 8601 dates. iCloud Backup automatic.

**OCR:** `ReceiptTextRecognizer.recognizeText(in:)` wraps `VNRecognizeTextRequest`, async/await.

---

## Common tasks for LLMs

### "Add a new category to the web app"
1. Add to `BUILTIN_CATEGORIES` in `web/app.js`: `{ id: "Pets", name: "Pets", emoji: "🐾", color: "#FBBF24" }`
2. Add keywords to `CATEGORY_RULES`: `["Pets", ["pet food","dog food","cat food","veterinary","vet","grooming"]]`
3. Run `npm run build`

### "Add a new merchant to the parser"
Add to the `known` array in `detectMerchantName()`:
```js
["Zepto", ["zepto"]],
["BigBasket", ["bigbasket", "supermart"]],
```

### "Fix a parsing bug for a specific receipt format"
1. Identify which parser runs: check `detectFormat()` output
2. Find the relevant parser function (`parseUPIPayment`, `parsePDFInvoice`, `parseOrderSummary`)
3. Add a test string to `MoneyLens/Checks/main.swift` as a `precondition`
4. Run `swift run MoneyLensChecks` to verify

### "Add a new analytics metric to the dashboard"
1. Write a pure function `computeXxx(transactions) → data`
2. Call it inside `dashboard()` and render as HTML
3. The function is automatically called on every `render()` — no subscription needed

### "Add a new screen"
1. Add a tab ID to the `[["dashboard",...], ["orders",...]]` array in `render()`
2. Write a `function myScreen() { return `<div>...</div>`; }`
3. Add `{state.tab === "myscreen" && myScreen()}` in the `<main>` section of `render()`
4. Add event bindings in `bindEvents()` if needed

---

## Critical constraints to remember

1. **Never edit `docs/` directly.** It's overwritten by `npm run build`. Always edit `web/` and build.
2. **The double-count guard is in `totalsByCategory()`** — filters `i.price < tx.amount`. Do not remove it; it prevents "Grand Total" mis-parses from inflating category totals.
3. **category.id must be stable.** Changing a built-in category id breaks existing saved transactions that store the old id. If renaming, add a migration shim in `loadTransactions()`.
4. **iOS and web are independent.** Changes to web/app.js do not affect the iOS app and vice versa.
5. **No position: fixed in Claude artifacts.** The web app deploys fine with `position: fixed` for modals, but if building Claude artifact previews, use `position: absolute` instead.
6. **PDF.js needs internet on first use.** The service worker caches the app shell but not the PDF.js CDN script. Fully offline PDF parsing is not supported.

---

## Design system (web)

```css
--teal:   #00C9A7   /* primary accent; buttons, active states */
--purp:   #7C5CF0   /* Shopping category */
--red:    #EF4444   /* Bills, price alerts */
--orange: #F97316   /* Food category */
--screen: #080B14   /* app background */
--card:   rgba(255,255,255,0.055)  /* card surface */
--border: rgba(255,255,255,0.1)    /* card border */
--text:   #F0F2F5   /* primary text */
--muted:  rgba(240,242,245,0.46)   /* secondary text, labels */
```

Cards: `background: var(--card); border: 0.5px solid var(--border); border-radius: 14px; padding: 11px 13px`

---

## Testing

```bash
# Web: local preview
npm run build && npm run preview

# iOS: framework-free logic checks
swift run MoneyLensChecks

# iOS: full test suite (requires Xcode)
swift test
```

The `MoneyLensChecks` target runs these assertions on `SampleData.transactions`:
- June monthly total = ₹9,505
- Beauty spend = ₹834 (Vitamin C Serum + Dettol Handwash)
- Supplements spend = ₹1,248 (Magnesium Glycinate + Farmley Almonds)
- Greek Yogurt price alert detected (₹80 → ₹95 = +18.75%)
- Blinkit order parsed correctly from raw text
