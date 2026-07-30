// swift-tools-version:5.9
import PackageDescription

// Vendored Capacitor/Cordova binaries so Xcode does not need to fetch GitHub releases.
let package = Package(
    name: "capacitor-swift-pm",
    platforms: [.iOS(.v15)],
    products: [
        .library(name: "Capacitor", targets: ["Capacitor"]),
        .library(name: "Cordova", targets: ["Cordova"]),
    ],
    dependencies: [],
    targets: [
        .binaryTarget(name: "Capacitor", path: "Capacitor.xcframework"),
        .binaryTarget(name: "Cordova", path: "Cordova.xcframework"),
    ]
)
