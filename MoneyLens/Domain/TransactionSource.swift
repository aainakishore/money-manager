import Foundation

public enum TransactionSource: String, CaseIterable, Codable, Identifiable, Hashable {
    case receiptEmail
    case shareSheet
    case screenshotOCR
    case bankFeed
    case paymentNotification
    case manual

    public var id: String { rawValue }

    public var title: String {
        switch self {
        case .receiptEmail: "Receipt email"
        case .shareSheet: "Share sheet"
        case .screenshotOCR: "Screenshot OCR"
        case .bankFeed: "Bank feed"
        case .paymentNotification: "Payment notification"
        case .manual: "Manual"
        }
    }
}
