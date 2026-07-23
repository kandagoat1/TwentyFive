import { createClient } from "@/lib/supabase/server";
import { EquityCurve, RDistribution, MistakeCost, BySlice } from "@/components/Analytics";
import { money, pct, num, rDisplay, pnlColor } from "@/lib/format";
import type { Trade, TradeStats } from "@/lib/types";

export const dynamic = "force-dynamic";

function Stat({ label, value, cls = "" }: { label: string; value: string; cls?: string }) {
  return (
    <div className="card p-4">
      <div className="label mb-2">{label}</div>
      <div className={`stat-value ${cls}`}>{value}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <h2 className="text-sm font-medium mb-4">{title}</h2>
      {children}
    </div>
  );
}

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function AnalyticsPage() {
  const supabase = createClient();
  const [{ data: trades }, { data: stats }, { data: accounts }] = await Promise.all([
    supabase.from("trades").select("*").order("entry_at", { ascending: true }).limit(2000),
    supabase.from("trade_stats").select("*").maybeSingle(),
    supabase.from("accounts").select("starting_balance"),
  ]);

  const rows = (trades ?? []) as Trade[];
  const s = (stats ?? null) as TradeStats | null;
  const starting = (accounts ?? []).reduce(
    (sum, a: any) => sum + Number(a.starting_balance ?? 0), 0);

  return (
    <>
      <h1 className="text-xl font-semibold mb-6">Analytics</h1>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
        <Stat label="Net P&L" value={money(s?.net_pnl ?? 0)} cls={pnlColor(s?.net_pnl)} />
        <Stat label="Expectancy" value={money(s?.expectancy)} cls={pnlColor(s?.expectancy)} />
        <Stat label="Avg R" value={rDisplay(s?.avg_r)} cls={pnlColor(s?.avg_r)} />
        <Stat label="Win rate" value={pct(s?.win_rate)} />
        <Stat label="Profit factor" value={num(s?.profit_factor)} />
        <Stat label="Trades" value={String(s?.total_trades ?? 0)} />
      </div>

      <div className="space-y-4">
        <Panel title="Equity curve">
          <EquityCurve trades={rows} starting={starting} />
        </Panel>

        <div className="grid lg:grid-cols-2 gap-4">
          <Panel title="R-multiple distribution">
            <RDistribution trades={rows} />
          </Panel>
          <Panel title="What your mistakes cost">
            <MistakeCost trades={rows} />
          </Panel>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <Panel title="By symbol">
            <BySlice trades={rows} title="Symbol" keyFn={(t) => t.symbol} />
          </Panel>
          <Panel title="By setup">
            <BySlice trades={rows} title="Setup" keyFn={(t) => t.setup} />
          </Panel>
          <Panel title="By day of week">
            <BySlice trades={rows} title="Day"
              keyFn={(t) => DOW[new Date(t.entry_at).getDay()]} />
          </Panel>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <Panel title="By emotion before entry">
            <BySlice trades={rows} title="Emotion" keyFn={(t) => t.emotion_pre} />
          </Panel>
          <Panel title="By conviction">
            <BySlice trades={rows} title="Conviction"
              keyFn={(t) => (t.conviction ? `${t.conviction}/5` : null)} />
          </Panel>
        </div>
      </div>
    </>
  );
}
