import Foundation

public struct LineItem: Codable, Hashable, Identifiable {
    public var id: UUID
    public var name: String
    public var quantity: Int
    public var unitPrice: Decimal
    public var category: SpendCategory
    public var categoryConfidence: CategoryConfidence
    public var sku: String?

    public init(
        id: UUID = UUID(),
        name: String,
        quantity: Int,
        unitPrice: Decimal,
        category: SpendCategory,
        categoryConfidence: CategoryConfidence = .medium,
        sku: String? = nil
    ) {
        self.id = id
        self.name = name
        self.quantity = quantity
        self.unitPrice = unitPrice
        self.category = category
        self.categoryConfidence = categoryConfidence
        self.sku = sku
    }

    public var total: Decimal {
        unitPrice * Decimal(quantity)
    }

    public var normalizedName: String {
        name
            .lowercased()
            .components(separatedBy: CharacterSet.alphanumerics.inverted)
            .filter { !$0.isEmpty }
            .joined(separator: " ")
    }
}

public struct SpendTransaction: Codable, Hashable, Identifiable {
    public var id: UUID
    public var date: Date
    public var merchant: String
    public var sourceApp: String
    public var paymentApp: String?
    public var amount: Decimal
    public var currencyCode: String
    public var category: SpendCategory
    public var source: TransactionSource
    public var items: [LineItem]
    public var confidence: Double

    public init(
        id: UUID = UUID(),
        date: Date,
        merchant: String,
        sourceApp: String,
        paymentApp: String? = nil,
        amount: Decimal,
        currencyCode: String = "INR",
        category: SpendCategory,
        source: TransactionSource,
        items: [LineItem],
        confidence: Double = 1.0
    ) {
        self.id = id
        self.date = date
        self.merchant = merchant
        self.sourceApp = sourceApp
        self.paymentApp = paymentApp
        self.amount = amount
        self.currencyCode = currencyCode
        self.category = category
        self.source = source
        self.items = items
        self.confidence = confidence
    }
}

public struct CategorySpend: Hashable, Identifiable {
    public var category: SpendCategory
    public var amount: Decimal

    public init(category: SpendCategory, amount: Decimal) {
        self.category = category
        self.amount = amount
    }

    public var id: SpendCategory { category }
}

public struct MerchantSpend: Hashable, Identifiable {
    public var merchant: String
    public var amount: Decimal

    public init(merchant: String, amount: Decimal) {
        self.merchant = merchant
        self.amount = amount
    }

    public var id: String { merchant }
}

public struct PriceChangeInsight: Hashable, Identifiable {
    public var id: String { "\(itemName)-\(merchant)" }
    public var itemName: String
    public var merchant: String
    public var previousPrice: Decimal
    public var latestPrice: Decimal
    public var percentageChange: Decimal
    public var latestDate: Date

    public init(
        itemName: String,
        merchant: String,
        previousPrice: Decimal,
        latestPrice: Decimal,
        percentageChange: Decimal,
        latestDate: Date
    ) {
        self.itemName = itemName
        self.merchant = merchant
        self.previousPrice = previousPrice
        self.latestPrice = latestPrice
        self.percentageChange = percentageChange
        self.latestDate = latestDate
    }
}

public enum CategoryConfidence: String, Codable {
    case high    // learned rule or strong keyword match
    case medium  // heuristic keyword list
    case low     // no match — needs user review
}
