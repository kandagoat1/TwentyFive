"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const numOrNull = (v: FormDataEntryValue | null) => {
  if (v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const TradeSchema = z.object({
  symbol: z.string().min(1).max(20).transform((s) => s.toUpperCase().trim()),
  asset_class: z.enum(["equity", "option", "future", "forex", "crypto"]),
  direction: z.enum(["long", "short"]),
  qty: z.number().positive(),
  avg_entry: z.number().positive(),
  avg_exit: z.number().positive().nullable(),
  stop_loss: z.number().positive().nullable(),
  take_profit: z.number().positive().nullable(),
  fees: z.number().min(0),
  entry_at: z.string(),
  exit_at: z.string().nullable(),
  setup: z.string().nullable(),
  notes: z.string().nullable(),
  emotion_pre: z.string().nullable(),
  emotion_post: z.string().nullable(),
  conviction: z.number().int().min(1).max(5).nullable(),
  strategy_id: z.string().uuid().nullable(),
  account_id: z.string().uuid().nullable(),
  mistakes: z.array(z.string()),
  tags: z.array(z.string()),
});

function parse(fd: FormData) {
  const exit = numOrNull(fd.get("avg_exit"));
  const exitAt = (fd.get("exit_at") as string) || null;
  return TradeSchema.parse({
    symbol: fd.get("symbol") as string,
    asset_class: (fd.get("asset_class") as string) || "equity",
    direction: (fd.get("direction") as string) || "long",
    qty: Number(fd.get("qty")),
    avg_entry: Number(fd.get("avg_entry")),
    avg_exit: exit,
    stop_loss: numOrNull(fd.get("stop_loss")),
    take_profit: numOrNull(fd.get("take_profit")),
    fees: numOrNull(fd.get("fees")) ?? 0,
    entry_at: new Date((fd.get("entry_at") as string) || Date.now()).toISOString(),
    exit_at: exit != null ? new Date(exitAt || Date.now()).toISOString() : null,
    setup: (fd.get("setup") as string) || null,
    notes: (fd.get("notes") as string) || null,
    emotion_pre: (fd.get("emotion_pre") as string) || null,
    emotion_post: (fd.get("emotion_post") as string) || null,
    conviction: numOrNull(fd.get("conviction")),
    strategy_id: (fd.get("strategy_id") as string) || null,
    account_id: (fd.get("account_id") as string) || null,
    mistakes: fd.getAll("mistakes").map(String).filter(Boolean),
    tags: ((fd.get("tags") as string) || "")
      .split(",").map((t) => t.trim()).filter(Boolean),
  });
}

export async function createTrade(fd: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const t = parse(fd);
  const { error } = await supabase.from("trades").insert({
    ...t,
    user_id: user.id,
    status: t.avg_exit != null ? "closed" : "open",
  });
  if (error) throw new Error(error.message);

  revalidatePath("/journal");
  redirect("/journal");
}

export async function updateTrade(id: string, fd: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const t = parse(fd);
  const { error } = await supabase
    .from("trades")
    .update({ ...t, status: t.avg_exit != null ? "closed" : "open" })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/journal");
  revalidatePath(`/journal/${id}`);
  redirect(`/journal/${id}`);
}

export async function closeTrade(id: string, fd: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const avg_exit = Number(fd.get("avg_exit"));
  if (!Number.isFinite(avg_exit) || avg_exit <= 0) {
    throw new Error("Valid exit price required");
  }
  const exitRaw = (fd.get("exit_at") as string) || null;

  const { error } = await supabase.from("trades").update({
    avg_exit,
    exit_at: new Date(exitRaw || Date.now()).toISOString(),
    status: "closed",
    emotion_post: (fd.get("emotion_post") as string) || null,
    mistakes: fd.getAll("mistakes").map(String).filter(Boolean),
  }).eq("id", id).eq("user_id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/journal");
  revalidatePath(`/journal/${id}`);
}

export async function deleteTrade(id: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("trades").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw new Error(error.message);

  redirect("/journal");
}
