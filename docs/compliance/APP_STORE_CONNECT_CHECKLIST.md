# App Store Connect checklist (US only) — screen-time helper / individual account

**Product positioning:** Screen-time helper with optional **focus challenges** (skill + press-your-luck bonus pots). No currency, no purchases for minutes, no cash-out. **Individual Developer account.** Declare **Simulated Gambling = None**.

## Age rating questionnaire (must match the binary)

| Field | Answer |
|---|---|
| Simulated Gambling | **None** |
| Contests | **None** |
| Gambling (real money) | **No** |
| Loot Boxes | **No** |
| Age Assurance | **No** (welcome disclosure only; soft 13+ lockout) |
| Parental Controls | **No** |
| Unrestricted Web Access | **No** |
| UGC / Social / Messaging / Ads | **No** (app contains no ads) |
| Other mature content | **None** unless clearly present |

Expected rating: Productivity / Lifestyle — **not** 17+ simulated gambling.

If you answer Simulated Gambling = Frequent/Infrequent on an Individual account, Apple will reject. Do not declare gambling and then ask for an Individual exception.

## Category

- Primary: **Productivity** (or **Lifestyle**) — match Second Thought–style wellbeing apps
- Secondary: optional Lifestyle / Productivity
- Not Made for Kids

## Listing copy (paste)

**Subtitle:** `Challenges for screen time`

**Promotional text:**  
Screel helps you set a daily minute budget. Clear short challenges to keep a bonus pot — bank anytime, or push further. Math Sprint is pure skill.

**Description:**

```
Screel is a screen-time helper for iPhone.

• Set a daily minute allowance for apps you select
• Link Apple Screen Time (Family Controls) to enforce when you’re out
• Optional challenges: Math Sprint (skill), Safe tiles, Timing run, Color spin, Twenty-one, Match three, and more
• Grow a bonus pot and bank it anytime — miss wipes the unbanked pot
• Optional commit: miss minutes from today’s allowance (focus friction, default off)
• Daily keep cap · optional PIN lock on allowance settings

No real money. No deposits. No cash-out. Minutes are only your daily screen allowance.

Designed for self-directed screen-time management. United States only for v1.
```

**Keywords:** `screen time,focus,habit,app limit,digital wellbeing,minutes,challenge`

**What’s New (resubmit):**  
Focus challenges with bonus pots you can bank anytime, plus Math Sprint skill challenge. Optional commit defaults to off. Screen-time helper positioning.

## Review notes (paste)

```
Screel is a screen-time / digital-wellbeing helper (same product category as challenge-based app blockers).

Users set a daily minute allowance and may authorize Apple Family Controls / DeviceActivity / ManagedSettings for selected apps. When the allowance is empty, those apps can be shielded.

Optional challenges:
• Math Sprint — pure skill (arithmetic under time pressure) for a fixed bonus
• Other challenges build a temporary BONUS POT. Users may bank the pot anytime. Continuing can wipe the unbanked pot. This is foregone bonus time, not a wager against purchased currency.
• Optional “commit” (default 0) lets a user intentionally risk minutes from today’s allowance as a commitment device. Losing reduces screen time — the product’s purpose. Nothing is purchased or cashed out.

No real money, deposits, withdrawals, chips, or IAP for minutes. No simulated gambling currency.

United States only. No demo account — all data on-device.

Store screenshots should lead with the bank / Screen Time setup and Math Sprint (not the color wheel).
```

## Reply to prior rejection (paste in Resolution Center)

```
Thank you for the feedback. Screel is a screen-time helper, not a casino product.

Minigames are framed as focus challenges (including a Math Sprint skill challenge). They build a temporary bonus pot the user can bank anytime; missing wipes only the unbanked pot. An optional commit (default off) can reduce today’s allowance as intentional focus friction — never purchased currency, never cash-out.

We declare Simulated Gambling = None, refresh metadata and screenshots to match the productivity positioning, and resubmit a new binary. Please re-review as a screen-time / digital-wellbeing app suitable for an Individual developer account.
```

## URLs

- Privacy: https://kevinxiang5.github.io/screel/privacy.html  
- Terms: https://kevinxiang5.github.io/screel/terms.html  
- Support / Marketing: https://kevinxiang5.github.io/screel/

## Content Rights

- **No** third-party content (own UI / challenges)

## App Privacy

- Product Interaction for App Functionality, not linked, not tracking (or “No data collected” if you prefer local-only optional disclosure)
- Advertising: **No**

## Family Controls (blocking)

Do **not** Submit for Review with Screen Time shielding enabled until Apple has approved **Family Controls (Distribution)** for:

- `com.screel.app`
- `com.screel.app.DeviceActivityMonitor`

Request form: https://developer.apple.com/contact/request/family-controls-distribution  

Without distribution approval, App Store / TestFlight uploads that include the Family Controls entitlement will fail signing or review. Development builds on your phone can still work with the development entitlement.

## Before Submit

- [ ] New binary with challenge / pot model (no ads, no “Blackjack” label in UI)
- [ ] Age ratings: Simulated Gambling = **None**
- [ ] Listing copy matches above
- [ ] Screenshots lead with bank + Math Sprint (not casino-looking tables)
- [ ] Review notes updated
- [ ] Resolution Center reply posted
- [ ] Family Controls distribution approved (if Connect / shield is live in the binary)
