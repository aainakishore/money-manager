import SwiftUI

struct TransactionsView: View {
    @EnvironmentObject private var store: SpendingStore

    var body: some View {
        NavigationStack {
            MoneyLensScreen {
                VStack(alignment: .leading, spacing: 10) {
                    Text("Itemized orders")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(MoneyLensTheme.text)

                    MoneyLensCard {
                        VStack(spacing: 0) {
                            ForEach(store.transactions) { transaction in
                                NavigationLink {
                                    TransactionDetailView(transaction: transaction)
                                } label: {
                                    TransactionRow(
                                        transaction: transaction,
                                        showsDivider: transaction.id != store.transactions.last?.id
                                    )
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                }
            }
            .navigationTitle("Orders")
        }
    }
}

struct TransactionRow: View {
    var transaction: SpendTransaction
    var showsDivider = true

    var body: some View {
        HStack(spacing: 9) {
            Image(systemName: transaction.category.symbolName)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(transaction.category.tint)
                .frame(width: 33, height: 33)
                .background(transaction.category.tint.opacity(0.14))
                .clipShape(RoundedRectangle(cornerRadius: 9))

            VStack(alignment: .leading, spacing: 3) {
                Text(transaction.merchant)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(MoneyLensTheme.text)
                    .lineLimit(1)

                Text(rowSubtitle)
                    .font(.system(size: 10))
                    .foregroundStyle(MoneyLensTheme.mutedText)
                    .lineLimit(1)
            }

            Spacer(minLength: 8)

            Text(AppFormatters.currency(transaction.amount))
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(MoneyLensTheme.text)
                .lineLimit(1)
        }
        .padding(.vertical, 7)
        .overlay(alignment: .bottom) {
            if showsDivider {
                Rectangle()
                    .fill(Color.white.opacity(0.06))
                    .frame(height: 0.5)
                    .padding(.leading, 42)
            }
        }
    }

    private var rowSubtitle: String {
        "\(transaction.items.count) items - \(AppFormatters.shortDate.string(from: transaction.date))"
    }
}
