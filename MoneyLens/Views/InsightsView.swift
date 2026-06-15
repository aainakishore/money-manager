import SwiftUI

struct InsightsView: View {
    @EnvironmentObject private var store: SpendingStore

    var body: some View {
        NavigationStack {
            MoneyLensScreen {
                VStack(alignment: .leading, spacing: 10) {
                    Text("Insights")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(MoneyLensTheme.text)

                    ForEach(store.priceInsights) { insight in
                        PriceInsightCard(insight: insight)
                    }

                    InsightCard(
                        symbol: "lightbulb.fill",
                        tint: MoneyLensTheme.teal,
                        title: "Blinkit basket trending up",
                        message: "Milk, eggs, and yogurt appear every month. Set a basket budget to catch price drift early."
                    )

                    InsightCard(
                        symbol: "creditcard.fill",
                        tint: MoneyLensTheme.violet,
                        title: "CRED bill needs source matching",
                        message: "The card payment may overlap with purchases. Link statements later to avoid double counting."
                    )

                    SourcePlanCard()
                }
            }
            .navigationTitle("Insights")
        }
    }
}

private struct PriceInsightCard: View {
    var insight: PriceChangeInsight

    var body: some View {
        MoneyLensCard {
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    HStack(spacing: 5) {
                        Image(systemName: "arrow.up.right")
                            .font(.system(size: 12, weight: .bold))
                        Text("Price increased - \(insight.merchant)")
                            .font(.system(size: 10, weight: .semibold))
                    }
                    .foregroundStyle(MoneyLensTheme.red)

                    Spacer()

                    Text("+\(AppFormatters.percent(insight.percentageChange))")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(MoneyLensTheme.red)
                }

                Text(insight.itemName)
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(MoneyLensTheme.text)

                Text("\(AppFormatters.currency(insight.previousPrice)) to \(AppFormatters.currency(insight.latestPrice))")
                    .font(.system(size: 11))
                    .foregroundStyle(MoneyLensTheme.mutedText)
            }
        }
    }
}

private struct InsightCard: View {
    var symbol: String
    var tint: Color
    var title: String
    var message: String

    var body: some View {
        MoneyLensCard {
            HStack(alignment: .top, spacing: 8) {
                Image(systemName: symbol)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(tint)
                    .frame(width: 20)

                VStack(alignment: .leading, spacing: 3) {
                    Text(title)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(MoneyLensTheme.text)

                    Text(message)
                        .font(.system(size: 11))
                        .lineSpacing(2)
                        .foregroundStyle(MoneyLensTheme.mutedText)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
        }
    }
}

private struct SourcePlanCard: View {
    private let rows = [
        SourcePlanRow(symbol: "doc.on.clipboard.fill", title: "Copy and paste", message: "Works now for order confirmations and receipt text."),
        SourcePlanRow(symbol: "square.and.arrow.up.fill", title: "Share extension", message: "Next target: one-tap import from another app's share sheet."),
        SourcePlanRow(symbol: "camera.viewfinder", title: "Screenshot OCR", message: "Works now through Photos and Apple's Vision text recognition.")
    ]

    var body: some View {
        MoneyLensCard(bottomSpacing: 10) {
            VStack(alignment: .leading, spacing: 9) {
                MoneyLensSectionLabel(title: "Share orders into the app")

                ForEach(rows) { row in
                    HStack(alignment: .top, spacing: 9) {
                        Image(systemName: row.symbol)
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(MoneyLensTheme.teal)
                            .frame(width: 22)

                        VStack(alignment: .leading, spacing: 2) {
                            Text(row.title)
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundStyle(MoneyLensTheme.text)

                            Text(row.message)
                                .font(.system(size: 11))
                                .foregroundStyle(MoneyLensTheme.mutedText)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }
                }
            }
        }
    }
}

private struct SourcePlanRow: Identifiable {
    var id: String { title }
    var symbol: String
    var title: String
    var message: String
}
