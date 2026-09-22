"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getDemoRecommendations } from "@/lib/api";
import type { Recommendation } from "@/lib/types";

const tabs = [
  { label: "For you", value: "ALL" },
  { label: "Internships", value: "INTERNSHIP" },
  { label: "Research", value: "RESEARCH" },
  { label: "Scholarships", value: "SCHOLARSHIP" },
  { label: "Hackathons", value: "HACKATHON" },
];

const prettyType: Record<string, string> = {
  INTERNSHIP: "Internship",
  RESEARCH: "Research",
  SCHOLARSHIP: "Scholarship",
  HACKATHON: "Hackathon",
};

function readableDate(value: string | null): string {
  if (!value) return "No deadline listed";
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function RecommendationCard({ item }: { item: Recommendation }) {
  const { opportunity, match } = item;
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-50 md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-xl font-bold text-indigo-600" aria-hidden="true">✳</div>
          <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[.14em] text-indigo-600">{prettyType[opportunity.opportunity_type] ?? opportunity.opportunity_type} · Demo listing</p><h2 className="mt-2 text-xl font-bold leading-snug text-slate-950"><Link href={`/opportunities/${opportunity.id}`} className="hover:text-indigo-700">{opportunity.title}</Link></h2><p className="mt-1 text-sm text-slate-500">{opportunity.organization} · {opportunity.location ?? "Location not listed"}</p></div>
        </div>
        <div className="rounded-2xl bg-indigo-50 px-4 py-3 text-center"><span className="block text-2xl font-bold text-indigo-700">{match.overall_score}%</span><span className="block text-[10px] font-semibold uppercase tracking-wide text-indigo-600">Profile match</span></div>
      </div>
      <p className="mt-5 line-clamp-2 text-sm leading-6 text-slate-600">{opportunity.description}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {match.matched_skills.slice(0, 3).map((skill) => <span key={skill} className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold capitalize text-emerald-700">✓ {skill}</span>)}
        {match.missing_required_skills.slice(0, 1).map((skill) => <span key={skill} className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold capitalize text-amber-700">△ {skill} to learn</span>)}
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-5"><span className="text-xs text-slate-500">Deadline: {readableDate(opportunity.deadline)}</span><Link href={`/opportunities/${opportunity.id}`} className="text-sm font-bold text-indigo-700 hover:text-indigo-900">View match details →</Link></div>
    </article>
  );
}

export default function OpportunityFeed() {
  const [items, setItems] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("ALL");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let mounted = true;
    getDemoRecommendations()
      .then((results) => { if (mounted) setItems(results); })
      .catch(() => { if (mounted) setError("The demo API is unavailable. Start the backend, apply migrations, and seed demo data."); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const shown = useMemo(() => items.filter(({ opportunity }) => {
    const typeMatches = activeTab === "ALL" || opportunity.opportunity_type === activeTab;
    const text = `${opportunity.title} ${opportunity.organization} ${opportunity.description}`.toLowerCase();
    return typeMatches && text.includes(query.trim().toLowerCase());
  }), [items, activeTab, query]);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 md:px-10"><Link href="/" className="flex items-center gap-3 text-lg font-bold text-slate-950"><span className="grid size-9 place-items-center rounded-xl bg-indigo-600 text-white">✳</span>OpportunityOS</Link><span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">Demo workspace</span></div></header>
      <main className="mx-auto max-w-7xl px-6 py-10 md:px-10">
        <div className="grid gap-9 lg:grid-cols-[15rem_minmax(0,1fr)]">
          <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-5 lg:sticky lg:top-8"><p className="px-3 text-xs font-bold uppercase tracking-[.18em] text-slate-400">Discover</p><nav className="mt-4 grid gap-1" aria-label="Opportunity categories">{tabs.map((tab) => <button key={tab.value} type="button" onClick={() => setActiveTab(tab.value)} aria-current={activeTab === tab.value ? "page" : undefined} className={`rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${activeTab === tab.value ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"}`}>{tab.label}</button>)}</nav><div className="mt-7 rounded-2xl bg-slate-900 p-4 text-white"><p className="text-sm font-bold">Sample student</p><p className="mt-2 text-xs leading-5 text-slate-300">CS sophomore · Python, React, SQL · Interested in AI/ML and research · New York area</p></div></aside>
          <div><div className="flex flex-wrap items-end justify-between gap-6"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-indigo-600">Discover your next step</p><h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-950 md:text-5xl">Opportunities for you</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Explore fictional examples ranked for a sample profile. Scores describe profile compatibility, not hiring odds.</p></div><span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600">{shown.length} results</span></div>
          <label className="mt-8 block"><span className="sr-only">Search demo opportunities</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search titles, organizations, or keywords" className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" /></label>
          {loading ? <div className="mt-7 rounded-3xl border border-slate-200 bg-white p-10 text-sm text-slate-500" role="status">Loading demo opportunities…</div> : error ? <div className="mt-7 rounded-3xl border border-amber-200 bg-amber-50 p-8 text-sm text-amber-900" role="alert">{error}</div> : shown.length === 0 ? <div className="mt-7 rounded-3xl border border-slate-200 bg-white p-10 text-sm text-slate-600">No results in this demo. Try a different category or search term.</div> : <div className="mt-7 grid gap-5">{shown.map((item) => <RecommendationCard key={item.opportunity.id} item={item} />)}</div>}
          </div>
        </div>
      </main>
    </div>
  );
}
