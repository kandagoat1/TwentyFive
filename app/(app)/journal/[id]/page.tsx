import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import TradeForm from "@/components/TradeForm";
import { updateTrade, deleteTrade } from "../actions";
import type { Trade, Account, Strategy } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TradeDetail({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data: trade }, { data: accounts }, { data: strategies }] = await Promise.all([
    supabase.from("trades").select("*").eq("id", params.id).maybeSingle(),
    supabase.from("accounts").select("*").order("name"),
    supabase.from("strategies").select("*").order("name"),
  ]);
  if (!trade) notFound();

  const t = trade as Trade;
  const update = updateTrade.bind(null, t.id);
  const remove = deleteTrade.bind(null, t.id);

  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/journal" className="text-muted hover:text-white text-sm">← Back</Link>
        <h1 className="text-xl font-semibold font-mono">{t.symbol}</h1>
        <form action={remove} className="ml-auto">
          <button className="text-xs text-muted hover:text-loss">Delete trade</button>
        </form>
      </div>
      <TradeForm
        action={update}
        trade={t}
        accounts={(accounts ?? []) as Account[]}
        strategies={(strategies ?? []) as Strategy[]}
        submitLabel="Update trade"
      />
    </>
  );
}
