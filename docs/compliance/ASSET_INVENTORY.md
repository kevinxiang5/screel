# Asset & dependency inventory

**Date:** 2026-07-13

## Original / first-party

| Asset | Location | Notes |
|---|---|---|
| Screel UI CSS | `src/index.css` | Original |
| App screens / games | `src/**` | Original |
| Favicon | `public/favicon.svg` | Original “S” mark |
| Brand name Screel | product-wide | Subject to trademark clearance |

## Fonts

| Font | Theme | Source | License |
|---|---|---|---|
| Syne, Outfit | Felt (default) | Google Fonts CDN | SIL OFL |
| Playfair Display, Lora | Editorial | Google Fonts CDN | SIL OFL |
| Fraunces, Nunito | Soft | Google Fonts CDN | SIL OFL |
| DM Sans | Clean | Google Fonts CDN | SIL OFL |

Privacy: CDN requests go to Google — disclosed in Privacy Policy. Prefer self-host for production iOS binary later.

## Icons

| Source | License | Use |
|---|---|---|
| `lucide-react` | ISC | UI icons |

## Removed from ship bundle (Phase 1)

- `public/icons.svg` (Vite social brand sprite)
- `src/assets/vite.svg`, `src/assets/react.svg`
- Slot-machine emoji favicon

## NPM direct dependencies

See `licenses/summary.txt` and `licenses/dependencies.json` (generated via `license-checker`).

Expected: MIT / ISC / Apache-2.0 for app deps. Vite toolchain may include MPL-2.0 `lightningcss` — do not redistribute modified MPL source without compliance.

## Policy

Do not add GPL/AGPL packages without counsel review.
