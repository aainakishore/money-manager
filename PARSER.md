# MoneyLens — Parser Reference

> How the receipt parser works: format detection, three parser implementations,
> category inference pipeline, confidence levels, and known edge cases.
> Applies to both `web/app.js` and `MoneyLens/Domain/ReceiptImportParser.swift` (same logic, different language).

---

## Overview

```
receiptText (string)
      │
      ▼
  detectFormat(text)
      │
      ├─ "upi"   → parseUPIPayment(text)
      ├─ "pdf"   → parsePDFInvoice(text)
      └─ "order" → parseOrderSummary(text)
                        │
                        ├─ detectMerchantName(text)
                        ├─ find total (regex, multi-pattern)
                        ├─ extract items line-by-line
                        ├─ Amazon fallback (product after "Arriving")
                        └─ deduplicate items
      │
      ▼
  { id, merchant, amount, date, category, items[] }
```

---

## Format detection

`detectFormat(text)` checks for signal phrases in order of specificity:

| Signal | Format |
|---|---|
| "upi transaction id", "upi lite", "google transaction id", "phonepay" | `"upi"` |
| ("tax invoice" OR "invoice no") AND ("hsn" OR "invoice value" OR "sgst") | `"pdf"` |
| everything else | `"order"` |

UPI and PDF signals are checked first because order-summary text can also mention "total", "paid", etc.

---

## UPI payment parser

Handles: Google Pay receipts, PhonePe receipts, Paytm payment confirmations.

**What it extracts:**
- Payee name: first line matching `^To:?\s+([^\n₹\d]+)`
- Amount: first `₹ NNN.NN` in the text
- Date: first date-shaped string `\d{1,2}\s+\w+\s+\d{4}`
- Category: inferred from payee name (e.g. "Varad Salon And Academy" → Beauty)

**Output:** Single-item transaction; item name is "Payment to {payee}".

**Example input (Google Pay):**
```
To Varad Salon And Academy
₹100
Completed
14 Jun 2026, 8:01pm
UPI Lite - ICICI Bank 6730
UPI transaction ID: 653131169746
```

---

## PDF invoice parser

Handles: Blinkit GST tax invoices, Zomato/Eternal restaurant invoices, Amazon seller invoices.

**Total detection** (two strategies, tried in order):
1. `invoice\s+value\s+([\d,]+)` → captures base amount; then scans the next 200 chars for a standalone number larger than the base (Blinkit adds a handling fee on a separate line, giving a slightly higher final total)
2. `\bTotal\s+([\d,]+)` → generic fallback

**Item extraction:**
Scans line by line. Skips lines that start with blocked terms ("total", "invoice", "tax", "gst", "handling", "delivery", "discount", "amount in words", "cgst", "sgst"). Matches numbered item rows with this pattern:
```
^\d+\.\s+(.+?)\s+(?:\d+\s+NOS\s+)?(?:\d{4,}\s+)?[\d.]+(?:\s+[\d.]+){3,}\s+(\d+)$
```
Captures: item name (group 1), final amount (last integer on the line, group 2).

**Blinkit PDF quirk:** A single Blinkit order may arrive as 3 separate PDFs (one per seller entity, one for the handling fee). The parser handles each PDF independently; the user imports them separately and they become separate transactions. Merging multi-seller Blinkit invoices into one is a known limitation.

**Zomato restaurant invoice quirk:** Eternal/Zomato issues separate invoices for the restaurant service, the platform fee, and delivery. The restaurant invoice is the useful one (contains the food items).

---

## Order summary parser

Handles: Swiggy OCR screenshots, Zomato email receipts, Amazon order confirmation emails, generic order summaries.

### Step 1: merchant detection

`detectMerchantName(text)` checks a known-merchant table:

| Display name | Signal strings |
|---|---|
| Blinkit | "blinkit", "blink commerce" |
| Amazon | "amazon" |
| Swiggy | "swiggy" |
| Zomato | "zomato", "eternal" |
| Myntra | "myntra" |
| Nykaa | "nykaa" |
| CRED | "cred" |
| Paytm | "paytm" |
| Zepto | "zepto" |

If no match and format is "order", context hints apply:
- "luckybite", "swiggy one", "bill total" → Swiggy
- "eternal", "zomato gold", "getoff", "amznpay" → Zomato

### Step 2: total detection

Multi-pattern regex (tried in order):
```js
/(?:bill\s+total|grand\s+total|order\s+total|total\s+paid|amount\s+paid|net\s+payable|total)[:\s\n]+(?:rs\.?|₹|inr)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i
```
The `\n` in `[:\s\n]+` handles Amazon's format where the label and the amount are on separate lines:
```
Grand Total:
₹3,502.35
```

### Step 3: item extraction

Line-by-line regex:
```js
/^(.+?)\s+(?:x\s*(\d+)\s+)?(?:rs\.?|₹|inr)\s*([0-9,]+(?:\.[0-9]{1,2})?)/gim
```
Captures: item name, optional quantity (`x2`, `x 3`), unit price.

**Blocked name prefixes** (lines starting with these are skipped):
```
"total", "paid", "order", "invoice", "tax", "gst", "delivery", "discount",
"coupon", "platform", "packaging", "restaurant packaging", "handling",
"membership", "express", "surge", "grand", "item(s)", "item total",
"subtotal", "marketplace", "shipping", "arriving", "ship to", "sold by",
"payment method", "amount", "free delivery", "extra discount", "taxes",
"bill total", "net payable", "restaurant pack", <merchant name>
```

Item price validity: only items with `price > 0` are kept (fees, free items excluded).

**Double-counting guard (critical):** Items where `price >= tx.amount` are filtered out in `totalsByCategory()`. This catches cases where "Grand Total" was accidentally parsed as an item.

### Step 4: Amazon fallback

Amazon order emails have prices on their own lines (not on the same line as the product name), so the standard regex captures nothing. Fallback:
1. Find the line starting with "Arriving" (marks the product section)
2. Scan subsequent lines for the first line that is: length > 20, no price symbol, not an address/metadata line
3. Create one item with that name and the total amount

**Amazon line skip patterns:**
```
/^(ship\s+to|sold\s+by|payment|order|<customer name>|tinsel|pune|india|maharashtra|tower|hinjawadi|\d{3,})/i
```

### Step 5: deduplication

After parsing, items are deduplicated by `name.toLowerCase().trim()`. Amazon order emails commonly repeat the product title twice (once as a heading, once as a link). This removes the duplicate before the review modal shows it.

---

## Category inference pipeline

`inferCategoryWithConfidence(text)` returns `{ category: string, confidence: "high"|"medium"|"low" }`.

### Layer 1 — user-learned rules (UserDefaults / localStorage)

Checked first. If the user previously confirmed that "Chicnutrix Glow" → Supplements, that mapping fires as `confidence: "high"` for any future text containing those words.

Storage key: `moneylens.learned_categories` (web), `UserDefaults["moneylens.learned_categories"]` (iOS).

Rule learning: triggered when user confirms an uncertain item in the review modal. The rule stores the first 3 words of the item name.

### Layer 2a — keyword rules

`CATEGORY_RULES` maps category IDs to keyword arrays. First match wins. Confidence: `"medium"`.

Order matters — more specific categories are checked first (Subscriptions, Transport, Bills, Beauty, Supplements, Food, Groceries, Clothing, Electronics, Medical, Fitness, Travel, Entertainment, Education, Shopping).

### Layer 2b — word-shape heuristics

Regex patterns for categories that don't fit clean keywords:
- Beauty: `\b(lip |lash |brow |blush|contour|primer|concealer)\b`
- Beauty (hygiene): `\b(wash|clean|care|groom|lotion|gel|foam|spray|powder|wipe|pad|razor)\b`
- Supplements: `\b(capsule|tablet|syrup|drops|health|wellness|ayurved|herbal)\b`
- Groceries: `\b(masala|pickle|papad|chutney|seeds?|nuts?|dry\s*fruit|roasted|organic)\b`
- Clothing: `\b(wear|cloth|saree|kurta|fabric|dupatta|dhoti)\b`

### Layer 3 — fallback

Returns `{ category: "Shopping", confidence: "low" }`. Low confidence triggers the "?" badge in the import preview and adds the item to the uncertain items list for the review modal.

---

## Confidence levels

| Level | Meaning | UI |
|---|---|---|
| `"high"` | Learned rule or very strong keyword match | No indicator |
| `"medium"` | Keyword list or heuristic match | No indicator |
| `"low"` | No match — default to Shopping | "?" orange badge; appears in review modal |

---

## Pre-joining multi-line items (iOS parser only)

Some Blinkit OCR results have item name, size/weight, and price on separate lines:
```
Amul Taaza Milk
500 ml x 2
₹72
```

`ReceiptImportParser.preJoinMultiLineItems()` detects a size line (`\d[\s.]*(?:g|kg|ml|l|pcs?)`) and a price line (`^(?:₹|rs\.?)`) and joins them with the item name before parsing.

The web parser uses a simpler single-line approach since most text inputs (copy-paste, PDF extraction) already have prices on the same line.

---

## Dominant category resolution

After all items are parsed, `dominantCategory(items)` finds the category with the highest *total spend* (not count). Example: if a Blinkit order has 2 grocery items (₹150 total) and 1 supplement item (₹349), the transaction category is "Supplements".

---

## Known limitations

1. **Blinkit multi-seller PDFs:** A single order produces 2–3 PDFs (one per seller + handling fee). Currently parsed as separate transactions. Future: detect same order ID across PDFs and merge.
2. **Swiggy restaurant name:** Swiggy OCR shows the restaurant name prominently but the actual platform is Swiggy. Detected via context hints ("swiggy one", "bill total", "luckybite").
3. **Amazon multi-item orders:** Amazon sends one email per shipment, not per order. An order with items from different sellers → multiple emails. Each parses as one transaction with one item (the Amazon fallback captures the first product title and uses the shipment subtotal).
4. **Scanned PDFs:** PDF.js can only extract text from text-layer PDFs. Scanned/image PDFs (photographed receipts saved as PDF) return empty text. The app detects this and shows a helpful error.
5. **Handwritten receipts:** Not supported. Vision framework handles printed text only.
6. **Foreign currency:** Amount extraction assumes INR (₹). Multi-currency support is not implemented.
