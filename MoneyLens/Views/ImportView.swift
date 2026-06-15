import PhotosUI
import SwiftUI

struct ImportView: View {
    @EnvironmentObject private var store: SpendingStore
    @State private var receiptText = ImportSamples.blinkitText
    @State private var selectedPhoto: PhotosPickerItem?
    @State private var parsedTransaction: SpendTransaction?
    @State private var statusMessage = "Paste order text or choose a screenshot."
    @State private var isReadingImage = false

    private let parser = ReceiptImportParser(calendar: SampleData.calendar)

    var body: some View {
        NavigationStack {
            MoneyLensScreen {
                VStack(alignment: .leading, spacing: 10) {
                    Text("Import order")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(MoneyLensTheme.text)

                    inputCard

                    if let parsedTransaction {
                        ParsedTransactionCard(transaction: parsedTransaction) {
                            store.add(parsedTransaction)
                            statusMessage = "Imported \(parsedTransaction.merchant) order."
                        }
                    }

                    Text(statusMessage)
                        .font(.system(size: 11))
                        .foregroundStyle(MoneyLensTheme.mutedText)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            .navigationTitle("Import")
            .onChange(of: selectedPhoto) { _, newValue in
                guard let newValue else { return }
                Task {
                    await readPhoto(newValue)
                }
            }
        }
    }

    private var inputCard: some View {
        MoneyLensCard {
            VStack(alignment: .leading, spacing: 8) {
                Text("Paste order text from Amazon, Swiggy, Blinkit...")
                    .font(.system(size: 11))
                    .foregroundStyle(MoneyLensTheme.mutedText)

                TextEditor(text: $receiptText)
                    .font(.system(size: 11, design: .monospaced))
                    .foregroundStyle(MoneyLensTheme.text)
                    .scrollContentBackground(.hidden)
                    .frame(minHeight: 130)
                    .padding(8)
                    .background(Color.white.opacity(0.04))
                    .overlay(
                        RoundedRectangle(cornerRadius: 10)
                            .stroke(Color.white.opacity(0.12), lineWidth: 0.5)
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 10))

                HStack(spacing: 8) {
                    Button {
                        parseCurrentText(source: .manual)
                    } label: {
                        Label("Parse text", systemImage: "wand.and.stars")
                            .font(.system(size: 12, weight: .semibold))
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(PrimaryMoneyLensButtonStyle())

                    PhotosPicker(selection: $selectedPhoto, matching: .images) {
                        Image(systemName: isReadingImage ? "hourglass" : "text.viewfinder")
                            .font(.system(size: 15, weight: .semibold))
                            .frame(width: 38, height: 32)
                    }
                    .buttonStyle(SecondaryMoneyLensButtonStyle())
                    .disabled(isReadingImage)

                    Button {
                        receiptText = ImportSamples.blinkitText
                        parsedTransaction = nil
                        statusMessage = "Sample order restored."
                    } label: {
                        Image(systemName: "arrow.counterclockwise")
                            .font(.system(size: 14, weight: .semibold))
                            .frame(width: 38, height: 32)
                    }
                    .buttonStyle(SecondaryMoneyLensButtonStyle())
                }
            }
        }
    }

    private func parseCurrentText(source: TransactionSource) {
        parsedTransaction = parser.parse(text: receiptText, source: source, importedAt: store.selectedMonth)
        statusMessage = parsedTransaction == nil
            ? "Could not find a usable total or item prices. Try a clearer receipt/order summary."
            : "Review the parsed order, then save it."
    }

    @MainActor
    private func readPhoto(_ item: PhotosPickerItem) async {
        isReadingImage = true
        defer { isReadingImage = false }

        do {
            guard let data = try await item.loadTransferable(type: Data.self),
                  let image = UIImage(data: data) else {
                statusMessage = "Could not load that image."
                return
            }

            receiptText = try await ReceiptTextRecognizer.recognizeText(in: image)
            parseCurrentText(source: .screenshotOCR)
        } catch {
            statusMessage = "Screenshot reading failed: \(error.localizedDescription)"
        }
    }
}

private struct ParsedTransactionCard: View {
    var transaction: SpendTransaction
    var save: () -> Void

    var body: some View {
        MoneyLensCard {
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    VStack(alignment: .leading, spacing: 3) {
                        Text(transaction.merchant)
                            .font(.system(size: 13, weight: .bold))
                            .foregroundStyle(MoneyLensTheme.text)

                        Text("\(transaction.items.count) items found")
                            .font(.system(size: 10))
                            .foregroundStyle(MoneyLensTheme.mutedText)
                    }

                    Spacer()

                    Text(AppFormatters.currency(transaction.amount))
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(MoneyLensTheme.teal)
                }

                ForEach(transaction.items.prefix(5)) { item in
                    HStack {
                        Text(item.name)
                            .font(.system(size: 11))
                            .foregroundStyle(MoneyLensTheme.text.opacity(0.82))
                            .lineLimit(1)

                        Spacer(minLength: 8)

                        Text(AppFormatters.currency(item.total))
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(MoneyLensTheme.text)
                    }
                    .padding(.top, 5)
                    .overlay(alignment: .top) {
                        Rectangle()
                            .fill(Color.white.opacity(0.06))
                            .frame(height: 0.5)
                    }
                }

                Button(action: save) {
                    Label("Save order", systemImage: "tray.and.arrow.down.fill")
                        .font(.system(size: 12, weight: .semibold))
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(SecondaryMoneyLensButtonStyle())
                .padding(.top, 2)
            }
        }
    }
}

struct PrimaryMoneyLensButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .padding(.vertical, 8)
            .foregroundStyle(MoneyLensTheme.background)
            .background(MoneyLensTheme.teal.opacity(configuration.isPressed ? 0.82 : 1))
            .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}

struct SecondaryMoneyLensButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .padding(.vertical, 7)
            .foregroundStyle(MoneyLensTheme.text)
            .background(Color.white.opacity(configuration.isPressed ? 0.14 : 0.08))
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(Color.white.opacity(0.12), lineWidth: 0.5)
            )
            .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}

private enum ImportSamples {
    static let blinkitText = """
    Blinkit Order
    14 Jun 2026
    Amul Taaza Milk 1L x2 Rs 72
    Eggs 12 pack Rs 115
    Greek Yogurt x2 Rs 95
    Dishwash Gel Rs 169
    Paid with Google Pay
    Order Total Rs 618
    """

    static let amazonText = """
    Amazon order summary
    Minimalist Vitamin C Serum Rs 699
    Running T-Shirt x2 Rs 650
    Magnesium Glycinate Rs 899
    Paid using CRED
    Order Total Rs 2898
    """
}
