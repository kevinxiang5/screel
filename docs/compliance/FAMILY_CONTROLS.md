# Screel Screen Time (Family Controls) — live bridge

## What ships in the repo

| Piece | Path |
| --- | --- |
| Capacitor plugin | `ios/App/App/ScreelScreenTime/ScreelScreenTimePlugin.swift` |
| Shared App Group store | `ios/App/App/ScreelScreenTime/ScreelScreenTimeShared.swift` |
| App picker UI | `ios/App/App/ScreelScreenTime/FamilyActivityPickerHost.swift` |
| Device Activity Monitor | `ios/App/ScreelDeviceActivityMonitor/` |
| JS contract | `src/native/ScreelScreenTime.ts` |
| Bank connect flow | `src/screens/BankScreen.tsx` |

### Runtime flow (physical iPhone)

1. User taps **Connect Screen Time**
2. `AuthorizationCenter.requestAuthorization(for: .individual)`
3. `FamilyActivityPicker` → save selection to App Group `group.com.screel.app`
4. `DeviceActivityCenter.startMonitoring` with up to 20 minute checkpoints for the bank budget
5. Extension updates `minutesUsed` and applies `ManagedSettingsStore` shields when budget is spent
6. JS polls usage every ~20s and syncs shields when `remaining === 0`

Web / Simulator: `isNativeAvailable() === false` → honest **simulated** fallback.

## Bundle IDs (request Family Controls for each)

| Target | Bundle ID |
| --- | --- |
| App | `com.screel.app` |
| DeviceActivityMonitor | `com.screel.app.DeviceActivityMonitor` |

Form: https://developer.apple.com/contact/request/family-controls-distribution  

**Development** builds can use Family Controls with your team; **TestFlight / App Store** need Apple’s distribution approval for both IDs.

## One-time Xcode / Developer Portal setup (on your Mac)

1. [developer.apple.com](https://developer.apple.com/account) → Identifiers  
   - App ID `com.screel.app` — enable **Family Controls** + **App Groups** (`group.com.screel.app`)  
   - App ID `com.screel.app.DeviceActivityMonitor` — same  
2. Open `ios/App/App.xcodeproj` (via `npm run open:ios`)  
3. Signing: your Team on **App** and **ScreelDeviceActivityMonitor**  
4. Confirm entitlements files are attached (already set in the project)  
5. Run on a **physical iPhone** (not Simulator)  
6. Before shipping: submit the Family Controls distribution request; wait for approval  

## Honest product claims

Allowed once linked:

- “Screel uses Apple Screen Time APIs (Family Controls) to track apps you select and shield them when your minute bank is empty.”

Not allowed:

- Claiming Screel edits Apple Settings  
- Claiming it tracks **all** device Screen Time without a user selection  
- Shipping blocking without distribution entitlement approval  

## Gate

Do not Submit for Review with blocking enabled until Apple approves distribution entitlements for both bundle IDs.
