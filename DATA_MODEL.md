# MoneyLens — Data Model Reference

> Canonical schemas for all data structures, localStorage keys, and computed types.
> Web (JS) and iOS (Swift) implementations share the same logical model.

---

## Core types

### SpendTransaction

The primary data unit. Each saved order is one transaction.

```ts
// TypeScript-style definition (used in web/app.js as plain objects)
interface SpendTransaction {
  id: string;           // crypto.randomUUID() — stable identifier
  merchant: string;     // "Blinkit" | "Amazon" | "Swiggy" | ... | "Unknown"
  amount: number;       // Total paid (INR). Source of truth for dashboard totals.
  date: string;         // "Jun 12" | "14 Jun 2026" | "Today"
  category: string;     // Category ID — matches a Category.id
  items: LineItem[];    // May be empty for UPI payments with no itemization
}
```

```swift
// Swift equivalent (MoneyLens/Domain/SpendingModels.swift)
struct SpendTransaction: Codable, Hashable, Identifiable {
  var id: UUID
  var date: Date
  var merchant: String
  var sourceApp: String
  var paymentApp: String?
  var amount: Decimal
  var currencyCode: String        // "INR"
  var category: SpendCategory
  var source: TransactionSource
  var items: [LineItem]
  var confidence: Double          // 0.0–1.0 parse confidence
}
```

**Important constraints:**
- `amount` is always the transaction-level total (what was actually paid)
- `items` may not sum to `amount` (delivery fees, taxes, discounts may not be itemized)
- If `items` is empty, the full `amount` is attributed to `category` in analytics
- `category` stores the **dominant** category of the items (highest spend), not necessarily the merchant's primary category

---

### LineItem

A single product within a transaction.

```ts
interface LineItem {
  name: string;           // Product name as parsed from receipt
  price: number;          // Total price (unitPrice × quantity)
  quantity: number;       // Default 1; extracted from "x2" or "2 NOS" patterns
  category: string;       // Category ID
  confidence: "high" | "medium" | "low";
}
```

```swift
struct LineItem: Codable, Hashable, Identifiable {
  var id: UUID
  var name: String
  var quantity: Int
  var unitPrice: Decimal
  var category: SpendCategory
  var categoryConfidence: CategoryConfidence  // .high | .medium | .low
  var sku: String?
  
  var total: Decimal { unitPrice * Decimal(quantity) }
  var normalizedName: String { /* lowercase, strip punctuation */ }
}
```

**Price validity rule:** A LineItem with `price >= tx.amount` is treated as a mis-parsed total line (not a real item) and excluded from category analytics. See `totalsByCategory()` in `web/app.js`.

---

### Category

Used in the web app only. The iOS app uses `SpendCategory` enum.

```ts
interface Category {
  id: string;     // Stable identifier, e.g. "Beauty", "Supplements", "my_custom_id"
  name: string;   // Display label, e.g. "Beauty", "My Custom Category"
  emoji: string;  // Single emoji, e.g. "💄", "🎸"
  color: string;  // Hex color, e.g. "#EC4899"
}
```

Built-in categories are defined in `BUILTIN_CATEGORIES` array. Custom categories are stored in `localStorage["moneylens.custom_cats"]`. `allCategories()` returns the merged list.

**iOS category enum:**
```swift
enum SpendCategory: String, CaseIterable, Codable {
  case groceries, foodDelivery, shopping, beauty, supplements,
       clothing, bills, transport, subscriptions, other
  // + SwiftUI tint color and SF Symbol name computed properties
}
```

---

## localStorage schema (web)

All keys are prefixed with `moneylens.` to avoid collisions.

### `moneylens.transactions`

Array of `SpendTransaction` objects. Written by `saveTransactions()`. Read by `loadTransactions()`. Falls back to `DEFAULT_TRANSACTIONS` if absent or invalid.

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "merchant": "Blinkit",
    "amount": 836,
    "date": "Jun 10",
    "category": "Groceries",
    "items": [
      { "name": "Amul Taaza Milk 1L", "price": 144, "quantity": 2, "category": "Groceries", "confidence": "high" },
      { "name": "Eggs 12 pack",       "price": 115, "quantity": 1, "category": "Groceries", "confidence": "high" }
    ]
  }
]
```

### `moneylens.learned_categories`

JSON array of `[keyword, categoryId]` tuples (serialized Map entries). Written by `saveLearnedRule()`. Read by `learnedRules()`.

```json
[
  ["chicnutrix glow", "Supplements"],
  ["varad salon",     "Beauty"],
  ["farmley almonds", "Supplements"]
]
```

Keys are the **first 3 words** of the item name, lowercased.

### `moneylens.custom_cats`

Array of user-created `Category` objects. Written by `saveCustomCategory()`. Read by `loadCustomCategories()`.

```json
[
  { "id": "Hobbies",   "name": "Hobbies",   "emoji": "🎸", "color": "#A855F7" },
  { "id": "Pet_Care",  "name": "Pet Care",  "emoji": "🐾", "color": "#FBBF24" }
]
```

---

## iOS persistence (Swift)

`SpendingStore` persists to `~/Documents/moneylens_transactions.json`. The file uses:
- ISO 8601 date encoding
- Pretty-printed JSON for debuggability
- Atomic `.atomic` write option to prevent corruption on kill
- Auto-included in iCloud Backup when the user has iCloud enabled

```swift
// File URL
FileManager.default
  .urls(for: .documentDirectory, in: .userDomainMask)[0]
  .appendingPathComponent("moneylens_transactions.json")
```

Learned category rules on iOS live in `UserDefaults.standard` under key `"moneylens.learned_categories"`, serialized as `[String: String]` JSON (keyword → category rawValue).

---

## Computed analytics types

These are derived at read time from `state.transactions`. Never persisted.

### CategorySpend (analytics output)

```ts
interface CategorySpend {
  id: string;      // Category.id
  name: string;    // Display name
  emoji: string;
  color: string;
  value: number;   // Total INR spend in this category
}
```

Produced by `totalsByCategory()`. Uses `validItems` (items where `price < tx.amount`) to avoid double-counting. Returns top 8 by value.

### MerchantSpend (analytics output)

```ts
interface MerchantSpend {
  name: string;
  value: number;
  color: string;  // Derived from colorForMerchant()
}
```

Produced by `totalsByMerchant()`. Uses transaction-level `amount` (not item prices). Returns top 5.

### PriceChangeInsight (analytics output)

```ts
interface PriceChangeInsight {
  itemName: string;
  merchant: string;
  prevPrice: number;
  latestPrice: number;
  pct: number;      // Integer percentage, e.g. 19
}
```

Produced by `computePriceInsights(transactions, minPct = 10)`. Compares unit prices (price ÷ quantity) of the same normalized item name at the same merchant across all transactions, in chronological order.

---

## Migration notes

The web app has no migration system. If the schema changes:
1. Update `loadTransactions()` to handle both old and new shapes
2. Add a one-time migration shim that reads old keys and writes to new structure
3. Bump the service worker cache name (`money-lens-vN`) to force clients to reload

The iOS app uses `JSONDecoder` with `iso8601` date strategy. Adding new optional fields with defaults is backward-compatible. Removing required fields or changing types requires a migration step in `SpendingStore.loadFromDisk()`.

---

## Data dictionary (key fields)

| Field | Where | Meaning |
|---|---|---|
| `tx.amount` | SpendTransaction | What the user actually paid. Used for dashboard total and merchant totals. |
| `item.price` | LineItem | Item total (unit price × qty). Used for category breakdown. |
| `item.confidence` | LineItem | How confident the parser was in the category assignment. Low → show "?" badge. |
| `tx.category` | SpendTransaction | Dominant category (highest spend) across all items. Used as fallback when items array is empty. |
| `category.id` | Category | Stable key used in all stored data. Changing this id breaks existing transactions. |
| `tx.date` | SpendTransaction | Free-form string as parsed from receipt ("Jun 12", "Today", "14 Jun 2026"). Not a Date object in JS. |
