import UIKit
import Capacitor

/// Registers local plugins Capacitor's empty `packageClassList` would otherwise skip.
class BridgeViewController: CAPBridgeViewController {
  override open func capacitorDidLoad() {
    super.capacitorDidLoad()
    bridge?.registerPluginInstance(ScreelScreenTimePlugin())
  }
}
