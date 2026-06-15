import Foundation

enum AppFormatters {
    static let inr: NumberFormatter = {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "INR"
        formatter.maximumFractionDigits = 0
        formatter.locale = Locale(identifier: "en_IN")
        return formatter
    }()

    static let shortDate: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        formatter.locale = Locale(identifier: "en_IN")
        return formatter
    }()

    static func currency(_ amount: Decimal) -> String {
        inr.string(from: amount as NSDecimalNumber) ?? "INR \(amount)"
    }

    static func percent(_ amount: Decimal) -> String {
        let number = NSDecimalNumber(decimal: amount)
        return "\(number.rounding(accordingToBehavior: nil))%"
    }
}

extension Decimal {
    var doubleValue: Double {
        NSDecimalNumber(decimal: self).doubleValue
    }
}
