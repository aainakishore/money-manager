import Foundation
import Combine

/// Persistent spending store. Transactions are saved as JSON in the app's
/// Documents directory and survive app kills, updates, and long inactivity
/// periods. Data is only removed if the user deletes the app.
final class SpendingStore: ObservableObject {

    // MARK: - Published state

    @Published private(set) var transactions: [SpendTransaction] {
        didSet { save() }
    }

    let analyzer: SpendingAnalyzer

    // MARK: - Persistence URL

    /// ~/Documents/moneylens_transactions.json
    /// Included in iCloud Backup automatically when the user has iCloud on.
    private static let dataURL: URL = {
        FileManager.default
            .urls(for: .documentDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("moneylens_transactions.json")
    }()

    // MARK: - Init

    init(analyzer: SpendingAnalyzer = SpendingAnalyzer(calendar: SampleData.calendar)) {
        self.analyzer = analyzer
        // Load from disk; fall back to sample data on first launch
        let loaded = Self.loadFromDisk()
        self.transactions = (loaded ?? SampleData.transactions).sorted { $0.date > $1.date }
        if loaded == nil {
            // First launch — save the sample data so the file exists
            save()
        }
    }

    // MARK: - Computed analytics

    /// Current calendar month for dashboard display
    var selectedMonth: Date { Date() }

    var monthlyTotal: Decimal {
        analyzer.monthlyTotal(for: transactions, containing: selectedMonth)
    }

    var categoryBreakdown: [CategorySpend] {
        analyzer.categoryBreakdown(for: transactions, containing: selectedMonth)
    }

    var merchantBreakdown: [MerchantSpend] {
        analyzer.merchantBreakdown(for: transactions, containing: selectedMonth)
    }

    var priceInsights: [PriceChangeInsight] {
        analyzer.priceIncreaseInsights(for: transactions)
    }

    // MARK: - Mutations

    func add(_ transaction: SpendTransaction) {
        transactions.insert(transaction, at: 0)
        transactions.sort { $0.date > $1.date }
        // save() fires via @Published didSet
    }

    func delete(at offsets: IndexSet) {
        transactions.remove(atOffsets: offsets)
    }

    func delete(_ transaction: SpendTransaction) {
        transactions.removeAll { $0.id == transaction.id }
    }

    func updateCategory(id: UUID, category: SpendCategory) {
        if let index = transactions.firstIndex(where: { $0.id == id }) {
            transactions[index].category = category
        }
    }

    func isDuplicate(_ candidate: SpendTransaction) -> Bool {
        transactions.contains { existing in
            existing.merchant == candidate.merchant &&
            existing.amount == candidate.amount &&
            abs(existing.date.timeIntervalSince(candidate.date)) < 86_400
        }
    }

    func resetToSampleData() {
        transactions = SampleData.transactions.sorted { $0.date > $1.date }
    }

    // MARK: - Disk I/O

    private func save() {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = .prettyPrinted
        guard let data = try? encoder.encode(transactions) else { return }
        // .atomic write prevents corruption if the app is killed mid-save
        try? data.write(to: Self.dataURL, options: .atomic)
    }

    private static func loadFromDisk() -> [SpendTransaction]? {
        let url = dataURL
        guard FileManager.default.fileExists(atPath: url.path),
              let data = try? Data(contentsOf: url) else { return nil }
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try? decoder.decode([SpendTransaction].self, from: data)
    }

    // MARK: - Debug helpers

    /// Returns the path to the JSON file so you can inspect it in a debugger or Files app
    var storagePath: String { Self.dataURL.path }

    /// File size in KB, or nil if the file does not exist yet
    var storageSizeKB: Int? {
        guard let attrs = try? FileManager.default.attributesOfItem(atPath: Self.dataURL.path),
              let size = attrs[.size] as? Int else { return nil }
        return size / 1024
    }
}