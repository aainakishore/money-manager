// ─── Constants ───────────────────────────────────────────────────────────────
const TEAL  = "#00C9A7";
const PURP  = "#7C5CF0";
const RED   = "#EF4444";
const ORG   = "#F97316";
const PINK  = "#EC4899";
const GREEN = "#34D399";
const CYAN  = "#06B6D4";
const VIO   = "#8B5CF6";

// ─── Sample data ─────────────────────────────────────────────────────────────
const SAMPLE_TEXT = `Blinkit Order
14 Jun 2026
Amul Taaza Milk 1L x2 Rs 72
Eggs 12 pack Rs 115
Greek Yogurt x2 Rs 95
Dishwash Gel Rs 169
Paid with Google Pay
Order Total Rs 618`;

const DEFAULT_TRANSACTIONS = [
  { id: uid(), merchant: "CRED",    amount: 4210, date: "Jun 12", category: "Bills",     color: RED,  icon: "▧", items: [{ name: "Credit card bill payment", price: 4210, category: "Bills", confidence: "high" }] },
  { id: uid(), merchant: "Amazon",  amount: 2899, date: "Jun 7",  category: "Shopping",  color: PURP, icon: "◧", items: [{ name: "Minimalist Vitamin C Serum", price: 699, category: "Beauty", confidence: "high" }, { name: "Running T-Shirt", price: 1300, category: "Shopping", confidence: "high" }, { name: "Magnesium Glycinate", price: 899, category: "Supplements", confidence: "high" }] },
  { id: uid(), merchant: "Blinkit", amount: 836,  date: "Jun 10", category: "Groceries", color: TEAL, icon: "◫", items: [{ name: "Amul Taaza Milk 1L", price: 144, category: "Groceries", confidence: "high" }, { name: "Eggs 12 pack", price: 115, category: "Groceries", confidence: "high" }, { name: "Greek Yogurt", price: 190, category: "Groceries", confidence: "high" }, { name: "Dishwash Gel", price: 169, category: "Groceries", confidence: "high" }] },
  { id: uid(), merchant: "Swiggy",  amount: 612,  date: "Jun 4",  category: "Food",      color: ORG,  icon: "◍", items: [{ name: "Paneer Bowl", price: 249, category: "Food", confidence: "high" }, { name: "Cold Coffee", price: 159, category: "Food", confidence: "high" }, { name: "Delivery and platform fees", price: 84, category: "Food", confidence: "high" }] },
  { id: uid(), merchant: "Blinkit", amount: 948,  date: "Jun 2",  category: "Groceries", color: TEAL, icon: "◫", items: [{ name: "Amul Taaza Milk 1L", price: 136, category: "Groceries", confidence: "high" }, { name: "Tata Salt 1kg", price: 28, category: "Groceries", confidence: "high" }, { name: "Farmley Almonds 200g", price: 349, category: "Supplements", confidence: "high" }, { name: "Dettol Handwash Refill", price: 135, category: "Beauty", confidence: "high" }, { name: "Brown Bread", price: 52, category: "Groceries", confidence: "high" }] }
];

// ─── App state ────────────────────────────────────────────────────────────────
const state = {
  tab: "dashboard",
  receiptText: SAMPLE_TEXT,
  parsed: null,
  transactions: loadTransactions()
};

// ─── Learned categories (Layer 1 of 3) ───────────────────────────────────────
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

// ─── Persistence ─────────────────────────────────────────────────────────────
function loadTransactions() {
  try {
    const saved = JSON.parse(localStorage.getItem("moneylens.transactions") ?? "null");
    return Array.isArray(saved) && saved.length ? saved : DEFAULT_TRANSACTIONS;
  } catch { return DEFAULT_TRANSACTIONS; }
}

function saveTransactions() {
  localStorage.setItem("moneylens.transactions", JSON.stringify(state.transactions));
}

// ─── Utilities ────────────────────────────────────────────────────────────────
function uid() { return crypto.randomUUID(); }
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

// Returns { category, confidence: "high"|"medium"|"low" }
function inferCategoryWithConfidence(text) {
  const v = text.toLowerCase();

  // Layer 1: learned rules
  for (const [keyword, category] of learnedRules()) {
    if (v.includes(keyword)) return { category, confidence: "high" };
  }

  // Layer 2a: keyword list
  const match = CATEGORY_RULES.find(([, words]) => words.some(w => v.includes(w)));
  if (match) return { category: match[0], confidence: "medium" };

  // Layer 2b: word-shape heuristics
  if (/\b(lip |lash |brow |blush|contour|primer|concealer|highlighter|bronzer)\b/i.test(v))
    return { category: "Beauty", confidence: "medium" };
  if (/\b(wash|clean|care|groom|hygien|lotion|gel|foam|spray|powder|wipe|pad|tampon|razor|blade)\b/i.test(v))
    return { category: "Beauty", confidence: "medium" };
  if (/\b(capsule|tablet|syrup|drops|supplement|health|wellness|ayurved|herbal)\b/i.test(v))
    return { category: "Supplements", confidence: "medium" };
  if (/\b(masala|pickle|papad|chutney|leaves|seeds?|nuts?|dry\s*fruit|roasted|organic)\b/i.test(v))
    return { category: "Groceries", confidence: "medium" };
  if (/\b(wear|cloth|fabric|linen|cotton|polyester|stitch|tailor)\b/i.test(v))
    return { category: "Shopping", confidence: "medium" };

  // Layer 3: unknown
  return { category: "Shopping", confidence: "low" };
}

function inferCategory(text) { return inferCategoryWithConfidence(text).category; }

function dominantCategory(items) {
  const totals = new Map();
  for (const item of items) totals.set(item.category, (totals.get(item.category) ?? 0) + item.price);
  return [...totals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

function categoryMeta(category) {
  const map = { Bills: { color: RED, icon: "▧" }, Shopping: { color: PURP, icon: "◧" }, Groceries: { color: TEAL, icon: "◫" }, Food: { color: ORG, icon: "◍" }, Beauty: { color: PINK, icon: "✦" }, Supplements: { color: GREEN, icon: "✚" }, Transport: { color: CYAN, icon: "◌" }, Subscriptions: { color: VIO, icon: "◉" } };
  return map[category] ?? { color: TEAL, icon: "◌" };
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
function detectMerchant(text) {
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
  return known.find(([, sigs]) => sigs.some(s => lower.includes(s)))?.[0] ?? null;
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

// ─── Parser entry point ───────────────────────────────────────────────────────
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
  const { category } = inferCategoryWithConfidence(payee);
  const meta = categoryMeta(category);
  return { id: uid(), merchant: payee, amount, date: dateMatch?.[1] ?? "Today", category, color: meta.color, icon: meta.icon, items: [{ name: `Payment to ${payee}`, price: amount, category, confidence: "high" }] };
}

// ─── PDF invoice parser ───────────────────────────────────────────────────────
function parsePDFInvoice(text) {
  const merchant = detectMerchant(text) ?? "Unknown";
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
  const blocked = ["total","invoice","tax","gst","handling","delivery","discount","amount in words","cgst","sgst"];
  const items = [];
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.length < 5 || blocked.some(b => t.toLowerCase().startsWith(b))) continue;
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
  let merchant = detectMerchant(text);
  if (!merchant) {
    const lower = text.toLowerCase();
    if (lower.includes("luckybite") || lower.includes("swiggy one") || lower.includes("bill total")) merchant = "Swiggy";
    else if (lower.includes("eternal") || lower.includes("getoff") || lower.includes("zomato gold")) merchant = "Zomato";
  }
  merchant = merchant ?? "Unknown";

  const totalMatch = text.match(
    /(?:bill\s+total|grand\s+total|order\s+total|total\s+paid|amount\s+paid|net\s+payable|total)[:\s]+(?:rs\.?|₹|inr)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i
  );
  const itemRegex = /^(.+?)\s+(?:x\s*(\d+)\s+)?(?:rs\.?|₹|inr)\s*([0-9,]+(?:\.[0-9]{1,2})?)/gim;
  const blocked = ["total","paid","order","invoice","tax","gst","delivery","discount","coupon","platform","packaging","restaurant packaging","handling","membership","express","surge",merchant.toLowerCase()];
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
  const amount = totalMatch ? Number(totalMatch[1].replaceAll(",", "")) : items.reduce((s, i) => s + i.price, 0);
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
function totalsByCategory() {
  const totals = new Map();
  for (const tx of state.transactions) {
    for (const item of tx.items.length ? tx.items : [{ price: tx.amount, category: tx.category }]) {
      const cat = item.category ?? tx.category;
      totals.set(cat, (totals.get(cat) ?? 0) + item.price);
    }
  }
  return [...totals.entries()].map(([name, value]) => ({ name, value, ...categoryMeta(name) })).sort((a, b) => b.value - a.value).slice(0, 4);
}

function totalsByMerchant() {
  const totals = new Map();
  for (const tx of state.transactions) totals.set(tx.merchant, (totals.get(tx.merchant) ?? 0) + tx.amount);
  return [...totals.entries()].map(([name, value]) => ({ name, value, color: colorForMerchant(name) })).sort((a, b) => b.value - a.value).slice(0, 4);
}

// ─── SVG Donut ────────────────────────────────────────────────────────────────
function renderDonut(categories, total) {
  const C = 2 * Math.PI * 42;
  let offset = 0;
  const circles = categories.map(cat => {
    const dash = total ? (cat.value / total) * C : 0;
    const circle = `<circle cx="55" cy="55" r="42" fill="none" stroke="${cat.color}" stroke-width="13" stroke-dasharray="${dash} ${C - dash}" stroke-dashoffset="${-offset}" />`;
    offset += dash;
    return circle;
  }).join("");
  return `<div class="donut-wrap"><svg width="110" height="110" role="img" aria-label="Spending category breakdown"><circle cx="55" cy="55" r="42" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="13"></circle><g transform="rotate(-90 55 55)">${circles}</g></svg><div class="donut-label"><strong>${fmt(total)}</strong><span>June 2026</span></div></div>`;
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
function dashboard() {
  const total = state.transactions.reduce((s, tx) => s + tx.amount, 0);
  const categories = totalsByCategory();
  const merchants = totalsByMerchant();
  const maxM = Math.max(...merchants.map(m => m.value), 1);
  return `
    <div class="eyebrow">June 2026 spending</div>
    <div class="hero-row"><div class="total">${fmt(total)}</div><div class="pill">91% itemized</div></div>
    <div class="metrics">
      <div class="metric"><strong>${state.transactions.length}</strong><span>Orders</span></div>
      <div class="metric"><strong>3</strong><span>Sources</span></div>
      <div class="metric"><strong>2</strong><span>Alerts</span></div>
    </div>
    <section class="card">
      <div class="section-label">By category</div>
      <div class="category-grid">
        ${renderDonut(categories, total)}
        <div>${categories.map(cat => `<div class="legend-row"><div class="legend-left"><span class="dot" style="background:${cat.color}"></span><span>${cat.name}</span></div><div class="amount">${fmt(cat.value)}</div></div>`).join("")}</div>
      </div>
    </section>
    <section class="card">
      <div class="section-label">Top merchants</div>
      ${merchants.map(m => `<div class="merchant-bar"><div class="bar-head"><span>${m.name}</span><strong>${fmt(m.value)}</strong></div><div class="bar-track"><div class="bar-fill" style="width:${(m.value/maxM)*100}%;background:${m.color}"></div></div></div>`).join("")}
    </section>
    <section class="card">
      <div class="section-label">Recent orders</div>
      ${state.transactions.slice(0, 3).map(tx => transactionRow(tx)).join("")}
    </section>`;
}

function orders() {
  return `
    <h1 class="screen-title">Itemized orders</h1>
    <section class="card">
      ${state.transactions.map(tx => `
        <div>
          ${transactionRow(tx, true)}
          <div id="edit-${tx.id}" style="display:none;padding:8px 0 4px;border-top:.5px solid rgba(255,255,255,.06)">
            <label style="font-size:10px;color:rgba(240,242,245,.45)">Category</label>
            <select data-edit-cat="${tx.id}" style="width:100%;background:rgba(255,255,255,.06);border:.5px solid rgba(255,255,255,.15);border-radius:6px;color:#f0f2f5;padding:5px;font-size:11px;margin-top:4px">
              ${["Groceries","Food","Shopping","Beauty","Supplements","Bills","Transport","Subscriptions"].map(cat => `<option value="${cat}" ${tx.category===cat?"selected":""}>${cat}</option>`).join("")}
            </select>
            <button data-save-edit="${tx.id}" style="margin-top:6px;width:100%;background:rgba(0,201,167,.12);border:.5px solid rgba(0,201,167,.3);color:#00C9A7;border-radius:6px;padding:5px;font-size:11px;font-weight:700;cursor:pointer">Save</button>
          </div>
        </div>`).join("")}
    </section>`;
}

function importScreen() {
  const uncertain = state.parsed?.items?.filter(i => i.confidence === "low") ?? [];
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
    <p class="eyebrow" id="importStatus">Copy order text or upload a screenshot.</p>`;
}

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
      ${parsed.items.slice(0, 5).map(item => `
        <div class="item-row">
          <span style="display:flex;align-items:center;gap:5px">
            ${item.confidence === "low" ? '<span style="background:rgba(249,115,22,.18);color:#f97316;font-size:9px;font-weight:700;width:14px;height:14px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center">?</span>' : ""}
            ${item.name}
          </span>
          <strong>${fmt(item.price)}</strong>
        </div>`).join("")}
      ${reviewBtn}
      <button class="secondary saved" id="saveOrder">Save order</button>
    </section>`;
}

function insights() {
  const alerts = [["Greek Yogurt", 80, 95, 19], ["Amul Taaza Milk 1L", 64, 72, 13], ["Eggs 12 pack", 98, 115, 17]];
  return `
    <h1 class="screen-title">Insights</h1>
    ${alerts.map(([item, prev, curr, pct]) => `
      <section class="card insight-card">
        <div class="insight-top"><span>↗ Price increased - Blinkit</span><strong>+${pct}%</strong></div>
        <h3>${item}</h3><p>${fmt(prev)} to ${fmt(curr)}</p>
      </section>`).join("")}
    <section class="card insight-card">
      <h3>Blinkit basket trending up</h3>
      <p>Milk, eggs, and yogurt appear every month. Set a basket budget to catch price drift early.</p>
    </section>
    <section class="card">
      <div class="section-label">Share orders into the app</div>
      ${[["▤","Copy and paste","Works now for order confirmations and receipt text."],["↥","Share extension","Native iOS next step. For web, use Safari share or paste copied text."],["⌗","Screenshot upload","Works now as an upload flow."]].map(([icon,title,text]) => `<div class="source-row"><div class="source-icon">${icon}</div><div><strong>${title}</strong><p>${text}</p></div></div>`).join("")}
    </section>`;
}

// ─── Render ───────────────────────────────────────────────────────────────────
function render() {
  document.querySelector("#app").innerHTML = `
    <div class="app-shell"><div class="phone">
      <header class="status" aria-hidden="true"><span>9:41</span><span>◡ ▱</span></header>
      <main class="main">
        <section class="screen ${state.tab==="dashboard"?"active":""}" id="dashboard">${dashboard()}</section>
        <section class="screen ${state.tab==="orders"?"active":""}" id="orders">${orders()}</section>
        <section class="screen ${state.tab==="import"?"active":""}" id="import">${importScreen()}</section>
        <section class="screen ${state.tab==="insights"?"active":""}" id="insights">${insights()}</section>
      </main>
      <nav class="tabbar" aria-label="App navigation">
        ${[["dashboard","◔","Dashboard"],["orders","☷","Orders"],["import","↥","Import"],["insights","◌","Insights"]].map(([id,icon,label]) => `<button class="tab ${state.tab===id?"active":""}" data-tab="${id}" aria-label="${label}" ${state.tab===id?'aria-current="page"':""}><span class="tab-icon" aria-hidden="true">${icon}</span><span class="tab-label">${label}</span></button>`).join("")}
      </nav>
    </div></div>`;
  bindEvents();
}

// ─── Category review modal ────────────────────────────────────────────────────
function showCategoryReviewModal(parsed) {
  const uncertain = parsed.items.filter(i => i.confidence === "low");
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
            ${cats.map(cat => `<button data-item="${idx}" data-cat="${cat}" style="font-size:10px;font-weight:600;padding:4px 9px;border-radius:6px;border:.5px solid rgba(255,255,255,.15);background:${item.category===cat?"#00C9A7":"rgba(255,255,255,.07)"};color:${item.category===cat?"#080b14":"#f0f2f5"};cursor:pointer">${cat}</button>`).join("")}
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
  // Tab navigation
  document.querySelectorAll("[data-tab]").forEach(btn => {
    btn.addEventListener("click", () => { state.tab = btn.dataset.tab; render(); });
  });

  // Import screen
  const ta = document.querySelector("#receiptText");
  if (ta) ta.addEventListener("input", e => { state.receiptText = e.target.value; state.parsed = null; });

  document.querySelector("#parseText")?.addEventListener("click", () => {
    state.receiptText = document.querySelector("#receiptText").value;
    state.parsed = parseReceipt(state.receiptText);
    render();
    document.querySelector("#importStatus").textContent = state.parsed
      ? "Review the parsed order, then save it."
      : "Could not find a usable total. Try a clearer receipt.";
  });

  document.querySelector("#resetText")?.addEventListener("click", () => {
    state.receiptText = SAMPLE_TEXT; state.parsed = null; render();
  });

  document.querySelector("#reviewCategories")?.addEventListener("click", () => {
    if (state.parsed) showCategoryReviewModal(state.parsed);
  });

  document.querySelector("#saveOrder")?.addEventListener("click", () => {
    if (!state.parsed) return;
    const dupe = findDuplicate(state.parsed);
    if (dupe && !confirm(`Looks like a duplicate — you already saved a ${state.parsed.merchant} order for ${fmt(state.parsed.amount)}. Save anyway?`)) return;
    state.transactions.unshift(state.parsed);
    saveTransactions();
    state.parsed = null;
    state.tab = "dashboard";
    render();
  });

  document.querySelector("#imageInput")?.addEventListener("change", async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    state.receiptText = `Screenshot: ${file.name}\n\nBrowser OCR not bundled — paste the text instead.\n\n${SAMPLE_TEXT}`;
    state.parsed = null; render();
  });

  // Orders screen — delete buttons
  document.querySelectorAll("[data-delete]").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      if (confirm("Remove this order?")) {
        state.transactions = state.transactions.filter(tx => tx.id !== btn.dataset.delete);
        saveTransactions(); render();
      }
    });
  });

  // Orders screen — click row to expand edit panel
  document.querySelectorAll(".tx-row").forEach(row => {
    row.addEventListener("click", () => {
      const id = row.closest("[data-id]")?.dataset.id ?? row.dataset.id;
      const panel = document.querySelector(`#edit-${id}`);
      if (panel) panel.style.display = panel.style.display === "none" ? "block" : "none";
    });
  });

  // Orders screen — save category edit
  document.querySelectorAll("[data-save-edit]").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const id = btn.dataset.saveEdit;
      const newCat = document.querySelector(`[data-edit-cat="${id}"]`)?.value;
      const tx = state.transactions.find(t => t.id === id);
      if (tx && newCat) { tx.category = newCat; saveTransactions(); render(); }
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
