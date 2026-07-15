import Foundation
import FamilyControls
import DeviceActivity
import ManagedSettings

extension DeviceActivityName {
  static let screelDaily = DeviceActivityName("screel.daily")
}

/// Shared App Group keys + helpers used by the app and DeviceActivityMonitor extension.
enum ScreelScreenTimeShared {
  static let appGroupId = "group.com.screel.app"
  static let selectionKey = "screel.selection"
  static let minutesUsedKey = "screel.minutesUsed"
  static let budgetKey = "screel.budgetMinutes"
  static let dayKey = "screel.dayStamp"
  static let linkedKey = "screel.linked"
  static let resetHourKey = "screel.resetHour"
  static let resetMinuteKey = "screel.resetMinute"

  static var defaults: UserDefaults {
    UserDefaults(suiteName: appGroupId) ?? .standard
  }

  static var resetHour: Int {
    get {
      if defaults.object(forKey: resetHourKey) == nil { return 4 }
      return max(0, min(23, defaults.integer(forKey: resetHourKey)))
    }
    set { defaults.set(max(0, min(23, newValue)), forKey: resetHourKey) }
  }

  static var resetMinute: Int {
    get {
      if defaults.object(forKey: resetMinuteKey) == nil { return 0 }
      return max(0, min(59, defaults.integer(forKey: resetMinuteKey)))
    }
    set { defaults.set(max(0, min(59, newValue)), forKey: resetMinuteKey) }
  }

  /// Period id based on the user-configured reset clock (not midnight).
  static func periodStamp(now: Date = Date()) -> String {
    var cal = Calendar.current
    cal.timeZone = .current
    let comps = cal.dateComponents([.year, .month, .day, .hour, .minute], from: now)
    let minsNow = (comps.hour ?? 0) * 60 + (comps.minute ?? 0)
    let resetMins = resetHour * 60 + resetMinute
    var day = cal.startOfDay(for: now)
    if minsNow < resetMins {
      day = cal.date(byAdding: .day, value: -1, to: day) ?? day
    }
    let y = cal.component(.year, from: day)
    let m = cal.component(.month, from: day)
    let d = cal.component(.day, from: day)
    return String(format: "%04d-%02d-%02d@%02d:%02d", y, m, d, resetHour, resetMinute)
  }

  static func ensurePeriodBucket() {
    let stamp = periodStamp()
    if defaults.string(forKey: dayKey) != stamp {
      defaults.set(stamp, forKey: dayKey)
      defaults.set(0, forKey: minutesUsedKey)
    }
  }

  static func forceNewPeriod(clearShields: Bool = true) {
    defaults.set(periodStamp(), forKey: dayKey)
    defaults.set(0, forKey: minutesUsedKey)
    if clearShields {
      applyShield(broke: false)
    }
  }

  static func saveSelection(_ selection: FamilyActivitySelection) throws {
    let data = try JSONEncoder().encode(selection)
    defaults.set(data, forKey: selectionKey)
  }

  static func loadSelection() -> FamilyActivitySelection? {
    guard let data = defaults.data(forKey: selectionKey) else { return nil }
    return try? JSONDecoder().decode(FamilyActivitySelection.self, from: data)
  }

  static func hasSelection() -> Bool {
    guard let selection = loadSelection() else { return false }
    return !selection.applicationTokens.isEmpty
      || !selection.categoryTokens.isEmpty
      || !selection.webDomainTokens.isEmpty
  }

  static var minutesUsed: Int {
    get {
      ensurePeriodBucket()
      return defaults.integer(forKey: minutesUsedKey)
    }
    set {
      ensurePeriodBucket()
      defaults.set(max(0, newValue), forKey: minutesUsedKey)
    }
  }

  static var budgetMinutes: Int {
    get { max(1, defaults.integer(forKey: budgetKey)) }
    set { defaults.set(max(1, newValue), forKey: budgetKey) }
  }

  static var isLinked: Bool {
    get { defaults.bool(forKey: linkedKey) }
    set { defaults.set(newValue, forKey: linkedKey) }
  }

  /// Up to 20 checkpoints across the Screel budget (counts only AFTER monitoring starts).
  static func checkpointEvents(
    selection: FamilyActivitySelection,
    budgetMinutes: Int
  ) -> [DeviceActivityEvent.Name: DeviceActivityEvent] {
    let budget = max(1, budgetMinutes)
    let steps = min(20, budget)
    var events: [DeviceActivityEvent.Name: DeviceActivityEvent] = [:]
    for step in 1...steps {
      let minutes = Int(ceil(Double(budget) * Double(step) / Double(steps)))
      let name = DeviceActivityEvent.Name("screel.m.\(minutes)")
      events[name] = DeviceActivityEvent(
        applications: selection.applicationTokens,
        categories: selection.categoryTokens,
        webDomains: selection.webDomainTokens,
        threshold: DateComponents(minute: minutes)
      )
    }
    return events
  }

  static func minutesFromEventName(_ name: DeviceActivityEvent.Name) -> Int? {
    let raw = name.rawValue
    guard raw.hasPrefix("screel.m.") else { return nil }
    return Int(raw.replacingOccurrences(of: "screel.m.", with: ""))
  }

  static func applyShield(broke: Bool) {
    let store = ManagedSettingsStore()
    guard broke, let selection = loadSelection() else {
      store.clearAllSettings()
      return
    }
    store.shield.applications = selection.applicationTokens.isEmpty ? nil : selection.applicationTokens
    store.shield.applicationCategories = selection.categoryTokens.isEmpty
      ? nil
      : .specific(selection.categoryTokens)
    store.shield.webDomains = selection.webDomainTokens.isEmpty ? nil : selection.webDomainTokens
  }

  /// Schedule from reset clock → one minute before next reset (repeats daily in device local TZ).
  static func dailySchedule(resetHour: Int, resetMinute: Int) -> DeviceActivitySchedule {
    var endHour = resetHour
    var endMinute = resetMinute - 1
    if endMinute < 0 {
      endMinute = 59
      endHour = (resetHour + 23) % 24
    }
    return DeviceActivitySchedule(
      intervalStart: DateComponents(hour: resetHour, minute: resetMinute, second: 0),
      intervalEnd: DateComponents(hour: endHour, minute: endMinute, second: 59),
      repeats: true
    )
  }
}
