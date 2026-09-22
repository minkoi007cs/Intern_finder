"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const supabase = getSupabaseClient();

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setMessage("");
    const result = mode === "signup"
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (result.error) setMessage(result.error.message);
    else if (result.data.session) router.push("/profile");
    else setMessage("Check your email to confirm your account, then sign in.");
  }

  async function googleSignIn() {
    if (!supabase) return;
    setMessage("");
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/profile` } });
    if (error) setMessage(error.message);
  }

  return <main className="grid min-h-screen place-items-center bg-[#f8fafc] px-6 py-10"><div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-100"><Link href="/" className="text-sm font-bold text-indigo-700">← OpportunityOS</Link><h1 className="mt-7 text-3xl font-bold tracking-tight text-slate-950">{mode === "login" ? "Welcome back" : "Create your account"}</h1><p className="mt-2 text-sm leading-6 text-slate-600">Build a profile to see how opportunities align with your goals.</p>{!supabase ? <p className="mt-7 rounded-2xl bg-amber-50 p-5 text-sm text-amber-900">Sign-in is not configured. Set the public Supabase URL and publishable key in frontend/.env.local.</p> : <><form onSubmit={submit} className="mt-7 space-y-4"><label className="block text-sm font-semibold text-slate-700">Email<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-500" /></label><label className="block text-sm font-semibold text-slate-700">Password<input type="password" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-500" /></label><button type="submit" disabled={busy} className="w-full rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white disabled:opacity-50">{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</button></form><button type="button" onClick={googleSignIn} className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 hover:border-indigo-300">Continue with Google</button>{message && <p className="mt-4 text-sm text-amber-800" role="status">{message}</p>}<button type="button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(""); }} className="mt-6 text-sm font-semibold text-indigo-700">{mode === "login" ? "New here? Create an account" : "Already have an account? Sign in"}</button></>}</div></main>;
}
