import SwiftUI

struct DashboardView: View {
    @EnvironmentObject private var store: SpendingStore

    var body: some View {
        NavigationStack {
            MoneyLensScreen {
                VStack(alignment: .leading, spacing: 10) {
                    MonthHeader(total: store.monthlyTotal)
                    CategoryDonutCard(categories: Array(store.categoryBreakdown.prefix(4)), total: store.monthlyTotal)
                    MerchantBars(merchants: Array(store.merchantBreakdown.prefix(4)))
                    RecentOrders(transactions: Array(store.transactions.prefix(3)))
                }
            }
            .navigationTitle("MoneyLens")
        }
    }
}

private struct MonthHeader: View {
    var total: Decimal

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("June 2026 spending")
                .font(.system(size: 11))
                .foregroundStyle(MoneyLensTheme.mutedText)

            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text(AppFormatters.currency(total))
                    .font(.system(size: 27, weight: .bold, design: .rounded))
                    .foregroundStyle(MoneyLensTheme.text)

                Text("91% itemized")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(MoneyLensTheme.teal)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(MoneyLensTheme.teal.opacity(0.14))
                    .overlay(
                        RoundedRectangle(cornerRadius: 6)
                            .stroke(MoneyLensTheme.teal.opacity(0.35), lineWidth: 0.5)
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 6))
            }

            HStack(spacing: 8) {
                MetricTile(value: "5", title: "Orders")
                MetricTile(value: "3", title: "Sources")
                MetricTile(value: "\(max(1, SampleData.transactions.count - 4))", title: "Alerts")
            }
        }
        .padding(.bottom, 2)
    }
}

private struct MetricTile: View {
    var value: String
    var title: String

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(value)
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(MoneyLensTheme.text)
            Text(title)
                .font(.system(size: 9))
                .foregroundStyle(MoneyLensTheme.mutedText)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 8)
        .padding(.vertical, 6)
        .background(MoneyLensTheme.elevated)
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(MoneyLensTheme.border.opacity(0.8), lineWidth: 0.5)
        )
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }
}

private struct CategoryDonutCard: View {
    var categories: [CategorySpend]
    var total: Decimal

    var body: some View {
        MoneyLensCard {
            VStack(alignment: .leading, spacing: 8) {
                MoneyLensSectionLabel(title: "By category")

                HStack(spacing: 10) {
                    DonutChart(categories: categories, total: total)
                        .frame(width: 110, height: 110)

                    VStack(spacing: 6) {
                        ForEach(categories) { categorySpend in
                            HStack(spacing: 6) {
                                Circle()
                                    .fill(categorySpend.category.tint)
                                    .frame(width: 6, height: 6)

                                Text(categorySpend.category.title)
                                    .font(.system(size: 11))
                                    .foregroundStyle(MoneyLensTheme.text.opacity(0.72))
                                    .lineLimit(1)

                                Spacer(minLength: 8)

                                Text(AppFormatters.currency(categorySpend.amount))
                                    .font(.system(size: 11, weight: .semibold))
                                    .foregroundStyle(MoneyLensTheme.text)
                            }
                        }
                    }
                }
            }
        }
    }
}

private struct DonutChart: View {
    var categories: [CategorySpend]
    var total: Decimal

    private var slices: [DonutSlice] {
        var start = 0.0
        return categories.map { category in
            let fraction = total > .zero ? category.amount.doubleValue / total.doubleValue : 0
            let slice = DonutSlice(
                category: category.category,
                amount: category.amount,
                start: start,
                end: start + fraction
            )
            start += fraction
            return slice
        }
    }

    var body: some View {
        ZStack {
            Circle()
                .stroke(Color.white.opacity(0.07), lineWidth: 13)

            ForEach(slices) { slice in
                Circle()
                    .trim(from: slice.start, to: slice.end)
                    .stroke(
                        slice.category.tint,
                        style: StrokeStyle(lineWidth: 13, lineCap: .butt)
                    )
                    .rotationEffect(.degrees(-90))
            }

            VStack(spacing: 0) {
                Text(AppFormatters.currency(total))
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(MoneyLensTheme.text)
                Text("June 2026")
                    .font(.system(size: 8))
                    .foregroundStyle(MoneyLensTheme.mutedText)
            }
        }
    }
}

private struct DonutSlice: Identifiable {
    var id: SpendCategory { category }
    var category: SpendCategory
    var amount: Decimal
    var start: Double
    var end: Double
}

private struct MerchantBars: View {
    var merchants: [MerchantSpend]

    private var maxAmount: Decimal {
        merchants.map(\.amount).max() ?? 1
    }

    var body: some View {
        MoneyLensCard {
            VStack(alignment: .leading, spacing: 8) {
                MoneyLensSectionLabel(title: "Top merchants")

                ForEach(merchants) { merchant in
                    VStack(spacing: 3) {
                        HStack {
                            Text(merchant.merchant)
                                .font(.system(size: 11))
                                .foregroundStyle(MoneyLensTheme.text.opacity(0.76))
                            Spacer()
                            Text(AppFormatters.currency(merchant.amount))
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundStyle(MoneyLensTheme.text)
                        }

                        GeometryReader { proxy in
                            ZStack(alignment: .leading) {
                                Capsule()
                                    .fill(Color.white.opacity(0.08))
                                Capsule()
                                    .fill(color(for: merchant.merchant))
                                    .frame(width: proxy.size.width * widthRatio(for: merchant.amount))
                            }
                        }
                        .frame(height: 3)
                    }
                    .padding(.bottom, 4)
                }
            }
        }
    }

    private func widthRatio(for amount: Decimal) -> Double {
        guard maxAmount > .zero else { return 0 }
        return min(1, amount.doubleValue / maxAmount.doubleValue)
    }

    private func color(for merchant: String) -> Color {
        switch merchant.lowercased() {
        case "cred": MoneyLensTheme.red
        case "amazon": MoneyLensTheme.violet
        case "blinkit": MoneyLensTheme.teal
        case "swiggy": MoneyLensTheme.orange
        default: MoneyLensTheme.teal
        }
    }
}

private struct RecentOrders: View {
    var transactions: [SpendTransaction]

    var body: some View {
        MoneyLensCard(bottomSpacing: 10) {
            VStack(alignment: .leading, spacing: 4) {
                MoneyLensSectionLabel(title: "Recent orders")

                ForEach(transactions) { transaction in
                    TransactionRow(transaction: transaction, showsDivider: transaction.id != transactions.last?.id)
                }
            }
        }
    }
}
