import Foundation
import MoneyLensCore

let analyzer = SpendingAnalyzer(calendar: SampleData.calendar)
let june = SampleData.calendar.date(from: DateComponents(year: 2026, month: 6, day: 14))!
let transactions = SampleData.transactions

let monthlyTotal = analyzer.monthlyTotal(for: transactions, containing: june)
precondition(monthlyTotal == 9505, "Expected June total of 9505, got \(monthlyTotal)")

let categories = analyzer.categoryBreakdown(for: transactions, containing: june)
let beauty = categories.first { $0.category == .beauty }?.amount
let supplements = categories.first { $0.category == .supplements }?.amount
precondition(beauty == 834, "Expected beauty spend of 834, got \(String(describing: beauty))")
precondition(supplements == 1248, "Expected supplements spend of 1248, got \(String(describing: supplements))")

let insights = analyzer.priceIncreaseInsights(for: transactions, minimumPercentageIncrease: 10)
let hasGreekYogurtAlert = insights.contains { insight in
    insight.itemName == "Greek Yogurt" &&
    insight.merchant == "Blinkit" &&
    insight.previousPrice == 80 &&
    insight.latestPrice == 95
}
precondition(hasGreekYogurtAlert, "Expected Greek Yogurt price alert")

let importedText = """
Blinkit Order
Amul Taaza Milk 1L x2 Rs 72
Eggs 12 pack Rs 115
Greek Yogurt x2 Rs 95
Paid with Google Pay
Order Total Rs 449
"""
let imported = ReceiptImportParser(calendar: SampleData.calendar)
    .parse(text: importedText, source: .manual, importedAt: june)
precondition(imported?.merchant == "Blinkit", "Expected imported merchant to be Blinkit")
precondition(imported?.paymentApp == "Google Pay", "Expected imported payment app to be Google Pay")
precondition(imported?.amount == 449, "Expected imported amount of 449")
precondition(imported?.items.count == 3, "Expected 3 imported items")

print("MoneyLens checks passed")
