"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getDemoRecommendations, getPersonalRecommendations } from "@/lib/api";
import { getSupabaseClient } from "@/lib/auth";
import type { Recommendation } from "@/lib/types";

const tabs = [
  { label: "All opportunities", value: "ALL" },
  { label: "Internships", value: "INTERNSHIP" },
  { label: "Research", value: "RESEARCH" },
  { label: "Scholarships", value: "SCHOLARSHIP" },
  { label: "Hackathons", value: "HACKATHON" },
];

const prettyType: Record<string, string> = {
  INTERNSHIP: "Internship", RESEARCH: "Research", SCHOLARSHIP: "Scholarship", HACKATHON: "Hackathon",
};

function readableDate(value: string | null): string {
  if (!value) return "No deadline listed";
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function RecommendationCard({ item, mode }: { item: Recommendation; mode: "demo" | "personal" }) {
  const { opportunity, match } = item;
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-50 md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-xl font-bold text-indigo-600" aria-hidden="true">✳</div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[.14em] text-indigo-700">{prettyType[opportunity.opportunity_type] ?? opportunity.opportunity_type} · Fictional example</p>
            <h2 className="mt-2 text-xl font-bold leading-snug text-slate-950"><Link href={`/opportunities/${opportunity.id}`} className="rounded hover:text-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600">{opportunity.title}</Link></h2>
            <p className="mt-1 text-sm text-slate-600">{opportunity.organization} · {opportunity.location ?? "Location not listed"}</p>
          </div>
        </div>
        <div className="rounded-2xl bg-indigo-50 px-4 py-3 text-center" aria-label={`${match.overall_score} percent ${mode === "personal" ? "profile" : "sample profile"} compatibility`}><span className="block text-2xl font-bold text-indigo-800">{match.overall_score}%</span><span className="block text-[10px] font-semibold uppercase tracking-wide text-indigo-700">{mode === "personal" ? "Your match" : "Sample match"}</span></div>
      </div>
      <p className="mt-5 line-clamp-2 text-sm leading-6 text-slate-600">{opportunity.description}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {match.matched_skills.slice(0, 3).map((skill) => <span key={skill} className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold capitalize text-emerald-800">✓ {skill}</span>)}
        {match.missing_required_skills.slice(0, 1).map((skill) => <span key={skill} className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold capitalize text-amber-800">△ {skill} to learn</span>)}
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-5"><span className="text-xs text-slate-600">Deadline: {readableDate(opportunity.deadline)}</span><Link href={`/opportunities/${opportunity.id}`} className="rounded text-sm font-bold text-indigo-700 hover:text-indigo-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600">View match details →</Link></div>
    </article>
  );
}

export default function OpportunityFeed() {
  const [items, setItems] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"demo" | "personal">("demo");
  const [signedIn, setSignedIn] = useState(false);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [activeTab, setActiveTab] = useState("ALL");
  const [query, setQuery] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [sort, setSort] = useState<"match" | "deadline">("match");

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const session = await getSupabaseClient()?.auth.getSession();
        const token = session?.data.session?.access_token;
        if (mounted) { setSignedIn(Boolean(token)); setNeedsProfile(false); }
        if (token) {
          const personal = await getPersonalRecommendations(token);
          if (personal) {
            if (mounted) { setItems(personal); setMode("personal"); }
            return;
          }
          if (mounted) setNeedsProfile(true);
        }
        const demo = await getDemoRecommendations();
        if (mounted) { setItems(demo); setMode("demo"); }
      } catch (reason) {
        if (mounted) setError(reason instanceof Error && reason.message.includes("(401)")
          ? "Your session has expired. Sign in again to load your recommendations."
          : "The opportunity API is unavailable. Start the backend, apply migrations, and seed demo data.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void load();
    return () => { mounted = false; };
  }, []);

  const shown = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    const filtered = items.filter(({ opportunity }) => {
      const typeMatches = activeTab === "ALL" || opportunity.opportunity_type === activeTab;
      const text = `${opportunity.title} ${opportunity.organization} ${opportunity.description} ${opportunity.skills.map((skill) => skill.name).join(" ")}`.toLocaleLowerCase();
      return typeMatches && (!remoteOnly || opportunity.remote_type === "REMOTE") && text.includes(needle);
    });
    if (sort === "deadline") filtered.sort((a, b) => (a.opportunity.deadline ?? "9999-12-31").localeCompare(b.opportunity.deadline ?? "9999-12-31") || b.match.overall_score - a.match.overall_score);
    return filtered;
  }, [items, activeTab, query, remoteOnly, sort]);

  function resetFilters() { setActiveTab("ALL"); setQuery(""); setRemoteOnly(false); setSort("match"); }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-5 md:px-10"><Link href="/" className="flex items-center gap-3 text-lg font-bold text-slate-950"><span className="grid size-9 place-items-center rounded-xl bg-indigo-600 text-white">✳</span>OpportunityOS</Link><div className="flex items-center gap-4"><Link href={signedIn ? "/profile" : "/login"} className="rounded text-sm font-bold text-indigo-700 hover:text-indigo-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600">{signedIn ? "My profile" : "Sign in"}</Link><span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900">{mode === "personal" ? "Personalized demo" : "Demo workspace"}</span></div></div></header>
      <main className="mx-auto max-w-7xl px-6 py-10 md:px-10">
        <div className="grid gap-9 lg:grid-cols-[15rem_minmax(0,1fr)]">
          <aside className="hidden h-fit rounded-3xl border border-slate-200 bg-white p-5 lg:sticky lg:top-8 lg:block"><p className="px-3 text-xs font-bold uppercase tracking-[.18em] text-slate-500">Discover</p><nav className="mt-4 grid gap-1" aria-label="Opportunity categories">{tabs.map((tab) => <button key={tab.value} type="button" onClick={() => setActiveTab(tab.value)} aria-pressed={activeTab === tab.value} className={`rounded-xl px-3 py-3 text-left text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 ${activeTab === tab.value ? "bg-indigo-50 text-indigo-800" : "text-slate-600 hover:bg-slate-50"}`}>{tab.label}</button>)}</nav><div className="mt-7 rounded-2xl bg-slate-900 p-4 text-white"><p className="text-sm font-bold">{mode === "personal" ? "Your profile" : "Sample student"}</p><p className="mt-2 text-xs leading-5 text-slate-200">{mode === "personal" ? "Scores use the skills, interests, and preferences you saved." : "CS sophomore · Python, React, SQL · Interested in AI/ML and research · New York area"}</p></div></aside>
          <div><div className="flex flex-wrap items-end justify-between gap-6"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-indigo-700">Discover your next step</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-950 md:text-5xl">Opportunities for you</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{mode === "personal" ? "These fictional examples are ranked for your saved profile." : "Explore fictional examples ranked for a sample profile."} Scores describe profile compatibility, not hiring odds.</p></div><span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700" role="status">{loading ? "Loading…" : `${shown.length} of ${items.length} results`}</span></div>
          <nav className="mt-7 flex gap-2 overflow-x-auto pb-2 lg:hidden" aria-label="Opportunity categories">{tabs.map((tab) => <button key={tab.value} type="button" onClick={() => setActiveTab(tab.value)} aria-pressed={activeTab === tab.value} className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 ${activeTab === tab.value ? "bg-indigo-600 text-white" : "border border-slate-200 bg-white text-slate-700"}`}>{tab.label}</button>)}</nav>
          {needsProfile && <p className="mt-7 rounded-2xl border border-indigo-100 bg-indigo-50 p-5 text-sm text-indigo-900">You are signed in. <Link href="/profile" className="font-bold underline">Create your profile</Link> to replace sample scores with your own.</p>}
          <div className="mt-8 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"><label className="block"><span className="sr-only">Search demo opportunities</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search titles, organizations, descriptions, or skills" className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" /></label><label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700"><input type="checkbox" checked={remoteOnly} onChange={(event) => setRemoteOnly(event.target.checked)} />Remote only</label></div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><label className="text-sm text-slate-600">Sort by <select value={sort} onChange={(event) => setSort(event.target.value as "match" | "deadline")} className="ml-2 rounded-lg border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-800"><option value="match">Best match</option><option value="deadline">Nearest deadline</option></select></label><button type="button" onClick={resetFilters} className="rounded px-2 py-1 text-sm font-semibold text-indigo-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600">Clear filters</button></div>
          {loading ? <div className="mt-7 rounded-3xl border border-slate-200 bg-white p-10 text-sm text-slate-600" role="status">Loading demo opportunities…</div> : error ? <div className="mt-7 rounded-3xl border border-amber-200 bg-amber-50 p-8 text-sm text-amber-900" role="alert">{error}</div> : shown.length === 0 ? <div className="mt-7 rounded-3xl border border-slate-200 bg-white p-10 text-sm text-slate-600">{items.length === 0 ? "The demo catalog is empty. Seed sample opportunities to begin." : "No results match these filters."} <button type="button" onClick={resetFilters} className="font-bold text-indigo-700 underline">Clear filters</button></div> : <div className="mt-7 grid gap-5">{shown.map((item) => <RecommendationCard key={item.opportunity.id} item={item} mode={mode} />)}</div>}
          </div>
        </div>
      </main>
    </div>
  );
}
