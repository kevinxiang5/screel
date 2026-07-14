# Screel

Play with your **minute bank**. Set a daily ceiling, then play **Blackjack** or **Roulette** to win or lose fictional minutes.

**No real-money gambling.** Minutes cannot be cashed out.

## Compliance note

This repository includes App Store / legal hardening docs under [`docs/compliance/`](docs/compliance/). On a physical iPhone, Bank → Connect uses Apple Family Controls / Device Activity / Managed Settings; web and Simulator stay simulated. See [`docs/compliance/FAMILY_CONTROLS.md`](docs/compliance/FAMILY_CONTROLS.md).

## Run

```bash
cd screel
npm install
npm run dev
```

Open the local URL Vite prints (usually `http://localhost:5173`).

## What’s inside

- **Age gate** (18+ pending counsel confirmation)
- **Loading screen** → Home with bank, challenges, quick play
- **Play** — Blackjack + Roulette (minute wagers)
- **Bank** — Screen Time link (native) or simulated fallback, daily ceiling, claims, reset day
- **Stats** — net minutes, win rate, history
- **You** — profile, toggles, Privacy / Terms / Odds / Responsible play

Progress saves in `localStorage`.
