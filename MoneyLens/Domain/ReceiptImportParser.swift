import Foundation

// MARK: - Document format detection

private enum ReceiptFormat {
    case upiPayment      // Google Pay / PhonePe / Paytm UPI screenshots
    case pdfTaxInvoice   // Structured GST tax invoices (Blinkit, Zomato invoices)
    case orderSummary    // Regular order receipts (Swiggy, Zomato, Amazon email)
}

public struct ReceiptImportParser {
    private let calendar: Calendar

    public init(calendar: Calendar = .current) {
        self.calendar = calendar
    }

    public func parse(
        text: String,
        source: TransactionSource,
        importedAt date: Date = Date()
    ) -> SpendTransaction? {
        guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return nil }

        switch detectFormat(text) {
        case .upiPayment:
            return parseUPIPayment(text: text, source: source, importedAt: date)
        case .pdfTaxInvoice:
            return parsePDFTaxInvoice(text: text, source: source, importedAt: date)
        case .orderSummary:
            return parseOrderSummary(text: text, source: source, importedAt: date)
        }
    }

    // MARK: - Format detection

    private func detectFormat(_ text: String) -> ReceiptFormat {
        let lower = text.lowercased()
        // UPI: has transaction ID, "completed", and a standalone rupee amount
        if lower.contains("upi transaction id") || lower.contains("upi lite") ||
           lower.contains("google transaction id") || lower.contains("phonepay") {
            return .upiPayment
        }
        // PDF tax invoice: has "tax invoice" + HSN/SAC codes or "invoice value"
        if (lower.contains("tax invoice") || lower.contains("invoice no")) &&
           (lower.contains("hsn") || lower.contains("invoice value") || lower.contains("sgst")) {
            return .pdfTaxInvoice
        }
        return .orderSummary
    }

    // MARK: - UPI Payment parser

    private func parseUPIPayment(text: String, source: TransactionSource, importedAt date: Date) -> SpendTransaction? {
        // Extract payee - first line that starts with "To" or contains the recipient name
        let lines = text.components(separatedBy: .newlines).map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty }

        var payee = "Unknown"
        for line in lines.prefix(5) {
            if line.lowercased().hasPrefix("to ") && !line.lowercased().contains("transaction") {
                payee = String(line.dropFirst(3)).trimmingCharacters(in: .whitespaces)
                break
            }
        }
        // Clean "To: Name" format
        if let match = text.range(of: #"^To:?\s+([^\n₹\d]+)"#, options: [.regularExpression, .caseInsensitive]) {
            let extracted = String(text[match]).replacingOccurrences(of: #"^To:?\s+"#, with: "", options: .regularExpression).trimmingCharacters(in: .whitespaces)
            if !extracted.isEmpty { payee = extracted }
        }

        // Extract amount - standalone ₹ followed by number
        guard let amountMatch = text.range(of: #"₹\s*([0-9,]+(?:\.[0-9]{1,2})?)"#, options: .regularExpression),
              let amount = Decimal(string: String(text[amountMatch]).replacingOccurrences(of: #"[₹,\s]"#, with: "", options: .regularExpression)) else {
            return nil
        }

        let paymentApp = detectPaymentApp(in: text)
        let category = inferCategory(from: payee)
        let detectedDate = detectDate(in: text) ?? date

        return SpendTransaction(
            date: detectedDate,
            merchant: payee,
            sourceApp: paymentApp ?? "Google Pay",
            paymentApp: paymentApp,
            amount: amount,
            category: category,
            source: source,
            items: [LineItem(name: "Payment to \(payee)", quantity: 1, unitPrice: amount, category: category)],
            confidence: 0.90
        )
    }

    // MARK: - PDF Tax Invoice parser (Blinkit / Zomato GST invoices)

    private func parsePDFTaxInvoice(text: String, source: TransactionSource, importedAt date: Date) -> SpendTransaction? {
        let merchant = detectMerchant(in: text) ?? "Unknown merchant"
        let paymentApp = detectPaymentApp(in: text)
        let detectedDate = detectDate(in: text) ?? date

        // Total: look for "Invoice Value", "Amount in Words" preceding total, or standalone total line
        let amount = detectPDFTotal(in: text) ?? 0
        guard amount > .zero else { return nil }

        // Items: numbered lines from GST tables "1. Item name ... finalPrice"
        let items = parsePDFItems(from: text, invoiceTotal: amount)

        let category = dominantCategory(from: items) ?? inferCategory(from: merchant)
        let confidence = items.isEmpty ? 0.60 : min(0.92, 0.70 + Double(items.count) * 0.04)

        return SpendTransaction(
            date: detectedDate,
            merchant: merchant,
            sourceApp: merchant,
            paymentApp: paymentApp,
            amount: amount,
            category: category,
            source: source,
            items: items,
            confidence: confidence
        )
    }

    private func detectPDFTotal(in text: String) -> Decimal? {
        // Try "Invoice Value X\nHandling Fee Y\nZ" pattern (Blinkit seller invoices)
        if let match = text.range(of: #"Invoice Value\s+([\d,]+(?:\.\d{1,2})?)"#, options: [.regularExpression, .caseInsensitive]) {
            let num = String(text[match]).replacingOccurrences(of: #"Invoice Value\s+"#, with: "", options: .regularExpression).replacingOccurrences(of: ",", with: "")
            if let val = Decimal(string: num.trimmingCharacters(in: .whitespaces)), val > 0 {
                // Also try to capture the next total that includes handling
                let lines = text.components(separatedBy: .newlines)
                if let ivLine = lines.firstIndex(where: { $0.contains("Invoice Value") }) {
                    // Look for a standalone total a few lines down
                    for line in lines[(ivLine + 1)..<min(ivLine + 5, lines.count)] {
                        let stripped = line.trimmingCharacters(in: .whitespaces)
                        if let standalone = Decimal(string: stripped.replacingOccurrences(of: ",", with: "")), standalone > val {
                            return standalone
                        }
                    }
                }
                return val
            }
        }
        // "Total X" at end of table
        if let match = text.range(of: #"(?:^|\n)Total\s+([\d,]+(?:\.\d{1,2})?)"#, options: [.regularExpression, .caseInsensitive]) {
            let num = String(text[match]).replacingOccurrences(of: #"(?i)total\s+"#, with: "", options: .regularExpression).replacingOccurrences(of: ",", with: "")
            if let val = Decimal(string: num.trimmingCharacters(in: .whitespacesAndNewlines)), val > 0 { return val }
        }
        return nil
    }

    private func parsePDFItems(from text: String, invoiceTotal: Decimal) -> [LineItem] {
        let lines = text.components(separatedBy: .newlines)
        var items: [LineItem] = []
        let blocked = ["total", "invoice", "tax", "gst", "handling", "delivery", "discount", "subtotal", "amount in words", "cgst", "sgst"]

        // Pattern: numbered item lines "1. Item Name ... quantity ... total_at_end"
        // Or item lines starting with a number followed by item description
        let numberedPattern = try? NSRegularExpression(pattern: #"^\d+\.\s*(.+?)\s+(?:\d+\s+NOS\s+)?(?:\d{4,}\s+)?[\d.]+\s+[\d.]+\s+[\d.]+(?:\s+[\d.]+)*\s+(\d+)$"#, options: [])

        for line in lines {
            let trimmed = line.trimmingCharacters(in: .whitespaces)
            guard trimmed.count > 5 else { continue }
            let lower = trimmed.lowercased()
            guard !blocked.contains(where: { lower.hasPrefix($0) }) else { continue }

            if let regex = numberedPattern,
               let match = regex.firstMatch(in: trimmed, range: NSRange(trimmed.startIndex..., in: trimmed)),
               let nameRange = Range(match.range(at: 1), in: trimmed),
               let priceRange = Range(match.range(at: 2), in: trimmed) {
                let name = String(trimmed[nameRange]).trimmingCharacters(in: .whitespaces)
                let price = Decimal(string: String(trimmed[priceRange])) ?? .zero
                if name.count >= 3 && price > 0 && price < invoiceTotal {
                    let (category, confidence) = inferCategoryWithConfidence(from: name)
                    items.append(LineItem(name: name, quantity: 1, unitPrice: price,
                                         category: category, categoryConfidence: confidence))
                }
            }
        }
        return items
    }

    // MARK: - Order Summary parser (Swiggy, Zomato, Amazon email, etc.)

    private func parseOrderSummary(text: String, source: TransactionSource, importedAt date: Date) -> SpendTransaction? {
        let rawLines = text
            .components(separatedBy: .newlines)
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }
        let lines = preJoinMultiLineItems(in: rawLines)

        guard !lines.isEmpty else { return nil }

        let merchant = detectMerchantFromContext(in: text) ?? lines.first ?? "Unknown merchant"
        let paymentApp = detectPaymentApp(in: text)
        var items = parseOrderItems(from: lines)
        if items.isEmpty, merchant == "Amazon" {
            let pattern = #"item(?:s)?\s+subtotal[:\s]+(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d{1,2})?)"#
            if let regex = try? NSRegularExpression(pattern: pattern, options: .caseInsensitive),
                let match = regex.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)),
                let priceRange = Range(match.range(at: 1), in: text) {
                    let priceStr = String(text[priceRange]).replacingOccurrences(of: ",", with: "")
                    if let price = Decimal(string: priceStr), price > 0 {
                        // Find first long line that isn't a label, address, or contains a price
                        let productLine = lines.first { l in
                            l.count > 20 &&
                            !l.lowercased().hasPrefix("order") &&
                            !l.lowercased().hasPrefix("ship") &&
                            !l.lowercased().hasPrefix("payment") &&
                            !l.lowercased().contains("subtotal") &&
                            !l.lowercased().contains("total") &&
                            !l.lowercased().contains("sold by") &&
                            extractAmounts(from: l).isEmpty
                        }
                        if let name = productLine {
                        // Amazon titles are long; trim at first "|" or 80 chars
                        let short = (name.components(separatedBy: "|").first ?? name)
                            .trimmingCharacters(in: .whitespaces)
                        items.append(LineItem(
                            name: String(short.prefix(80)),
                            quantity: 1,
                            unitPrice: price,
                            category: inferCategory(from: name)
                        ))
                    }
                }
            }
        }

        let amount = detectOrderTotal(in: lines) ?? items.reduce(Decimal.zero) { $0 + $1.total }
        guard amount > .zero else { return nil }

        let category = dominantCategory(from: items) ?? inferCategory(from: merchant)
        let confidence = items.isEmpty ? 0.48 : min(0.96, 0.62 + Double(items.count) * 0.06)

        return SpendTransaction(
            date: detectDate(in: text) ?? date,
            merchant: merchant,
            sourceApp: merchant,
            paymentApp: paymentApp,
            amount: amount,
            category: category,
            source: source,
            items: items,
            confidence: confidence
        )
    }

    private func detectOrderTotal(in lines: [String]) -> Decimal? {
        // Extended keyword list including "bill total" (Swiggy) and "invoice value"
        let totalKeywords = [
            "grand total", "bill total", "order total", "total paid",
            "amount paid", "amount due", "net payable", "invoice value", "paid", "total"
        ]

        for line in lines.reversed() {
            let lower = line.lowercased()
            guard totalKeywords.contains(where: { lower.contains($0) }) else { continue }
            // Grab the last number on this line (handles "Bill Total ₹602.00")
            if let amount = extractAmounts(from: line).last {
                return amount
            }
        }
        return nil
    }

    private func parseOrderItems(from lines: [String]) -> [LineItem] {
        lines.compactMap { line in
            let lower = line.lowercased()
            guard shouldTreatAsOrderItem(line: lower),
                  let amount = extractAmounts(from: line).last else { return nil }

            let quantity = extractQuantity(from: line)
            let name = cleanedItemName(from: line)
            guard name.count >= 3 else { return nil }

            let (category, confidence) = inferCategoryWithConfidence(from: name)
            return LineItem(name: name, quantity: quantity, unitPrice: amount,
                            category: category, categoryConfidence: confidence)
        }
    }

    private func shouldTreatAsOrderItem(line: String) -> Bool {
        let blocked = [
            "total", "subtotal", "tax", "gst", "delivery", "platform fee",
            "discount", "coupon", "paid", "payment", "order id", "invoice",
            "restaurant packaging", "packaging charge", "express delivery",
            "handling", "membership", "surge"
        ]
        return !blocked.contains { line.contains($0) }
    }

    // MARK: - Merchant detection

   // AFTER
private func detectMerchant(in text: String) -> String? {
    let lower = text.lowercased()
    let merchants: [(display: String, signals: [String])] = [
        ("Amazon",  ["amazon"]),
        ("Blinkit", ["blinkit", "blink commerce"]),  // ← covers Blink Commerce PDFs
        ("Swiggy",  ["swiggy"]),
        ("Zomato",  ["zomato", "eternal"]),           // ← covers Eternal Ltd invoices
        ("Myntra",  ["myntra"]),
        ("Nykaa",   ["nykaa"]),
        ("CRED",    ["cred"]),
        ("Paytm",   ["paytm"]),
        ("Zepto",   ["zepto"])
    ]
    return merchants.first { _, signals in
        signals.contains { lower.contains($0) }
    }?.display
}

    /// Extended merchant detection that uses platform-context hints for restaurant orders
    private func detectMerchantFromContext(in text: String) -> String? {
        if let direct = detectMerchant(in: text) { return direct }
        let lower = text.lowercased()
        // Swiggy-specific signals
        if lower.contains("luckybite") || lower.contains("swiggy one") ||
           lower.contains("swiggy bolt") || lower.contains("bill total") {
            return "Swiggy"
        }
        // Zomato/Eternal signals
        if lower.contains("eternal") || lower.contains("zomato gold") ||
           lower.contains("getoff") || lower.contains("amznpay") {
            return "Zomato"
        }
        return nil
    }

    private func detectPaymentApp(in text: String) -> String? {
        let lower = text.lowercased()
        let apps = ["CRED", "Google Pay", "GPay", "Paytm", "PhonePe", "Amazon Pay", "UPI Lite"]
        return apps.first { lower.contains($0.lowercased()) }
    }

    // MARK: - Shared helpers

    private func extractQuantity(from line: String) -> Int {
        let patterns = [
            #"(?i)\bx\s*(\d+)\b"#,
            #"(?i)\b(\d+)\s*x\b"#,
            #"(?i)\bqty[:\s]+(\d+)\b"#,
            #"(?i)\b(\d+)\s+nos\b"#         // "3 NOS" in Blinkit invoices
        ]
        for pattern in patterns {
            guard let regex = try? NSRegularExpression(pattern: pattern),
                  let match = regex.firstMatch(in: line, range: NSRange(line.startIndex..., in: line)),
                  let range = Range(match.range(at: 1), in: line),
                  let qty = Int(line[range]) else { continue }
            return max(1, qty)
        }
        return 1
    }

    /// Joins "item name / optional size×qty / ₹price" triplets into single lines
/// so the standard per-line parser can capture them.
private func preJoinMultiLineItems(in lines: [String]) -> [String] {
    let sizePattern = try? NSRegularExpression(
        pattern: #"^\d[\s.]*(?:g|kg|ml|l|pcs?|pc|pack|nos)\s"#,
        options: .caseInsensitive
    )
    let pricePattern = try? NSRegularExpression(
        pattern: #"^(?:₹|rs\.?)\s*\d"#,
        options: .caseInsensitive
    )

    func matches(_ re: NSRegularExpression?, _ str: String) -> Bool {
        guard let re else { return false }
        return re.firstMatch(in: str, range: NSRange(str.startIndex..., in: str)) != nil
    }

    var result: [String] = []
    var i = 0
    while i < lines.count {
        let line = lines[i]
        if line.lowercased().contains("free gift") { i += 1; continue }

        var offset = 1
        // Skip optional size/unit line ("270 g x 1", "12 pcs x 1")
        if i + offset < lines.count, matches(sizePattern, lines[i + offset]) {
            offset += 1
        }
        // If the next line is a standalone price, join it
        if i + offset < lines.count, matches(pricePattern, lines[i + offset]) {
            result.append("\(line) \(lines[i + offset])")
            i += offset + 1
            continue
        }
        result.append(line)
        i += 1
    }
    return result
}

    private func cleanedItemName(from line: String) -> String {
        var name = line
        name = name.replacingOccurrences(of: #"(?i)(inr|rs\.?|₹)\s*[0-9,.]+"#, with: "", options: .regularExpression)
        name = name.replacingOccurrences(of: #"[0-9,.]+\s*(inr|rs\.?|₹)"#, with: "", options: .regularExpression)
        name = name.replacingOccurrences(of: #"(?i)\bqty[:\s]+\d+\b"#, with: "", options: .regularExpression)
        name = name.replacingOccurrences(of: #"(?i)\bx\s*\d+\b"#, with: "", options: .regularExpression)
        name = name.replacingOccurrences(of: #"(?i)\b\d+\s*x\b"#, with: "", options: .regularExpression)
        name = name.replacingOccurrences(of: #"(?i)\b\d+\s*nos\b"#, with: "", options: .regularExpression)
        // Strip trailing standalone numbers (Zomato "Item 1 ₹265 ₹265" leaves "Item 1")
        name = name.replacingOccurrences(of: #"\s+\d+\s*$"#, with: "", options: .regularExpression)
        name = name.replacingOccurrences(of: #"\s{2,}"#, with: " ", options: .regularExpression)
        return name.trimmingCharacters(in: CharacterSet(charactersIn: " -:|."))
    }

    private func extractAmounts(from line: String) -> [Decimal] {
        // Matches ₹/Rs/INR prefixed numbers OR plain numbers (for PDF invoices without currency symbol)
        let pattern = #"(?:₹|rs\.?|inr)\s*([0-9]+(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?)|(?<!\d)([0-9]+(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?)(?=\s*$)"#
        guard let regex = try? NSRegularExpression(pattern: pattern, options: .caseInsensitive) else { return [] }

        return regex
            .matches(in: line, range: NSRange(line.startIndex..., in: line))
            .compactMap { match in
                // Group 1 = currency-prefixed, group 2 = end-of-line plain number
                for groupIndex in 1...2 {
                    if let range = Range(match.range(at: groupIndex), in: line) {
                        let value = String(line[range]).replacingOccurrences(of: ",", with: "")
                        if let d = Decimal(string: value), d > 0 { return d }
                    }
                }
                return nil
            }
    }

    private func detectDate(in text: String) -> Date? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.date.rawValue)
        let range = NSRange(text.startIndex..., in: text)
        return detector?.matches(in: text, range: range).compactMap(\.date).first
    }

    private func dominantCategory(from items: [LineItem]) -> SpendCategory? {
        items
            .reduce(into: [SpendCategory: Decimal]()) { totals, item in
                totals[item.category, default: .zero] += item.total
            }
            .max { $0.value < $1.value }?.key
    }

    private func inferCategory(from text: String) -> SpendCategory {
        inferCategoryWithConfidence(from: text).category
    }

    private func inferCategoryWithConfidence(from text: String) -> (category: SpendCategory, confidence: CategoryConfidence) {
        // Layer 1: learned rules (user-taught, always wins)
        if let learned = CategoryLearner.shared.category(for: text) {
            return (learned, .high)
        }

        let lower = text.lowercased()
        let rules: [(SpendCategory, [String])] = [
            (.subscriptions, ["netflix", "spotify", "prime video", "disney", "hotstar", "apple tv",
                              "subscription", "youtube premium", "zee5"]),
            (.transport,     ["uber", "ola", "metro", "fuel", "petrol", "diesel", "rapido", "cab",
                              "auto", "taxi", "toll", "parking"]),
            (.bills,         ["cred", "credit card", "electricity", "broadband", "wifi", "recharge",
                              "postpaid", "prepaid", "emi", "insurance", "rent"]),
            (.beauty,        ["serum", "toner", "moisturiser", "moisturizer", "sunscreen", "spf",
                              "face wash", "cleanser", "shampoo", "conditioner", "hair mask", "hair oil",
                              "body wash", "soap", "scrub", "lip balm", "lipstick", "foundation",
                              "mascara", "eyeliner", "kajal", "nail polish", "perfume", "deodorant",
                              "salon", "academy", "haircut", "kojic", "glutathione", "arbutin",
                              "niacinamide", "retinol", "dettol", "handwash", "sanitiser"]),
            (.supplements,   ["protein", "whey", "casein", "creatine", "pre-workout", "bcaa", "amino",
                              "vitamin", "multivitamin", "omega", "fish oil", "magnesium", "zinc",
                              "calcium", "collagen", "probiotic", "moringa", "ashwagandha",
                              "carbamide", "almond", "chia seed", "flaxseed", "makhana"]),
            (.foodDelivery,  ["swiggy", "zomato", "biryani", "pizza", "burger", "sandwich", "wrap",
                              "shawarma", "kebab", "tikka", "grill", "pasta", "noodle", "maggi",
                              "coffee", "chai", "tea", "juice", "smoothie", "milkshake", "lassi",
                              "paneer", "roti", "naan", "paratha", "dosa", "idli", "samosa",
                              "restaurant", "cafe", "bakery", "meal", "thali", "snack",
                              "chocolate", "biscuit", "cookie", "chips", "popcorn", "candy",
                              "ice cream", "cake", "pastry", "dessert"]),
            (.groceries,     ["blinkit", "zepto", "bigbasket", "jiomart", "milk", "curd", "yogurt",
                              "butter", "ghee", "cheese", "bread", "egg", "atta", "flour", "rice",
                              "dal", "pulses", "lentil", "salt", "sugar", "oil", "mustard", "vinegar",
                              "sauce", "ketchup", "pickle", "jam", "honey", "onion", "potato",
                              "tomato", "garlic", "ginger", "carrot", "broccoli", "cabbage",
                              "capsicum", "cucumber", "spinach", "peas", "mango", "banana", "apple",
                              "orange", "lemon", "coconut", "litchi", "lychee", "grapes",
                              "watermelon", "papaya", "masala", "spice", "turmeric", "cumin",
                              "coriander", "pepper", "oats", "cornflakes", "muesli", "poha",
                              "detergent", "dishwash", "tissue", "toilet paper", "garbage bag"]),
            (.clothing,      ["shirt", "t-shirt", "tshirt", "top", "blouse", "kurta", "jeans",
                              "trouser", "pant", "shorts", "skirt", "dress", "saree", "shoe",
                              "sandal", "slipper", "sneaker", "boot", "myntra"]),
            (.shopping,      ["amazon", "flipkart", "nykaa", "bag", "wallet", "belt", "watch",
                              "jewellery", "earphone", "headphone", "charger", "cable", "mobile",
                              "laptop", "tablet", "keyboard", "mouse", "book", "stationery",
                              "pen", "notebook", "tape", "lighter", "measuring"])
        ]

        // Layer 2a: keyword match
        if let match = rules.first(where: { _, keywords in keywords.contains { lower.contains($0) } }) {
            return (match.0, .medium)
        }

        // Layer 2b: word-shape heuristics
        if lower.range(of: #"\b(lip |lash |brow |blush|contour|primer|concealer|highlighter|bronzer)\b"#, options: .regularExpression) != nil {
            return (.beauty, .medium)
        }
        if lower.range(of: #"\b(wash|clean|care|groom|hygien|lotion|gel|foam|spray|powder|wipe|pad|tampon|razor|blade)\b"#, options: .regularExpression) != nil {
            return (.beauty, .medium)
        }
        if lower.range(of: #"\b(capsule|tablet|syrup|drops|supplement|health|wellness|ayurved|herbal)\b"#, options: .regularExpression) != nil {
            return (.supplements, .medium)
        }
        if lower.range(of: #"\b(masala|pickle|papad|chutney|leaves|seeds?|nuts?|dry\s*fruit|roasted|organic)\b"#, options: .regularExpression) != nil {
            return (.groceries, .medium)
        }
        if lower.range(of: #"\b(wear|cloth|fabric|linen|cotton|polyester|stitch|tailor)\b"#, options: .regularExpression) != nil {
            return (.clothing, .medium)
        }

        // Layer 3: unknown — flag for user review
        return (.shopping, .low)
    }
}