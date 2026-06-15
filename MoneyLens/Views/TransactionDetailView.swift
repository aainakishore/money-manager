import SwiftUI

struct TransactionDetailView: View {
    var transaction: SpendTransaction
    @EnvironmentObject private var store: SpendingStore
    @State private var editedCategory: SpendCategory

    init(transaction: SpendTransaction) {
        self.transaction = transaction
        _editedCategory = State(initialValue: transaction.category)
    }

    var body: some View {
        MoneyLensScreen {
            VStack(alignment: .leading, spacing: 10) {
                MoneyLensCard {
                    VStack(alignment: .leading, spacing: 8) {
                        Text(AppFormatters.currency(transaction.amount))
                            .font(.system(size: 30, weight: .bold, design: .rounded))
                            .foregroundStyle(MoneyLensTheme.text)

                        Text("\(transaction.merchant) - \(AppFormatters.shortDate.string(from: transaction.date))")
                            .font(.system(size: 11))
                            .foregroundStyle(MoneyLensTheme.mutedText)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }

                MoneyLensCard {
                    VStack(alignment: .leading, spacing: 6) {
                        MoneyLensSectionLabel(title: "Order items")

                        ForEach(transaction.items) { item in
                            HStack(alignment: .center, spacing: 9) {
                                Image(systemName: item.category.symbolName)
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundStyle(item.category.tint)
                                    .frame(width: 28, height: 28)
                                    .background(item.category.tint.opacity(0.14))
                                    .clipShape(RoundedRectangle(cornerRadius: 8))

                                VStack(alignment: .leading, spacing: 2) {
                                    Text(item.name)
                                        .font(.system(size: 12, weight: .semibold))
                                        .foregroundStyle(MoneyLensTheme.text)
                                        .lineLimit(1)

                                    Text("\(item.quantity)x - \(item.category.title)")
                                        .font(.system(size: 10))
                                        .foregroundStyle(MoneyLensTheme.mutedText)
                                }

                                Spacer()

                                Text(AppFormatters.currency(item.total))
                                    .font(.system(size: 12, weight: .bold))
                                    .foregroundStyle(MoneyLensTheme.text)
                            }
                            .padding(.vertical, 4)
                        }
                    }
                }

                MoneyLensCard {
                    VStack(alignment: .leading, spacing: 8) {
                        MoneyLensSectionLabel(title: "Transaction details")

                        HStack {
                            Text("Category")
                                .font(.system(size: 11))
                                .foregroundStyle(MoneyLensTheme.mutedText)
                            Spacer()
                            Picker("Category", selection: $editedCategory) {
                                ForEach(SpendCategory.allCases) { cat in
                                    Text(cat.title).tag(cat)
                                }
                            }
                            .pickerStyle(.menu)
                            .tint(MoneyLensTheme.teal)
                            .font(.system(size: 11, weight: .semibold))
                        }
                        .onChange(of: editedCategory) { _, newValue in
                            store.updateCategory(id: transaction.id, category: newValue)
                        }

                        DetailLine(title: "Source app", value: transaction.sourceApp)
                        DetailLine(title: "Payment app", value: transaction.paymentApp ?? "Unknown")
                        DetailLine(title: "Import method", value: transaction.source.title)
                        DetailLine(title: "Confidence", value: "\(Int(transaction.confidence * 100))%")
                    }
                }
            }
        }
        .navigationTitle(transaction.merchant)
        .navigationBarTitleDisplayMode(.inline)
    }
}

private struct DetailLine: View {
    var title: String
    var value: String

    var body: some View {
        HStack {
            Text(title)
                .font(.system(size: 11))
                .foregroundStyle(MoneyLensTheme.mutedText)
            Spacer()
            Text(value)
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(MoneyLensTheme.text)
        }
    }
}
