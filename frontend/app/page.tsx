import Link from "next/link";

const categories = [
  { icon: "✳", title: "Internships", text: "Find early-career roles that fit what you know now." },
  { icon: "◈", title: "Research", text: "Discover labs, assistant roles, and undergraduate programs." },
  { icon: "✦", title: "Beyond work", text: "Explore scholarships, hackathons, and local opportunities." },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f8fafc]">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 md:px-10">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-base font-bold tracking-tight text-slate-900 sm:gap-3 sm:text-xl" aria-label="OpportunityOS home">
          <span className="grid size-9 place-items-center rounded-xl bg-indigo-600 text-lg text-white">✳</span>
          OpportunityOS
        </Link>
        <nav className="flex items-center gap-4 text-sm font-semibold text-slate-600" aria-label="Primary navigation">
          <a href="#how-it-works" className="hidden hover:text-indigo-600 sm:inline">How it works</a>
          <Link href="/opportunities" className="rounded-full bg-slate-900 px-4 py-2.5 text-xs text-white transition hover:bg-indigo-600 sm:px-5 sm:py-3 sm:text-sm">Explore demo</Link>
        </nav>
      </header>

      <section className="relative overflow-hidden px-6 pb-24 pt-16 md:px-10 md:pt-24">
        <div className="absolute -right-24 top-0 size-[32rem] rounded-full bg-violet-100 blur-3xl" aria-hidden="true" />
        <div className="absolute -left-24 bottom-0 size-[25rem] rounded-full bg-blue-100 blur-3xl" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[.15em] text-indigo-700 shadow-sm"><span className="size-2 rounded-full bg-indigo-500" /> A better way to discover what is next</span>
            <h1 className="mt-8 max-w-2xl text-4xl font-bold leading-[1.08] tracking-[-.055em] text-slate-950 sm:text-5xl md:text-7xl">Your potential is bigger than one job board.</h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-600">Internships, research, scholarships, and more—brought together and matched to your skills, interests, and goals. See why each opportunity fits and what you can do next.</p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link href="/opportunities" className="rounded-full bg-indigo-600 px-7 py-4 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700">Explore the demo <span aria-hidden="true">→</span></Link>
              <a href="#how-it-works" className="rounded-full border border-slate-200 bg-white px-7 py-4 text-sm font-bold text-slate-800 transition hover:border-indigo-300">See how it works</a>
            </div>
            <p className="mt-6 text-xs text-slate-500">Demo listings are examples, not live offers. Match scores show profile compatibility.</p>
          </div>
          <div className="relative mx-auto w-full max-w-[34rem]">
            <div className="absolute -inset-7 rotate-3 rounded-[2.5rem] bg-gradient-to-br from-indigo-200/80 to-sky-100/40" aria-hidden="true" />
            <div className="relative rounded-[2rem] border border-white bg-white/95 p-5 shadow-2xl shadow-slate-300/40 md:p-7">
              <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                <div><p className="text-xs font-bold uppercase tracking-widest text-indigo-600">For you</p><h2 className="mt-1 text-xl font-bold text-slate-900">Your opportunity feed</h2></div>
                <div className="grid size-10 place-items-center rounded-full bg-slate-100 text-slate-700">✦</div>
              </div>
              <article className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5">
                <div className="flex items-start justify-between gap-4"><div><span className="text-xs font-bold uppercase tracking-wide text-indigo-600">Research · Sample</span><h3 className="mt-2 text-lg font-bold text-slate-900">Undergraduate ML Research Assistant</h3><p className="mt-1 text-sm text-slate-500">Example University AI Lab · Hybrid</p></div><span className="shrink-0 rounded-full bg-indigo-600 px-3 py-2 text-sm font-bold text-white">86%</span></div>
                <div className="mt-5 flex flex-wrap gap-2"><span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700">✓ Python</span><span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700">✓ ML interest</span><span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-amber-700">△ PyTorch to learn</span></div>
                <p className="mt-4 text-xs leading-5 text-slate-600">You have relevant programming experience. A small PyTorch project could strengthen your profile.</p>
              </article>
              <div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl border border-slate-100 p-4"><p className="text-xs text-slate-500">Explore</p><p className="mt-1 font-bold">Research roles</p></div><div className="rounded-xl border border-slate-100 p-4"><p className="text-xs text-slate-500">Plan</p><p className="mt-1 font-bold">Your next skill</p></div></div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-t border-slate-100 bg-white px-6 py-24 md:px-10">
        <div className="mx-auto max-w-7xl"><p className="text-xs font-bold uppercase tracking-[.2em] text-indigo-600">More than a search box</p><h2 className="mt-4 max-w-2xl text-3xl font-bold tracking-tight text-slate-950 md:text-5xl">A clearer path from curiosity to action.</h2><div className="mt-12 grid gap-5 md:grid-cols-3">{categories.map((item) => <div key={item.title} className="rounded-3xl border border-slate-100 bg-slate-50 p-8"><span className="grid size-12 place-items-center rounded-2xl bg-indigo-100 text-2xl text-indigo-600">{item.icon}</span><h3 className="mt-7 text-xl font-bold">{item.title}</h3><p className="mt-3 leading-7 text-slate-600">{item.text}</p></div>)}</div></div>
      </section>
      <footer className="border-t border-slate-200 px-6 py-8 text-center text-sm text-slate-500">OpportunityOS · Built for students exploring their next step.</footer>
    </main>
  );
}
