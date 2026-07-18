export type TabId = 'home' | 'play' | 'bank' | 'stats' | 'you';

export type GameKind =
  | 'blackjack'
  | 'roulette'
  | 'mines'
  | 'crash'
  | 'slots'
  | 'hilo'
  | 'dice';

export type GameId = GameKind | null;

export type RoundResult = 'win' | 'lose' | 'push' | 'blackjack';

export interface HistoryEntry {
  id: string;
  game: GameKind;
  /** Signed minute result: positive winnings, negative stake loss, or 0 for a push. */
  delta: number;
  result: RoundResult;
  detail: string;
  at: number;
}

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  reward: number;
  claimed: boolean;
}

/** How usage minutes are sourced when Bank is linked. */
export type UsageSource = 'none' | 'simulated' | 'screenTime';

/** Global typeface pairs for the whole app. */
export type FontTheme = 'felt' | 'editorial' | 'soft' | 'clean';

export interface ScreelState {
  schemaVersion: 3;
  displayName: string;
  connected: boolean;
  /** `screenTime` = Apple Family Controls; `simulated` = local demo (web / fallback). */
  usageSource: UsageSource;
  ageVerified: boolean;
  /** User said they are under 18 — locked out. */
  ageBlocked: boolean;
  /** Finished post-age setup (allowance / reset / connect prompt). */
  setupComplete: boolean;
  /** Why the user is here — picked during onboarding, personalizes copy. */
  focusGoal: string | null;
  /** App categories the user said eat their time. */
  distractions: string[];
  fontTheme: FontTheme;
  /** Daily Screel allowance in minutes (30–960). */
  baseLimit: number;
  minutesBank: number;
  minutesUsed: number;
  /** Local wall-clock hour (0–23) when the allowance day rolls. */
  resetHour: number;
  /** Local wall-clock minute (0–59). */
  resetMinute: number;
  /** IANA timezone used for reset math, e.g. America/Los_Angeles. */
  timeZone: string;
  /** Last applied period id — when this changes, bank auto-resets. */
  activePeriodId: string;
  streak: number;
  /** Current consecutive successful banks (resets on a miss). */
  winStreak: number;
  xp: number;
  level: number;
  /** Minutes kept from challenges (lifetime). */
  totalWon: number;
  /** Minutes lost from challenge stakes (lifetime). */
  totalLost: number;
  biggestWin: number;
  gamesPlayed: number;
  history: HistoryEntry[];
  challenges: DailyChallenge[];
  soundOn: boolean;
  riskAlerts: boolean;
  /** Minutes earned from minigames in the current period. */
  minutesEarnedToday: number;
  /** Default minute stake for the next challenge. */
  wagerMinutes: number;
  /** StoreKit entitlement. Refreshed from the store on native startup. */
  isPremium: boolean;
  /** Free-plan challenge quota consumed this period. */
  challengesUsedToday: number;
  /** Rewarded-ad challenge refills claimed this period. */
  challengeAdsUsedToday: number;
  /** Extra challenge starts granted by completed rewarded ads. */
  bonusChallengesToday: number;
  /** Whether the one-per-period +5m rescue has been claimed. */
  minuteRescueUsedToday: boolean;
  /**
   * Optional SHA-256 hash of a 4-digit bank PIN.
   * When set, allowance / reset time / period reset need unlock first.
   */
  bankPinHash: string | null;
}

export const FREE_CHALLENGES_PER_DAY = 20;
export const CHALLENGE_AD_DAILY_CAP = 5;
export const CHALLENGE_AD_REWARD = 2;
export const MINUTE_RESCUE_REWARD = 5;
export const WAGER_MAX = 20;

/** Base minute pot seeds per game (before ladder / multiplier growth). */
export const GAME_REWARDS: Record<GameKind, number> = {
  blackjack: 5,
  roulette: 4,
  mines: 3,
  crash: 3,
  slots: 3,
  hilo: 3,
  dice: 4,
};
