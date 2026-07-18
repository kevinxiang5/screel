# Premium and rewarded-ad release setup

The repository uses Apple StoreKit through `@capgo/native-purchases` and Google Mobile Ads through `@capacitor-community/admob`. Web preview buttons intentionally report that purchases and ads require the iPhone app.

## 1. App Store Connect

1. Create a subscription group named **Screel Premium**.
2. Add an auto-renewable monthly product with ID `com.screel.app.premium.monthly`.
3. Add localization, price, review screenshot, and subscription review notes.
4. Add the subscription to the app version before review.
5. Keep the standard Apple purchase sheet as the source of the localized price.

## 2. AdMob

1. Create an iOS app for bundle ID `com.screel.app`.
2. Create two Rewarded ad units: **Challenge Refill** and **Minute Rescue**.
3. Copy `.env.example` to `.env.local` and replace both rewarded unit IDs.
4. In `ios/App/App/Info.plist`, replace Google’s sample `GADApplicationIdentifier` with Screel’s AdMob **App ID** (the value containing `~`, not an ad-unit ID).
5. Run `npm run build:ios`, then test both rewards on a real device.

The code requests non-personalized ads and does not request ATT. Do not reward a user until `showRewardVideoAd()` returns a reward.

## 3. App Store disclosures

- Age Rating → Advertising: **Yes**
- In-App Purchases: attach the Premium subscription
- Update App Privacy for the current Google Mobile Ads SDK disclosure
- Review notes must explain: Normal has 20 starts/day, up to five voluntary +2-start ads, one +5m rescue ad, and Premium removes ads/start limits without changing odds or minute rewards

Do not submit with Google’s sample App ID or test ad-unit IDs.
