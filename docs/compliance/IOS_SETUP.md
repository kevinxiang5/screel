# iOS / Capacitor setup (Phase 3)

## What’s done

- Capacitor initialized: **appId** `com.screel.app`, **appName** Screel
- Native project at [`ios/`](../../ios)
- Web assets sync via `npm run build:ios`
- **Real Screen Time bridge** (Family Controls / DeviceActivity / ManagedSettings) — see [`FAMILY_CONTROLS.md`](./FAMILY_CONTROLS.md)

## Mac / Xcode steps (you must run these — Windows cannot archive for App Store)

1. Open a Mac with Xcode 16+
2. Clone repo, `npm install`, `npm run build:ios`
3. `npm run open:ios` → open `App.xcodeproj` in Xcode
4. Signing & Capabilities → Team = your Apple Developer account on **App** and **ScreelDeviceActivityMonitor**
5. In developer.apple.com: App IDs `com.screel.app` + `com.screel.app.DeviceActivityMonitor` with Family Controls + App Group `group.com.screel.app`
6. Set original App Icon in `Assets.xcassets` (1024×1024 PNG for App Store)
7. Run on a **physical iPhone** and test Bank → Connect Screen Time
8. Before TestFlight/App Store: request Family Controls **distribution** for both bundle IDs

## TestFlight path

- Development: Family Controls usually works with your personal team on-device  
- Distribution: wait for Apple’s Family Controls approval or App Review will reject the entitlement  
- Review notes: re-check [`APP_STORE_CONNECT_CHECKLIST.md`](./APP_STORE_CONNECT_CHECKLIST.md); the current minute-stake build carries simulated-gambling review risk

## Do not

- Submit with misleading “controls all Screen Time” claims  
- Claim Settings UI integration
