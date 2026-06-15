const T = "#00C9A7";
const V = "#7C5CF0";
const R = "#EF4444";
const O = "#F97316";

const sample = `Blinkit Order
14 Jun 2026
Amul Taaza Milk 1L x2 Rs 72
Eggs 12 pack Rs 115
Greek Yogurt x2 Rs 95
Dishwash Gel Rs 169
Paid with Google Pay
Order Total Rs 618`;

const defaultTransactions = [
  {
    id: crypto.randomUUID(),
    merchant: "CRED",
    amount: 4210,
    date: "Jun 12",
    category: "Bills",
    color: R,
    icon: "▧",
    items: [{ name: "Credit card bill payment", price: 4210 }]
  },
  {
    id: crypto.randomUUID(),
    merchant: "Amazon",
    amount: 2899,
    date: "Jun 7",
    category: "Shopping",
    color: V,
    icon: "◧",
    items: [
      { name: "Minimalist Vitamin C Serum", price: 699 },
      { name: "Running T-Shirt", price: 1300 },
      { name: "Magnesium Glycinate", price: 899 }
    ]
  },
  {
    id: crypto.randomUUID(),
    merchant: "Blinkit",
    amount: 836,
    date: "Jun 10",
    category: "Groceries",
    color: T,
    icon: "◫",
    items: [
      { name: "Amul Taaza Milk 1L", price: 144 },
      { name: "Eggs 12 pack", price: 115 },
      { name: "Greek Yogurt", price: 190 },
      { name: "Dishwash Gel", price: 169 }
    ]
  },
  {
    id: crypto.randomUUID(),
    merchant: "Swiggy",
    amount: 612,
    date: "Jun 4",
    category: "Food",
    color: O,
    icon: "◍",
    items: [
      { name: "Paneer Bowl", price: 249 },
      { name: "Cold Coffee", price: 159 },
      { name: "Delivery and platform fees", price: 84 }
    ]
  },
  {
    id: crypto.randomUUID(),
    merchant: "Blinkit",
    amount: 948,
    date: "Jun 2",
    category: "Groceries",
    color: T,
    icon: "◫",
    items: [
      { name: "Amul Taaza Milk 1L", price: 136 },
      { name: "Tata Salt 1kg", price: 28 },
      { name: "Farmley Almonds 200g", price: 349 },
      { name: "Dettol Handwash Refill", price: 135 },
      { name: "Brown Bread", price: 52 }
    ]
  }
];

const state = {
  tab: "dashboard",
  receiptText: sample,
  parsed: null,
  transactions: loadTransactions()
};

inferCategory._learned = new Map(
  JSON.parse(localStorage.getItem("moneylens.learned_categories") ?? "[]")
);

function loadTransactions() {
  try {
    const saved = JSON.parse(localStorage.getItem("moneylens.transactions") ?? "null");
    return Array.isArray(saved) && saved.length ? saved : defaultTransactions;
  } catch {
    return defaultTransactions;
  }
}

function saveTransactions() {
  localStorage.setItem("moneylens.transactions", JSON.stringify(state.transactions));
}

function fmt(amount) {
  return "₹" + Math.round(amount).toLocaleString("en-IN");
}

// ── Format detection ─────────────────────────────────────────────────────────

function detectFormat(text) {
  const lower = text.toLowerCase();
  if (
    lower.includes("upi transaction id") ||
    lower.includes("upi lite") ||
    lower.includes("google transaction id") ||
    lower.includes("phonepay")
  ) return "upi";
  if (
    (lower.includes("tax invoice") || lower.includes("invoice no")) &&
    (lower.includes("hsn") || lower.includes("invoice value") || lower.includes("sgst"))
  ) return "pdf";
  return "order";
}

// ── Main entry point ─────────────────────────────────────────────────────────

function parseReceipt(text) {
  const format = detectFormat(text);
  if (format === "upi")  return parseUPIPayment(text);
  if (format === "pdf")  return parsePDFInvoice(text);
  return parseOrderSummary(text);
}

function dominantCategory(items) {
  const totals = new Map();
  for (const item of items) {
    totals.set(item.category, (totals.get(item.category) ?? 0) + item.price);
  }
  return [...totals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

function categoryMeta(category) {
  const map = {
    Bills:         { color: "#EF4444", icon: "▧" },
    Shopping:      { color: "#7C5CF0", icon: "◧" },
    Groceries:     { color: "#00C9A7", icon: "◫" },
    Food:          { color: "#F97316", icon: "◍" },
    Beauty:        { color: "#EC4899", icon: "✦" },
    Supplements:   { color: "#34D399", icon: "✚" },
    Transport:     { color: "#06B6D4", icon: "◌" },
    Subscriptions: { color: "#8B5CF6", icon: "◉" }
  };
  return map[category] ?? { color: "#00C9A7", icon: "◌" };
}

function totalsByCategory() {
  const totals = new Map();
  for (const transaction of state.transactions) {
    for (const item of transaction.items.length ? transaction.items : [{ price: transaction.amount, category: transaction.category }]) {
      const category = item.category ?? transaction.category;
      totals.set(category, (totals.get(category) ?? 0) + item.price);
    }
  }
  return [...totals.entries()]
    .map(([name, value]) => ({ name, value, ...categoryMeta(name) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 4);
}

function totalsByMerchant() {
  const totals = new Map();
  for (const transaction of state.transactions) {
    totals.set(transaction.merchant, (totals.get(transaction.merchant) ?? 0) + transaction.amount);
  }
  return [...totals.entries()]
    .map(([name, value]) => ({ name, value, color: colorForMerchant(name) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 4);
}

function colorForMerchant(name) {
  const lower = name.toLowerCase();
  if (lower.includes("cred")) return R;
  if (lower.includes("amazon")) return V;
  if (lower.includes("blinkit")) return T;
  if (lower.includes("swiggy")) return O;
  return T;
}

function renderDonut(categories, total) {
  const circumference = 2 * Math.PI * 42;
  let offset = 0;
  const circles = categories
    .map((cat) => {
      const dash = total ? (cat.value / total) * circumference : 0;
      const circle = `<circle cx="55" cy="55" r="42" fill="none" stroke="${cat.color}" stroke-width="13" stroke-dasharray="${dash} ${circumference - dash}" stroke-dashoffset="${-offset}" />`;
      offset += dash;
      return circle;
    })
    .join("");

  return `
    <div class="donut-wrap">
      <svg width="110" height="110" role="img" aria-label="Spending category breakdown">
        <circle cx="55" cy="55" r="42" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="13"></circle>
        <g transform="rotate(-90 55 55)">${circles}</g>
      </svg>
      <div class="donut-label"><strong>${fmt(total)}</strong><span>June 2026</span></div>
    </div>`;
}

function transactionRow(transaction) {
  return `
    <div class="tx-row">
      <div class="tx-icon" style="background:${transaction.color}22;color:${transaction.color}">${transaction.icon}</div>
      <div class="tx-meta">
        <strong>${transaction.merchant}</strong>
        <span>${transaction.items.length} items - ${transaction.date}</span>
      </div>
      <div class="tx-amount">${fmt(transaction.amount)}</div>
    </div>`;
}

function dashboard() {
  const total = state.transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  const categories = totalsByCategory();
  const merchants = totalsByMerchant();
  const maxMerchant = Math.max(...merchants.map((merchant) => merchant.value), 1);
  return `
    <div class="eyebrow">June 2026 spending</div>
    <div class="hero-row">
      <div class="total">${fmt(total)}</div>
      <div class="pill">91% itemized</div>
    </div>
    <div class="metrics">
      <div class="metric"><strong>${state.transactions.length}</strong><span>Orders</span></div>
      <div class="metric"><strong>3</strong><span>Sources</span></div>
      <div class="metric"><strong>2</strong><span>Alerts</span></div>
    </div>
    <section class="card">
      <div class="section-label">By category</div>
      <div class="category-grid">
        ${renderDonut(categories, total)}
        <div>
          ${categories.map((cat) => `
            <div class="legend-row">
              <div class="legend-left"><span class="dot" style="background:${cat.color}"></span><span>${cat.name}</span></div>
              <div class="amount">${fmt(cat.value)}</div>
            </div>`).join("")}
        </div>
      </div>
    </section>
    <section class="card">
      <div class="section-label">Top merchants</div>
      ${merchants.map((merchant) => `
        <div class="merchant-bar">
          <div class="bar-head"><span>${merchant.name}</span><strong>${fmt(merchant.value)}</strong></div>
          <div class="bar-track"><div class="bar-fill" style="width:${(merchant.value / maxMerchant) * 100}%;background:${merchant.color}"></div></div>
        </div>`).join("")}
    </section>
    <section class="card">
      <div class="section-label">Recent orders</div>
      ${state.transactions.slice(0, 3).map(transactionRow).join("")}
    </section>`;
}

function orders() {
  return `<h1 class="screen-title">Itemized orders</h1><section class="card">${state.transactions.map(transactionRow).join("")}</section>`;
}

function importScreen() {
  return `
    <h1 class="screen-title">Import order</h1>
    <section class="card">
      <label class="eyebrow" for="receiptText">Paste order text from Amazon, Swiggy, Blinkit...</label>
      <textarea id="receiptText" aria-label="Order text">${state.receiptText}</textarea>
      <div class="actions">
        <button class="primary" id="parseText">Parse text</button>
        <label class="secondary file-button" aria-label="Upload screenshot">⌗<input id="imageInput" type="file" accept="image/*" /></label>
        <button class="secondary" id="resetText" aria-label="Reset sample">↺</button>
      </div>
    </section>
    <div id="parsedSlot">${state.parsed ? parsedCard(state.parsed) : ""}</div>
    <p class="eyebrow" id="importStatus">Copy order text or upload a screenshot. Browser OCR varies by device, so paste text is the most reliable first test.</p>`;
}

function parsedCard(parsed) {
  return `
    <section class="card">
      <div class="parsed-head">
        <div><strong>${parsed.merchant}</strong><span>${parsed.items.length} items found</span></div>
        <div class="parsed-total">${fmt(parsed.amount)}</div>
      </div>
      ${parsed.items.slice(0, 5).map((item) => `<div class="item-row"><span>${item.name}</span><strong>${fmt(item.price)}</strong></div>`).join("")}
      <button class="secondary saved" id="saveOrder">Save order</button>
    </section>`;
}

function insights() {
  const alerts = [
    ["Greek Yogurt", 80, 95, 19],
    ["Amul Taaza Milk 1L", 64, 72, 13],
    ["Eggs 12 pack", 98, 115, 17]
  ];
  return `
    <h1 class="screen-title">Insights</h1>
    ${alerts.map(([item, previous, current, pct]) => `
      <section class="card insight-card">
        <div class="insight-top"><span>↗ Price increased - Blinkit</span><strong>+${pct}%</strong></div>
        <h3>${item}</h3>
        <p>${fmt(previous)} to ${fmt(current)}</p>
      </section>`).join("")}
    <section class="card insight-card">
      <h3>Blinkit basket trending up</h3>
      <p>Milk, eggs, and yogurt appear every month. Set a basket budget to catch price drift early.</p>
    </section>
    <section class="card">
      <div class="section-label">Share orders into the app</div>
      ${[
        ["▤", "Copy and paste", "Works now for order confirmations and receipt text."],
        ["↥", "Share extension", "Native iOS next step. For web, use Safari share or paste copied text."],
        ["⌗", "Screenshot upload", "Works now as an upload flow. For OCR, use copied text or add a server/browser OCR engine later."]
      ].map(([icon, title, text]) => `
        <div class="source-row"><div class="source-icon">${icon}</div><div><strong>${title}</strong><p>${text}</p></div></div>`).join("")}
    </section>`;
}

function render() {
  document.querySelector("#app").innerHTML = `
    <div class="app-shell">
      <div class="phone">
        <header class="status" aria-hidden="true"><span>9:41</span><span>◡ ▱</span></header>
        <main class="main">
          <section class="screen ${state.tab === "dashboard" ? "active" : ""}" id="dashboard">${dashboard()}</section>
          <section class="screen ${state.tab === "orders" ? "active" : ""}" id="orders">${orders()}</section>
          <section class="screen ${state.tab === "import" ? "active" : ""}" id="import">${importScreen()}</section>
          <section class="screen ${state.tab === "insights" ? "active" : ""}" id="insights">${insights()}</section>
        </main>
        <nav class="tabbar" aria-label="App navigation">
          ${[
            ["dashboard", "◔", "Dashboard"],
            ["orders", "☷", "Orders"],
            ["import", "↥", "Import"],
            ["insights", "◌", "Insights"]
          ].map(([id, icon, label]) => `
            <button class="tab ${state.tab === id ? "active" : ""}" data-tab="${id}" aria-label="${label}" ${state.tab === id ? 'aria-current="page"' : ""}>
              <span class="tab-icon" aria-hidden="true">${icon}</span><span class="tab-label">${label}</span>
            </button>`).join("")}
        </nav>
      </div>
    </div>`;

  bindEvents();
}

function bindEvents() {
  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.tab = button.dataset.tab;
      render();
    });
  });

  const receiptText = document.querySelector("#receiptText");
  if (receiptText) {
    receiptText.addEventListener("input", (event) => {
      state.receiptText = event.target.value;
      state.parsed = null;
    });
  }

  document.querySelector("#parseText")?.addEventListener("click", () => {
    state.receiptText = document.querySelector("#receiptText").value;
    state.parsed = parseReceipt(state.receiptText);
    render();
  });

  document.querySelector("#resetText")?.addEventListener("click", () => {
    state.receiptText = sample;
    state.parsed = null;
    render();
  });

  document.querySelector("#saveOrder")?.addEventListener("click", () => {
    if (!state.parsed) return;
    state.transactions.unshift(state.parsed);
    saveTransactions();
    state.parsed = null;
    state.tab = "dashboard";
    render();
  });

  document.querySelector("#imageInput")?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    state.receiptText = `Screenshot selected: ${file.name}

Browser-only OCR is not bundled yet. For now, copy visible order text from the app or use iPhone Live Text on the screenshot, then paste it here.

${sample}`;
    state.parsed = null;
    render();
  });
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}

render();

// ── UPI payment screenshots (Google Pay, PhonePe, etc.) ──────────────────────

function parseUPIPayment(text) {
  // "To Varad Salon And Academy" or "To: Name"
  const payeeMatch = text.match(/^To:?\s+([^\n₹\d]+)/im);
  const payee = payeeMatch ? payeeMatch[1].trim() : "Unknown";

  // Standalone ₹100 or ₹100.00
  const amountMatch = text.match(/₹\s*([0-9,]+(?:\.[0-9]{1,2})?)/);
  if (!amountMatch) return null;
  const amount = Number(amountMatch[1].replaceAll(",", ""));

  const dateMatch = text.match(/(\d{1,2}\s+\w+\s+\d{4})/);
  const category = inferCategory(payee);
  const meta = categoryMeta(category);

  return {
    id: crypto.randomUUID(),
    merchant: payee,
    amount,
    date: dateMatch ? dateMatch[1] : "Today",
    category,
    color: meta.color,
    icon: meta.icon,
    items: [{ name: `Payment to ${payee}`, price: amount }]
  };
}

// ── PDF tax invoices (Blinkit / Zomato GST invoices) ─────────────────────────

function parsePDFInvoice(text) {
  const merchant = detectMerchantName(text);

  // Total: "Invoice Value 1,544" then standalone "1,551" two lines later
  let amount = 0;
  const invMatch = text.match(/invoice\s+value\s+([\d,]+(?:\.\d{1,2})?)/i);
  if (invMatch) {
    const base = Number(invMatch[1].replaceAll(",", ""));
    // Look for a standalone total (with handling fee) a few characters later
    const afterInv = text.slice(text.indexOf(invMatch[0]) + invMatch[0].length, text.indexOf(invMatch[0]) + 200);
    const standMatch = afterInv.match(/^\s*([\d,]+)\s*$/m);
    amount = standMatch ? Number(standMatch[1].replaceAll(",", "")) : base;
  }
  if (!amount) {
    const totMatch = text.match(/\bTotal\s+([\d,]+(?:\.\d{1,2})?)/i);
    if (totMatch) amount = Number(totMatch[1].replaceAll(",", ""));
  }

  // Items: numbered rows from GST table — last integer on the line is the INR total
  const lines = text.split("\n");
  const blocked = ["total", "invoice", "tax", "gst", "handling", "delivery", "discount", "amount in words", "cgst", "sgst"];
  const items = [];

  for (const line of lines) {
    const t = line.trim();
    if (!t || t.length < 5) continue;
    if (blocked.some((b) => t.toLowerCase().startsWith(b))) continue;

    // Numbered item line: "1. Item name ... 35" or "1. Item name ... 1,551"
    const m = t.match(/^\d+\.\s+(.+?)\s+(?:\d+\s+NOS\s+)?(?:\d{4,}\s+)?[\d.]+(?:\s+[\d.]+){3,}\s+(\d+)$/);
    if (m) {
      const name = m[1].trim();
      const price = Number(m[2]);
      if (name.length >= 3 && price > 0 && price < (amount || 99999)) {
        items.push({ name, price, quantity: 1, category: inferCategory(name) });
      }
    }
  }

  if (!amount) amount = items.reduce((s, i) => s + i.price, 0);
  const category = dominantCategory(items) ?? inferCategory(merchant);
  const meta = categoryMeta(category);

  return {
    id: crypto.randomUUID(),
    merchant,
    amount,
    date: "Today",
    category,
    color: meta.color,
    icon: meta.icon,
    items
  };
}

// ── Standard order summaries (Swiggy OCR, Zomato email, Amazon email) ────────

function parseOrderSummary(text) {
  let merchant = detectMerchantName(text);

  // Platform-context hints for restaurant orders (Swiggy OCR shows restaurant name, not "Swiggy")
  if (merchant === "Unknown") {
    const lower = text.toLowerCase();
    if (lower.includes("luckybite") || lower.includes("swiggy one") || lower.includes("bill total"))
      merchant = "Swiggy";
    else if (lower.includes("eternal") || lower.includes("getoff") || lower.includes("zomato gold"))
      merchant = "Zomato";
  }

  // Extended total keywords, decimal-aware
  const totalMatch = text.match(
    /(?:bill\s+total|grand\s+total|order\s+total|total\s+paid|amount\s+paid|net\s+payable|total)[:\s]+(?:rs\.?|₹|inr)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i
  );

  // Item regex — handles both "x2 ₹95" and "1 ₹265 ₹265" (Zomato) formats, captures decimals
  const itemRegex = /^(.+?)\s+(?:x\s*(\d+)\s+)?(?:rs\.?|₹|inr)\s*([0-9,]+(?:\.[0-9]{1,2})?)/gim;
  const blocked = [
    "total", "paid", "order", "invoice", "tax", "gst", "delivery",
    "discount", "coupon", "platform", "packaging", "restaurant packaging",
    "handling", "membership", "express", "surge", merchant.toLowerCase()
  ];
  const items = [];
  let match;

  while ((match = itemRegex.exec(text)) !== null) {
    // Strip trailing lone quantity digit that Zomato format leaves: "Lamb Shawarma 1"
    let name = match[1].trim().replace(/\s+\d+\s*$/, "");
    const quantity = Number(match[2] ?? 1);
    const unitPrice = Number(match[3].replaceAll(",", ""));
    if (name.length > 3 && !blocked.some((w) => name.toLowerCase().startsWith(w))) {
      items.push({ name, price: unitPrice * quantity, quantity, category: inferCategory(name) });
    }
  }

  const amount = totalMatch
    ? Number(totalMatch[1].replaceAll(",", ""))
    : items.reduce((s, i) => s + i.price, 0);

  const category = dominantCategory(items) ?? inferCategory(merchant);
  const meta = categoryMeta(category);

  return {
    id: crypto.randomUUID(),
    merchant,
    amount,
    date: "Today",
    category,
    color: meta.color,
    icon: meta.icon,
    items
  };
}

// ── Category helpers ─────────────────────────────────────────────────────────

function inferCategory(text, learnedRules = inferCategory._learned) {
  // Check user-learned mappings first (exact keyword matches stored from unrecognized items)
  for (const [keyword, category] of learnedRules) {
    if (text.toLowerCase().includes(keyword)) return category;
  }
  const v = text.toLowerCase();

  // Keyword rules — first match wins, ordered by specificity
  const rules = [
    ["Subscriptions", ["netflix", "spotify", "prime video", "disney", "hotstar", "apple tv",
                       "subscription", "youtube premium", "zee5"]],
    ["Transport",     ["uber", "ola", "metro", "fuel", "petrol", "diesel", "rapido", "cab",
                       "auto", "taxi", "bus pass", "toll", "parking"]],
    ["Bills",         ["cred", "credit card", "electricity", "broadband", "wifi", "recharge",
                       "postpaid", "prepaid", "emi", "insurance", "rent"]],
    ["Beauty",        ["serum", "toner", "moisturiser", "moisturizer", "sunscreen", "spf",
                       "face wash", "cleanser", "shampoo", "conditioner", "hair mask", "hair oil",
                       "body wash", "soap", "scrub", "lip balm", "lipstick", "foundation",
                       "mascara", "eyeliner", "kajal", "nail polish", "perfume", "deodorant",
                       "salon", "academy", "haircut", "waxing", "threading",
                       "kojic", "glutathione", "arbutin", "niacinamide", "retinol",
                       "dettol", "handwash", "sanitiser", "sanitizer"]],
    ["Supplements",   ["protein", "whey", "casein", "creatine", "pre-workout", "pre workout",
                       "bcaa", "amino", "vitamin", "multivitamin", "omega", "fish oil",
                       "magnesium", "zinc", "iron supplement", "calcium", "collagen",
                       "probiotic", "moringa", "ashwagandha", "carbamide", "almond",
                       "chia seed", "flaxseed", "makhana"]],
    ["Food",          ["swiggy", "zomato", "biryani", "pizza", "burger", "sandwich", "wrap",
                       "shawarma", "kebab", "tikka", "grill", "pasta", "noodle", "maggi",
                       "coffee", "chai", "tea", "juice", "smoothie", "milkshake", "lassi",
                       "paneer", "roti", "naan", "paratha", "dosa", "idli", "samosa",
                       "restaurant", "cafe", "bakery", "meal", "thali", "snack",
                       "chocolate", "biscuit", "cookie", "chips", "popcorn", "candy",
                       "ice cream", "cake", "pastry", "dessert"]],
    ["Groceries",     ["blinkit", "zepto", "bigbasket", "jiomart",
                       "milk", "curd", "yogurt", "butter", "ghee", "cheese", "paneer",
                       "bread", "egg", "atta", "flour", "rice", "dal", "pulses", "lentil",
                       "salt", "sugar", "oil", "mustard", "vinegar", "sauce", "ketchup",
                       "pickle", "jam", "honey", "grocery",
                       "onion", "potato", "tomato", "garlic", "ginger", "carrot",
                       "broccoli", "cabbage", "capsicum", "cucumber", "spinach", "peas",
                       "mango", "banana", "apple", "orange", "lemon", "coconut",
                       "litchi", "lychee", "grapes", "watermelon", "papaya",
                       "masala", "spice", "turmeric", "cumin", "coriander", "pepper",
                       "tea leaves", "coffee powder", "oats", "cornflakes", "muesli",
                       "noodles", "pasta", "poha", "suji", "semolina",
                       "detergent", "dishwash", "floor cleaner", "toilet cleaner",
                       "tissue", "toilet paper", "garbage bag"]],
    ["Shopping",      ["amazon", "myntra", "flipkart", "nykaa",
                       "shirt", "t-shirt", "tshirt", "top", "blouse", "kurta",
                       "jeans", "trouser", "pant", "shorts", "skirt", "dress", "saree",
                       "shoe", "sandal", "slipper", "sneaker", "boot",
                       "bag", "wallet", "belt", "watch", "jewellery",
                       "earphone", "headphone", "charger", "cable", "mobile",
                       "laptop", "tablet", "keyboard", "mouse",
                       "book", "stationery", "pen", "notebook",
                       "tape", "lighter", "measuring", "tool", "hardware"]]
  ];

  // First pass: exact keyword match
  const keywordMatch = rules.find(([, words]) => words.some((w) => v.includes(w)))?.[0];
  if (keywordMatch) return keywordMatch;

  // Second pass: heuristic signals for uncatalogued items
  // Looks like a personal care / hygiene product
  if (/\b(wash|clean|care|groom|hygien|lotion|gel|foam|spray|powder|wipe|pad|tampon|razor|blade)\b/i.test(v)) {
    return "Beauty";
  }
  // Looks like a food ingredient or packaged food
  if (/\b(masala|pickle|papad|chutney|syrup|extract|leaves|seeds?|nuts?|dry\s*fruit|roasted|organic|natural)\b/i.test(v)) {
    return "Groceries";
  }
  // Looks like a health product
  if (/\b(capsule|tablet|syrup|drops|supplement|health|wellness|ayurved|herbal)\b/i.test(v)) {
    return "Supplements";
  }
  // Looks like apparel or accessories
  if (/\b(wear|cloth|fabric|linen|cotton|polyester|stitch|tailor|fitting)\b/i.test(v)) {
    return "Shopping";
  }

  return "Shopping";
}

// Drop-in helper — add once near the top of the improved-parsers section
function detectMerchantName(text) {
  const lower = text.toLowerCase();
  const known = [
    ["Blinkit", ["blinkit", "blink commerce"]],
    ["Amazon",  ["amazon"]],
    ["Swiggy",  ["swiggy"]],
    ["Zomato",  ["zomato", "eternal"]],
    ["Myntra",  ["myntra"]],
    ["Nykaa",   ["nykaa"]],
    ["CRED",    ["cred"]],
    ["Paytm",   ["paytm"]],
    ["Zepto",   ["zepto"]],
  ];
  return known.find(([, sigs]) => sigs.some(s => lower.includes(s)))?.[0] ?? "Unknown";
}

function preJoinMultiLineItems(lines) {
  const isSizeLine  = l => /^\d[\s.]*(?:g|kg|ml|l|pcs?|pc)\s/i.test(l);
  const isPriceLine = l => /^(?:₹|rs\.?)\s*\d/i.test(l);
  const isFreeGift  = l => l.toLowerCase().includes("free gift");

  const result = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (isFreeGift(line)) { i++; continue; }

    let offset = 1;
    if (i + offset < lines.length && isSizeLine(lines[i + offset])) offset++;
    if (i + offset < lines.length && isPriceLine(lines[i + offset])) {
      result.push(`${line} ${lines[i + offset]}`);
      i += offset + 1;
    } else {
      result.push(line);
      i++;
    }
  }
  return result;
}