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
  wager: number;
  payout: number;
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
  displayName: string;
  connected: boolean;
  /** `screenTime` = Apple Family Controls; `simulated` = local demo (web / fallback). */
  usageSource: UsageSource;
  ageVerified: boolean;
  /** User said they are under 18 — locked out. */
  ageBlocked: boolean;
  /** Finished post-age setup (allowance / reset / connect prompt). */
  setupComplete: boolean;
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
  xp: number;
  level: number;
  totalWon: number;
  totalLost: number;
  biggestWin: number;
  gamesPlayed: number;
  history: HistoryEntry[];
  challenges: DailyChallenge[];
  soundOn: boolean;
  riskAlerts: boolean;
  /** Rewarded-ad minute rescues used in the current period (daily cap). */
  adRescuesUsed: number;
}

/** Rewarded-ad rescue economy. */
export const AD_RESCUE_MINUTES = 5;
export const AD_RESCUE_DAILY_CAP = 3;
