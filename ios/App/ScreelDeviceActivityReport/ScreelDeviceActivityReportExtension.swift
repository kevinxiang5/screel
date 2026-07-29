import DeviceActivity
import SwiftUI

@main
struct ScreelDeviceActivityReportExtension: DeviceActivityReportExtension {
  var body: some DeviceActivityReportScene {
    TopAppsReport { configuration in
      TopAppsReportView(configuration: configuration)
    }
  }
}

extension DeviceActivityReport.Context {
  static let screelTopApps = Self("screel.topApps")
}

struct TopAppsReport: DeviceActivityReportScene {
  let content: (TopAppsConfiguration) -> TopAppsReportView

  var context: DeviceActivityReport.Context { .screelTopApps }

  func makeConfiguration(
    representing data: DeviceActivityResults<DeviceActivityData>
  ) async -> TopAppsConfiguration {
    var total: TimeInterval = 0
    var byCategory: [String: TimeInterval] = [:]

    for await deviceData in data {
      for await segment in deviceData.activitySegments {
        total += segment.totalActivityDuration
        for await category in segment.categories {
          let key = category.category.localizedDisplayName ?? "Category"
          byCategory[key, default: 0] += category.totalActivityDuration
        }
      }
    }

    let rows = byCategory
      .map { TopAppsConfiguration.Row(name: $0.key, minutes: Int($0.value / 60)) }
      .sorted { $0.minutes > $1.minutes }
      .prefix(8)

    let top = rows.first
    let thisWeek = Int(total / 60)
    // Prior-week delta is not available as a separate filter in this scene —
    // surface share of top category vs total as the primary insight.
    let share = thisWeek > 0 && top != nil ? Int((Double(top!.minutes) / Double(thisWeek)) * 100) : 0

    return TopAppsConfiguration(
      rows: Array(rows),
      topName: top?.name ?? "—",
      topMinutes: top?.minutes ?? 0,
      totalMinutes: thisWeek,
      topSharePercent: share
    )
  }
}

struct TopAppsConfiguration {
  struct Row: Identifiable {
    var id: String { name }
    let name: String
    let minutes: Int
  }

  let rows: [Row]
  let topName: String
  let topMinutes: Int
  let totalMinutes: Int
  let topSharePercent: Int
}

struct TopAppsReportView: View {
  let configuration: TopAppsConfiguration

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      VStack(alignment: .leading, spacing: 4) {
        Text("Most used category")
          .font(.caption)
          .foregroundStyle(.secondary)
        Text(configuration.topName)
          .font(.title2.bold())
        Text("\(configuration.topMinutes)m · \(configuration.topSharePercent)% of \(configuration.totalMinutes)m tracked")
          .font(.subheadline)
          .foregroundStyle(.secondary)
      }

      ForEach(configuration.rows) { row in
        HStack {
          Text(row.name)
          Spacer()
          Text("\(row.minutes)m")
            .monospacedDigit()
            .foregroundStyle(.secondary)
        }
        .font(.subheadline)
        Divider()
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }
}
