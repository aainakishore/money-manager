import Foundation
import XCTest
@testable import MoneyLensCore

final class SpendingAnalyzerTests: XCTestCase {
    private var analyzer: SpendingAnalyzer!
    private var june: Date!

    override func setUp() {
        super.setUp()
        analyzer = SpendingAnalyzer(calendar: SampleData.calendar)
        june = SampleData.calendar.date(from: DateComponents(year: 2026, month: 6, day: 14))
    }

    func monthlyTotal() {
        let total = analyzer.monthlyTotal(for: SampleData.transactions, containing: june)
        XCTAssertEqual(total, 9505)
    }

    func categoryBreakdownUsesLineItems() {
        let categories = analyzer.categoryBreakdown(for: SampleData.transactions, containing: june)
        let beauty = categories.first { $0.category == .beauty }
        let supplements = categories.first { $0.category == .supplements }

        XCTAssertEqual(beauty?.amount, 834)
        XCTAssertEqual(supplements?.amount, 1248)
    }

    func priceIncreaseInsights() {
        let insights = analyzer.priceIncreaseInsights(for: SampleData.transactions, minimumPercentageIncrease: 10)

        XCTAssertTrue(insights.contains { insight in
            insight.itemName == "Greek Yogurt" &&
            insight.merchant == "Blinkit" &&
            insight.previousPrice == 80 &&
            insight.latestPrice == 95
        })
    }
}
