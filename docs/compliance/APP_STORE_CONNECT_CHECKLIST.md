# App Store Connect checklist (US only)

**Gate:** Counsel memo + verification matrix green before Submit for Review.

## App record

- [ ] Name: Screel
- [ ] Bundle ID: `com.screel.app`
- [ ] SKU: screel-ios-001
- [ ] Primary language: English (U.S.)
- [ ] Availability: **United States only**

## Category

- [ ] Prefer **Lifestyle** primary + **Games** secondary — or Games / Casino if counsel prefers (more scrutiny)
- [ ] Not Made for Kids

## Age rating questionnaire

- [ ] Simulated Gambling = **Frequent**
- [ ] Override higher if counsel requires 18+
- [ ] Confirm Brazil / Korea / Australia fields; keep app unavailable outside US for v1

## URLs

- [ ] Privacy Policy URL → host `privacy.html` (e.g. GitHub Pages / your domain)
- [ ] Support URL / marketing URL
- [ ] Terms linked in-app (You → Terms) and preferably public `terms.html`

## Privacy nutrition labels (current web/sim build)

- [ ] Data collected: Product Interaction (game history) — on device; not linked to identity if true
- [ ] Declare Google Fonts if still used (optional diagnostics N/A)
- [ ] When Device Activity ships: update labels + purpose strings before that version

## Pricing

- [ ] Free or paid up-front
- [ ] No IAP that sells redeemable minute currency

## Listing copy (must match product)

Suggested subtitle: `Simulated minutes. No real money.`

Description must say:
- Simulated blackjack/roulette
- Minutes have no cash value
- Not affiliated with Apple
- Age-restricted

## Screenshots

- [ ] No forged Apple Settings / Screen Time UI
- [ ] Show age gate or disclosure once
- [ ] Show odds / no-real-money disclosure

## Review notes

```
Screel uses fictional “minutes” as chips. No deposits, withdrawals, or cash prizes.
Usage linking is simulated in this build (or: uses Family Controls after approval — describe).
Territory: United States only.
No demo account — all data local.
```

## Export compliance

- [ ] Standard HTTPS only → usual encryption questions
