import Foundation
import Capacitor

/// Stub Capacitor plugin — replace with FamilyControls / DeviceActivity / ManagedSettings
/// after Apple approves distribution entitlements. See docs/compliance/FAMILY_CONTROLS.md
@objc(ScreelScreenTimePlugin)
public class ScreelScreenTimePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ScreelScreenTimePlugin"
    public let jsName = "ScreelScreenTime"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getTodayUsageMinutes", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "applyShieldWhenBroke", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isNativeAvailable", returnType: CAPPluginReturnPromise),
    ]

    @objc func requestAuthorization(_ call: CAPPluginCall) {
        // TODO: AuthorizationCenter.shared.requestAuthorization
        call.resolve(["status": "unavailable"])
    }

    @objc func getTodayUsageMinutes(_ call: CAPPluginCall) {
        call.resolve(["minutes": 0])
    }

    @objc func applyShieldWhenBroke(_ call: CAPPluginCall) {
        call.resolve()
    }

    @objc func isNativeAvailable(_ call: CAPPluginCall) {
        // Flip to true only when Family Controls is entitlement-approved and wired.
        call.resolve(["available": false])
    }
}
