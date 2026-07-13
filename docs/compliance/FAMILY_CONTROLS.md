# ScreelScreenTime native bridge (stub)

## Purpose

Replace the **simulated** `connectScreenTime()` in `ScreelContext` with real Apple APIs after Family Controls distribution is approved.

## Bundle IDs (proposed)

| Target | Bundle ID |
|---|---|
| App | `com.screel.app` |
| DeviceActivityMonitor extension | `com.screel.app.DeviceActivityMonitor` |
| (Optional) DeviceActivityReport | `com.screel.app.DeviceActivityReport` |

File a **Family Controls** distribution request for **each** bundle ID:
https://developer.apple.com/contact/request/family-controls-distribution

## Swift plugin outline

Implement Capacitor plugin `ScreelScreenTime` using:

- `FamilyControls` — `AuthorizationCenter.shared.requestAuthorization(for: .individual)` (or `.child` if parental product)
- `DeviceActivity` — schedule / thresholds for daily usage
- `ManagedSettings` — `ManagedSettingsStore` shields when remaining minutes = 0

Do **not** claim the app edits Apple Settings UI. User-facing copy: “Screel enforces your limit via system Screen Time APIs.”

## Web / current behavior

`src/native/ScreelScreenTime.ts` registers a web stub that returns `unavailable`. Bank screen remains honest about simulation until `isNativeAvailable()` is true.

## Wire-up after native lands

1. Cap sync / open Xcode
2. Add entitlement `com.apple.developer.family-controls` to app + extensions
3. Call `ScreelScreenTime.requestAuthorization()` from Bank
4. Poll or observe usage → update `minutesUsed`
5. On `remaining === 0`, `applyShieldWhenBroke({ broke: true })`

## Gate

No App Store binary that offers **blocking** until Apple approves distribution entitlements and counsel signs marketing copy.
