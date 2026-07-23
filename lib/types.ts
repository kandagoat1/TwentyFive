export type AssetClass = "equity" | "option" | "future" | "forex" | "crypto";
export type Direction = "long" | "short";
export type TradeStatus = "open" | "closed";

export interface Trade {
  id: string;
  user_id: string;
  account_id: string | null;
  strategy_id: string | null;
  symbol: string;
  asset_class: AssetClass;
  direction: Direction;
  status: TradeStatus;
  entry_at: string;
  exit_at: string | null;
  qty: number;
  avg_entry: number;
  avg_exit: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  fees: number;
  setup: string | null;
  mistakes: string[];
  emotion_pre: string | null;
  emotion_post: string | null;
  conviction: number | null;
  notes: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  gross_pnl: number | null;
  net_pnl: number | null;
  risk_per_unit: number | null;
  risk_amount: number | null;
  r_multiple: number | null;
  planned_rr: number | null;
  hold_minutes: number | null;
}

export interface Account {
  id: string; name: string; broker: string | null;
  starting_balance: number; currency: string; is_active: boolean;
}

export interface Strategy {
  id: string; name: string; description: string | null;
}

export interface TradeStats {
  total_trades: number; wins: number; losses: number;
  win_rate: number | null; net_pnl: number | null;
  expectancy: number | null; avg_r: number | null;
  avg_win: number | null; avg_loss: number | null;
  profit_factor: number | null;
  best_trade: number | null; worst_trade: number | null;
}

export const MISTAKE_OPTIONS = [
  "No stop loss", "Moved stop", "Oversized", "FOMO entry",
  "Revenge trade", "Early exit", "Held too long", "Ignored plan",
  "Chased", "Averaged down", "No setup", "Traded news",
] as const;

export const EMOTIONS = [
  "Calm", "Confident", "Anxious", "Fearful",
  "Greedy", "Impatient", "Frustrated", "Euphoric",
] as const;
