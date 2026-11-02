import Link from 'next/link';
import { Camera, CheckCheck, ClipboardCheck, Code2, Flame, MapPinned, Smartphone, Users } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { HeroMap } from '@/components/layout/HeroMap';
import { HomeStats } from '@/components/layout/HomeStats';
import { KNOWN_REPORTED_ESTIMATED } from '@/lib/constants';

const STEPS = [
  { icon: Camera, title: 'People report', body: 'Residents, LGA ambassadors, local governments and operators send photos, places and records. News and public notices are read too.' },
  { icon: ClipboardCheck, title: 'Reviewers check', body: 'Every report goes to a review queue. Duplicates are caught, photos are approved before they are shown, and nothing is called confirmed until someone has checked it.' },
  { icon: MapPinned, title: 'The map shows it', body: 'Sites, hotspots, collection points, rivers, drains, schools and flood zones sit together, with filters and a history slider.' },
  { icon: Code2, title: 'Others can use it', body: 'Researchers, agencies and partners read the same records through a documented API, with the source and method of every figure.' },
];

const AUDIENCES = [
  { icon: Users, title: 'Residents', body: 'See what has been reported near you and add what you see. No account needed.', href: '/report', cta: 'Report waste' },
  { icon: Smartphone, title: 'Ambassadors', body: 'Visit sites, measure and photograph them, even without signal. Records send when you are back online.', href: '/field', cta: 'Open the field app' },
  { icon: Code2, title: 'Partners and researchers', body: 'Download the data, or use the API. Official records can be sent in by authorities and operators.', href: '/developers', cta: 'See the API' },
];

export default function HomePage() {
  return (
    <PageShell wide>
      <section aria-labelledby="hero" className="grid items-center gap-8 py-2 lg:grid-cols-2 lg:gap-12 lg:py-6">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-sm font-semibold text-accent">
            <CheckCheck size={14} aria-hidden="true" /> Rivers State, all 23 local government areas
          </p>
          <h1 id="hero" className="mt-4 text-2xl font-semibold leading-tight tracking-tight text-fg sm:text-3xl lg:text-4xl">
            See where waste is, and how sure we are about it
          </h1>
          <p className="mt-4 max-w-xl text-lg text-fg-muted">
            WasteChainMapper maps where waste is dumped, collected and treated. It keeps what is known, what has been reported and what has only been estimated clearly apart.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/map" className="btn-primary"><MapPinned size={16} aria-hidden="true" />Open the map</Link>
            <Link href="/report" className="btn-secondary"><Camera size={16} aria-hidden="true" />Report waste</Link>
            <Link href="/hotspots" className="btn-ghost"><Flame size={16} aria-hidden="true" />See hotspots</Link>
          </div>
        </div>
        <div className="overflow-hidden rounded-lg bg-panel p-3 shadow-raised"><HeroMap /></div>
      </section>

      <section aria-labelledby="today" className="mt-10">
        <h2 id="today" className="mb-3 text-lg font-semibold text-fg">Where things stand</h2>
        <HomeStats />
      </section>

      <section aria-labelledby="distinctions" className="mt-14">
        <h2 id="distinctions" className="text-xl font-semibold text-fg">Known, reported, estimated</h2>
        <p className="mt-1 max-w-prose text-base text-fg-muted">
          A mapped site does not prove waste is still there. A photo does not give an exact volume. Two things near each other are not proof that one caused the other.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {KNOWN_REPORTED_ESTIMATED.map((k, i) => (
            <div key={k.title} className="rounded-lg bg-panel p-5">
              <span aria-hidden="true" className={`block h-1 w-10 rounded-full ${['bg-tier-high', 'bg-tier-low', 'bg-tier-medium'][i]}`} />
              <h3 className="mt-3 text-lg font-semibold text-fg">{k.title}</h3>
              <p className="mt-1 text-sm text-fg-muted">{k.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="how" className="mt-14">
        <h2 id="how" className="text-xl font-semibold text-fg">How it works</h2>
        <ol className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-lg bg-panel p-5">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent"><s.icon size={20} aria-hidden="true" /></span>
              <h3 className="mt-3 text-base font-semibold text-fg"><span className="text-fg-muted">{i + 1}. </span>{s.title}</h3>
              <p className="mt-1 text-sm text-fg-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="who" className="mt-14">
        <h2 id="who" className="text-xl font-semibold text-fg">Who it is for</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {AUDIENCES.map((a) => (
            <div key={a.title} className="flex flex-col rounded-lg bg-panel p-5">
              <a.icon size={22} className="text-accent" aria-hidden="true" />
              <h3 className="mt-3 text-base font-semibold text-fg">{a.title}</h3>
              <p className="mt-1 flex-1 text-sm text-fg-muted">{a.body}</p>
              <Link href={a.href} className="mt-4 inline-flex min-h-11 items-center font-semibold text-accent hover:text-accent-hover">{a.cta}</Link>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm">
          <Link href="/about" className="font-semibold text-accent hover:text-accent-hover">Read how the data is made and what it cannot tell you</Link>
        </p>
      </section>
    </PageShell>
  );
}
