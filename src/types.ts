export type TabId = 'home' | 'play' | 'bank' | 'stats' | 'you';

export type GameId = 'blackjack' | 'roulette' | null;

export type RoundResult = 'win' | 'lose' | 'push' | 'blackjack';

export interface HistoryEntry {
  id: string;
  game: 'blackjack' | 'roulette';
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

export interface ScreelState {
  displayName: string;
  connected: boolean;
  /** `screenTime` = Apple Family Controls; `simulated` = local demo (web / fallback). */
  usageSource: UsageSource;
  ageVerified: boolean;
  baseLimit: number;
  minutesBank: number;
  minutesUsed: number;
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
}
