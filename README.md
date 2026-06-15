# MoneyLens

MoneyLens is an iOS-first personal finance app prototype for automatically understanding where money went, down to item-level orders when receipts are available.

## Product Direction

iOS does not allow one app to directly read another app's private order/payment data, even with a broad in-app permission prompt. So the app is designed around privacy-safe inputs:

- Receipt email import, with user permission.
- Share-sheet imports from shopping, food, grocery, and payment apps.
- Screenshot/photo OCR import for receipts and order summaries.
- Bank/payment provider APIs where available.
- Future merchant integrations for direct itemized orders.

The first version focuses on the data model, itemized transaction logging, category analytics, monthly charts, and price-increase insights.

## Current Prototype

- SwiftUI app shell under `MoneyLens/`.
- Reusable pure Swift finance logic under `MoneyLens/Domain`.
- Unit tests under `Tests/MoneyLensCoreTests`.
- Sample transactions for Swiggy, Blinkit, Amazon, CRED, and recurring purchases.
- Import tab for pasted order text and screenshot OCR.
- Dark Fold-inspired interface based on `moneylens_app_mockup.html`: compact translucent cards, teal accents, category donut, merchant bars, and bottom navigation.

## Import Paths

The fastest manual test loop is:

1. Open an order in Amazon, Swiggy, Blinkit, or a payment app.
2. Copy the order summary text if the app allows it, or take a screenshot.
3. In MoneyLens, open Import.
4. Paste the text and tap Parse text, or choose the screenshot.
5. Review the parsed merchant, total, and items, then save the order.

A full iOS Share Extension is the next production step. That makes MoneyLens appear in the iOS share sheet from other apps and receives shared text, URLs, PDFs, or images through the extension context.

## Deploy To Your iPhone

You cannot install an iOS app by unzipping a folder on the phone. iOS requires the app to be built and signed.

Fastest personal test:

1. Install full Xcode from the Mac App Store or Apple Developer downloads.
2. Open `MoneyLens.xcodeproj`.
3. Connect your iPhone by USB.
4. In Xcode, select your iPhone as the run destination.
5. Set a unique bundle identifier and choose your Apple Account under Signing & Capabilities.
6. Press Run.

This works with a free Apple developer account for device testing, but the install may need periodic re-signing. For sharing with other people, join the Apple Developer Program and use TestFlight through App Store Connect.

## Verify Core Logic

```sh
swift test
```

If the local Command Line Tools installation does not include `XCTest`, run the framework-free checks instead:

```sh
swift run MoneyLensChecks
```

Full iOS simulator builds require Xcode to be installed and selected with `xcode-select`.
