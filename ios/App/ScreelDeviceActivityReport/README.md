# Screel DeviceActivityReport extension

Adds a privacy-preserving per-app usage report (Apple sandbox — data cannot be read by the main JS app).

## Wire in Xcode (one-time)

1. Open `ios/App/App.xcworkspace`
2. File → New → Target → Device Activity Report Extension
3. Product name: `ScreelDeviceActivityReport`, bundle id `com.screel.app.DeviceActivityReport`
4. Replace generated sources with files in this folder (`ScreelDeviceActivityReportExtension.swift`, `Info.plist`, entitlements)
5. Enable Family Controls + App Group `group.com.screel.app` on the extension
6. Embed the extension in the App target
7. Also add `UsageReportHost.swift` to the App target if Xcode did not pick it up automatically

Until the extension is embedded, `presentUsageReport` still opens a sheet; the report view may stay empty on device.
