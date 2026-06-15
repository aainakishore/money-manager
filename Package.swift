// swift-tools-version: 6.0

import PackageDescription

let package = Package(
    name: "MoneyLens",
    platforms: [
        .iOS(.v17),
        .macOS(.v14)
    ],
    products: [
        .library(name: "MoneyLensCore", targets: ["MoneyLensCore"]),
        .executable(name: "MoneyLensChecks", targets: ["MoneyLensChecks"])
    ],
    targets: [
        .target(
            name: "MoneyLensCore",
            path: "MoneyLens/Domain"
        ),
        .executableTarget(
            name: "MoneyLensChecks",
            dependencies: ["MoneyLensCore"],
            path: "MoneyLens/Checks"
        ),
        .testTarget(
            name: "MoneyLensCoreTests",
            dependencies: ["MoneyLensCore"],
            path: "Tests/MoneyLensCoreTests"
        )
    ]
)
