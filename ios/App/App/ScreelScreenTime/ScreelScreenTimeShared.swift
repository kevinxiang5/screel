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

  static var defaults: UserDefaults {
    UserDefaults(suiteName: appGroupId) ?? .standard
  }

  static func todayStamp() -> String {
    let f = DateFormatter()
    f.calendar = Calendar.current
    f.locale = Locale(identifier: "en_US_POSIX")
    f.dateFormat = "yyyy-MM-dd"
    return f.string(from: Date())
  }

  static func ensureDayBucket() {
    let today = todayStamp()
    if defaults.string(forKey: dayKey) != today {
      defaults.set(today, forKey: dayKey)
      defaults.set(0, forKey: minutesUsedKey)
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
      ensureDayBucket()
      return defaults.integer(forKey: minutesUsedKey)
    }
    set {
      ensureDayBucket()
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

  /// Build up to 20 threshold events spanning 1…budget minutes for selected tokens.
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
}
