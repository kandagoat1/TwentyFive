import { createClient } from "@/lib/supabase/server";
import TradeForm from "@/components/TradeForm";
import { createTrade } from "../actions";
import type { Account, Strategy } from "@/lib/types";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function NewTrade() {
  const supabase = createClient();
  const [{ data: accounts }, { data: strategies }] = await Promise.all([
    supabase.from("accounts").select("*").eq("is_active", true).order("name"),
    supabase.from("strategies").select("*").order("name"),
  ]);

  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/journal" className="text-muted hover:text-white text-sm">← Back</Link>
        <h1 className="text-xl font-semibold">Log trade</h1>
      </div>
      <TradeForm
        action={createTrade}
        accounts={(accounts ?? []) as Account[]}
        strategies={(strategies ?? []) as Strategy[]}
      />
    </>
  );
}
