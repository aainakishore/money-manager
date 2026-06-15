import Foundation

public enum SpendCategory: String, CaseIterable, Codable, Identifiable, Hashable {
    case groceries
    case foodDelivery
    case shopping
    case beauty
    case supplements
    case clothing
    case bills
    case transport
    case subscriptions
    case other

    public var id: String { rawValue }

    public var title: String {
        switch self {
        case .groceries: "Groceries"
        case .foodDelivery: "Food delivery"
        case .shopping: "Shopping"
        case .beauty: "Beauty"
        case .supplements: "Supplements"
        case .clothing: "Clothing"
        case .bills: "Bills"
        case .transport: "Transport"
        case .subscriptions: "Subscriptions"
        case .other: "Other"
        }
    }

    public var symbolName: String {
        switch self {
        case .groceries: "cart.fill"
        case .foodDelivery: "fork.knife"
        case .shopping: "bag.fill"
        case .beauty: "sparkles"
        case .supplements: "cross.case.fill"
        case .clothing: "tshirt.fill"
        case .bills: "doc.text.fill"
        case .transport: "car.fill"
        case .subscriptions: "repeat.circle.fill"
        case .other: "square.grid.2x2.fill"
        }
    }
}
