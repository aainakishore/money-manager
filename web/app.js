// ─── Colour tokens ────────────────────────────────────────────────────────────
const TEAL  = "#00C9A7";
const PURP  = "#7C5CF0";
const RED   = "#EF4444";
const ORG   = "#F97316";
const PINK  = "#EC4899";
const GREEN = "#34D399";
const CYAN  = "#06B6D4";
const VIO   = "#8B5CF6";

// ─── Sample data ──────────────────────────────────────────────────────────────
const SAMPLE_TEXT = `Blinkit Order
14 Jun 2026
Amul Taaza Milk 1L x2 Rs 72
Eggs 12 pack Rs 115
Greek Yogurt x2 Rs 95
Dishwash Gel Rs 169
Paid with Google Pay
Order Total Rs 618`;

const DEFAULT_TRANSACTIONS = [
  {
    id: uid(), merchant: "CRED", amount: 4210, date: "Jun 12", category: "Bills",
    color: RED, icon: "▧",
    items: [{ name: "Credit card bill payment", price: 4210, category: "Bills", confidence: "high" }]
  },
  {
    id: uid(), merchant: "Amazon", amount: 2899, date: "Jun 7", category: "Shopping",
    color: PURP, icon: "◧",
    items: [
      { name: "Minimalist Vitamin C Serum", price: 699,  category: "Beauty",      confidence: "high" },
      { name: "Running T-Shirt",            price: 1300, category: "Shopping",    confidence: "high" },
      { name: "Magnesium Glycinate",        price: 899,  category: "Supplements", confidence: "high" }
    ]
  },
  {
    id: uid(), merchant: "Blinkit", amount: 836, date: "Jun 10", category: "Groceries",
    color: TEAL, icon: "◫",
    items: [
      { name: "Amul Taaza Milk 1L", price: 144, category: "Groceries", confidence: "high" },
      { name: "Eggs 12 pack",       price: 115, category: "Groceries", confidence: "high" },
      { name: "Greek Yogurt",       price: 190, category: "Groceries", confidence: "high" },
      { name: "Dishwash Gel",       price: 169, category: "Groceries", confidence: "high" }
    ]
  },
  {
    id: uid(), merchant: "Swiggy", amount: 612, date: "Jun 4", category: "Food",
    color: ORG, icon: "◍",
    items: [
      { name: "Paneer Bowl",               price: 249, category: "Food", confidence: "high" },
      { name: "Cold Coffee",               price: 159, category: "Food", confidence: "high" },
      { name: "Delivery and platform fees",price: 84,  category: "Food", confidence: "high" }
    ]
  },
  {
    id: uid(), merchant: "Blinkit", amount: 948, date: "Jun 2", category: "Groceries",
    color: TEAL, icon: "◫",
    items: [
      { name: "Amul Taaza Milk 1L",    price: 136, category: "Groceries",    confidence: "high" },
      { name: "Tata Salt 1kg",         price: 28,  category: "Groceries",    confidence: "high" },
      { name: "Farmley Almonds 200g",  price: 349, category: "Supplements",  confidence: "high" },
      { name: "Dettol Handwash Refill",price: 135, category: "Beauty",       confidence: "high" },
      { name: "Brown Bread",           price: 52,  category: "Groceries",    confidence: "high" }
    ]
  }
];

// ─── State ────────────────────────────────────────────────────────────────────
// Fix 6a: empty receiptText on startup
const state = {
  tab: "dashboard",
  receiptText: "",
  parsed: null,
  transactions: loadTransactions()
};

// ─── Persistence ──────────────────────────────────────────────────────────────
function uid() { return crypto.randomUUID(); }

function loadTransactions() {
  try {
    const saved = JSON.parse(localStorage.getItem("moneylens.transactions") ?? "null");
    return Array.isArray(saved) && saved.length ? saved : DEFAULT_TRANSACTIONS;
  } catch { return DEFAULT_TRANSACTIONS; }
}

function saveTransactions() {
  localStorage.setItem("moneylens.transactions", JSON.stringify(state.transactions));
}

// ─── Learned rules (category layer 1) ────────────────────────────────────────
function learnedRules() {
  try {
    return new Map(JSON.parse(localStorage.getItem("moneylens.learned_categories") ?? "[]"));
  } catch { return new Map(); }
}

function saveLearnedRule(keyword, category) {
  const rules = learnedRules();
  rules.set(keyword.toLowerCase().trim().split(/\s+/).slice(0, 3).join(" "), category);
  localStorage.setItem("moneylens.learned_categories", JSON.stringify([...rules]));
}

// ─── Formatting ───────────────────────────────────────────────────────────────
function fmt(n) { return "₹" + Math.round(n).toLocaleString("en-IN"); }

// ─── Category helpers ─────────────────────────────────────────────────────────
const CATEGORY_RULES = [
  ["Subscriptions", ["netflix","spotify","prime video","disney","hotstar","apple tv","subscription","youtube premium","zee5"]],
  ["Transport",     ["uber","ola","metro","fuel","petrol","diesel","rapido","cab","auto","taxi","toll","parking"]],
  ["Bills",         ["cred","credit card","electricity","broadband","wifi","recharge","postpaid","prepaid","emi","insurance","rent"]],
  ["Beauty",        ["serum","toner","moisturiser","moisturizer","sunscreen","spf","face wash","cleanser","shampoo","conditioner","hair mask","hair oil","body wash","soap","scrub","lip balm","lipstick","foundation","mascara","eyeliner","kajal","nail polish","perfume","deodorant","salon","academy","haircut","kojic","glutathione","arbutin","niacinamide","retinol","dettol","handwash","sanitiser","sanitizer"]],
  ["Supplements",   ["protein","whey","casein","creatine","pre-workout","bcaa","amino","vitamin","multivitamin","omega","fish oil","magnesium","zinc","calcium","collagen","probiotic","moringa","ashwagandha","carbamide","almond","chia seed","flaxseed","makhana"]],
  ["Food",          ["swiggy","zomato","biryani","pizza","burger","sandwich","wrap","shawarma","kebab","tikka","grill","pasta","noodle","maggi","coffee","chai","tea","juice","smoothie","milkshake","lassi","paneer","roti","naan","paratha","dosa","idli","samosa","restaurant","cafe","bakery","meal","thali","snack","chocolate","biscuit","cookie","chips","popcorn","candy","ice cream","cake","pastry","dessert"]],
  ["Groceries",     ["blinkit","zepto","bigbasket","jiomart","milk","curd","yogurt","butter","ghee","cheese","bread","egg","atta","flour","rice","dal","pulses","lentil","salt","sugar","oil","mustard","vinegar","sauce","ketchup","pickle","jam","honey","onion","potato","tomato","garlic","ginger","carrot","broccoli","cabbage","capsicum","cucumber","spinach","peas","mango","banana","apple","orange","lemon","coconut","litchi","lychee","grapes","watermelon","papaya","masala","spice","turmeric","cumin","coriander","pepper","oats","cornflakes","muesli","poha","detergent","dishwash","tissue","toilet paper","garbage bag"]],
  ["Shopping",      ["amazon","myntra","flipkart","nykaa","shirt","t-shirt","tshirt","top","blouse","kurta","jeans","trouser","pant","shorts","skirt","dress","saree","shoe","sandal","slipper","sneaker","boot","bag","wallet","belt","watch","jewellery","earphone","headphone","charger","cable","mobile","laptop","tablet","keyboard","mouse","book","stationery","pen","notebook","tape","lighter","measuring"]]
];

function inferCategoryWithConfidence(text) {
  const v = text.toLowerCase();
  for (const [kw, cat] of learnedRules()) {
    if (v.includes(kw)) return { category: cat, confidence: "high" };
  }
  const match = CATEGORY_RULES.find(([, words]) => words.some(w => v.includes(w)));
  if (match) return { category: match[0], confidence: "medium" };
  if (/\b(lip |lash |brow |blush|contour|primer|concealer|highlighter|bronzer)\b/i.test(v)) return { category: "Beauty", confidence: "medium" };
  if (/\b(wash|clean|care|groom|hygien|lotion|gel|foam|spray|powder|wipe|pad|tampon|razor|blade)\b/i.test(v)) return { category: "Beauty", confidence: "medium" };
  if (/\b(capsule|tablet|syrup|drops|supplement|health|wellness|ayurved|herbal)\b/i.test(v)) return { category: "Supplements", confidence: "medium" };
  if (/\b(masala|pickle|papad|chutney|leaves|seeds?|nuts?|dry\s*fruit|roasted|organic)\b/i.test(v)) return { category: "Groceries", confidence: "medium" };
  if (/\b(wear|cloth|fabric|linen|cotton|polyester|stitch|tailor)\b/i.test(v)) return { category: "Shopping", confidence: "medium" };
  return { category: "Shopping", confidence: "low" };
}

function inferCategory(text) { return inferCategoryWithConfidence(text).category; }

function dominantCategory(items) {
  const totals = new Map();
  for (const item of items) totals.set(item.category, (totals.get(item.category) ?? 0) + item.price);
  return [...totals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

function categoryMeta(cat) {
  const map = {
    Bills: { color: RED, icon: "▧" }, Shopping: { color: PURP, icon: "◧" },
    Groceries: { color: TEAL, icon: "◫" }, Food: { color: ORG, icon: "◍" },
    Beauty: { color: PINK, icon: "✦" }, Supplements: { color: GREEN, icon: "✚" },
    Transport: { color: CYAN, icon: "◌" }, Subscriptions: { color: VIO, icon: "◉" }
  };
  return map[cat] ?? { color: TEAL, icon: "◌" };
}

function colorForMerchant(name) {
  const l = name.toLowerCase();
  if (l.includes("cred")) return RED;
  if (l.includes("amazon")) return PURP;
  if (l.includes("blinkit")) return TEAL;
  if (l.includes("swiggy")) return ORG;
  return TEAL;
}

// ─── Merchant detection ───────────────────────────────────────────────────────
function detectMerchantName(text) {
  const lower = text.toLowerCase();
  const known = [
    ["Blinkit", ["blinkit","blink commerce"]],
    ["Amazon",  ["amazon"]],
    ["Swiggy",  ["swiggy"]],
    ["Zomato",  ["zomato","eternal"]],
    ["Myntra",  ["myntra"]],
    ["Nykaa",   ["nykaa"]],
    ["CRED",    ["cred"]],
    ["Paytm",   ["paytm"]],
    ["Zepto",   ["zepto"]]
  ];
  return known.find(([, sigs]) => sigs.some(s => lower.includes(s)))?.[0] ?? "Unknown";
}

// ─── Format detection ─────────────────────────────────────────────────────────
function detectFormat(text) {
  const lower = text.toLowerCase();
  if (lower.includes("upi transaction id") || lower.includes("upi lite") ||
      lower.includes("google transaction id") || lower.includes("phonepay")) return "upi";
  if ((lower.includes("tax invoice") || lower.includes("invoice no")) &&
      (lower.includes("hsn") || lower.includes("invoice value") || lower.includes("sgst"))) return "pdf";
  return "order";
}

// ─── Parser entry ─────────────────────────────────────────────────────────────
function parseReceipt(text) {
  const fmt_ = detectFormat(text);
  if (fmt_ === "upi") return parseUPIPayment(text);
  if (fmt_ === "pdf") return parsePDFInvoice(text);
  return parseOrderSummary(text);
}

// ─── UPI parser ───────────────────────────────────────────────────────────────
function parseUPIPayment(text) {
  const payeeMatch = text.match(/^To:?\s+([^\n₹\d]+)/im);
  const payee = payeeMatch ? payeeMatch[1].trim() : "Unknown";
  const amountMatch = text.match(/₹\s*([0-9,]+(?:\.[0-9]{1,2})?)/);
  if (!amountMatch) return null;
  const amount = Number(amountMatch[1].replaceAll(",", ""));
  const dateMatch = text.match(/(\d{1,2}\s+\w+\s+\d{4})/);
  const { category, confidence } = inferCategoryWithConfidence(payee);
  const meta = categoryMeta(category);
  return {
    id: uid(), merchant: payee, amount,
    date: dateMatch?.[1] ?? "Today", category, color: meta.color, icon: meta.icon,
    items: [{ name: `Payment to ${payee}`, price: amount, category, confidence }]
  };
}

// ─── PDF invoice parser ───────────────────────────────────────────────────────
function parsePDFInvoice(text) {
  const merchant = detectMerchantName(text);
  let amount = 0;
  const invMatch = text.match(/invoice\s+value\s+([\d,]+(?:\.\d{1,2})?)/i);
  if (invMatch) {
    const base = Number(invMatch[1].replaceAll(",", ""));
    const afterInv = text.slice(text.indexOf(invMatch[0]) + invMatch[0].length, text.indexOf(invMatch[0]) + 200);
    const standMatch = afterInv.match(/^\s*([\d,]+)\s*$/m);
    amount = standMatch ? Number(standMatch[1].replaceAll(",", "")) : base;
  }
  if (!amount) {
    const totMatch = text.match(/\bTotal\s+([\d,]+(?:\.\d{1,2})?)/i);
    if (totMatch) amount = Number(totMatch[1].replaceAll(",", ""));
  }
  const blockedPdf = ["total","invoice","tax","gst","handling","delivery","discount","amount in words","cgst","sgst"];
  const items = [];
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.length < 5 || blockedPdf.some(b => t.toLowerCase().startsWith(b))) continue;
    const m = t.match(/^\d+\.\s+(.+?)\s+(?:\d+\s+NOS\s+)?(?:\d{4,}\s+)?[\d.]+(?:\s+[\d.]+){3,}\s+(\d+)$/);
    if (m) {
      const name = m[1].trim();
      const price = Number(m[2]);
      if (name.length >= 3 && price > 0 && price < (amount || 99999)) {
        const { category, confidence } = inferCategoryWithConfidence(name);
        items.push({ name, price, quantity: 1, category, confidence });
      }
    }
  }
  if (!amount) amount = items.reduce((s, i) => s + i.price, 0);
  const category = dominantCategory(items) ?? inferCategory(merchant);
  const meta = categoryMeta(category);
  return { id: uid(), merchant, amount, date: "Today", category, color: meta.color, icon: meta.icon, items };
}

// ─── Order summary parser ─────────────────────────────────────────────────────
function parseOrderSummary(text) {
  let merchant = detectMerchantName(text);
  if (merchant === "Unknown") {
    const lower = text.toLowerCase();
    if (lower.includes("luckybite") || lower.includes("swiggy one") || lower.includes("bill total")) merchant = "Swiggy";
    else if (lower.includes("eternal") || lower.includes("getoff") || lower.includes("zomato gold")) merchant = "Zomato";
  }

  // Fix 3b: totalMatch crosses line breaks (Amazon puts ₹ on next line)
  const totalMatch = text.match(
    /(?:bill\s+total|grand\s+total|order\s+total|total\s+paid|amount\s+paid|net\s+payable|total)[:\s\n]+(?:rs\.?|₹|inr)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i
  ) || text.match(
    /(?:grand\s+total|total)[:\s]*\n\s*₹([0-9,]+(?:\.[0-9]{1,2})?)/i
  );

  const itemRegex = /^(.+?)\s+(?:x\s*(\d+)\s+)?(?:rs\.?|₹|inr)\s*([0-9,]+(?:\.[0-9]{1,2})?)/gim;

  // Fix 2a: expanded blocked list
  const blocked = [
    "total", "paid", "order", "invoice", "tax", "gst", "delivery", "discount",
    "coupon", "platform", "packaging", "restaurant packaging", "handling",
    "membership", "express", "surge", "grand", "item(s)", "item total",
    "subtotal", "marketplace", "shipping", "arriving", "ship to", "sold by",
    "payment method", "amount", "free delivery", "extra discount", "taxes",
    "bill total", "net payable", "restaurant pack",
    merchant.toLowerCase()
  ];

  const items = [];
  let match;
  while ((match = itemRegex.exec(text)) !== null) {
    let name = match[1].trim().replace(/\s+\d+\s*$/, "");
    const quantity = Number(match[2] ?? 1);
    const unitPrice = Number(match[3].replaceAll(",", ""));
    if (name.length > 3 && !blocked.some(w => name.toLowerCase().startsWith(w))) {
      const { category, confidence } = inferCategoryWithConfidence(name);
      items.push({ name, price: unitPrice * quantity, quantity, category, confidence });
    }
  }

  // Fix 3a: Amazon fallback — product name on its own line after "Arriving…"
  if (items.length === 0 && merchant === "Amazon") {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    const arrivingIdx = lines.findIndex(l => /^arriving/i.test(l));
    const productLines = arrivingIdx >= 0 ? lines.slice(arrivingIdx + 1) : lines;
    const skipRe = /^(ship\s+to|sold\s+by|payment|order|aaina|tinsel|pune|india|maharashtra|tower|hinjawadi|\d{3,}|[a-z0-9._%+-]+@)/i;
    const productLine = productLines.find(l =>
      l.length > 20 &&
      !skipRe.test(l) &&
      !/(?:₹|rs\.?|inr|\bsubtotal\b|\btotal\b|\bshipping\b|\bmarketplace\b)/i.test(l)
    );
    if (productLine && totalMatch) {
      const name = (productLine.split("|")[0]).trim().slice(0, 120);
      const { category, confidence } = inferCategoryWithConfidence(name);
      items.push({ name, price: Number(totalMatch[1].replaceAll(",", "")), quantity: 1, category, confidence });
    }
  }

  // Fix 4a / 3: deduplicate items with same name
  const seenNames = new Set();
  const deduped = items.filter(i => {
    const k = i.name.toLowerCase().trim();
    if (seenNames.has(k)) return false;
    seenNames.add(k);
    return true;
  });
  items.length = 0;
  deduped.forEach(i => items.push(i));

  const amount = totalMatch
    ? Number(totalMatch[1].replaceAll(",", ""))
    : items.reduce((s, i) => s + i.price, 0);
  const category = dominantCategory(items) ?? inferCategory(merchant);
  const meta = categoryMeta(category);
  return { id: uid(), merchant, amount, date: "Today", category, color: meta.color, icon: meta.icon, items };
}

// ─── Duplicate detection ──────────────────────────────────────────────────────
function findDuplicate(candidate) {
  return state.transactions.find(tx =>
    tx.merchant === candidate.merchant &&
    Math.round(tx.amount) === Math.round(candidate.amount) &&
    tx.date === candidate.date
  );
}

// ─── Analytics ────────────────────────────────────────────────────────────────
// Fix 2b: filter out mis-parsed items whose price >= transaction total
function totalsByCategory() {
  const totals = new Map();
  for (const tx of state.transactions) {
    const validItems = (tx.items || []).filter(i => i.price > 0 && i.price < tx.amount);
    const source = validItems.length > 0 ? validItems : [{ price: tx.amount, category: tx.category }];
    for (const item of source) {
      const cat = item.category ?? tx.category;
      totals.set(cat, (totals.get(cat) ?? 0) + item.price);
    }
  }
  return [...totals.entries()]
    .map(([name, value]) => ({ name, value, ...categoryMeta(name) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
}

function totalsByMerchant() {
  const totals = new Map();
  for (const tx of state.transactions) totals.set(tx.merchant, (totals.get(tx.merchant) ?? 0) + tx.amount);
  return [...totals.entries()]
    .map(([name, value]) => ({ name, value, color: colorForMerchant(name) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
}

// ─── Fix 5: Real price-change insights ───────────────────────────────────────
function computePriceInsights(transactions, minPct = 10) {
  const history = new Map();
  for (const tx of transactions) {
    for (const item of tx.items || []) {
      if (!item.price || item.price <= 0) continue;
      const unitPrice = item.price / (item.quantity || 1);
      const norm = item.name.toLowerCase()
        .replace(/\s*\(.*?\)/g, "").replace(/\s+/g, " ").trim().slice(0, 40);
      const key = `${tx.merchant}|${norm}`;
      if (!history.has(key)) history.set(key, []);
      history.get(key).push({ price: unitPrice, date: tx.date || "Today", name: item.name, merchant: tx.merchant });
    }
  }
  const alerts = [];
  for (const [, events] of history) {
    if (events.length < 2) continue;
    const ordered = [...events].reverse();
    const prev = ordered[ordered.length - 2];
    const latest = ordered[ordered.length - 1];
    if (prev.price <= 0) continue;
    const pct = ((latest.price - prev.price) / prev.price) * 100;
    if (pct >= minPct) {
      alerts.push({ itemName: latest.name, merchant: latest.merchant, prevPrice: prev.price, latestPrice: latest.price, pct: Math.round(pct) });
    }
  }
  return alerts.sort((a, b) => b.pct - a.pct);
}

// ─── Fix 7: Chart helpers ─────────────────────────────────────────────────────
function renderMonthlyTrend(transactions) {
  const ORDER = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const byMonth = new Map();
  for (const tx of transactions) {
    const month = (tx.date || "").split(" ")[0];
    if (month && ORDER.includes(month)) byMonth.set(month, (byMonth.get(month) ?? 0) + tx.amount);
  }
  if (byMonth.size < 2) return "";
  const sorted = [...byMonth.entries()].sort((a, b) => ORDER.indexOf(a[0]) - ORDER.indexOf(b[0]));
  const max = Math.max(...sorted.map(m => m[1]), 1);
  return `
    <section class="card">
      <div class="section-label">Monthly trend</div>
      <div class="trend-chart">
        ${sorted.map(([month, total]) => `
          <div class="trend-bar-wrap">
            <div style="flex:1;width:100%;display:flex;align-items:flex-end">
              <div class="trend-bar" style="height:${Math.max(4, Math.round((total / max) * 52))}px" title="${fmt(total)}"></div>
            </div>
            <span class="trend-label">${month}</span>
          </div>`).join("")}
      </div>
    </section>`;
}

function renderCategoryBars(categories, total) {
  return `
    <section class="card">
      <div class="section-label">By category</div>
      ${categories.map(cat => `
        <div class="hbar-row">
          <span class="hbar-name">${cat.name}</span>
          <div class="hbar-track">
            <div class="hbar-fill" style="width:${total ? Math.round((cat.value / total) * 100) : 0}%;background:${cat.color}"></div>
          </div>
          <span class="hbar-amount">${fmt(cat.value)}</span>
        </div>`).join("")}
    </section>`;
}

// ─── Transaction row ──────────────────────────────────────────────────────────
function transactionRow(tx, showDelete = false) {
  return `
    <div class="tx-row" data-id="${tx.id}">
      <div class="tx-icon" style="background:${tx.color}22;color:${tx.color}">${tx.icon}</div>
      <div class="tx-meta">
        <strong>${tx.merchant}</strong>
        <span>${tx.items.length} items — ${tx.date}</span>
      </div>
      <div class="tx-amount">${fmt(tx.amount)}</div>
      ${showDelete ? `<button data-delete="${tx.id}" aria-label="Delete" style="background:none;border:none;color:rgba(239,68,68,.7);font-size:16px;padding:4px 6px;cursor:pointer">✕</button>` : ""}
    </div>`;
}

// ─── Screens ──────────────────────────────────────────────────────────────────
// Dashboard: donut on main view, click → slide-up detail sheet with bars + trend
function renderDonut(categories, total) {
  const C = 2 * Math.PI * 42;
  let offset = 0;
  const circles = categories.map(cat => {
    const dash = total ? (cat.value / total) * C : 0;
    const circle = `<circle cx="55" cy="55" r="42" fill="none" stroke="${cat.color}" stroke-width="13"
      stroke-dasharray="${dash} ${C - dash}" stroke-dashoffset="${-offset}" />`;
    offset += dash;
    return circle;
  }).join("");
  return `
    <div class="donut-wrap" id="donutBtn" role="button" aria-label="View spending breakdown" tabindex="0"
      style="cursor:pointer;position:relative">
      <svg width="110" height="110" role="img" aria-label="Spending by category">
        <circle cx="55" cy="55" r="42" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="13"></circle>
        <g transform="rotate(-90 55 55)">${circles}</g>
      </svg>
      <div class="donut-label">
        <strong>${fmt(total)}</strong>
        <span style="color:rgba(0,201,167,.8);font-size:7px;margin-top:1px">tap for more ↗</span>
      </div>
    </div>`;
}

function showChartDetailSheet(categories, total, transactions) {
  if (document.getElementById("chartSheet")) return; // already open
  const sheet = document.createElement("div");
  sheet.id = "chartSheet";
  sheet.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:1000;display:flex;align-items:flex-end;justify-content:center";

  // monthly trend
  const ORDER = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const byMonth = new Map();
  for (const tx of transactions) {
    const month = (tx.date || "").split(" ")[0];
    if (month && ORDER.includes(month)) byMonth.set(month, (byMonth.get(month) ?? 0) + tx.amount);
  }
  const sorted = [...byMonth.entries()].sort((a, b) => ORDER.indexOf(a[0]) - ORDER.indexOf(b[0]));
  const maxM = Math.max(...sorted.map(m => m[1]), 1);
  const trendHtml = sorted.length >= 2 ? `
    <div class="section-label" style="margin-top:16px">Monthly trend</div>
    <div class="trend-chart" style="margin-bottom:4px">
      ${sorted.map(([month, tot]) => `
        <div class="trend-bar-wrap">
          <div style="flex:1;width:100%;display:flex;align-items:flex-end">
            <div class="trend-bar" style="height:${Math.max(4, Math.round((tot / maxM) * 52))}px" title="${fmt(tot)}"></div>
          </div>
          <span class="trend-label">${month}</span>
        </div>`).join("")}
    </div>` : "";

  // horizontal bars
  const barsHtml = categories.map(cat => `
    <div class="hbar-row">
      <span class="hbar-name" style="display:flex;align-items:center;gap:5px">
        <span style="width:7px;height:7px;border-radius:50%;background:${cat.color};flex-shrink:0"></span>
        ${cat.name}
      </span>
      <div class="hbar-track">
        <div class="hbar-fill" style="width:${total ? Math.round((cat.value / total) * 100) : 0}%;background:${cat.color}"></div>
      </div>
      <span class="hbar-amount">${fmt(cat.value)}</span>
    </div>`).join("");

  sheet.innerHTML = `
    <div style="background:#0e1220;border-radius:18px 18px 0 0;padding:18px 16px 32px;width:min(100%,430px);max-height:82vh;overflow-y:auto">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <span style="font-size:13px;font-weight:700;color:#f0f2f5">Spending breakdown</span>
        <button id="closeChartSheet" style="background:rgba(255,255,255,.1);border:none;color:#f0f2f5;border-radius:50%;width:26px;height:26px;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center">✕</button>
      </div>
      <div class="section-label">By category</div>
      ${barsHtml}
      ${trendHtml}
    </div>`;

  document.body.appendChild(sheet);

  document.getElementById("closeChartSheet").addEventListener("click", () => {
    document.body.removeChild(sheet);
  });
  // tap backdrop to close
  sheet.addEventListener("click", e => {
    if (e.target === sheet) document.body.removeChild(sheet);
  });
}

function dashboard() {
  const total = state.transactions.reduce((s, tx) => s + tx.amount, 0);
  const categories = totalsByCategory();
  const merchants = totalsByMerchant();
  const maxM = Math.max(...merchants.map(m => m.value), 1);
  const ordersCount = state.transactions.length;
  return `
    <div class="eyebrow">All-time spending</div>
    <div class="hero-row"><div class="total">${fmt(total)}</div><div class="pill">${ordersCount} orders</div></div>
    <div class="metrics">
      <div class="metric"><strong>${ordersCount}</strong><span>Orders</span></div>
      <div class="metric"><strong>${new Set(state.transactions.map(tx => tx.merchant)).size}</strong><span>Merchants</span></div>
      <div class="metric"><strong>${fmt(total / Math.max(ordersCount, 1))}</strong><span>Avg order</span></div>
    </div>
    <section class="card">
      <div class="section-label">By category</div>
      <div class="category-grid">
        ${renderDonut(categories, total)}
        <div>
          ${categories.map(cat => `
            <div class="legend-row">
              <div class="legend-left"><span class="dot" style="background:${cat.color}"></span><span>${cat.name}</span></div>
              <div class="amount">${fmt(cat.value)}</div>
            </div>`).join("")}
        </div>
      </div>
    </section>
    <section class="card">
      <div class="section-label">Top merchants</div>
      ${merchants.map(m => `
        <div class="merchant-bar">
          <div class="bar-head"><span>${m.name}</span><strong>${fmt(m.value)}</strong></div>
          <div class="bar-track"><div class="bar-fill" style="width:${(m.value / maxM) * 100}%;background:${m.color}"></div></div>
        </div>`).join("")}
    </section>
    <section class="card">
      <div class="section-label">Recent orders</div>
      ${state.transactions.slice(0, 3).map(tx => transactionRow(tx)).join("")}
    </section>`;
}

// Orders with inline edit panel (Fix 6d: amount field added)
function orders() {
  const cats = ["Groceries","Food","Shopping","Beauty","Supplements","Bills","Transport","Subscriptions"];
  return `
    <h1 class="screen-title">Itemized orders</h1>
    <section class="card">
      ${state.transactions.map(tx => `
        <div>
          ${transactionRow(tx, true)}
          <div id="edit-${tx.id}" style="display:none;padding:8px 0 4px;border-top:.5px solid rgba(255,255,255,.06)">
            <label style="font-size:10px;color:rgba(240,242,245,.45)">Category</label>
            <select data-edit-cat="${tx.id}" style="width:100%;background:rgba(255,255,255,.06);border:.5px solid rgba(255,255,255,.15);border-radius:6px;color:#f0f2f5;padding:5px;font-size:11px;margin-top:4px">
              ${cats.map(cat => `<option value="${cat}" ${tx.category === cat ? "selected" : ""}>${cat}</option>`).join("")}
            </select>
            <label style="font-size:10px;color:rgba(240,242,245,.45);margin-top:8px;display:block">Amount (₹)</label>
            <input type="number" data-edit-amount="${tx.id}" value="${tx.amount}"
              style="width:100%;background:rgba(255,255,255,.06);border:.5px solid rgba(255,255,255,.15);border-radius:6px;color:#f0f2f5;padding:5px;font-size:11px;margin-top:4px;box-sizing:border-box" />
            <button data-save-edit="${tx.id}" style="margin-top:6px;width:100%;background:rgba(0,201,167,.12);border:.5px solid rgba(0,201,167,.3);color:#00C9A7;border-radius:6px;padding:5px;font-size:11px;font-weight:700;cursor:pointer">Save</button>
          </div>
        </div>`).join("")}
    </section>`;
}

// Fix 1b: image/PDF file handler — no textarea reset
function importScreen() {
  return `
    <h1 class="screen-title">Import order</h1>
    <section class="card">
      <label class="eyebrow" for="receiptText">Paste order text from Amazon, Swiggy, Blinkit...</label>
      <textarea id="receiptText" aria-label="Order text"
        placeholder="Paste order text from Amazon, Swiggy, Blinkit, Zomato…">${state.receiptText}</textarea>
      <div class="actions">
        <button class="primary" id="parseText">Parse text</button>
        <label class="secondary file-button" aria-label="Upload PDF or screenshot">
          ⌗<input id="imageInput" type="file" accept="image/*,application/pdf" />
        </label>
        <button class="secondary" id="loadSample" aria-label="Load sample">⌗ Demo</button>
        <button class="secondary" id="resetText" aria-label="Clear">✕</button>
      </div>
    </section>
    <div id="parsedSlot">${state.parsed ? parsedCard(state.parsed) : ""}</div>
    <p class="eyebrow" id="importStatus">Paste order text or pick a file.</p>`;
}

// Fix 6c: show ALL items with scroll cap
function parsedCard(parsed) {
  const uncertain = parsed.items.filter(i => i.confidence === "low");
  const reviewBtn = uncertain.length
    ? `<button class="secondary" id="reviewCategories" style="width:100%;margin-top:6px">Review ${uncertain.length} uncertain categor${uncertain.length > 1 ? "ies" : "y"} ↗</button>`
    : "";
  return `
    <section class="card">
      <div class="parsed-head">
        <div><strong>${parsed.merchant}</strong><span>${parsed.items.length} items found</span></div>
        <div class="parsed-total">${fmt(parsed.amount)}</div>
      </div>
      <div style="max-height:240px;overflow-y:auto;margin:-4px 0">
        ${parsed.items.map(item => `
          <div class="item-row">
            <span style="display:flex;align-items:center;gap:5px">
              ${item.confidence === "low" ? '<span style="background:rgba(249,115,22,.18);color:#f97316;font-size:9px;font-weight:700;width:14px;height:14px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center">?</span>' : ""}
              ${item.name}
            </span>
            <strong>${fmt(item.price)}</strong>
          </div>`).join("")}
      </div>
      ${reviewBtn}
      <button class="secondary saved" id="saveOrder">Save order</button>
    </section>`;
}

// Fix 5b: real insights from data
function insights() {
  const priceAlerts = computePriceInsights(state.transactions);
  const categories = totalsByCategory();
  const merchants = totalsByMerchant();
  const total = state.transactions.reduce((s, tx) => s + tx.amount, 0);
  const ordersCount = state.transactions.length;
  const avgOrder = ordersCount > 0 ? total / ordersCount : 0;
  const topCat = categories[0];
  const topMerchant = merchants[0];

  const alertHtml = priceAlerts.length > 0
    ? priceAlerts.map(a => `
        <section class="card insight-card">
          <div class="insight-top"><span>↗ Price increased · ${a.merchant}</span><strong>+${a.pct}%</strong></div>
          <h3>${a.itemName}</h3>
          <p>${fmt(a.prevPrice)} → ${fmt(a.latestPrice)}</p>
        </section>`).join("")
    : `<section class="card insight-card">
        <h3>No price changes detected yet</h3>
        <p>Import the same items from the same merchant across two or more orders to see price trend alerts here.</p>
      </section>`;

  return `
    <h1 class="screen-title">Insights</h1>
    ${alertHtml}
    ${topCat ? `
    <section class="card insight-card">
      <div class="insight-top"><span>Top category</span><strong>${Math.round((topCat.value / total) * 100)}% of spend</strong></div>
      <h3>${topCat.name}</h3>
      <p>${fmt(topCat.value)} across all orders</p>
    </section>` : ""}
    ${topMerchant ? `
    <section class="card insight-card">
      <div class="insight-top"><span>Most visited merchant</span><strong>${state.transactions.filter(tx => tx.merchant === topMerchant.name).length} orders</strong></div>
      <h3>${topMerchant.name}</h3>
      <p>${fmt(topMerchant.value)} total spend</p>
    </section>` : ""}
    <section class="card insight-card">
      <div class="insight-top"><span>Average order size</span></div>
      <h3>${fmt(avgOrder)}</h3>
      <p>across ${ordersCount} order${ordersCount !== 1 ? "s" : ""}</p>
    </section>
    <section class="card">
      <div class="section-label">Share orders into the app</div>
      ${[
        ["▤","Copy and paste","Works now for order confirmations and receipt text."],
        ["↥","Share extension","Native iOS next step. For web, use Safari share or paste copied text."],
        ["⌗","Screenshot or PDF","Select a file — you'll be guided to copy the text from it."]
      ].map(([icon, title, text]) => `
        <div class="source-row"><div class="source-icon">${icon}</div><div><strong>${title}</strong><p>${text}</p></div></div>`).join("")}
    </section>`;
}

// ─── Render ───────────────────────────────────────────────────────────────────
function render() {
  document.querySelector("#app").innerHTML = `
    <div class="app-shell"><div class="phone">
      <header class="status" aria-hidden="true"><span>9:41</span><span>◡ ▱</span></header>
      <main class="main">
        <section class="screen ${state.tab === "dashboard" ? "active" : ""}" id="dashboard">${dashboard()}</section>
        <section class="screen ${state.tab === "orders"    ? "active" : ""}" id="orders">${orders()}</section>
        <section class="screen ${state.tab === "import"    ? "active" : ""}" id="import">${importScreen()}</section>
        <section class="screen ${state.tab === "insights"  ? "active" : ""}" id="insights">${insights()}</section>
      </main>
      <nav class="tabbar" aria-label="App navigation">
        ${[["dashboard","◔","Dashboard"],["orders","☷","Orders"],["import","↥","Import"],["insights","◌","Insights"]]
          .map(([id, icon, label]) => `
            <button class="tab ${state.tab === id ? "active" : ""}" data-tab="${id}" aria-label="${label}" ${state.tab === id ? 'aria-current="page"' : ""}>
              <span class="tab-icon" aria-hidden="true">${icon}</span><span class="tab-label">${label}</span>
            </button>`).join("")}
      </nav>
    </div></div>`;
  bindEvents();
}

// ─── Category review modal ────────────────────────────────────────────────────
function showCategoryReviewModal(parsed) {
  // Fix 4a: deduplicate before opening modal
  const seenNames = new Set();
  parsed.items = parsed.items.filter(i => {
    const k = i.name.toLowerCase().trim();
    if (seenNames.has(k)) return false;
    seenNames.add(k);
    return true;
  });
  const uncertain = parsed.items.filter(i => i.confidence === "low");
  if (uncertain.length === 0) return;

  const cats = ["Groceries","Food","Shopping","Beauty","Supplements","Bills","Transport","Subscriptions"];
  const modal = document.createElement("div");
  modal.id = "catModal";
  modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:1000;display:flex;align-items:flex-end;justify-content:center";
  modal.innerHTML = `
    <div style="background:#0e1220;border-radius:18px 18px 0 0;padding:20px 16px 32px;width:min(100%,430px);max-height:80vh;overflow:auto">
      <p style="font-size:11px;color:rgba(240,242,245,.5);margin:0 0 14px">These items weren't recognised. Pick a category — remembered for next time.</p>
      ${uncertain.map((item, idx) => `
        <div style="margin-bottom:14px">
          <div style="font-size:12px;font-weight:600;margin-bottom:6px;color:#f0f2f5">${item.name}</div>
          <div style="display:flex;flex-wrap:wrap;gap:5px">
            ${cats.map(cat => `<button data-item="${idx}" data-cat="${cat}"
              style="font-size:10px;font-weight:600;padding:4px 9px;border-radius:6px;border:.5px solid rgba(255,255,255,.15);background:${item.category === cat ? "#00C9A7" : "rgba(255,255,255,.07)"};color:${item.category === cat ? "#080b14" : "#f0f2f5"};cursor:pointer">
              ${cat}</button>`).join("")}
          </div>
        </div>`).join("")}
      <button id="doneReview" style="width:100%;background:#00C9A7;color:#080b14;border:0;border-radius:8px;padding:10px;font-weight:700;font-size:13px;margin-top:8px">Done</button>
    </div>`;
  document.body.appendChild(modal);

  const selections = Object.fromEntries(uncertain.map((item, i) => [i, item.category]));
  modal.querySelectorAll("[data-item]").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.item);
      selections[idx] = btn.dataset.cat;
      modal.querySelectorAll(`[data-item="${idx}"]`).forEach(b => {
        b.style.background = b.dataset.cat === selections[idx] ? "#00C9A7" : "rgba(255,255,255,.07)";
        b.style.color = b.dataset.cat === selections[idx] ? "#080b14" : "#f0f2f5";
      });
    });
  });

  document.querySelector("#doneReview").addEventListener("click", () => {
    uncertain.forEach((item, idx) => {
      item.category = selections[idx];
      item.confidence = "high";
      saveLearnedRule(item.name, selections[idx]);
    });
    document.body.removeChild(modal);
    render();
  });
}

// ─── Event binding ────────────────────────────────────────────────────────────
function bindEvents() {
  // Tab nav
  document.querySelectorAll("[data-tab]").forEach(btn => {
    btn.addEventListener("click", () => { state.tab = btn.dataset.tab; render(); });
  });

  // Donut → detail sheet
  const donutBtn = document.getElementById("donutBtn");
  if (donutBtn) {
    const openSheet = () => {
      const total = state.transactions.reduce((s, tx) => s + tx.amount, 0);
      showChartDetailSheet(totalsByCategory(), total, state.transactions);
    };
    donutBtn.addEventListener("click", openSheet);
    donutBtn.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") openSheet(); });
  }

  // Textarea sync
  const ta = document.querySelector("#receiptText");
  if (ta) ta.addEventListener("input", e => { state.receiptText = e.target.value; state.parsed = null; });

  // Fix 4b: parse + deduplicate
  document.querySelector("#parseText")?.addEventListener("click", () => {
    state.receiptText = document.querySelector("#receiptText").value;
    const result = parseReceipt(state.receiptText);
    if (result) {
      const seen = new Set();
      result.items = result.items.filter(i => {
        const k = i.name.toLowerCase().trim();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    }
    state.parsed = result;
    render();
    const statusEl = document.querySelector("#importStatus");
    if (statusEl) statusEl.textContent = state.parsed
      ? "Review the parsed order, then save it."
      : "Could not find a usable total. Try a clearer receipt.";
  });

  // Fix 6b: reset to empty
  document.querySelector("#resetText")?.addEventListener("click", () => {
    state.receiptText = ""; state.parsed = null; render();
  });

  // Load demo sample
  document.querySelector("#loadSample")?.addEventListener("click", () => {
    state.receiptText = SAMPLE_TEXT; state.parsed = null; render();
  });

  document.querySelector("#reviewCategories")?.addEventListener("click", () => {
    if (state.parsed) showCategoryReviewModal(state.parsed);
  });

  document.querySelector("#saveOrder")?.addEventListener("click", () => {
    if (!state.parsed) return;
    const dupe = findDuplicate(state.parsed);
    if (dupe && !confirm(`Looks like a duplicate — ${state.parsed.merchant} ${fmt(state.parsed.amount)} already saved. Save anyway?`)) return;
    state.transactions.unshift(state.parsed);
    saveTransactions();
    state.parsed = null;
    state.tab = "dashboard";
    render();
  });

  // Fix 1b: PDF/image handler — no textarea reset
  document.querySelector("#imageInput")?.addEventListener("change", e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const status = document.querySelector("#importStatus");
    if (file.type === "application/pdf") {
      if (status) status.textContent = "PDF selected. Open it, press Cmd+A to select all text, Cmd+C to copy, then paste into the text area above.";
      return;
    }
    if (status) status.textContent = "Screenshot selected. On iPhone, use Live Text to copy the order text, then paste it above. On desktop, try right-click → Copy text if your browser supports it.";
  });

  // Orders: delete
  document.querySelectorAll("[data-delete]").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      if (confirm("Remove this order?")) {
        state.transactions = state.transactions.filter(tx => tx.id !== btn.dataset.delete);
        saveTransactions(); render();
      }
    });
  });

  // Orders: toggle edit panel on row click
  document.querySelectorAll(".tx-row").forEach(row => {
    row.addEventListener("click", () => {
      const id = row.dataset.id;
      const panel = document.querySelector(`#edit-${id}`);
      if (panel) panel.style.display = panel.style.display === "none" ? "block" : "none";
    });
  });

  // Fix 6d: save edit (category + amount)
  document.querySelectorAll("[data-save-edit]").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const id = btn.dataset.saveEdit;
      const newCat = document.querySelector(`[data-edit-cat="${id}"]`)?.value;
      const newAmt = parseFloat(document.querySelector(`[data-edit-amount="${id}"]`)?.value);
      const tx = state.transactions.find(t => t.id === id);
      if (tx) {
        if (newCat) tx.category = newCat;
        if (!isNaN(newAmt) && newAmt > 0) tx.amount = newAmt;
        saveTransactions(); render();
      }
    });
  });
}

// ─── Service worker ───────────────────────────────────────────────────────────
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}

render();
