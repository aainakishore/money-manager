import Foundation

public enum SampleData {
    public static let calendar: Calendar = {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "Asia/Kolkata") ?? .current
        return calendar
    }()

    public static var transactions: [SpendTransaction] {
        [
            SpendTransaction(
                date: date(2026, 6, 2),
                merchant: "Blinkit",
                sourceApp: "Blinkit",
                paymentApp: "Google Pay",
                amount: 948,
                category: .groceries,
                source: .shareSheet,
                items: [
                    LineItem(name: "Amul Taaza Milk 1L", quantity: 2, unitPrice: 68, category: .groceries),
                    LineItem(name: "Tata Salt 1kg", quantity: 1, unitPrice: 28, category: .groceries),
                    LineItem(name: "Farmley Almonds 200g", quantity: 1, unitPrice: 349, category: .supplements),
                    LineItem(name: "Dettol Handwash Refill", quantity: 1, unitPrice: 135, category: .beauty),
                    LineItem(name: "Brown Bread", quantity: 1, unitPrice: 52, category: .groceries)
                ]
            ),
            SpendTransaction(
                date: date(2026, 6, 4),
                merchant: "Swiggy",
                sourceApp: "Swiggy",
                paymentApp: "Paytm",
                amount: 612,
                category: .foodDelivery,
                source: .receiptEmail,
                items: [
                    LineItem(name: "Paneer Bowl", quantity: 1, unitPrice: 249, category: .foodDelivery),
                    LineItem(name: "Cold Coffee", quantity: 1, unitPrice: 159, category: .foodDelivery),
                    LineItem(name: "Delivery and platform fees", quantity: 1, unitPrice: 84, category: .foodDelivery)
                ]
            ),
            SpendTransaction(
                date: date(2026, 6, 7),
                merchant: "Amazon",
                sourceApp: "Amazon",
                paymentApp: "CRED",
                amount: 2899,
                category: .shopping,
                source: .screenshotOCR,
                items: [
                    LineItem(name: "Minimalist Vitamin C Serum", quantity: 1, unitPrice: 699, category: .beauty),
                    LineItem(name: "Running T-Shirt", quantity: 2, unitPrice: 650, category: .clothing),
                    LineItem(name: "Magnesium Glycinate", quantity: 1, unitPrice: 899, category: .supplements)
                ],
                confidence: 0.88
            ),
            SpendTransaction(
                date: date(2026, 6, 10),
                merchant: "Blinkit",
                sourceApp: "Blinkit",
                paymentApp: "Google Pay",
                amount: 836,
                category: .groceries,
                source: .shareSheet,
                items: [
                    LineItem(name: "Amul Taaza Milk 1L", quantity: 2, unitPrice: 72, category: .groceries),
                    LineItem(name: "Eggs 12 pack", quantity: 1, unitPrice: 115, category: .groceries),
                    LineItem(name: "Greek Yogurt", quantity: 2, unitPrice: 95, category: .groceries),
                    LineItem(name: "Dishwash Gel", quantity: 1, unitPrice: 169, category: .groceries)
                ]
            ),
            SpendTransaction(
                date: date(2026, 6, 12),
                merchant: "CRED",
                sourceApp: "CRED",
                paymentApp: "CRED",
                amount: 4210,
                category: .bills,
                source: .paymentNotification,
                items: [
                    LineItem(name: "Credit card bill payment", quantity: 1, unitPrice: 4210, category: .bills)
                ]
            ),
            SpendTransaction(
                date: date(2026, 5, 18),
                merchant: "Blinkit",
                sourceApp: "Blinkit",
                paymentApp: "Google Pay",
                amount: 744,
                category: .groceries,
                source: .shareSheet,
                items: [
                    LineItem(name: "Amul Taaza Milk 1L", quantity: 2, unitPrice: 64, category: .groceries),
                    LineItem(name: "Greek Yogurt", quantity: 2, unitPrice: 80, category: .groceries),
                    LineItem(name: "Eggs 12 pack", quantity: 1, unitPrice: 98, category: .groceries)
                ]
            )
        ]
    }

    private static func date(_ year: Int, _ month: Int, _ day: Int) -> Date {
        calendar.date(from: DateComponents(year: year, month: month, day: day)) ?? Date()
    }
}
