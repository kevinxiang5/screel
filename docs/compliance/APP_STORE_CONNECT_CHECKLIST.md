# App Store Connect checklist (US only) — screen-time helper / individual account

**Product positioning:** Screen-time helper with optional focus challenges and additive-only bonus pots. Existing allowance is never wagered or reduced by a challenge. No currency, purchases for minutes, or cash-out. **Individual Developer account.**

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
| Advertising | **Yes** (user-initiated Google rewarded ads on Normal only) |
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
Set a daily minute budget, build better habits, and clear optional focus challenges. Premium adds unlimited ad-free challenge play.

**Description:**

```
Screel is a screen-time helper for iPhone.

• Set a daily minute allowance for apps you select
• Link Apple Screen Time (Family Controls) to enforce when you’re out
• Optional challenges: Safe tiles, Timing run, Color spin, Twenty-one, Match three, and more
• Grow a bonus pot and bank it anytime — miss wipes the unbanked pot
• Existing allowance is never wagered or reduced by challenge outcomes
• Daily keep cap · optional PIN lock on allowance settings
• Normal: 20 daily challenges with optional rewarded-ad refills
• Premium subscription: unlimited challenges, no ads, and richer stats

No real money. No deposits. No cash-out. Minutes are only your daily screen allowance.

Designed for self-directed screen-time management. United States only for v1.
```

**Keywords:** `screen time,focus,habit,app limit,digital wellbeing,minutes,challenge`

**What’s New (resubmit):**  
Added Normal and Premium plans, additive-only bonus pots, challenge customization, and clearer progress stats.

## Review notes (paste)

```
Screel is a screen-time / digital-wellbeing helper (same product category as challenge-based app blockers).

Users set a daily minute allowance and may authorize Apple Family Controls / DeviceActivity / ManagedSettings for selected apps. When the allowance is empty, those apps can be shielded.

Optional challenges:
• Challenges build a temporary BONUS POT. Users may bank the pot anytime. Continuing can wipe the unbanked pot. This is foregone bonus time, not a wager against purchased currency.
• Existing allowance is never placed into a challenge and never decreases after a miss.

Normal includes 20 daily challenge starts. Users may voluntarily complete up to five rewarded ads for +2 starts each and one rewarded ad for a +5-minute rescue when out of minutes. Premium is an auto-renewable subscription for unlimited starts, no ads, and richer statistics. Premium does not improve odds, raise minute rewards, or sell minutes.

No real money, deposits, withdrawals, chips, or IAP for minutes.

United States only. No demo account — all data on-device.

Store screenshots should lead with the bank / Screen Time setup (not the color wheel).
```

## Reply to prior rejection (paste in Resolution Center)

```
Thank you for the feedback. Screel is a screen-time helper, not a casino product.

Minigames are framed as focus challenges. They build a temporary bonus pot the user can bank anytime; missing wipes only the unbanked bonus. Existing allowance is never wagered or reduced by a challenge.

We declare Simulated Gambling = None, refresh metadata and screenshots to match the productivity positioning, and resubmit a new binary. Please re-review as a screen-time / digital-wellbeing app suitable for an Individual developer account.
```

## URLs

- Privacy: https://kevinxiang5.github.io/screel/privacy.html  
- Terms: https://kevinxiang5.github.io/screel/terms.html  
- Support / Marketing: https://kevinxiang5.github.io/screel/

## Content Rights

- **No** third-party content (own UI / challenges)

## App Privacy

- Advertising: **Yes**
- Update the privacy nutrition label for Google Mobile Ads before submission. Review Device ID, Product Interaction, Advertising Data, Diagnostics, Third-Party Advertising, and Analytics against Google’s current SDK disclosure.
- Ads request non-personalized treatment (`npa: true`); Screel does not request ATT permission or use IDFA.

## Family Controls (blocking)

Do **not** Submit for Review with Screen Time shielding enabled until Apple has approved **Family Controls (Distribution)** for:

- `com.screel.app`
- `com.screel.app.DeviceActivityMonitor`

Request form: https://developer.apple.com/contact/request/family-controls-distribution  

Without distribution approval, App Store / TestFlight uploads that include the Family Controls entitlement will fail signing or review. Development builds on your phone can still work with the development entitlement.

## Before Submit

- [ ] Create auto-renewable subscription `com.screel.app.premium.monthly`, add localization/price, and attach it to the version
- [ ] Create AdMob iOS app + rewarded units; replace Google sample IDs before release
- [ ] New binary with additive-only challenge / pot model (no “Blackjack” label in UI)
- [ ] Age ratings: Simulated Gambling = **None**
- [ ] Listing copy matches above
- [ ] Screenshots lead with bank + setup (not casino-looking tables)
- [ ] Review notes updated
- [ ] Resolution Center reply posted
- [ ] Family Controls distribution approved (if Connect / shield is live in the binary)
