import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader, PageShell } from '@/components/layout/PageShell';
import { BASIS_INFO, KNOWN_REPORTED_ESTIMATED, PROXIMITY_NOTICE, WASTE_CATEGORY_INFO, WASTE_CATEGORY_ORDER } from '@/lib/constants';
import { Badge } from '@/components/ui/Badge';

export const metadata: Metadata = {
  title: 'How the data works',
  description: 'Where the records come from, how they are checked, how estimates are made, and what the platform cannot tell you.',
};

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="mt-10">
      <h2 id={id} className="text-xl font-semibold text-fg">{title}</h2>
      <div className="mt-3 space-y-3 text-base text-fg-muted">{children}</div>
    </section>
  );
}

export default function AboutPage() {
  return (
    <PageShell>
      <div className="max-w-3xl">
        <PageHeader title="How the data works" description="What you are looking at on the map, where it came from, and what it cannot tell you." />

        <Section id="three" title="Known, reported and estimated">
          <ul className="space-y-3">
            {KNOWN_REPORTED_ESTIMATED.map((k) => (
              <li key={k.title}><span className="font-semibold text-fg">{k.title}.</span> {k.body}</li>
            ))}
          </ul>
        </Section>

        <Section id="sources" title="Where records come from">
          <p>
            Reports come from the public form, an email inbox, field ambassadors, local governments and operators, news stories and public notices, and public
            posts where a platform allows it. Open data comes from OpenStreetMap (places, rivers, drains, schools and health facilities) and the Water Point Data Exchange.
          </p>
          <p>
            Anything found online is a reported observation. It is never promoted to a confirmed site automatically. Each source is listed with the terms it allows, and
            the platform does not depend on scraping social networks. Email and the web form always work.
          </p>
        </Section>

        <Section id="checking" title="How a record is checked">
          <ol className="list-decimal space-y-2 pl-5">
            <li>The report arrives with its time, place, photos and the channel it came by. The original photos are kept unchanged.</li>
            <li>The system looks for duplicates: the same place within about 60 metres, or the same photo sent twice.</li>
            <li>A reviewer checks the source, the photos and the position, and marks it corroborated, field-verified or rejected. Each decision is logged with who made it.</li>
            <li>Photos stay private until a reviewer approves them. Photos that show people are held back.</li>
          </ol>
          <p>
            <span className="font-semibold text-fg">Corroborated</span> means a reviewer checked the source and the place. <span className="font-semibold text-fg">Field-verified</span> means someone visited, or has first-hand evidence.
          </p>
        </Section>

        <Section id="estimates" title="How estimates are made">
          <p>Every estimate carries the kind of figure it is, how it was made, how sure the person or tool was, and when.</p>
          <ul className="space-y-2">
            {(Object.keys(BASIS_INFO) as (keyof typeof BASIS_INFO)[]).map((b) => (
              <li key={b} className="flex flex-wrap items-center gap-2">
                <Badge tone={BASIS_INFO[b].tone}>{BASIS_INFO[b].label}</Badge>
                <span>{BASIS_INFO[b].description}.</span>
              </li>
            ))}
          </ul>
          <p>Known limits:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Volume from length, width and height treats a pile as a box, or as half a box for a heap. Real piles are uneven.</li>
            <li>Weight is volume multiplied by an assumed density for the kind of waste. It is always low confidence, and it is not worked out at all for hazardous waste or an unknown mix.</li>
            <li>A breakdown by kind is called full only when it adds up to 100 percent. Otherwise it is partial or unknown.</li>
            <li>Moisture judged by eye is experimental and low confidence unless it was measured.</li>
            <li>Suggestions of the kind of waste from a description use keyword rules. They are suggestions for a reviewer, not classifications. Photo recognition is not switched on.</li>
          </ul>
        </Section>

        <Section id="categories" title="Kinds of waste">
          <dl className="space-y-2">
            {WASTE_CATEGORY_ORDER.map((c) => (
              <div key={c}><dt className="inline font-semibold text-fg">{WASTE_CATEGORY_INFO[c].label}. </dt><dd className="inline">{WASTE_CATEGORY_INFO[c].examples}.</dd></div>
            ))}
          </dl>
          <p>Hazardous and medical waste is kept separate. Its photos are not made public, and it never gets a weight estimate.</p>
        </Section>

        <Section id="tracking" title="Mapping waste and tracking it are different">
          <p>
            Most records say waste was seen at a place and time. A journey from generation to collection, transport, sorting, treatment and final disposal is shown only where
            an operator, a field team or a sensor supplied evidence for each step. Where there is none, you see the last place the waste was recorded. Nothing here is live tracking.
          </p>
        </Section>

        <Section id="patterns" title="Patterns are not causes">
          <p>{PROXIMITY_NOTICE}</p>
          <p>Health data, where it is added, will be shown only in groups large enough that no person can be identified.</p>
        </Section>

        <Section id="privacy" title="Privacy">
          <ul className="list-disc space-y-1 pl-5">
            <li>Names, phone numbers and email addresses given with a report are seen only by reviewers. Phone numbers and emails typed into a description are removed from public text.</li>
            <li>Photos are shrunk on the sender&apos;s phone, which also removes hidden camera data such as location.</li>
            <li>Everyone who reports agrees to the use of their report. Reviewers check that agreement before photos are published.</li>
            <li>Every change made by staff is written to an audit log.</li>
          </ul>
        </Section>

        <Section id="partners" title="Who can contribute">
          <p>
            Rivers State Government and environment agencies, the 23 local governments, collection and recycling operators, universities, community organisations, technology and geospatial
            groups, public health and drainage bodies, and funders. Data is shared under agreements that set what may be used, how often it is updated, who owns it, and how it is credited.
          </p>
          <p>
            Partners can <Link href="/developers" className="font-semibold text-accent hover:text-accent-hover">use the API</Link> and send official records. Ambassadors work in the field app.
          </p>
        </Section>
      </div>
    </PageShell>
  );
}
