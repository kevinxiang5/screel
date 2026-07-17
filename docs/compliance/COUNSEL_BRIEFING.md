# Screel — Counsel Briefing Packet

> **Superseded for App Store submission (2026-07):** product is now positioned as a **screen-time helper with focus challenges** for an **Individual** account. Use [`APP_STORE_CONNECT_CHECKLIST.md`](./APP_STORE_CONNECT_CHECKLIST.md) for age ratings (**Simulated Gambling = None**), listing copy, and review notes. The sections below retain an earlier casino-adjacent framing for counsel history only — **do not paste them into App Store Connect.**

**Prepared for:** outside counsel (App Store / IP / US gambling–consumer)  
**Product:** Screel  
**Repo:** https://github.com/kevinxiang5/screel  
**Prepared:** 2026-07-13  
**Status:** Engineering compliance pack — **not legal advice**

---

## What we need from counsel (written answers)

1. Is v1 “simulated gambling” under US federal/state framing if currency is **only screen-time minutes** with **no cash-out / redeem**?
2. Required age floor and disclosures (17+ vs 18+)?
3. Can marketing use Apple’s “Screen Time” product name? Preferred substitute wording?
4. Should the App Store publisher be an **LLC** (or other entity) rather than an individual?
5. Confirm **United States only** for v1; any state-level issues with social-casino + wellbeing framing?
6. Clearance notes on the mark **“Screel”** (USPTO / common law) — see `docs/compliance/TRADEMARK_SEARCH.md`.

**Gate:** Do not submit to App Review until a written memo exists covering 1–5.

---

## Product summary

Screel is a mobile/web app where users set a daily **minute bank**, optionally link (or simulate) usage tracking, then play **blackjack** and **roulette** to win or lose **minutes** (not money).

| Feature | Production intent | Current code |
|---|---|---|
| Blackjack / Roulette | Ship | Fully implemented locally |
| Minute bank / challenges | Ship | `localStorage` key `screel-v1` |
| Real Apple Screen Time blocking | Phase 2+ | **Mock only** until Family Controls |
| Cash / IAP redeemable value | **Never** (simulated path) | Not present |

---

## Paytables (must match in-app Odds screen)

### Blackjack
- Blackjack pays **3:2**
- Wins pay **1:1**
- Insurance **2:1** if dealer has blackjack
- Dealer stands on soft 17
- Split / double supported

### Roulette (European 0–36)
- Straight-up number: **35:1** profit
- Dozen / column: **2:1**
- Even-money (red/black, odd/even, 1–18/19–36): **1:1**

---

## Data map (current)

Persisted in browser/`localStorage` (`screel-v1`):

- `displayName` (nickname, max 20 chars)
- `connected`, `baseLimit`, `minutesBank`, `minutesUsed`
- `streak`, `xp`, `level`, win/loss stats, `history[]`, `challenges[]`
- `soundOn`, `riskAlerts`

**No** email, phone, account system, analytics SDKs, or ads today.  
Google Fonts CDN may load Outfit + Syne (disclose in Privacy Policy or self-host).

**Future native:** Device Activity / usage minutes via Family Controls — will require updated privacy nutrition labels and purpose strings.

---

## App Store stance we intend

- Territory: **US only** for v1
- Age rating: **Simulated Gambling = Frequent** (expect 17+/18+)
- Guideline path: **5.3 simulated**, **not** 5.3.4 real-money gaming
- Explicit disclosure: *No real money gambling. Minutes are fictional chip units.*
- No Made for Kids

---

## Recommended publisher

Prefer an **LLC** (or similar) as the App Store Connect seller for gambling-adjacent / regulated-field signaling. Confirm with counsel.

---

## Attachments in this folder

- `OWNERSHIP.md` — authorship record  
- `ASSET_INVENTORY.md` — fonts, icons, deps  
- `TRADEMARK_SEARCH.md` — DIY search log (counsel should verify)  
- `PRIVACY_POLICY.md` / `TERMS.md` — draft policies to host  
- `APP_STORE_CONNECT_CHECKLIST.md` — ASC metadata  
- `VERIFICATION_MATRIX.md` — pre-submit gates  
- `FAMILY_CONTROLS.md` — entitlement request notes  
- `licenses/` — dependency license report when generated  
