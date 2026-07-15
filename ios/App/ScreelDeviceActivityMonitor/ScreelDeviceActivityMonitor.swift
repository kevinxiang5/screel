import DeviceActivity
import FamilyControls
import Foundation
import ManagedSettings

/// Runs in the Device Activity Monitor extension when thresholds fire.
class ScreelDeviceActivityMonitor: DeviceActivityMonitor {
  override func intervalDidStart(for activity: DeviceActivityName) {
    super.intervalDidStart(for: activity)
    // New reset-window day — unlock and zero Screel's used counter.
    ScreelScreenTimeShared.forceNewPeriod(clearShields: true)
  }

  override func intervalDidEnd(for activity: DeviceActivityName) {
    super.intervalDidEnd(for: activity)
  }

  override func eventDidReachThreshold(_ event: DeviceActivityEvent.Name, activity: DeviceActivityName) {
    super.eventDidReachThreshold(event, activity: activity)
    ScreelScreenTimeShared.ensurePeriodBucket()
    if let minutes = ScreelScreenTimeShared.minutesFromEventName(event) {
      ScreelScreenTimeShared.minutesUsed = max(ScreelScreenTimeShared.minutesUsed, minutes)
    }
    if ScreelScreenTimeShared.minutesUsed >= ScreelScreenTimeShared.budgetMinutes {
      ScreelScreenTimeShared.applyShield(broke: true)
    }
  }

  override func eventWillReachThresholdWarning(_ event: DeviceActivityEvent.Name, activity: DeviceActivityName) {
    super.eventWillReachThresholdWarning(event, activity: activity)
  }
}
