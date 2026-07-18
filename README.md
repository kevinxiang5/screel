# Screel

**Screen-time helper** for iPhone. Set a daily minute budget for apps you choose, optionally link Apple Screen Time, and stake minutes on short focus challenges.

**No real money.** Minutes are not a currency and cannot be cashed out.

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

- **Personalized setup** — name, goal, distractions, suggested budget, Screen Time connect
- **Home** — remaining minutes, streak, daily goals, quick play
- **Play** — press-your-luck challenges (Safe tiles, Timing run, Multiplier wheel, Twenty-one, and more)
- **Bank** — Screen Time link (native) or simulated fallback, daily ceiling, optional PIN, claims
- **Stats** — kept / missed minutes, keep rate, history
- **You** — profile, toggles, Privacy / Terms / How challenges work

Progress saves in `localStorage`.
