import { Capacitor } from '@capacitor/core';
import { AdMob, MaxAdContentRating } from '@capacitor-community/admob';
import { NativePurchases, PURCHASE_TYPE } from '@capgo/native-purchases';

export const PREMIUM_PRODUCT_ID =
  import.meta.env.VITE_PREMIUM_PRODUCT_ID || 'com.screel.app.premium.monthly';

const TEST_REWARDED_ID = 'ca-app-pub-3940256099942544/1712485313';
const CHALLENGE_AD_ID = import.meta.env.VITE_ADMOB_CHALLENGE_REWARDED_ID || TEST_REWARDED_ID;
const RESCUE_AD_ID = import.meta.env.VITE_ADMOB_RESCUE_REWARDED_ID || TEST_REWARDED_ID;
const isTestingAds = import.meta.env.DEV || !import.meta.env.VITE_ADMOB_CHALLENGE_REWARDED_ID;

let adsReady = false;

async function ensureAds() {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('Rewarded ads are available in the iPhone app.');
  }
  if (adsReady) return;
  await AdMob.initialize({
    initializeForTesting: isTestingAds,
    tagForChildDirectedTreatment: false,
    tagForUnderAgeOfConsent: false,
    maxAdContentRating: MaxAdContentRating.Teen,
  });
  adsReady = true;
}

export async function showRewardedAd(kind: 'challenge' | 'rescue'): Promise<boolean> {
  await ensureAds();
  await AdMob.prepareRewardVideoAd({
    adId: kind === 'challenge' ? CHALLENGE_AD_ID : RESCUE_AD_ID,
    isTesting: isTestingAds,
    npa: true,
  });
  const reward = await AdMob.showRewardVideoAd();
  return Boolean(reward);
}

export async function purchasePremium(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) throw new Error('Premium is purchased in the iPhone app.');
  const transaction = await NativePurchases.purchaseProduct({
    productIdentifier: PREMIUM_PRODUCT_ID,
    productType: PURCHASE_TYPE.SUBS,
  });
  return transaction.productIdentifier === PREMIUM_PRODUCT_ID && transaction.isActive !== false;
}

export async function getPremiumPrice(): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) return null;
  const { products } = await NativePurchases.getProducts({
    productIdentifiers: [PREMIUM_PRODUCT_ID],
    productType: PURCHASE_TYPE.SUBS,
  });
  return products[0]?.priceString ?? null;
}

export async function restorePremium(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  await NativePurchases.restorePurchases();
  const { purchases } = await NativePurchases.getPurchases({
    productType: PURCHASE_TYPE.SUBS,
    onlyCurrentEntitlements: true,
  });
  return purchases.some(
    (purchase) => purchase.productIdentifier === PREMIUM_PRODUCT_ID && purchase.isActive !== false,
  );
}

export async function checkPremium(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  const { purchases } = await NativePurchases.getPurchases({
    productType: PURCHASE_TYPE.SUBS,
    onlyCurrentEntitlements: true,
  });
  return purchases.some(
    (purchase) => purchase.productIdentifier === PREMIUM_PRODUCT_ID && purchase.isActive !== false,
  );
}

export async function managePremium(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  await NativePurchases.manageSubscriptions();
}
