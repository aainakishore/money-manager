import Foundation

public struct SpendingAnalyzer {
    public var calendar: Calendar

    public init(calendar: Calendar = .current) {
        self.calendar = calendar
    }

    public func monthlyTotal(
        for transactions: [SpendTransaction],
        containing date: Date = Date()
    ) -> Decimal {
        transactions
            .filter { calendar.isDate($0.date, equalTo: date, toGranularity: .month) }
            .reduce(Decimal.zero) { $0 + $1.amount }
    }

    public func categoryBreakdown(
        for transactions: [SpendTransaction],
        containing date: Date = Date()
    ) -> [CategorySpend] {
        let monthTransactions = transactions.filter {
            calendar.isDate($0.date, equalTo: date, toGranularity: .month)
        }

        let itemTotals = monthTransactions.reduce(into: [SpendCategory: Decimal]()) { result, transaction in
            if transaction.items.isEmpty {
                result[transaction.category, default: .zero] += transaction.amount
            } else {
                for item in transaction.items {
                    result[item.category, default: .zero] += item.total
                }
            }
        }

        return itemTotals
            .map(CategorySpend.init(category:amount:))
            .sorted { $0.amount > $1.amount }
    }

    public func merchantBreakdown(
        for transactions: [SpendTransaction],
        containing date: Date = Date()
    ) -> [MerchantSpend] {
        let monthTransactions = transactions.filter {
            calendar.isDate($0.date, equalTo: date, toGranularity: .month)
        }

        return monthTransactions
            .reduce(into: [String: Decimal]()) { result, transaction in
                result[transaction.merchant, default: .zero] += transaction.amount
            }
            .map(MerchantSpend.init(merchant:amount:))
            .sorted { $0.amount > $1.amount }
    }

    public func priceIncreaseInsights(
        for transactions: [SpendTransaction],
        minimumPercentageIncrease: Decimal = 10
    ) -> [PriceChangeInsight] {
        let itemEvents = transactions.flatMap { transaction in
            transaction.items.map { item in
                ItemPriceEvent(
                    normalizedName: item.normalizedName,
                    displayName: item.name,
                    merchant: transaction.merchant,
                    unitPrice: item.unitPrice,
                    date: transaction.date
                )
            }
        }

        let grouped = Dictionary(grouping: itemEvents) { event in
            "\(event.merchant)|\(event.normalizedName)"
        }

        return grouped.compactMap { _, events in
            let ordered = events.sorted { $0.date < $1.date }
            guard ordered.count >= 2,
                  let previous = ordered.dropLast().last,
                  let latest = ordered.last,
                  previous.unitPrice > .zero else {
                return nil
            }

            let percentageChange = ((latest.unitPrice - previous.unitPrice) / previous.unitPrice) * 100
            guard percentageChange >= minimumPercentageIncrease else { return nil }

            return PriceChangeInsight(
                itemName: latest.displayName,
                merchant: latest.merchant,
                previousPrice: previous.unitPrice,
                latestPrice: latest.unitPrice,
                percentageChange: percentageChange,
                latestDate: latest.date
            )
        }
        .sorted { $0.percentageChange > $1.percentageChange }
    }
}

private struct ItemPriceEvent {
    var normalizedName: String
    var displayName: String
    var merchant: String
    var unitPrice: Decimal
    var date: Date
}
