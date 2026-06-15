import SwiftUI

struct ContentView: View {
    var body: some View {
        TabView {
            DashboardView()
                .tabItem {
                    Label("Dashboard", systemImage: "chart.pie.fill")
                }

            TransactionsView()
                .tabItem {
                    Label("Orders", systemImage: "list.bullet.rectangle.fill")
                }

            ImportView()
                .tabItem {
                    Label("Import", systemImage: "square.and.arrow.down.fill")
                }

            InsightsView()
                .tabItem {
                    Label("Insights", systemImage: "lightbulb.fill")
                }
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(SpendingStore())
}
