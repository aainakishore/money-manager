import SwiftUI

struct SourcesView: View {
    private let sources: [SourcePermission] = [
        SourcePermission(name: "Receipt email", symbol: "envelope.fill", status: "Ready for Gmail/IMAP connector", enabled: true),
        SourcePermission(name: "Share sheet imports", symbol: "square.and.arrow.down.fill", status: "Best path for Amazon, Swiggy, Blinkit", enabled: true),
        SourcePermission(name: "Screenshot OCR", symbol: "text.viewfinder", status: "Use Vision to parse order screenshots", enabled: true),
        SourcePermission(name: "Bank/payment feeds", symbol: "building.columns.fill", status: "Needs provider API or aggregator", enabled: false),
        SourcePermission(name: "Live app access", symbol: "lock.shield.fill", status: "Not allowed by iOS sandbox", enabled: false)
    ]

    var body: some View {
        NavigationStack {
            List {
                Section {
                    ForEach(sources) { source in
                        HStack(spacing: 12) {
                            Image(systemName: source.symbol)
                                .frame(width: 36, height: 36)
                                .background(source.enabled ? Color.teal.opacity(0.16) : Color.gray.opacity(0.14))
                                .foregroundStyle(source.enabled ? .teal : .secondary)
                                .clipShape(RoundedRectangle(cornerRadius: 8))

                            VStack(alignment: .leading, spacing: 4) {
                                Text(source.name)
                                    .font(.headline)
                                Text(source.status)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }

                            Spacer()

                            Image(systemName: source.enabled ? "checkmark.circle.fill" : "exclamationmark.triangle.fill")
                                .foregroundStyle(source.enabled ? .green : .orange)
                        }
                        .padding(.vertical, 6)
                    }
                } header: {
                    Text("Data sources")
                } footer: {
                    Text("MoneyLens should ask for narrow permissions and explain exactly what each source contributes. Direct access to private data inside another installed app is not available on iOS.")
                }
            }
            .navigationTitle("Sources")
        }
    }
}

private struct SourcePermission: Identifiable {
    var id: String { name }
    var name: String
    var symbol: String
    var status: String
    var enabled: Bool
}
