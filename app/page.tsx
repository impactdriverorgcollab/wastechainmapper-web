import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { HomeStats } from '@/components/layout/HomeStats';
import { AtlasPlate } from '@/components/home/AtlasPlate';
import { KNOWN_REPORTED_ESTIMATED } from '@/lib/constants';

// A real sequence, so it is numbered.
const STEPS = [
  { title: 'Someone reports it', body: 'A resident, an LGA ambassador, a local government or an operator sends a photo, a place or a record. News and public notices are read as well.' },
  { title: 'A reviewer checks it', body: 'Duplicates are caught and photos stay private until approved. Nothing is called confirmed until someone has checked the source or visited.' },
  { title: 'It goes on the map', body: 'With its status, its evidence and the date it was last seen, beside rivers, drains, schools and flood zones.' },
  { title: 'Anyone can use it', body: 'Agencies, researchers and partners read the same records through the API, with the source and method of every figure.' },
];

const USES = [
  { who: 'Residents', what: 'See what has been reported near you and add what you see. No account needed.', href: '/report', cta: 'Report waste' },
  { who: 'LGA ambassadors', what: 'Visit sites, measure and photograph them, even without signal. Records send when you are back online.', href: '/field', cta: 'Open the field app' },
  { who: 'Agencies, partners and researchers', what: 'Download the data, use the API, or send in official records.', href: '/developers', cta: 'Read the API guide' },
];

function SectionTitle({ id, children, intro }: { id: string; children: React.ReactNode; intro?: string }) {
  return (
    <div className="mb-6 max-w-2xl">
      <h2 id={id} className="text-xl font-semibold text-fg">{children}</h2>
      {intro && <p className="mt-2 text-base text-fg-muted">{intro}</p>}
    </div>
  );
}

export default function HomePage() {
  return (
    <PageShell wide>
      <section aria-labelledby="hero" className="grid gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-6 lg:pt-10">
          <p className="font-mono text-xs uppercase tracking-widest text-fg-muted">Waste atlas of Rivers State</p>
          <h1 id="hero" className="mt-4 text-2xl font-semibold text-fg sm:text-3xl">
            Where waste is in Rivers State, and how sure we are about it
          </h1>
          <p className="mt-5 max-w-xl text-lg text-fg-muted">
            Dump sites, collection points and the waste moving between them, across all 23 local government areas. Every record says whether it has been checked, and every figure says how it was made.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/map" className="btn-primary">Open the map</Link>
            <Link href="/report" className="btn-secondary">Report waste</Link>
          </div>
          <div className="mt-12 border-t border-line pt-6">
            <HomeStats />
          </div>
        </div>
        <div className="lg:col-span-6">
          <AtlasPlate />
        </div>
      </section>

      <section aria-labelledby="distinctions" className="mt-20 border-t border-line pt-10">
        <SectionTitle id="distinctions" intro="A mapped site does not prove waste is still there. A photo does not give an exact volume. Two things near each other are not proof that one caused the other.">
          Three kinds of statement, kept apart
        </SectionTitle>
        <dl className="grid gap-8 md:grid-cols-3">
          {KNOWN_REPORTED_ESTIMATED.map((k) => (
            <div key={k.title}>
              <dt className="text-base font-semibold text-fg">{k.title}</dt>
              <dd className="mt-2 text-base text-fg-muted">{k.body}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="how" className="mt-20 border-t border-line pt-10">
        <SectionTitle id="how">From a report to the map</SectionTitle>
        <ol className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="border-t-2 border-fg pt-4">
              <p className="font-mono text-sm text-fg-subtle">Step {i + 1}</p>
              <h3 className="mt-1 text-base font-semibold text-fg">{s.title}</h3>
              <p className="mt-2 text-sm text-fg-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="use" className="mt-20 border-t border-line pt-10">
        <SectionTitle id="use">Using the atlas</SectionTitle>
        <ul className="divide-y divide-line border-y border-line">
          {USES.map((u) => (
            <li key={u.who} className="grid gap-2 py-5 md:grid-cols-12 md:items-center md:gap-6">
              <h3 className="text-base font-semibold text-fg md:col-span-3">{u.who}</h3>
              <p className="text-base text-fg-muted md:col-span-6">{u.what}</p>
              <Link href={u.href} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-accent hover:text-accent-hover md:col-span-3 md:justify-end">
                {u.cta} <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm">
          <Link href="/about" className="inline-flex min-h-11 items-center gap-1 font-semibold text-accent hover:text-accent-hover">
            How the data is made, and what it cannot tell you <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </p>
      </section>
    </PageShell>
  );
}
