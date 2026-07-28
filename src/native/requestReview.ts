import { Capacitor } from '@capacitor/core';
import { appStoreWriteReviewDeepLink, appStoreWriteReviewUrl } from '../config/storeLinks';

/**
 * Open the App Store write-review page (not the in-app star sheet).
 * Returns false if the store ID isn't configured or open failed.
 */
export async function requestReviewPrompt(): Promise<boolean> {
  const httpsUrl = appStoreWriteReviewUrl();
  if (!httpsUrl) return false;

  try {
    if (Capacitor.isNativePlatform()) {
      const deep = appStoreWriteReviewDeepLink() ?? httpsUrl;
      window.location.href = deep;
      return true;
    }
    window.open(httpsUrl, '_blank', 'noopener,noreferrer');
    return true;
  } catch {
    return false;
  }
}
