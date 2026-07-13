# GitHub Pages (Privacy + Terms URLs)

App Store Connect needs public HTTPS links. This repo deploys them via GitHub Actions.

## Live URLs (after first successful deploy)

| Document | URL |
| --- | --- |
| Index | https://kevinxiang5.github.io/screel/ |
| Privacy Policy | https://kevinxiang5.github.io/screel/privacy.html |
| Terms of Use | https://kevinxiang5.github.io/screel/terms.html |

Paste the Privacy URL into **App Store Connect → App Privacy → Privacy Policy URL**.

## One-time enable (required)

1. Open https://github.com/kevinxiang5/screel/settings/pages  
2. Under **Build and deployment → Source**, choose **GitHub Actions**  
3. Push to `main` (or run the **Deploy GitHub Pages** workflow under Actions → Run workflow)  
4. Wait ~1–2 minutes; open the Privacy URL above to confirm it loads

## Source files

- `public/privacy.html` — Privacy Policy  
- `public/terms.html` — Terms of Use  
- `site/index.html` — Legal landing page  
- `.github/workflows/deploy-pages.yml` — deploy pipeline  

Edit the HTML under `public/`, commit to `main`, and Pages updates automatically.
