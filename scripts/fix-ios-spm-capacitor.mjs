/**
 * Capacitor `cap sync` rewrites CapApp-SPM/Package.swift to fetch capacitor-swift-pm from GitHub.
 * That remote binary fetch is what breaks CapApp-SPM resolution for this project.
 * Always point CapApp-SPM at the vendored local package instead.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkgPath = join(root, 'ios', 'App', 'CapApp-SPM', 'Package.swift');
const localPm = join(root, 'ios', 'App', 'capacitor-swift-pm', 'Package.swift');

if (!existsSync(localPm)) {
  console.error('Missing vendored ios/App/capacitor-swift-pm. Cannot fix CapApp-SPM.');
  process.exit(1);
}

const fixed = `// swift-tools-version: 5.9
import PackageDescription

// DO NOT MODIFY THIS FILE - managed by Capacitor CLI commands
// Local capacitor-swift-pm path is restored by scripts/fix-ios-spm-capacitor.mjs after sync.
let package = Package(
    name: "CapApp-SPM",
    platforms: [.iOS(.v16)],
    products: [
        .library(
            name: "CapApp-SPM",
            targets: ["CapApp-SPM"])
    ],
    dependencies: [
        .package(path: "../capacitor-swift-pm")
    ],
    targets: [
        .target(
            name: "CapApp-SPM",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm")
            ]
        )
    ]
)
`;

writeFileSync(pkgPath, fixed.replace(/\r?\n/g, '\n'));
console.log('Pinned CapApp-SPM to vendored ios/App/capacitor-swift-pm.');
