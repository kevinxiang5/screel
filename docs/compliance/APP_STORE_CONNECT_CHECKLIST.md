# App Store Connect checklist (US only) — screen-time helper / individual account

> **Current build warning (July 17, 2026):** The app now lets users stake allowance minutes and lose that stake. This likely meets Apple’s simulated-gambling definition and is high-risk for an Individual Developer account. Do not reuse the “Simulated Gambling = None” answers below without new policy/legal review.

**Product positioning:** Screen-time helper with optional minute-stake challenges. No purchases for minutes and no cash-out, but challenge losses reduce today’s allowance.

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
| UGC / Social / Messaging | **No** |
| Advertising | **No** |
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
Set a daily minute budget, build better habits, and clear optional focus challenges.

**Description:**

```
Screel is a screen-time helper for iPhone.

• Set a daily minute allowance for apps you select
• Link Apple Screen Time (Family Controls) to enforce when you’re out
• Optional challenges: Safe tiles, Timing run, Multiplier wheel, Twenty-one, Match three, and more
• Choose a minute stake before each challenge
• Wins add the displayed payout; misses subtract the stake
• Unlimited challenge starts and full progress stats
• Optional PIN lock on allowance settings

No real money. No deposits. No cash-out. Minutes are only your daily screen allowance.

Designed for self-directed screen-time management. United States only for v1.
```

**Keywords:** `screen time,focus,habit,app limit,digital wellbeing,minutes,challenge`

**What’s New (resubmit):**  
Added minute stakes, challenge customization, unlimited starts, and clearer progress stats.

## Review notes (paste)

```
Screel is a screen-time / digital-wellbeing helper (same product category as challenge-based app blockers).

Users set a daily minute allowance and may authorize Apple Family Controls / DeviceActivity / ManagedSettings for selected apps. When the allowance is empty, those apps can be shielded.

Optional challenges:
• Users choose a minute stake before each challenge. Wins add the displayed payout and misses subtract the stake from today’s allowance.

Challenge starts are unlimited. The app contains no ads or in-app purchases.

No real money, deposits, withdrawals, chips, or IAP for minutes.

United States only. No demo account — all data on-device.

Store screenshots should lead with the bank / Screen Time setup (not the color wheel).
```

## Reply to prior rejection (paste in Resolution Center)

```
Thank you for the feedback. Screel is a screen-time helper, not a casino product.

Minigames are framed as focus challenges with minute stakes. Wins add minutes and misses subtract the selected stake. Minutes cannot be purchased or cashed out.

We declare Simulated Gambling = None, refresh metadata and screenshots to match the productivity positioning, and resubmit a new binary. Please re-review as a screen-time / digital-wellbeing app suitable for an Individual developer account.
```

## URLs

- Privacy: https://kevinxiang5.github.io/screel/privacy.html  
- Terms: https://kevinxiang5.github.io/screel/terms.html  
- Support / Marketing: https://kevinxiang5.github.io/screel/

## Content Rights

- **No** third-party content (own UI / challenges)

## App Privacy

- Advertising: **No**
- Purchases: **No**

## Family Controls (blocking)

Do **not** Submit for Review with Screen Time shielding enabled until Apple has approved **Family Controls (Distribution)** for:

- `com.screel.app`
- `com.screel.app.DeviceActivityMonitor`

Request form: https://developer.apple.com/contact/request/family-controls-distribution  

Without distribution approval, App Store / TestFlight uploads that include the Family Controls entitlement will fail signing or review. Development builds on your phone can still work with the development entitlement.

## Before Submit

- [ ] Reassess Individual-account eligibility because the current binary contains minute staking and losses
- [ ] Age ratings: Simulated Gambling = **None**
- [ ] Listing copy matches above
- [ ] Screenshots lead with bank + setup (not casino-looking tables)
- [ ] Review notes updated
- [ ] Resolution Center reply posted
- [ ] Family Controls distribution approved (if Connect / shield is live in the binary)
