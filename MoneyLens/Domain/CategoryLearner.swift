import Foundation

/// Persists user-confirmed category decisions and applies them on future imports.
public final class CategoryLearner {
    private static let key = "moneylens.learned_categories"

    public static let shared = CategoryLearner()

    private var rules: [String: SpendCategory] = {
        guard let data = UserDefaults.standard.data(forKey: key),
              let decoded = try? JSONDecoder().decode([String: String].self, from: data)
        else { return [:] }
        return decoded.compactMapValues { SpendCategory(rawValue: $0) }
    }()

    public func category(for keyword: String) -> SpendCategory? {
        let lower = keyword.lowercased()
        return rules.first { lower.contains($0.key) }?.value
    }

    public func learn(keyword: String, category: SpendCategory) {
        let normalized = keyword.lowercased()
            .components(separatedBy: .whitespaces).prefix(3).joined(separator: " ")
        rules[normalized] = category
        let encoded = rules.mapValues { $0.rawValue }
        if let data = try? JSONEncoder().encode(encoded) {
            UserDefaults.standard.set(data, forKey: Self.key)
        }
    }
}