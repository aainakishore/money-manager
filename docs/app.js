// ─── Colour tokens ────────────────────────────────────────────────────────────
const TEAL  = "#00C9A7";
const PURP  = "#7C5CF0";
const RED   = "#EF4444";
const ORG   = "#F97316";
const PINK  = "#EC4899";
const GREEN = "#34D399";
const CYAN  = "#06B6D4";
const VIO   = "#8B5CF6";

// ─── Category registry ────────────────────────────────────────────────────────
// Each category: { id, name, emoji, color }
// id = the key stored in transactions (backward-compatible with old data)
// name = display label
const BUILTIN_CATEGORIES = [
  { id: "Bills",         name: "Bills",          emoji: "🧾", color: RED   },
  { id: "Food",          name: "Food & Dining",  emoji: "🍔", color: ORG   },
  { id: "Groceries",     name: "Groceries",      emoji: "🛒", color: TEAL  },
  { id: "Shopping",      name: "Shopping",       emoji: "🛍️", color: PURP  },
  { id: "Beauty",        name: "Beauty",         emoji: "💄", color: PINK  },
  { id: "Supplements",   name: "Supplements",    emoji: "💊", color: GREEN },
  { id: "Clothing",      name: "Clothing",       emoji: "👕", color: "#6366F1" },
  { id: "Transport",     name: "Transport",      emoji: "🚗", color: CYAN  },
  { id: "Subscriptions", name: "Subscriptions",  emoji: "📺", color: VIO   },
  { id: "Electronics",   name: "Electronics",    emoji: "📱", color: "#38BDF8" },
  { id: "Travel",        name: "Travel",         emoji: "✈️", color: "#F59E0B" },
  { id: "Entertainment", name: "Entertainment",  emoji: "🎮", color: "#A78BFA" },
  { id: "Medical",       name: "Medical",        emoji: "🏥", color: "#FB7185" },
  { id: "Education",     name: "Education",      emoji: "📚", color: "#60A5FA" },
  { id: "Fitness",       name: "Fitness",        emoji: "💪", color: "#4ADE80" },
  { id: "Other",         name: "Other",          emoji: "📦", color: "#94A3B8" },
];

const EMOJI_PALETTE = [
  "🏠","🌿","⚽","🎓","💻","🎸","🐾","🌊","🎨","🔧",
  "💼","🎪","🚀","🍕","🍜","🎁","🎵","🎬","🌍","⭐",
  "🎯","🎲","🌺","🦋","🍀","🔑","💡","🎤","🦁","🔥",
  "❄️","💧","🌈","🏆","💎","🌸","🎭","🧲","🧸","🌙"
];

const COLOR_PALETTE_CUSTOM = [
  "#EF4444","#F97316","#F59E0B","#EAB308",
  "#84CC16","#22C55E","#14B8A6","#06B6D4",
  "#3B82F6","#6366F1","#8B5CF6","#A855F7",
  "#EC4899","#F43F5E","#64748B","#94A3B8"
];

function loadCustomCategories() {
  try { return JSON.parse(localStorage.getItem("moneylens.custom_cats") ?? "[]"); }
  catch { return []; }
}

function saveCustomCategory(cat) {
  const existing = loadCustomCategories();
  if (!existing.find(c => c.id === cat.id)) {
    localStorage.setItem("moneylens.custom_cats", JSON.stringify([...existing, cat]));
  }
}

function allCategories() {
  return [...BUILTIN_CATEGORIES, ...loadCustomCategories()];
}

function categoryMeta(catId) {
  const cat = allCategories().find(c => c.id === catId);
  // Backward compat alias: also return .icon for old code that expects it
  if (cat) return { ...cat, icon: cat.emoji };
  return { id: catId ?? "Other", name: catId ?? "Other", emoji: "📦", icon: "📦", color: "#94A3B8" };
}

function colorForMerchant(name) {
  const l = name.toLowerCase();
  if (l.includes("cred"))    return RED;
  if (l.includes("amazon"))  return PURP;
  if (l.includes("blinkit")) return TEAL;
  if (l.includes("swiggy"))  return ORG;
  return TEAL;
}

// ─── PDF.js — client-side text extraction ────────────────────────────────────
// Loads PDF.js dynamically from CDN on first use. No index.html change needed.
let _pdfJSReady = false;

async function ensurePDFJS() {
  if (_pdfJSReady || window.pdfjsLib) { _pdfJSReady = true; return; }
  await new Promise((res, rej) => {
    const s = Object.assign(document.createElement("script"), {
      src: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
      onload: res, onerror: rej
    });
    document.head.appendChild(s);
  });
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  _pdfJSReady = true;
}

async function extractPDFText(file) {
  await ensurePDFJS();
  const buf  = await file.arrayBuffer();
  const pdf  = await window.pdfjsLib.getDocument({ data: buf }).promise;
  const pages = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page    = await pdf.getPage(p);
    const content = await page.getTextContent();
    // Join items with space; new line between pages
    pages.push(content.items.map(i => i.str).join(" "));
  }
  return pages.join("\n");
}

// ─── Sample data ──────────────────────────────────────────────────────────────
const SAMPLE_TEXT = `Blinkit Order
14 Jun 2026
Amul Taaza Milk 1L x2 Rs 72
Eggs 12 pack Rs 115
Greek Yogurt x2 Rs 95
Dishwash Gel Rs 169
Paid with Google Pay
Order Total Rs 618`;

// Note: color and icon are now derived from category at render time,
// but kept here for backward compatibility with any saved localStorage data.
const DEFAULT_TRANSACTIONS = [
  {
    id: uid(), merchant: "CRED", amount: 4210, date: "Jun 12", category: "Bills",
    items: [{ name: "Credit card bill payment", price: 4210, category: "Bills", confidence: "high" }]
  },
  {
    id: uid(), merchant: "Amazon", amount: 2899, date: "Jun 7", category: "Shopping",
    items: [
      { name: "Minimalist Vitamin C Serum", price: 699,  category: "Beauty",      confidence: "high" },
      { name: "Running T-Shirt",            price: 1300, category: "Clothing",    confidence: "high" },
      { name: "Magnesium Glycinate",        price: 899,  category: "Supplements", confidence: "high" }
    ]
  },
  {
    id: uid(), merchant: "Blinkit", amount: 836, date: "Jun 10", category: "Groceries",
    items: [
      { name: "Amul Taaza Milk 1L", price: 144, category: "Groceries", confidence: "high" },
      { name: "Eggs 12 pack",       price: 115, category: "Groceries", confidence: "high" },
      { name: "Greek Yogurt",       price: 190, category: "Groceries", confidence: "high" },
      { name: "Dishwash Gel",       price: 169, category: "Groceries", confidence: "high" }
    ]
  },
  {
    id: uid(), merchant: "Swiggy", amount: 612, date: "Jun 4", category: "Food",
    items: [
      { name: "Paneer Bowl",                price: 249, category: "Food", confidence: "high" },
      { name: "Cold Coffee",                price: 159, category: "Food", confidence: "high" },
      { name: "Delivery and platform fees", price: 84,  category: "Food", confidence: "high" }
    ]
  },
  {
    id: uid(), merchant: "Blinkit", amount: 948, date: "Jun 2", category: "Groceries",
    items: [
      { name: "Amul Taaza Milk 1L",    price: 136, category: "Groceries",   confidence: "high" },
      { name: "Tata Salt 1kg",         price: 28,  category: "Groceries",   confidence: "high" },
      { name: "Farmley Almonds 200g",  price: 349, category: "Supplements", confidence: "high" },
      { name: "Dettol Handwash Refill",price: 135, category: "Beauty",      confidence: "high" },
      { name: "Brown Bread",           price: 52,  category: "Groceries",   confidence: "high" }
    ]
  }
];

// ─── State ────────────────────────────────────────────────────────────────────
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

// ─── Category inference ───────────────────────────────────────────────────────
const CATEGORY_RULES = [
  ["Subscriptions", ["netflix","spotify","prime video","disney","hotstar","apple tv","subscription","youtube premium","zee5"]],
  ["Transport",     ["uber","ola","metro","fuel","petrol","diesel","rapido","cab","auto","taxi","toll","parking"]],
  ["Bills",         ["cred","credit card","electricity","broadband","wifi","recharge","postpaid","prepaid","emi","insurance","rent"]],
  ["Beauty",        ["serum","toner","moisturiser","moisturizer","sunscreen","spf","face wash","cleanser","shampoo","conditioner","hair mask","hair oil","body wash","soap","scrub","lip balm","lipstick","foundation","mascara","eyeliner","kajal","nail polish","perfume","deodorant","salon","academy","haircut","kojic","glutathione","arbutin","niacinamide","retinol","dettol","handwash","sanitiser","sanitizer"]],
  ["Supplements",   ["protein","whey","casein","creatine","pre-workout","bcaa","amino","vitamin","multivitamin","omega","fish oil","magnesium","zinc","calcium","collagen","probiotic","moringa","ashwagandha","carbamide","almond","chia seed","flaxseed","makhana"]],
  ["Food",          ["swiggy","zomato","biryani","pizza","burger","sandwich","wrap","shawarma","kebab","tikka","grill","pasta","noodle","maggi","coffee","chai","tea","juice","smoothie","milkshake","lassi","paneer","roti","naan","paratha","dosa","idli","samosa","restaurant","cafe","bakery","meal","thali","snack","chocolate","biscuit","cookie","chips","popcorn","candy","ice cream","cake","pastry","dessert"]],
  ["Groceries",     ["blinkit","zepto","bigbasket","jiomart","milk","curd","yogurt","butter","ghee","cheese","bread","egg","atta","flour","rice","dal","pulses","lentil","salt","sugar","oil","mustard","vinegar","sauce","ketchup","pickle","jam","honey","onion","potato","tomato","garlic","ginger","carrot","broccoli","cabbage","capsicum","cucumber","spinach","peas","mango","banana","apple","orange","lemon","coconut","litchi","lychee","grapes","watermelon","papaya","masala","spice","turmeric","cumin","coriander","pepper","oats","cornflakes","muesli","poha","detergent","dishwash","tissue","toilet paper","garbage bag"]],
  ["Clothing",      ["shirt","t-shirt","tshirt","top","blouse","kurta","jeans","trouser","pant","shorts","skirt","dress","saree","shoe","sandal","slipper","sneaker","boot","myntra","fabric","linen","cotton","polyester","stitch","tailor","ethnic","leggings","hoodie","sweater","jacket","coat","innerwear","socks","cap","hat"]],
  ["Electronics",   ["charger","cable","earphone","headphone","earbuds","laptop","keyboard","mouse","tablet","monitor","speaker","router","power bank","webcam","pen drive","hard drive","ram","ssd","gpu","processor"]],
  ["Medical",       ["medicine","tablet","capsule","syrup","drops","doctor","clinic","hospital","pharmacy","chemist","band aid","bandage","thermometer","bp monitor","glucometer","nebuliser"]],
  ["Fitness",       ["gym","yoga","workout","fitness","dumbbell","protein bar","sports","cricket","badminton","running shoe","cycle","treadmill","skipping rope"]],
  ["Travel",        ["hotel","flight","train","bus","makemytrip","goibibo","booking.com","airbnb","oyo","irctc","indigo","spicejet","vistara","inn","resort","hostel"]],
  ["Entertainment", ["movie","cinema","pvr","inox","concert","event","gaming","steam","bookmyshow","ticketing","amusement","comedy","standup"]],
  ["Education",     ["course","udemy","coursera","byju","unacademy","tuition","class","coaching","exam","test series","ncert","olympiad","school fee","college fee"]],
  ["Shopping",      ["amazon","flipkart","nykaa","bag","wallet","belt","watch","jewellery","mobile","book","stationery","pen","notebook","tape","lighter","measuring","decor","furniture","appliance","kitchenware","bedsheet","pillow","mattress"]],
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
  if (/\b(wear|cloth|saree|kurta|fabric|dupatta|dhoti)\b/i.test(v)) return { category: "Clothing", confidence: "medium" };
  return { category: "Shopping", confidence: "low" };
}

function inferCategory(text) { return inferCategoryWithConfidence(text).category; }

function dominantCategory(items) {
  const totals = new Map();
  for (const item of items) totals.set(item.category, (totals.get(item.category) ?? 0) + item.price);
  return [...totals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
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
  if (fmt_ === "upi")   return parseUPIPayment(text);
  if (fmt_ === "pdf")   return parsePDFInvoice(text);
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
    date: dateMatch?.[1] ?? "Today", category,
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
  return { id: uid(), merchant, amount, date: "Today", category, items };
}

// ─── Order summary parser ─────────────────────────────────────────────────────
function parseOrderSummary(text) {
  let merchant = detectMerchantName(text);
  if (merchant === "Unknown") {
    const lower = text.toLowerCase();
    if (lower.includes("luckybite") || lower.includes("swiggy one") || lower.includes("bill total")) merchant = "Swiggy";
    else if (lower.includes("eternal") || lower.includes("getoff") || lower.includes("zomato gold")) merchant = "Zomato";
  }

  const totalMatch = text.match(
      /(?:bill\s+total|grand\s+total|order\s+total|total\s+paid|amount\s+paid|net\s+payable|total)[:\s\n]+(?:rs\.?|₹|inr)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i
  ) || text.match(
      /(?:grand\s+total|total)[:\s]*\n\s*₹([0-9,]+(?:\.[0-9]{1,2})?)/i
  );

  const itemRegex = /^(.+?)\s+(?:x\s*(\d+)\s+)?(?:rs\.?|₹|inr)\s*([0-9,]+(?:\.[0-9]{1,2})?)/gim;

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

  // Amazon fallback
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

  // Deduplicate
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
  return { id: uid(), merchant, amount, date: "Today", category, items };
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
    const validItems = (tx.items || []).filter(i => i.price > 0 && i.price < tx.amount);
    const source = validItems.length > 0 ? validItems : [{ price: tx.amount, category: tx.category }];
    for (const item of source) {
      const cat = item.category ?? tx.category;
      totals.set(cat, (totals.get(cat) ?? 0) + item.price);
    }
  }
  return [...totals.entries()]
      .map(([id, value]) => {
        const meta = categoryMeta(id);
        return { id, name: meta.name, value, emoji: meta.emoji, color: meta.color };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
}

function totalsByMerchant() {
  const totals = new Map();
  for (const tx of state.transactions) totals.set(tx.merchant, (totals.get(tx.merchant) ?? 0) + tx.amount);
  return [...totals.entries()]
      .map(([name, value]) => ({ name, value, color: colorForMerchant(name) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
}

// ─── Price-change insights ────────────────────────────────────────────────────
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
    const prev   = ordered[ordered.length - 2];
    const latest = ordered[ordered.length - 1];
    if (prev.price <= 0) continue;
    const pct = ((latest.price - prev.price) / prev.price) * 100;
    if (pct >= minPct) {
      alerts.push({ itemName: latest.name, merchant: latest.merchant, prevPrice: prev.price, latestPrice: latest.price, pct: Math.round(pct) });
    }
  }
  return alerts.sort((a, b) => b.pct - a.pct);
}

// ─── Transaction row ──────────────────────────────────────────────────────────
// Icon and color are always derived from category — never from stored tx data.
function transactionRow(tx, showDelete = false) {
  const meta  = categoryMeta(tx.category);
  const color = meta.color;
  const emoji = meta.emoji;
  return `
    <div class="tx-row" data-id="${tx.id}">
      <div class="tx-icon" style="background:${color}22;color:${color};font-size:17px;line-height:1">${emoji}</div>
      <div class="tx-meta">
        <strong>${tx.merchant}</strong>
        <span>${(tx.items || []).length} items — ${tx.date}</span>
      </div>
      <div class="tx-amount">${fmt(tx.amount)}</div>
      ${showDelete ? `<button data-delete="${tx.id}" aria-label="Delete" style="background:none;border:none;color:rgba(239,68,68,.7);font-size:16px;padding:4px 6px;cursor:pointer">✕</button>` : ""}
    </div>`;
}

// ─── Donut SVG (used in dashboard) ───────────────────────────────────────────
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
    <div class="donut-wrap" id="donutBtn" role="button" aria-label="View spending breakdown" tabindex="0" style="cursor:pointer">
      <svg width="110" height="110" role="img" aria-label="Spending by category">
        <circle cx="55" cy="55" r="42" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="13"></circle>
        <g transform="rotate(-90 55 55)">${circles}</g>
      </svg>
      <div class="donut-label">
        <strong>${fmt(total)}</strong>
        <span style="color:rgba(0,201,167,.8);font-size:7px;margin-top:2px">tap for details ↗</span>
      </div>
    </div>`;
}

// ─── Enhanced chart detail sheet ──────────────────────────────────────────────
// Opens when user taps the donut chart. Shows full financial breakdown:
// summary stats → donut (larger) → category bars with % → monthly trend →
// top items → quick links to insights → create custom category button.
function showChartDetailSheet(categories, total, transactions) {
  if (document.getElementById("chartSheet")) return;

  const sheet = document.createElement("div");
  sheet.id = "chartSheet";
  sheet.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:1000;display:flex;align-items:flex-end;justify-content:center";

  // ── Summary stats
  const ordersCount = transactions.length;
  const merchantCount = new Set(transactions.map(t => t.merchant)).size;
  const avgOrder = ordersCount > 0 ? Math.round(total / ordersCount) : 0;
  const itemCount = transactions.reduce((s, t) => s + (t.items?.length ?? 0), 0);

  // ── Monthly trend
  const MONTH_ORDER = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const byMonth = new Map();
  for (const tx of transactions) {
    const month = (tx.date || "").split(" ")[0];
    if (month && MONTH_ORDER.includes(month)) byMonth.set(month, (byMonth.get(month) ?? 0) + tx.amount);
  }
  const sortedMonths = [...byMonth.entries()].sort((a, b) => MONTH_ORDER.indexOf(a[0]) - MONTH_ORDER.indexOf(b[0]));
  const maxMonthVal = Math.max(...sortedMonths.map(m => m[1]), 1);

  // ── Top items (by unit price, across all transactions)
  const allItems = [];
  for (const tx of transactions) {
    for (const item of tx.items || []) {
      if (item.price > 0) allItems.push({ ...item, merchant: tx.merchant });
    }
  }
  const topItems = allItems.sort((a, b) => b.price - a.price).slice(0, 8);

  // ── Larger donut SVG (136px)
  const R = 52, CX = 68, CY = 68, SW = 16;
  const C2 = 2 * Math.PI * R;
  let off2 = 0;
  const circles2 = categories.map(cat => {
    const dash = total ? (cat.value / total) * C2 : 0;
    const circle = `<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="${cat.color}" stroke-width="${SW}"
      stroke-dasharray="${dash.toFixed(2)} ${(C2 - dash).toFixed(2)}" stroke-dashoffset="${(-off2).toFixed(2)}" />`;
    off2 += dash;
    return circle;
  }).join("");

  const donutHtml = `
    <div style="display:flex;justify-content:center;margin:12px 0 16px">
      <div style="position:relative;width:136px;height:136px">
        <svg width="136" height="136" viewBox="0 0 136 136">
          <circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="${SW}"></circle>
          <g transform="rotate(-90 ${CX} ${CY})">${circles2}</g>
        </svg>
        <div style="position:absolute;inset:0;display:grid;place-content:center;text-align:center;line-height:1.15">
          <strong style="font-size:15px;color:#f0f2f5">${fmt(total)}</strong>
          <span style="font-size:8px;color:rgba(240,242,245,.46)">all time</span>
        </div>
      </div>
    </div>`;

  // ── Category bars
  const catBarsHtml = categories.map(cat => {
    const pct = total ? ((cat.value / total) * 100).toFixed(1) : 0;
    return `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <span style="font-size:16px;width:22px;text-align:center;flex-shrink:0">${cat.emoji}</span>
        <span style="font-size:11px;color:rgba(240,242,245,.72);width:84px;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${cat.name}</span>
        <div style="flex:1;height:5px;background:rgba(255,255,255,.08);border-radius:3px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:${cat.color};border-radius:3px;transition:width .4s ease"></div>
        </div>
        <span style="font-size:9px;color:rgba(240,242,245,.4);width:34px;text-align:right;flex-shrink:0">${pct}%</span>
        <span style="font-size:11px;font-weight:650;color:#f0f2f5;width:56px;text-align:right;flex-shrink:0">${fmt(cat.value)}</span>
      </div>`;
  }).join("");

  // ── Monthly trend bars (horizontal)
  const trendHtml = sortedMonths.length >= 2
      ? sortedMonths.map(([month, val]) => `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:7px">
          <span style="font-size:10px;color:rgba(240,242,245,.46);width:28px;flex-shrink:0">${month}</span>
          <div style="flex:1;height:8px;background:rgba(255,255,255,.07);border-radius:4px;overflow:hidden">
            <div style="height:100%;width:${Math.round((val / maxMonthVal) * 100)}%;background:${TEAL};border-radius:4px"></div>
          </div>
          <span style="font-size:11px;font-weight:650;color:#f0f2f5;width:60px;text-align:right;flex-shrink:0">${fmt(val)}</span>
        </div>`).join("")
      : `<p style="font-size:11px;color:rgba(240,242,245,.4);margin:4px 0">Add orders from multiple months to see monthly trends here.</p>`;

  // ── Top items list
  const topItemsHtml = topItems.length
      ? topItems.map(item => {
        const meta = categoryMeta(item.category);
        return `
          <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-top:.5px solid rgba(255,255,255,.06)">
            <span style="font-size:15px;flex-shrink:0">${meta.emoji}</span>
            <div style="min-width:0;flex:1">
              <div style="font-size:11px;color:#f0f2f5;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${item.name}</div>
              <div style="font-size:9px;color:rgba(240,242,245,.4)">${item.merchant} · ${meta.name}</div>
            </div>
            <span style="font-size:12px;font-weight:700;color:#f0f2f5;flex-shrink:0">${fmt(item.price)}</span>
          </div>`;
      }).join("")
      : `<p style="font-size:11px;color:rgba(240,242,245,.4);margin:4px 0">No itemized orders yet. Import receipts to see top purchases.</p>`;

  sheet.innerHTML = `
    <div style="background:#0e1220;border-radius:18px 18px 0 0;padding:0 16px 36px;width:min(100%,430px);max-height:90vh;overflow-y:auto">

      <!-- Drag handle -->
      <div style="width:36px;height:4px;background:rgba(255,255,255,.2);border-radius:2px;margin:10px auto 0"></div>

      <!-- Header -->
      <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 0 0">
        <span style="font-size:14px;font-weight:700;color:#f0f2f5">Spending breakdown</span>
        <button id="closeChartSheet" style="background:rgba(255,255,255,.1);border:none;color:#f0f2f5;border-radius:50%;width:26px;height:26px;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center">✕</button>
      </div>

      <!-- 4-stat grid -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:12px 0">
        ${[
    [fmt(total),    "Total"],
    [ordersCount,   "Orders"],
    [merchantCount, "Merchants"],
    [itemCount,     "Line items"],
  ].map(([v, l]) => `
          <div style="background:rgba(255,255,255,.05);border-radius:9px;padding:7px 4px;text-align:center">
            <strong style="display:block;font-size:12px;color:#f0f2f5;line-height:1.2">${v}</strong>
            <span style="font-size:8px;color:rgba(240,242,245,.46)">${l}</span>
          </div>`).join("")}
      </div>

      <!-- Large donut -->
      ${donutHtml}

      <!-- Category section -->
      <div style="font-size:10px;font-weight:650;text-transform:uppercase;letter-spacing:.5px;color:rgba(240,242,245,.46);margin-bottom:10px">By category</div>
      ${catBarsHtml}

      <!-- Monthly trend -->
      <div style="font-size:10px;font-weight:650;text-transform:uppercase;letter-spacing:.5px;color:rgba(240,242,245,.46);margin:16px 0 10px">Monthly spend</div>
      ${trendHtml}

      <!-- Avg order insight -->
      ${avgOrder > 0 ? `
      <div style="background:rgba(0,201,167,.07);border:.5px solid rgba(0,201,167,.2);border-radius:10px;padding:10px 12px;margin:16px 0 4px;display:flex;align-items:center;gap:10px">
        <span style="font-size:20px">📊</span>
        <div>
          <div style="font-size:12px;font-weight:600;color:#f0f2f5">Avg order: ${fmt(avgOrder)}</div>
          <div style="font-size:10px;color:rgba(240,242,245,.5)">across ${ordersCount} orders from ${merchantCount} merchant${merchantCount !== 1 ? "s" : ""}</div>
        </div>
      </div>` : ""}

      <!-- Top purchases -->
      <div style="font-size:10px;font-weight:650;text-transform:uppercase;letter-spacing:.5px;color:rgba(240,242,245,.46);margin:16px 0 4px">Top purchases</div>
      ${topItemsHtml}

      <!-- Create custom category CTA -->
      <button id="openAddCategoryFromSheet" style="width:100%;margin-top:20px;padding:11px;background:rgba(0,201,167,.08);border:.5px solid rgba(0,201,167,.3);border-radius:10px;color:#00C9A7;font-size:12px;font-weight:700;cursor:pointer">
        + Create custom category
      </button>
    </div>`;

  document.body.appendChild(sheet);

  document.getElementById("closeChartSheet").addEventListener("click", () => {
    document.body.removeChild(sheet);
  });
  sheet.addEventListener("click", e => {
    if (e.target === sheet) document.body.removeChild(sheet);
  });
  document.getElementById("openAddCategoryFromSheet")?.addEventListener("click", () => {
    document.body.removeChild(sheet);
    showAddCategoryModal();
  });
}

// ─── Custom category creation modal ──────────────────────────────────────────
function showAddCategoryModal() {
  if (document.getElementById("addCatModal")) return;

  let selectedEmoji = "📦";
  let selectedColor = "#06B6D4";

  const modal = document.createElement("div");
  modal.id = "addCatModal";
  modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:2000;display:flex;align-items:flex-end;justify-content:center";

  modal.innerHTML = `
    <div style="background:#0e1220;border-radius:18px 18px 0 0;padding:0 16px 36px;width:min(100%,430px);max-height:85vh;overflow-y:auto">

      <div style="width:36px;height:4px;background:rgba(255,255,255,.2);border-radius:2px;margin:10px auto 0"></div>

      <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 0 14px">
        <span style="font-size:14px;font-weight:700;color:#f0f2f5">Create category</span>
        <button id="closeAddCat" style="background:rgba(255,255,255,.1);border:none;color:#f0f2f5;border-radius:50%;width:26px;height:26px;font-size:14px;cursor:pointer">✕</button>
      </div>

      <!-- Live preview -->
      <div id="catPreview" style="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.05);border-radius:12px;padding:10px 12px;margin-bottom:16px">
        <div id="previewIcon" style="width:38px;height:38px;border-radius:10px;background:${selectedColor}22;display:grid;place-items:center;font-size:20px;flex-shrink:0">${selectedEmoji}</div>
        <div>
          <div id="previewName" style="font-size:13px;font-weight:600;color:#f0f2f5">New category</div>
          <div style="font-size:10px;color:rgba(240,242,245,.4)">Preview</div>
        </div>
      </div>

      <!-- Name input -->
      <div style="font-size:10px;color:rgba(240,242,245,.46);margin-bottom:5px">Name</div>
      <input id="catNameInput" type="text" placeholder="e.g. Dining Out, Hobbies, Pets…" maxlength="20"
        style="width:100%;background:rgba(255,255,255,.06);border:.5px solid rgba(255,255,255,.15);border-radius:8px;color:#f0f2f5;padding:8px 10px;font-size:12px;margin-bottom:16px;box-sizing:border-box;outline:none" />

      <!-- Emoji picker -->
      <div style="font-size:10px;color:rgba(240,242,245,.46);margin-bottom:8px">Icon</div>
      <div id="emojiPicker" style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:16px">
        ${EMOJI_PALETTE.map(e => `
          <button data-emoji="${e}" style="width:36px;height:36px;border-radius:8px;border:1.5px solid ${e === selectedEmoji ? "#00C9A7" : "transparent"};background:rgba(255,255,255,.06);font-size:18px;cursor:pointer;display:grid;place-items:center;transition:border-color .15s">${e}</button>
        `).join("")}
      </div>

      <!-- Color picker -->
      <div style="font-size:10px;color:rgba(240,242,245,.46);margin-bottom:8px">Color</div>
      <div id="colorPicker" style="display:flex;flex-wrap:wrap;gap:7px;margin-bottom:20px">
        ${COLOR_PALETTE_CUSTOM.map(c => `
          <button data-color="${c}" style="width:28px;height:28px;border-radius:50%;background:${c};border:2.5px solid ${c === selectedColor ? "#ffffff" : "transparent"};cursor:pointer;transition:border-color .15s"></button>
        `).join("")}
      </div>

      <button id="saveCatBtn" style="width:100%;background:#00C9A7;color:#080b14;border:0;border-radius:10px;padding:12px;font-size:13px;font-weight:700;cursor:pointer">Create category</button>
    </div>`;

  document.body.appendChild(modal);

  // Live name preview
  document.getElementById("catNameInput").addEventListener("input", e => {
    const v = e.target.value.trim() || "New category";
    document.getElementById("previewName").textContent = v;
  });

  // Emoji selection
  modal.querySelectorAll("[data-emoji]").forEach(btn => {
    btn.addEventListener("click", () => {
      selectedEmoji = btn.dataset.emoji;
      modal.querySelectorAll("[data-emoji]").forEach(b => {
        b.style.borderColor = b.dataset.emoji === selectedEmoji ? "#00C9A7" : "transparent";
      });
      const pIcon = document.getElementById("previewIcon");
      pIcon.textContent = selectedEmoji;
    });
  });

  // Color selection
  modal.querySelectorAll("[data-color]").forEach(btn => {
    btn.addEventListener("click", () => {
      selectedColor = btn.dataset.color;
      modal.querySelectorAll("[data-color]").forEach(b => {
        b.style.borderColor = b.dataset.color === selectedColor ? "#ffffff" : "transparent";
      });
      const pIcon = document.getElementById("previewIcon");
      pIcon.style.background = selectedColor + "22";
    });
  });

  const close = () => document.body.removeChild(modal);
  document.getElementById("closeAddCat").addEventListener("click", close);
  modal.addEventListener("click", e => { if (e.target === modal) close(); });

  document.getElementById("saveCatBtn").addEventListener("click", () => {
    const name = document.getElementById("catNameInput").value.trim();
    if (!name) {
      document.getElementById("catNameInput").style.borderColor = "rgba(239,68,68,.6)";
      document.getElementById("catNameInput").focus();
      return;
    }
    const id = name.replace(/\s+/g, "_");
    if (allCategories().find(c => c.id === id)) {
      document.getElementById("catNameInput").style.borderColor = "rgba(239,68,68,.6)";
      return;
    }
    saveCustomCategory({ id, name, emoji: selectedEmoji, color: selectedColor });
    close();
    render();
  });
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function dashboard() {
  const total      = state.transactions.reduce((s, tx) => s + tx.amount, 0);
  const categories = totalsByCategory();
  const merchants  = totalsByMerchant();
  const maxM       = Math.max(...merchants.map(m => m.value), 1);
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
          ${categories.slice(0, 5).map(cat => `
            <div class="legend-row">
              <div class="legend-left">
                <span style="font-size:13px">${cat.emoji}</span>
                <span>${cat.name}</span>
              </div>
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

// ─── Orders screen ────────────────────────────────────────────────────────────
function orders() {
  const cats = allCategories();
  return `
    <h1 class="screen-title">Itemized orders</h1>
    <section class="card">
      ${state.transactions.map(tx => `
        <div>
          ${transactionRow(tx, true)}
          <div id="edit-${tx.id}" style="display:none;padding:8px 0 4px;border-top:.5px solid rgba(255,255,255,.06)">
            <label style="font-size:10px;color:rgba(240,242,245,.45)">Category</label>
            <select data-edit-cat="${tx.id}" style="width:100%;background:rgba(255,255,255,.06);border:.5px solid rgba(255,255,255,.15);border-radius:6px;color:#f0f2f5;padding:5px;font-size:11px;margin-top:4px">
              ${cats.map(c => `<option value="${c.id}" ${tx.category === c.id ? "selected" : ""}>${c.emoji} ${c.name}</option>`).join("")}
            </select>
            <label style="font-size:10px;color:rgba(240,242,245,.45);margin-top:8px;display:block">Amount (₹)</label>
            <input type="number" data-edit-amount="${tx.id}" value="${tx.amount}"
              style="width:100%;background:rgba(255,255,255,.06);border:.5px solid rgba(255,255,255,.15);border-radius:6px;color:#f0f2f5;padding:5px;font-size:11px;margin-top:4px;box-sizing:border-box" />
            <button data-save-edit="${tx.id}" style="margin-top:6px;width:100%;background:rgba(0,201,167,.12);border:.5px solid rgba(0,201,167,.3);color:#00C9A7;border-radius:6px;padding:5px;font-size:11px;font-weight:700;cursor:pointer">Save</button>
          </div>
        </div>`).join("")}
    </section>
    <button id="addCategoryBtn" style="width:100%;margin-top:8px;padding:10px;background:rgba(255,255,255,.04);border:.5px solid rgba(255,255,255,.1);border-radius:10px;color:rgba(240,242,245,.6);font-size:11px;cursor:pointer">
      ＋ Create custom category
    </button>`;
}

// ─── Import screen ────────────────────────────────────────────────────────────
function importScreen() {
  return `
    <h1 class="screen-title">Import order</h1>
    <section class="card">
      <label class="eyebrow" for="receiptText">Paste order text from Amazon, Swiggy, Blinkit…</label>
      <textarea id="receiptText" aria-label="Order text"
        placeholder="Paste order text from Amazon, Swiggy, Blinkit, Zomato…">${state.receiptText}</textarea>
      <div class="actions">
        <button class="primary" id="parseText">Parse text</button>
        <label class="secondary file-button" aria-label="Upload PDF or screenshot">
          📄<input id="imageInput" type="file" accept="image/*,application/pdf" />
        </label>
        <button class="secondary" id="loadSample" aria-label="Load sample">Demo</button>
        <button class="secondary" id="resetText" aria-label="Clear">✕</button>
      </div>
    </section>
    <div id="parsedSlot">${state.parsed ? parsedCard(state.parsed) : ""}</div>
    <p class="eyebrow" id="importStatus">Paste order text or upload a PDF — it will be read automatically.</p>`;
}

// ─── Parsed card ──────────────────────────────────────────────────────────────
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
        ${parsed.items.map(item => {
    const meta = categoryMeta(item.category);
    return `
            <div class="item-row">
              <span style="display:flex;align-items:center;gap:6px">
                <span style="font-size:13px">${meta.emoji}</span>
                ${item.confidence === "low" ? '<span style="background:rgba(249,115,22,.18);color:#f97316;font-size:9px;font-weight:700;width:14px;height:14px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center">?</span>' : ""}
                ${item.name}
              </span>
              <strong>${fmt(item.price)}</strong>
            </div>`;
  }).join("")}
      </div>
      ${reviewBtn}
      <button class="secondary saved" id="saveOrder">Save order</button>
    </section>`;
}

// ─── Insights screen ──────────────────────────────────────────────────────────
function insights() {
  const priceAlerts = computePriceInsights(state.transactions);
  const categories  = totalsByCategory();
  const merchants   = totalsByMerchant();
  const total       = state.transactions.reduce((s, tx) => s + tx.amount, 0);
  const ordersCount = state.transactions.length;
  const avgOrder    = ordersCount > 0 ? total / ordersCount : 0;
  const topCat      = categories[0];
  const topMerchant = merchants[0];

  const alertHtml = priceAlerts.length > 0
      ? priceAlerts.map(a => `
        <section class="card insight-card">
          <div class="insight-top"><span>↗ Price increased · ${a.merchant}</span><strong>+${a.pct}%</strong></div>
          <h3>${a.itemName}</h3>
          <p>${fmt(a.prevPrice)} → ${fmt(a.latestPrice)}</p>
        </section>`).join("")
      : `<section class="card insight-card">
        <h3>No price changes yet</h3>
        <p>Import the same item from the same merchant across two orders to see price alerts here.</p>
      </section>`;

  return `
    <h1 class="screen-title">Insights</h1>
    ${alertHtml}
    ${topCat ? `
    <section class="card insight-card">
      <div class="insight-top"><span>${topCat.emoji} Top category</span><strong>${Math.round((topCat.value / total) * 100)}% of spend</strong></div>
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
      <div class="section-label">How to import orders</div>
      ${[
    ["📋","Copy and paste","Works now — grab order confirmation text from any app and paste it into the Import tab."],
    ["📤","Share extension","Native iOS share sheet integration is the next step. For now, Safari share → Copy works."],
    ["📄","PDF upload","Upload a Blinkit, Zomato, or Amazon invoice PDF — text is extracted automatically."]
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
  const seenNames = new Set();
  parsed.items = parsed.items.filter(i => {
    const k = i.name.toLowerCase().trim();
    if (seenNames.has(k)) return false;
    seenNames.add(k);
    return true;
  });
  const uncertain = parsed.items.filter(i => i.confidence === "low");
  if (uncertain.length === 0) return;

  const cats = allCategories();
  const modal = document.createElement("div");
  modal.id = "catModal";
  modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:1000;display:flex;align-items:flex-end;justify-content:center";
  modal.innerHTML = `
    <div style="background:#0e1220;border-radius:18px 18px 0 0;padding:20px 16px 32px;width:min(100%,430px);max-height:80vh;overflow:auto">
      <p style="font-size:11px;color:rgba(240,242,245,.5);margin:0 0 14px">These items weren't recognised. Pick a category — your choice is saved for next time.</p>
      ${uncertain.map((item, idx) => `
        <div style="margin-bottom:14px">
          <div style="font-size:12px;font-weight:600;margin-bottom:6px;color:#f0f2f5">${item.name}</div>
          <div style="display:flex;flex-wrap:wrap;gap:5px">
            ${cats.map(c => `<button data-item="${idx}" data-cat="${c.id}"
              style="font-size:10px;font-weight:600;padding:4px 8px;border-radius:6px;border:.5px solid rgba(255,255,255,.15);background:${item.category === c.id ? "#00C9A7" : "rgba(255,255,255,.07)"};color:${item.category === c.id ? "#080b14" : "#f0f2f5"};cursor:pointer">
              ${c.emoji} ${c.name}</button>`).join("")}
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
        b.style.color      = b.dataset.cat === selections[idx] ? "#080b14" : "#f0f2f5";
      });
    });
  });

  document.querySelector("#doneReview").addEventListener("click", () => {
    uncertain.forEach((item, idx) => {
      item.category   = selections[idx];
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

  // Parse text button
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
        ? "Review the parsed order below, then tap Save."
        : "Could not find a usable total. Try a clearer receipt.";
  });

  // Reset
  document.querySelector("#resetText")?.addEventListener("click", () => {
    state.receiptText = ""; state.parsed = null; render();
  });

  // Load demo
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

  // ── PDF / image handler — reads PDFs automatically via PDF.js ──
  document.querySelector("#imageInput")?.addEventListener("change", async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const statusEl = document.querySelector("#importStatus");

    if (file.type === "application/pdf") {
      if (statusEl) statusEl.textContent = "📄 Reading PDF…";
      try {
        const text = await extractPDFText(file);
        if (!text.trim()) {
          if (statusEl) statusEl.textContent = "PDF appears to be scanned/image-only. Try copying text manually.";
          return;
        }
        state.receiptText = text;
        render(); // show extracted text in textarea

        // Auto-parse
        const result = parseReceipt(text);
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

        const s2 = document.querySelector("#importStatus");
        if (s2) s2.textContent = result
            ? `✅ PDF parsed — ${result.items.length} items from ${result.merchant}. Review and save.`
            : "PDF text extracted but no order total found. Check the text above and adjust if needed.";
      } catch (err) {
        console.error(err);
        if (statusEl) statusEl.textContent = "PDF reading failed. Try copying the text manually.";
      }
      return;
    }

    // Image — can't do OCR in browser without a backend, guide the user
    if (statusEl) statusEl.textContent = "Screenshot selected. On iPhone, use Live Text to copy the order text, then paste it above.";
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

  // Orders: toggle inline edit panel
  document.querySelectorAll(".tx-row").forEach(row => {
    row.addEventListener("click", () => {
      const id    = row.dataset.id;
      const panel = document.querySelector(`#edit-${id}`);
      if (panel) panel.style.display = panel.style.display === "none" ? "block" : "none";
    });
  });

  // Orders: save edit
  document.querySelectorAll("[data-save-edit]").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const id     = btn.dataset.saveEdit;
      const newCat = document.querySelector(`[data-edit-cat="${id}"]`)?.value;
      const newAmt = parseFloat(document.querySelector(`[data-edit-amount="${id}"]`)?.value);
      const tx     = state.transactions.find(t => t.id === id);
      if (tx) {
        if (newCat) tx.category = newCat;
        if (!isNaN(newAmt) && newAmt > 0) tx.amount = newAmt;
        saveTransactions(); render();
      }
    });
  });

  // Add custom category buttons (orders screen + any other)
  document.getElementById("addCategoryBtn")?.addEventListener("click", () => {
    showAddCategoryModal();
  });
  document.getElementById("openAddCategoryFromSheet")?.addEventListener("click", () => {
    showAddCategoryModal();
  });
}

// ─── Service worker ───────────────────────────────────────────────────────────
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}

render();
