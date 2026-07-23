"use client";

import { useState, useMemo } from "react";
import { MISTAKE_OPTIONS, EMOTIONS, type Trade, type Account, type Strategy } from "@/lib/types";
import { money, num } from "@/lib/format";

const toLocal = (iso: string | null) =>
  iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000)
        .toISOString().slice(0, 16) : "";

export default function TradeForm({
  action, trade, accounts, strategies, submitLabel = "Save trade",
}: {
  action: (fd: FormData) => void;
  trade?: Trade;
  accounts: Account[];
  strategies: Strategy[];
  submitLabel?: string;
}) {
  const [direction, setDirection] = useState(trade?.direction ?? "long");
  const [entry, setEntry] = useState(trade?.avg_entry?.toString() ?? "");
  const [exit, setExit] = useState(trade?.avg_exit?.toString() ?? "");
  const [stop, setStop] = useState(trade?.stop_loss?.toString() ?? "");
  const [target, setTarget] = useState(trade?.take_profit?.toString() ?? "");
  const [qty, setQty] = useState(trade?.qty?.toString() ?? "");
  const [fees, setFees] = useState(trade?.fees?.toString() ?? "0");

  const calc = useMemo(() => {
    const e = parseFloat(entry), s = parseFloat(stop),
          x = parseFloat(exit),  t = parseFloat(target),
          q = parseFloat(qty),   f = parseFloat(fees) || 0;
    const sign = direction === "long" ? 1 : -1;
    const riskUnit = e && s ? Math.abs(e - s) : null;
    return {
      risk: riskUnit && q ? riskUnit * q : null,
      rr: riskUnit && t ? Math.abs(t - e) / riskUnit : null,
      pnl: e && x && q ? (x - e) * sign * q - f : null,
      r: riskUnit && x ? ((x - e) * sign) / riskUnit : null,
      warn: e && s ? (direction === "long" ? s >= e : s <= e) : false,
    };
  }, [entry, exit, stop, target, qty, fees, direction]);

  return (
    <form action={action} className="space-y-6">
      <section className="card p-5">
        <h2 className="text-sm font-medium mb-4">Position</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Symbol *</label>
            <input name="symbol" required defaultValue={trade?.symbol}
              placeholder="AAPL" className="input font-mono uppercase" />
          </div>
          <div>
            <label className="label">Asset class</label>
            <select name="asset_class" defaultValue={trade?.asset_class ?? "equity"} className="input">
              {["equity", "option", "future", "forex", "crypto"].map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Direction</label>
            <select name="direction" value={direction} className="input"
              onChange={(e) => setDirection(e.target.value as "long" | "short")}>
              <option value="long">long</option>
              <option value="short">short</option>
            </select>
          </div>
          <div>
            <label className="label">Account</label>
            <select name="account_id" defaultValue={trade?.account_id ?? ""} className="input">
              <option value="">—</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Strategy</label>
            <select name="strategy_id" defaultValue={trade?.strategy_id ?? ""} className="input">
              <option value="">—</option>
              {strategies.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Setup</label>
            <input name="setup" defaultValue={trade?.setup ?? ""}
              placeholder="Breakout retest" className="input" />
          </div>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-sm font-medium mb-4">Prices &amp; size</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Quantity *</label>
            <input name="qty" required type="number" step="any" value={qty}
              onChange={(e) => setQty(e.target.value)} className="input font-mono" />
          </div>
          <div>
            <label className="label">Avg entry *</label>
            <input name="avg_entry" required type="number" step="any" value={entry}
              onChange={(e) => setEntry(e.target.value)} className="input font-mono" />
          </div>
          <div>
            <label className="label">Avg exit</label>
            <input name="avg_exit" type="number" step="any" value={exit}
              onChange={(e) => setExit(e.target.value)}
              placeholder="blank = still open" className="input font-mono" />
          </div>
          <div>
            <label className="label">Stop loss</label>
            <input name="stop_loss" type="number" step="any" value={stop}
              onChange={(e) => setStop(e.target.value)} className="input font-mono" />
          </div>
          <div>
            <label className="label">Take profit</label>
            <input name="take_profit" type="number" step="any" value={target}
              onChange={(e) => setTarget(e.target.value)} className="input font-mono" />
          </div>
          <div>
            <label className="label">Fees</label>
            <input name="fees" type="number" step="any" value={fees}
              onChange={(e) => setFees(e.target.value)} className="input font-mono" />
          </div>
          <div>
            <label className="label">Entry time</label>
            <input name="entry_at" type="datetime-local" className="input"
              defaultValue={toLocal(trade?.entry_at ?? new Date().toISOString())} />
          </div>
          <div>
            <label className="label">Exit time</label>
            <input name="exit_at" type="datetime-local" className="input"
              defaultValue={toLocal(trade?.exit_at ?? null)} />
          </div>
        </div>

        {(calc.risk || calc.pnl != null) && (
          <div className="mt-4 pt-4 border-t border-edge grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="label">Risk</div>
              <div className="font-mono">{calc.risk ? money(calc.risk) : "—"}</div>
            </div>
            <div>
              <div className="label">Planned R:R</div>
              <div className="font-mono">{calc.rr ? `${num(calc.rr)}:1` : "—"}</div>
            </div>
            <div>
              <div className="label">Net P&amp;L</div>
              <div className={`font-mono ${calc.pnl == null ? "" : calc.pnl > 0 ? "text-win" : "text-loss"}`}>
                {calc.pnl == null ? "—" : money(calc.pnl)}
              </div>
            </div>
            <div>
              <div className="label">R multiple</div>
              <div className={`font-mono ${calc.r == null ? "" : calc.r > 0 ? "text-win" : "text-loss"}`}>
                {calc.r == null ? "—" : `${calc.r > 0 ? "+" : ""}${num(calc.r)}R`}
              </div>
            </div>
          </div>
        )}
        {calc.warn && (
          <p className="mt-3 text-xs text-loss">
            Stop is on the wrong side of entry for a {direction} trade.
          </p>
        )}
      </section>

      <section className="card p-5">
        <h2 className="text-sm font-medium mb-4">Execution &amp; psychology</h2>
        <div className="grid sm:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="label">Emotion before</label>
            <select name="emotion_pre" defaultValue={trade?.emotion_pre ?? ""} className="input">
              <option value="">—</option>
              {EMOTIONS.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Emotion after</label>
            <select name="emotion_post" defaultValue={trade?.emotion_post ?? ""} className="input">
              <option value="">—</option>
              {EMOTIONS.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Conviction (1–5)</label>
            <select name="conviction" defaultValue={trade?.conviction ?? ""} className="input">
              <option value="">—</option>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        <label className="label">Mistakes</label>
        <div className="flex flex-wrap gap-2 mb-4">
          {MISTAKE_OPTIONS.map((m) => (
            <label key={m}
              className="flex items-center gap-1.5 text-xs border border-edge rounded-md px-2.5 py-1.5 cursor-pointer hover:border-muted">
              <input type="checkbox" name="mistakes" value={m}
                defaultChecked={trade?.mistakes?.includes(m)} className="accent-accent" />
              {m}
            </label>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Tags (comma separated)</label>
            <input name="tags" defaultValue={trade?.tags?.join(", ") ?? ""}
              placeholder="momentum, earnings" className="input" />
          </div>
        </div>

        <div className="mt-4">
          <label className="label">Notes</label>
          <textarea name="notes" rows={4} defaultValue={trade?.notes ?? ""}
            placeholder="What was the thesis? What actually happened?" className="input resize-y" />
        </div>
      </section>

      <div className="flex gap-3">
        <button type="submit" className="btn-primary">{submitLabel}</button>
      </div>
    </form>
  );
}
