import SwiftUI
import UIKit

@main
struct MoneyLensApp: App {
    @StateObject private var store = SpendingStore()

    init() {
        UITabBar.appearance().isTranslucent = false
        UITabBar.appearance().barTintColor = UIColor(MoneyLensTheme.background)
        UITabBar.appearance().backgroundColor = UIColor(MoneyLensTheme.background)
        UINavigationBar.appearance().largeTitleTextAttributes = [.foregroundColor: UIColor(MoneyLensTheme.text)]
        UINavigationBar.appearance().titleTextAttributes = [.foregroundColor: UIColor(MoneyLensTheme.text)]
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(store)
                .preferredColorScheme(.dark)
                .tint(MoneyLensTheme.teal)
        }
    }
}
