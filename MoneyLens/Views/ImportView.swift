import PhotosUI
import SwiftUI

struct ImportView: View {
    @EnvironmentObject private var store: SpendingStore
    @State private var receiptText = ImportSamples.blinkitText
    @State private var selectedPhoto: PhotosPickerItem?
    @State private var parsedTransaction: SpendTransaction?
    @State private var statusMessage = "Paste order text or choose a screenshot."
    @State private var isReadingImage = false
    @State private var showDuplicateAlert = false
    @State private var showCategoryReview = false
    @State private var uncertainItems: [LineItem] = []

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
                        ParsedTransactionCard(
                            transaction: parsedTransaction,
                            onReviewCategories: {
                                uncertainItems = parsedTransaction.items.filter {
                                    $0.categoryConfidence == .low
                                }
                                showCategoryReview = true
                            },
                            onSave: { attemptSave(parsedTransaction) }
                        )
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
                Task { await readPhoto(newValue) }
            }
            .alert("Possible duplicate", isPresented: $showDuplicateAlert) {
                Button("Save anyway", role: .none) {
                    if let tx = parsedTransaction { commitSave(tx) }
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                if let tx = parsedTransaction {
                    Text("You already have a \(tx.merchant) order for \(AppFormatters.currency(tx.amount)). Save this one too?")
                }
            }
            .sheet(isPresented: $showCategoryReview) {
                if let tx = parsedTransaction {
                    CategoryReviewSheet(items: $uncertainItems) { confirmed in
                        applyConfirmedCategories(confirmed, to: tx)
                        showCategoryReview = false
                    }
                }
            }
        }
    }

    // MARK: - Input card

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

    // MARK: - Actions

    private func parseCurrentText(source: TransactionSource) {
        parsedTransaction = parser.parse(text: receiptText, source: source, importedAt: Date())
        if let tx = parsedTransaction {
            statusMessage = "Review the parsed order, then save it."
            uncertainItems = tx.items.filter { $0.categoryConfidence == .low }
            if !uncertainItems.isEmpty {
                showCategoryReview = true
            }
        } else {
            statusMessage = "Could not find a usable total or item prices. Try a clearer receipt/order summary."
        }
    }

    private func attemptSave(_ transaction: SpendTransaction) {
        if store.isDuplicate(transaction) {
            showDuplicateAlert = true
        } else {
            commitSave(transaction)
        }
    }

    private func commitSave(_ transaction: SpendTransaction) {
        store.add(transaction)
        parsedTransaction = nil
        statusMessage = "Imported \(transaction.merchant) order."
    }

    private func applyConfirmedCategories(_ confirmed: [LineItem], to tx: SpendTransaction) {
        // Learn rules for each confirmed item
        confirmed.forEach { item in
            CategoryLearner.shared.learn(keyword: item.name, category: item.category)
        }
        // Rebuild the transaction with updated items
        let updatedItems = tx.items.map { original -> LineItem in
            if let updated = confirmed.first(where: { $0.id == original.id }) {
                return updated
            }
            return original
        }
        parsedTransaction = SpendTransaction(
            id: tx.id, date: tx.date, merchant: tx.merchant,
            sourceApp: tx.sourceApp, paymentApp: tx.paymentApp,
            amount: tx.amount, category: tx.category,
            source: tx.source, items: updatedItems,
            confidence: tx.confidence
        )
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

// MARK: - ParsedTransactionCard

private struct ParsedTransactionCard: View {
    var transaction: SpendTransaction
    var onReviewCategories: () -> Void
    var onSave: () -> Void

    private var uncertainCount: Int {
        transaction.items.filter { $0.categoryConfidence == .low }.count
    }

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
                    HStack(spacing: 6) {
                        if item.categoryConfidence == .low {
                            Text("?")
                                .font(.system(size: 9, weight: .bold))
                                .foregroundStyle(Color.orange)
                                .frame(width: 14, height: 14)
                                .background(Color.orange.opacity(0.15))
                                .clipShape(Circle())
                        }
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

                if uncertainCount > 0 {
                    Button(action: onReviewCategories) {
                        Label(
                            "Review \(uncertainCount) uncertain categor\(uncertainCount > 1 ? "ies" : "y")",
                            systemImage: "tag.slash"
                        )
                        .font(.system(size: 11, weight: .semibold))
                        .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(SecondaryMoneyLensButtonStyle())
                    .tint(.orange)
                }

                Button(action: onSave) {
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

// MARK: - CategoryReviewSheet

struct CategoryReviewSheet: View {
    @Binding var items: [LineItem]
    var onDone: ([LineItem]) -> Void

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Text("These items weren't recognised. Pick a category — your choice is remembered for next time.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                ForEach($items) { $item in
                    VStack(alignment: .leading, spacing: 8) {
                        Text(item.name)
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(MoneyLensTheme.text)

                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 6) {
                                ForEach(SpendCategory.allCases) { cat in
                                    Button(cat.title) {
                                        item.category = cat
                                        item.categoryConfidence = .high
                                    }
                                    .font(.system(size: 11, weight: .semibold))
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 5)
                                    .background(
                                        item.category == cat
                                            ? MoneyLensTheme.teal
                                            : Color.white.opacity(0.08)
                                    )
                                    .foregroundStyle(
                                        item.category == cat
                                            ? MoneyLensTheme.background
                                            : MoneyLensTheme.text
                                    )
                                    .clipShape(Capsule())
                                }
                            }
                            .padding(.horizontal, 1)
                        }
                    }
                    .padding(.vertical, 4)
                    .listRowBackground(Color.white.opacity(0.04))
                }
            }
            .scrollContentBackground(.hidden)
            .background(MoneyLensTheme.background)
            .navigationTitle("Review categories")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { onDone(items) }
                        .fontWeight(.bold)
                        .tint(MoneyLensTheme.teal)
                }
            }
        }
    }
}

// MARK: - Button styles

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

// MARK: - Sample texts

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
}
