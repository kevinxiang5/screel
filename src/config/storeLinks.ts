/**
 * Numeric Apple ID from App Store Connect → App → App Information.
 * Used to deep-link into the App Store write-review page.
 */
export const APPLE_APP_STORE_ID = '6790989391';

export function appStoreWriteReviewUrl(): string | null {
  const id = APPLE_APP_STORE_ID.trim();
  if (!id) return null;
  return `https://apps.apple.com/app/id${id}?action=write-review`;
}

/** Opens the App Store app directly on iOS when possible. */
export function appStoreWriteReviewDeepLink(): string | null {
  const id = APPLE_APP_STORE_ID.trim();
  if (!id) return null;
  return `itms-apps://itunes.apple.com/app/id${id}?action=write-review`;
}
