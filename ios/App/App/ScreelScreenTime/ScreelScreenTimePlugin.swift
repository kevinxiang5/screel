import Foundation
import Capacitor
import FamilyControls
import DeviceActivity
import ManagedSettings

/**
 Real Screen Time bridge via Family Controls / DeviceActivity / ManagedSettings.

 Screel minutes are a fresh budget from link / daily reset — they do NOT import
 historical totals from Settings → Screen Time.
 */
@objc(ScreelScreenTimePlugin)
public class ScreelScreenTimePlugin: CAPPlugin, CAPBridgedPlugin {
  public let identifier = "ScreelScreenTimePlugin"
  public let jsName = "ScreelScreenTime"
  public let pluginMethods: [CAPPluginMethod] = [
    CAPPluginMethod(name: "isNativeAvailable", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "requestAuthorization", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "presentAppPicker", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "startMonitoring", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "stopMonitoring", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "getTodayUsageMinutes", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "applyShieldWhenBroke", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "getLinkStatus", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "resetUsageDay", returnType: CAPPluginReturnPromise),
  ]

  private let center = DeviceActivityCenter()

  @objc func isNativeAvailable(_ call: CAPPluginCall) {
    #if targetEnvironment(simulator)
    call.resolve(["available": false, "reason": "simulator"])
    #else
    call.resolve(["available": true])
    #endif
  }

  @objc func requestAuthorization(_ call: CAPPluginCall) {
    Task {
      do {
        try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
        let status = Self.mapStatus(AuthorizationCenter.shared.authorizationStatus)
        call.resolve(["status": status])
      } catch {
        call.resolve(["status": "denied", "error": error.localizedDescription])
      }
    }
  }

  @objc func presentAppPicker(_ call: CAPPluginCall) {
    DispatchQueue.main.async {
      guard let presenter = self.bridge?.viewController else {
        call.reject("No view controller")
        return
      }
      let initial = ScreelScreenTimeShared.loadSelection() ?? FamilyActivitySelection()
      FamilyActivityPickerHost.present(from: presenter, initial: initial) { selection in
        guard let selection else {
          call.resolve(["selected": false, "applicationCount": 0])
          return
        }
        do {
          try ScreelScreenTimeShared.saveSelection(selection)
          let count = selection.applicationTokens.count
            + selection.categoryTokens.count
            + selection.webDomainTokens.count
          call.resolve(["selected": count > 0, "applicationCount": count])
        } catch {
          call.reject("Could not save app selection: \(error.localizedDescription)")
        }
      }
    }
  }

  @objc func startMonitoring(_ call: CAPPluginCall) {
    let budget = call.getInt("budgetMinutes") ?? ScreelScreenTimeShared.budgetMinutes
    let resetUsed = call.getBool("resetUsed") ?? false
    if let hour = call.getInt("resetHour") {
      ScreelScreenTimeShared.resetHour = hour
    }
    if let minute = call.getInt("resetMinute") {
      ScreelScreenTimeShared.resetMinute = minute
    }

    guard let selection = ScreelScreenTimeShared.loadSelection(), ScreelScreenTimeShared.hasSelection() else {
      call.reject("Pick apps to track first")
      return
    }
    guard AuthorizationCenter.shared.authorizationStatus == .approved else {
      call.reject("Screen Time authorization not approved")
      return
    }

    ScreelScreenTimeShared.budgetMinutes = max(1, budget)
    if resetUsed {
      ScreelScreenTimeShared.forceNewPeriod(clearShields: true)
    } else {
      ScreelScreenTimeShared.ensurePeriodBucket()
    }
    ScreelScreenTimeShared.isLinked = true

    let schedule = ScreelScreenTimeShared.dailySchedule(
      resetHour: ScreelScreenTimeShared.resetHour,
      resetMinute: ScreelScreenTimeShared.resetMinute
    )
    let events = ScreelScreenTimeShared.checkpointEvents(
      selection: selection,
      budgetMinutes: ScreelScreenTimeShared.budgetMinutes
    )

    do {
      center.stopMonitoring([.screelDaily])
      try center.startMonitoring(.screelDaily, during: schedule, events: events)
      // Always keep apps unlocked at the start of a fresh budget.
      if resetUsed || ScreelScreenTimeShared.minutesUsed < ScreelScreenTimeShared.budgetMinutes {
        ScreelScreenTimeShared.applyShield(broke: false)
      }
      call.resolve([
        "ok": true,
        "budgetMinutes": ScreelScreenTimeShared.budgetMinutes,
        "eventCount": events.count,
        "resetHour": ScreelScreenTimeShared.resetHour,
        "resetMinute": ScreelScreenTimeShared.resetMinute,
      ])
    } catch {
      call.reject("Could not start monitoring: \(error.localizedDescription)")
    }
  }

  @objc func stopMonitoring(_ call: CAPPluginCall) {
    center.stopMonitoring([.screelDaily])
    ScreelScreenTimeShared.isLinked = false
    ScreelScreenTimeShared.applyShield(broke: false)
    call.resolve()
  }

  @objc func getTodayUsageMinutes(_ call: CAPPluginCall) {
    ScreelScreenTimeShared.ensurePeriodBucket()
    call.resolve([
      "minutes": ScreelScreenTimeShared.minutesUsed,
      "budgetMinutes": ScreelScreenTimeShared.budgetMinutes,
      "linked": ScreelScreenTimeShared.isLinked,
      "hasSelection": ScreelScreenTimeShared.hasSelection(),
    ])
  }

  @objc func applyShieldWhenBroke(_ call: CAPPluginCall) {
    let broke = call.getBool("broke") ?? false
    ScreelScreenTimeShared.applyShield(broke: broke)
    call.resolve(["broke": broke])
  }

  @objc func resetUsageDay(_ call: CAPPluginCall) {
    ScreelScreenTimeShared.forceNewPeriod(clearShields: true)
    call.resolve(["minutes": 0])
  }

  @objc func getLinkStatus(_ call: CAPPluginCall) {
    ScreelScreenTimeShared.ensurePeriodBucket()
    call.resolve([
      "authorized": AuthorizationCenter.shared.authorizationStatus == .approved,
      "status": Self.mapStatus(AuthorizationCenter.shared.authorizationStatus),
      "hasSelection": ScreelScreenTimeShared.hasSelection(),
      "linked": ScreelScreenTimeShared.isLinked,
      "minutesUsed": ScreelScreenTimeShared.minutesUsed,
      "budgetMinutes": ScreelScreenTimeShared.budgetMinutes,
      "resetHour": ScreelScreenTimeShared.resetHour,
      "resetMinute": ScreelScreenTimeShared.resetMinute,
    ])
  }

  private static func mapStatus(_ status: AuthorizationStatus) -> String {
    switch status {
    case .approved: return "approved"
    case .denied: return "denied"
    case .notDetermined: return "notDetermined"
    @unknown default: return "unavailable"
    }
  }
}
