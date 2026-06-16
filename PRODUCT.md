# MoneyLens — Product & Business Reference

> Context file for designers, PMs, and LLMs working on product direction.
> Answers: what is this, who is it for, why does it exist, where is it going.

---

## One-sentence pitch

MoneyLens is an itemized personal spending tracker that understands what you actually bought — not just which app you paid through.

---

## The problem

Indian payment apps (Google Pay, CRED, Paytm) tell you *how much* you spent and *where*. They don't tell you *what* you bought. A ₹948 Blinkit transaction is recorded as one blob — not as milk (₹136), almonds (₹349), dettol (₹135), and bread (₹52).

This makes meaningful spending analysis impossible. You can't:
- See that 40% of your grocery spend is actually supplements and beauty items
- Notice that Greek Yogurt has gone up 19% on Blinkit over two months
- Know your actual food vs household vs wellness split

---

## Target user

**Primary:** Urban Indian knowledge worker, 25–38, Pune/Bengaluru/Mumbai.
- Orders 4–10 times/month from Swiggy, Blinkit, Amazon, Zomato
- Already conscious about spending but lacks itemized visibility
- Uses CRED, Google Pay, or UPI natively
- Comfortable enough to paste order text into an app

**Not (yet):** Someone wanting automated bank feed sync, family budgeting, or tax filing support.

---

## Core user journey (happy path)

```
1. Receive Blinkit delivery → open the order in Blinkit app
2. Tap "Share" → paste the order text into MoneyLens Import
3. MoneyLens parses merchant, items, prices, categories
4. User confirms one uncertain category (Makhana → Supplements)
5. Order saved; dashboard updates; category split is now accurate
```

Secondary path (PDF invoice):
```
1. Receive Blinkit/Zomato GST invoice email
2. Download the PDF → open MoneyLens Import → tap 📄 → select PDF
3. PDF.js extracts the text automatically; parser runs; result shown
4. User reviews and saves
```

---

## Feature areas

### Import (current)
- Paste raw text from any order confirmation
- Upload PDF (auto-extracted via PDF.js in browser, Vision on iOS)
- Screenshot upload with user-guided copy-paste (no browser OCR)
- Auto-detects format: UPI payment receipt vs GST tax invoice vs order summary
- Parser handles: Blinkit, Swiggy, Zomato, Amazon, Google Pay, Paytm

### Categorization (current)
- 16 built-in categories with emoji icons and color identities
- 3-layer inference: user-learned rules → keyword lists → word-shape heuristics
- Confidence system: high / medium / low (low → shows "?" badge, triggers review)
- User can review uncertain items and confirm — choices are remembered
- User can create unlimited custom categories (name + emoji + color)

### Dashboard (current)
- All-time total + order/merchant/avg stats
- Category donut chart → taps open chart detail sheet
- Top merchants horizontal bars
- Recent orders list

### Chart detail sheet (current)
- 4-stat grid: total, orders, merchants, line items
- Large donut with percentage breakdown
- Category horizontal bars with % labels
- Monthly spend trend (hidden until 2+ months of data)
- Average order insight card
- Top 8 purchases list
- Create custom category shortcut

### Insights (current)
- Real price-change alerts: computed from actual transaction data (same item, same merchant, different price on different orders)
- Top category and top merchant summaries
- Average order size
- Import method guide

### Orders (current)
- Full transaction list with category icons
- Inline edit: category (from full category list including custom) + amount
- Delete with confirmation

---

## Privacy principles

1. **No backend.** All data lives in the user's browser (`localStorage`) or iOS `~/Documents`. Nothing is sent anywhere.
2. **No auth.** No accounts, no passwords, no email.
3. **No tracking.** No analytics, no crash reporting, no ad network.
4. **PDF.js CDN.** The only external request is the PDF.js library on first PDF upload. The PDF content itself never leaves the device.
5. **Export-ready.** Transactions are stored as plain JSON — trivial to export or migrate.

---

## Competitive context

| Product | Itemized? | Auto-sync? | Privacy |
|---|---|---|---|
| CRED | ❌ transaction level | ✅ bank/card | ☁️ cloud |
| Walnut | ❌ transaction level | ✅ SMS parse | ☁️ cloud |
| Money View | ❌ transaction level | ✅ bank feed | ☁️ cloud |
| Splitwise | ❌ manual entry | ❌ | ☁️ cloud |
| **MoneyLens** | **✅ item level** | **⚙️ semi-auto** | **🔒 local-only** |

The gap MoneyLens fills: *item-level* understanding, *local-first* privacy, *receipt-based* (not bank-feed-based) accuracy.

---

## Import method roadmap

| Method | Status | Notes |
|---|---|---|
| Paste text | ✅ Live | Works for any order confirmation text |
| PDF upload (browser) | ✅ Live | PDF.js via CDN |
| Screenshot + copy | ✅ Live (iOS) | Vision OCR on iOS, manual copy-paste on web |
| iOS share sheet | 🔲 Next | Implement Share Extension target in Xcode |
| Email import | 🔲 Planned | IMAP connector or Gmail OAuth |
| Bank feed (statement PDF) | 🔲 Planned | Parse HDFC/ICICI/SBI PDF statements |
| Merchant API | 🔲 Future | Direct itemized data where APIs exist |

---

## Monetization opportunities (not yet implemented)

These are directions to evaluate — none are committed:

1. **One-time purchase / tip jar** — Low friction, aligned with privacy values. Keep it free with an optional "buy me a coffee" IAP.
2. **iCloud Sync IAP** — Data sync across devices via iCloud Container. ₹99–199/year tier.
3. **Pro analytics** — Monthly reports as PDF, budget targets, custom date ranges. ₹299/year.
4. **Business expense tracking** — Team use, per-seat model.
5. **White-label API** — Sell the receipt parser as an API to fintech startups.

---

## Design principles

1. **Item-level is the core.** A transaction without items is just a number. Every import path should strive for itemization.
2. **Confidence transparency.** Never silently miscategorize. Surface uncertainty with "?" badges and let the user decide.
3. **Dark, dense, fast.** The UI is inspired by Fold Money — dark background, teal accents, compact cards, no wasted whitespace.
4. **Learn from corrections.** Every user-confirmed category teaches the parser. The app gets smarter per user, locally.
5. **No dark patterns.** No engagement loops, no "keep using the app" prompts, no upsell popups. Utility only.

---

## Open questions / product decisions

- Should the dashboard show current-month only or all-time totals? (Current: all-time, to always show data)
- Should duplicate detection use fuzzy matching or exact merchant+amount+date? (Current: exact)
- At what point should we prompt for iCloud/cloud backup? (Currently: never — local only)
- Should custom categories sync across devices? (Currently: no — localStorage only)
