# MoneyLens — Architecture Reference

> Context file for developers and LLMs working in this repo.
> Last updated to reflect: PDF.js client-side parsing, elaborate category system, chart detail sheet, custom categories.

---

## System overview

MoneyLens has two independent codebases that share a domain model:

```
MoneyLens/
├── web/               ← PWA (deployed to GitHub Pages via docs/)
│   ├── app.js         ← entire app: state, parsers, analytics, UI rendering
│   ├── styles.css     ← all visual styling
│   ├── index.html     ← shell; no frameworks, no bundler
│   ├── service-worker.js  ← offline cache
│   └── manifest.webmanifest
│
├── MoneyLens/         ← native iOS app (SwiftUI)
│   ├── App/           ← entry point, UIKit appearances
│   ├── Domain/        ← pure Swift models + logic (no UIKit)
│   │   ├── SpendingModels.swift      ← SpendTransaction, LineItem, CategorySpend
│   │   ├── SpendCategory.swift       ← enum of categories
│   │   ├── SpendingAnalyzer.swift    ← analytics: totals, category breakdown, price insights
│   │   ├── ReceiptImportParser.swift ← format detection + all three parsers
│   │   ├── CategoryLearner.swift     ← user-confirmed category rules, UserDefaults
│   │   └── SampleData.swift         ← realistic June 2026 fixture data
│   ├── Services/      ← side-effectful services
│   │   ├── SpendingStore.swift       ← ObservableObject, JSON persistence to ~/Documents
│   │   ├── AppFormatters.swift       ← INR currency formatter, date formatter
│   │   └── ReceiptTextRecognizer.swift  ← Vision framework OCR
│   └── Views/         ← SwiftUI screens and components
│       ├── ContentView.swift         ← TabView root
│       ├── DashboardView.swift       ← spending summary, donut, merchant bars
│       ├── TransactionsView.swift    ← list of orders with delete
│       ├── TransactionDetailView.swift  ← line items, category picker, confidence
│       ├── ImportView.swift          ← paste, photo picker, OCR trigger
│       ├── InsightsView.swift        ← price alerts, tips, source plan
│       ├── MoneyLensTheme.swift      ← design tokens, card views, reusable components
│       └── SourcesView.swift         ← data source status list
│
├── MoneyLens/Domain/  ← also a Swift Package target (MoneyLensCore)
│   └── ...            ← imported by iOS app and by MoneyLensChecks
│
├── Tests/MoneyLensCoreTests/  ← XCTest suite for domain logic
├── MoneyLens/Checks/  ← framework-free correctness checks (swift run MoneyLensChecks)
├── scripts/           ← Node build scripts
│   ├── build-web.mjs  ← copies web/ → docs/ and dist/
│   └── preview-web.mjs ← minimal HTTP server for local preview
├── docs/              ← GitHub Pages root (auto-generated; never edit directly)
└── .github/workflows/deploy.yml  ← auto-deploys docs/ to Pages on push to main
```

---

## Web app architecture

### State machine

The web app is intentionally framework-free: one global `state` object, one `render()` that replaces `#app` innerHTML, one `bindEvents()` that attaches listeners after each render.

```js
const state = {
  tab: "dashboard" | "orders" | "import" | "insights",
  receiptText: string,      // current textarea content
  parsed: ParsedOrder | null,  // result of last parse, shown in import screen
  transactions: SpendTransaction[]  // loaded from localStorage, source of truth
};
```

Every user action mutates `state` then calls `render()`. The pattern is intentionally simple — adding React or Signals is a future option but not needed yet.

### Data flow

```
User pastes text / uploads PDF
       ↓
extractPDFText(file) [PDF.js, dynamic CDN load]
       ↓
parseReceipt(text)
  → detectFormat()         → "upi" | "pdf" | "order"
  → parseUPIPayment()      → handles Google Pay, PhonePe screenshots
  → parsePDFInvoice()      → handles Blinkit/Zomato GST invoices
  → parseOrderSummary()    → handles Swiggy, Zomato, Amazon order emails
       ↓
result: { id, merchant, amount, date, category, items[] }
       ↓
User reviews, edits category, taps Save
       ↓
state.transactions.unshift(result)
saveTransactions() → localStorage["moneylens.transactions"]
state.tab = "dashboard"; render()
```

### Category system

Categories are the single most important classification in the app. The system has three layers:

**Layer 0 — registry:**  
`BUILTIN_CATEGORIES` is an array of `{ id, name, emoji, color }`. Custom categories (user-created) are stored in `localStorage["moneylens.custom_cats"]` and appended at runtime. `allCategories()` returns the merged list.

**Layer 1 — inference (keyword rules):**  
`CATEGORY_RULES` maps category IDs to keyword lists. `inferCategoryWithConfidence(text)` checks user-learned rules first, then the keyword list, then word-shape regexes, and returns `{ category, confidence: "high"|"medium"|"low" }`.

**Layer 2 — user learning:**  
When a user confirms an uncertain category in the review modal, `saveLearnedRule(keyword, category)` persists a `"itemName → categoryId"` mapping in `localStorage["moneylens.learned_categories"]`. On future imports, learned rules win over keyword rules.

### Analytics functions

| Function | Returns | Used by |
|---|---|---|
| `totalsByCategory()` | top-8 categories by spend, with `{id, name, emoji, color, value}` | dashboard donut, chart sheet |
| `totalsByMerchant()` | top-5 merchants by transaction total | dashboard bars |
| `computePriceInsights()` | items where unit price rose ≥10% between appearances | Insights tab |
| `findDuplicate(candidate)` | existing tx with same merchant + amount + date | save guard |

**Double-counting fix (critical):**  
`totalsByCategory` filters `validItems = tx.items.filter(i => i.price > 0 && i.price < tx.amount)` before summing. This prevents "Grand Total" lines accidentally parsed as items from inflating category totals.

### PDF extraction

PDF.js is loaded dynamically on first use — no `<script>` tag in `index.html` required:

```js
async function ensurePDFJS() {
  if (window.pdfjsLib) return;
  // dynamic <script> injection from cdnjs CDN
}

async function extractPDFText(file) {
  await ensurePDFJS();
  const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  // iterate pages, join item strings, return full text
}
```

The extracted text is placed in `state.receiptText` and `parseReceipt()` is called automatically. The user sees both the extracted text (editable) and the parsed result.

### Chart detail sheet

`showChartDetailSheet(categories, total, transactions)` builds a bottom sheet (position:fixed overlay) with:
- 4-stat summary grid (total, orders, merchants, line items)
- 136px donut chart with centered total
- Horizontal category bars with percentage labels
- Monthly trend (horizontal bar per month, hidden if <2 months)
- Average order insight card
- Top 8 purchases list
- "Create custom category" CTA

### Custom category modal

`showAddCategoryModal()` presents:
- Live preview tile (updates on every keystroke and click)
- Text input for name
- 40-emoji palette grid
- 16-color palette grid
- Save → generates `id = name.replace(/\s+/g, "_")` and calls `saveCustomCategory()`

---

## iOS app architecture

### Domain layer (MoneyLensCore Swift Package)

Pure value types, no UIKit, testable in isolation:

- `SpendTransaction` — Codable struct: id, date, merchant, sourceApp, paymentApp?, amount, currencyCode, category, source, items, confidence
- `LineItem` — Codable struct: id, name, quantity, unitPrice, category, categoryConfidence, sku?
- `SpendCategory` — enum with rawValue strings, SF Symbol names, display titles
- `SpendingAnalyzer` — struct with calendar; methods: `monthlyTotal`, `categoryBreakdown`, `merchantBreakdown`, `priceIncreaseInsights`
- `ReceiptImportParser` — struct; same three-parser architecture as web (UPI, PDF tax invoice, order summary)
- `CategoryLearner` — singleton; UserDefaults-backed keyword→category map

### Service layer

- `SpendingStore: ObservableObject` — loads from `~/Documents/moneylens_transactions.json`, publishes `transactions`, `monthlyTotal`, `categoryBreakdown`, `merchantBreakdown`, `priceInsights`
- `ReceiptTextRecognizer` — async wrapper around Vision `VNRecognizeTextRequest`

### View layer (SwiftUI)

All screens receive data via `@EnvironmentObject var store: SpendingStore`. State for UI concerns lives in `@State`. Navigation is handled by `NavigationStack` within each tab. The design system lives in `MoneyLensTheme.swift` (colors, card styles, section labels, screen wrapper with scroll + toolbar styling).

---

## Build system

### Web build

```bash
npm run build   # runs scripts/build-web.mjs
                # rm -rf docs/ dist/
                # cp -r web/ docs/
                # cp -r web/ dist/
```

**Never edit `docs/` directly** — it's overwritten on every build.

### iOS build

Open `MoneyLens.xcodeproj` in Xcode. The project references `MoneyLensCore` as a local Swift Package via `Package.swift`. Unit tests live in `Tests/MoneyLensCoreTests/`.

Framework-free logic checks (no Xcode needed):
```bash
swift run MoneyLensChecks
```

---

## Deployment

### Web (GitHub Pages)

`.github/workflows/deploy.yml` triggers on push to `main`:
1. Checkout
2. Upload `docs/` as Pages artifact
3. Deploy to `https://<user>.github.io/<repo>/`

The service worker (`docs/service-worker.js`) uses cache `"money-lens-v4"`. Bump the version string when pushing breaking CSS/JS changes so clients get fresh assets.

### iOS (personal device)

1. Xcode → your device → Run (free cert, 7-day expiry)
2. Or: Apple Developer Program → TestFlight (permanent, shareable)
3. Or: AltStore sideload of a compiled `.ipa` (free, 7-day expiry)

---

## localStorage schema

| Key | Type | Description |
|---|---|---|
| `moneylens.transactions` | `SpendTransaction[]` JSON | All saved orders |
| `moneylens.learned_categories` | `[string, string][]` (Map entries) | User-confirmed keyword→categoryId rules |
| `moneylens.custom_cats` | `Category[]` JSON | User-created categories |

---

## Environment constraints

- No backend, no auth, no analytics
- All parsing runs client-side in the browser
- PDF.js worker loaded from `cdnjs.cloudflare.com` (requires internet on first PDF upload)
- Image OCR is not available in the PWA — Vision framework (iOS) is the only OCR path
- The iOS app cannot read private data from other installed apps (iOS sandbox); import requires user action (share sheet, paste, photos)
