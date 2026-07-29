import SwiftUI
import UIKit
import DeviceActivity
import FamilyControls

extension DeviceActivityReport.Context {
  static let screelTopApps = Self("screel.topApps")
}

/// Presents Apple's privacy-preserving usage report (per-app names stay in the extension).
enum UsageReportHost {
  static func present(from presenter: UIViewController, completion: @escaping (Bool) -> Void) {
    let sheet = UIHostingController(rootView: UsageReportSheet(onClose: {
      presenter.dismiss(animated: true) {
        completion(true)
      }
    }))
    sheet.modalPresentationStyle = .pageSheet
    if let detents = sheet.sheetPresentationController {
      detents.detents = [.large()]
      detents.prefersGrabberVisible = true
    }
    presenter.present(sheet, animated: true)
  }
}

private struct UsageReportSheet: View {
  let onClose: () -> Void

  private var filter: DeviceActivityFilter {
    let now = Date()
    let cal = Calendar.current
    let weekAgo = cal.date(byAdding: .day, value: -7, to: now) ?? now
    return DeviceActivityFilter(
      segment: .daily(during: DateInterval(start: weekAgo, end: now)),
      users: .all,
      devices: .init([.iPhone])
    )
  }

  var body: some View {
    NavigationStack {
      VStack(alignment: .leading, spacing: 16) {
        Text("Tracked apps · this week")
          .font(.caption)
          .foregroundStyle(.secondary)
          .textCase(.uppercase)
        DeviceActivityReport(.screelTopApps, filter: filter)
          .frame(maxWidth: .infinity, minHeight: 320)
        Text("Per-app names are drawn by the system report and never leave the device.")
          .font(.footnote)
          .foregroundStyle(.secondary)
        Spacer(minLength: 0)
      }
      .padding()
      .navigationTitle("Usage report")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .topBarTrailing) {
          Button("Done", action: onClose)
        }
      }
    }
  }
}
