# iOS / Capacitor setup (Phase 3)

## What’s done

- Capacitor initialized: **appId** `com.screel.app`, **appName** Screel
- Native project at [`ios/`](../../ios)
- Web assets sync via `npm run build:ios`
- TypeScript plugin stub: [`src/native/ScreelScreenTime.ts`](../../src/native/ScreelScreenTime.ts)

## Mac / Xcode steps (you must run these — Windows cannot archive for App Store)

1. Open a Mac with Xcode 16+
2. Clone repo, `npm install`, `npm run build:ios`
3. `npm run open:ios` → open workspace in Xcode
4. Signing & Capabilities → Team = your Apple Developer account
5. Create App ID `com.screel.app` in developer.apple.com if missing
6. Set original App Icon in `Assets.xcassets` (use `public/favicon.svg` as start — supply 1024×1024 PNG for App Store)
7. Internal TestFlight build **without** Family Controls blocking first (honest simulated Bank copy)
8. Only after Family Controls approval: add entitlement + DeviceActivity extensions

## TestFlight path (no fake OS claims)

- Keep Bank copy as “simulated” until native APIs return `available: true`
- Review notes: “Minutes are fictional chips. No real-money gambling. US testers only.”

## Do not

- Submit a thin website with misleading Screen Time claims
- Enable ManagedSettings shields before entitlement approval
