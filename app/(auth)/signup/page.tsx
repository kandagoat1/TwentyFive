"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Signup() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true); setErr(null);
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { setErr(error.message); setBusy(false); return; }
    if (data.session) { router.push("/journal"); router.refresh(); return; }
    setMsg("Check your email to confirm your account.");
    setBusy(false);
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="card w-full max-w-sm p-8">
        <h1 className="font-mono text-2xl font-bold mb-6">Create account</h1>
        <div className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={email}
              onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()} />
            <p className="text-xs text-muted mt-1">Minimum 6 characters.</p>
          </div>
          {err && <p className="text-loss text-sm">{err}</p>}
          {msg && <p className="text-win text-sm">{msg}</p>}
          <button className="btn-primary w-full" onClick={submit} disabled={busy}>
            {busy ? "Creating…" : "Create account"}
          </button>
          <p className="text-sm text-muted text-center">
            Have one? <Link href="/login" className="text-accent">Sign in</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
