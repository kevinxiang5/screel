# Pre-submit verification matrix

Fail closed: any unchecked **required** item blocks App Review submit.

## A. Legal pack (owner + counsel) — REQUIRED

- [ ] Written counsel memo: simulated gambling OK in US launch states; age floor set
- [ ] Screel trademark clearance notes completed (`TRADEMARK_SEARCH.md`)
- [ ] Privacy Policy + Terms hosted on public HTTPS URLs
- [ ] Publisher entity decided (prefer LLC)
- [ ] Support email monitored

## B. Repo / IP pack — REQUIRED

- [x] No Stake-like / competitor clone comments
- [x] Unused Vite/React/social brand SVGs removed
- [x] Original favicon (no slot emoji)
- [x] LICENSE present (proprietary)
- [x] Dependency license inventory under `licenses/`
- [x] BJ home badge shows 3:2 (matches math)
- [x] Odds & house rules in-app
- [x] Screen Time / usage copy matches capability (native on device; simulated on web/simulator)
- [ ] No third-party logos in App Store screenshots

## C. Product safety — REQUIRED

- [x] Age gate cannot be skipped (`ageVerified` in state)
- [x] Persistent no-real-money disclosure
- [x] Risk alerts available
- [ ] ASO keywords do not target under-17

## D. Technical / App Review

- [x] Capacitor iOS project `ios/` with `com.screel.app`
- [ ] Runs on physical iPhone via TestFlight / Xcode
- [ ] Family Controls **distribution** approved for `com.screel.app` + `com.screel.app.DeviceActivityMonitor` before App Review
- [ ] Review notes written (`APP_STORE_CONNECT_CHECKLIST.md`)
- [ ] Internal TestFlight signed before App Review

## E. Money-loss protection

- [ ] No large paid UA until approved
- [ ] No “Apple partner / official Screen Time” claims
- [ ] Budget for 1–2 rejection cycles
- [ ] Counsel on call for 5.3 rejection responses

## Sign-off

| Role | Name | Date | OK? |
|---|---|---|---|
| Owner | | | |
| Counsel | | | |
| Engineering | | | |
