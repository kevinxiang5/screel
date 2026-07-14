import SwiftUI
import FamilyControls
import UIKit

/// Presents Apple's FamilyActivityPicker so the user can choose apps/categories to monitor.
enum FamilyActivityPickerHost {
  @MainActor
  static func present(
    from presenter: UIViewController,
    initial: FamilyActivitySelection,
    completion: @escaping (FamilyActivitySelection?) -> Void
  ) {
    let root = PickerRoot(selection: initial) { result in
      presenter.dismiss(animated: true) {
        completion(result)
      }
    }
    let host = UIHostingController(rootView: root)
    host.modalPresentationStyle = .formSheet
    presenter.present(host, animated: true)
  }
}

private struct PickerRoot: View {
  @State private var selection: FamilyActivitySelection
  let onFinish: (FamilyActivitySelection?) -> Void

  init(selection: FamilyActivitySelection, onFinish: @escaping (FamilyActivitySelection?) -> Void) {
    _selection = State(initialValue: selection)
    self.onFinish = onFinish
  }

  var body: some View {
    NavigationView {
      FamilyActivityPicker(selection: $selection)
        .navigationTitle("Apps to track")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
          ToolbarItem(placement: .cancellationAction) {
            Button("Cancel") { onFinish(nil) }
          }
          ToolbarItem(placement: .confirmationAction) {
            Button("Save") { onFinish(selection) }
          }
        }
    }
  }
}
