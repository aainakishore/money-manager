import SwiftUI

enum MoneyLensTheme {
    static let background = Color(hex: 0x080B14)
    static let elevated = Color.white.opacity(0.055)
    static let elevatedStrong = Color.white.opacity(0.08)
    static let border = Color.white.opacity(0.10)
    static let text = Color(hex: 0xF0F2F5)
    static let mutedText = Color(hex: 0xF0F2F5).opacity(0.48)
    static let teal = Color(hex: 0x00C9A7)
    static let violet = Color(hex: 0x7C5CF0)
    static let red = Color(hex: 0xEF4444)
    static let orange = Color(hex: 0xF97316)
}

extension Color {
    init(hex: UInt, opacity: Double = 1) {
        let red = Double((hex >> 16) & 0xff) / 255
        let green = Double((hex >> 8) & 0xff) / 255
        let blue = Double(hex & 0xff) / 255
        self.init(.sRGB, red: red, green: green, blue: blue, opacity: opacity)
    }
}

extension SpendCategory {
    var tint: Color {
        switch self {
        case .groceries: MoneyLensTheme.teal
        case .foodDelivery: MoneyLensTheme.orange
        case .shopping: MoneyLensTheme.violet
        case .beauty: .pink
        case .supplements: .mint
        case .clothing: .indigo
        case .bills: MoneyLensTheme.red
        case .transport: .cyan
        case .subscriptions: .purple
        case .other: .gray
        }
    }
}

struct MoneyLensCard<Content: View>: View {
    var bottomSpacing: CGFloat = 0
    private let content: Content

    init(bottomSpacing: CGFloat = 0, @ViewBuilder content: () -> Content) {
        self.bottomSpacing = bottomSpacing
        self.content = content()
    }

    var body: some View {
        content
            .padding(.horizontal, 13)
            .padding(.vertical, 11)
            .background(MoneyLensTheme.elevated)
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(MoneyLensTheme.border, lineWidth: 0.5)
            )
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .padding(.bottom, bottomSpacing)
    }
}

struct MoneyLensSectionLabel: View {
    var title: String

    var body: some View {
        Text(title.uppercased())
            .font(.system(size: 10, weight: .semibold))
            .tracking(0.5)
            .foregroundStyle(MoneyLensTheme.mutedText)
    }
}

struct MoneyLensScreen<Content: View>: View {
    private let content: Content

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        ScrollView {
            content
                .padding(.horizontal, 12)
                .padding(.top, 8)
                .padding(.bottom, 24)
        }
        .scrollIndicators(.hidden)
        .background(MoneyLensTheme.background.ignoresSafeArea())
        .toolbarBackground(MoneyLensTheme.background, for: .navigationBar)
        .toolbarColorScheme(.dark, for: .navigationBar)
    }
}
