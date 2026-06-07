'use client';

import { useEffect, useState } from 'react';

type Firm = {
  firm_id: string;
  firm_name: string;
  coverage?: string[];
  best_fit?: string[];
  capacity_today?: { consult_slots_today?: number; urgent_slots_today?: number; max_new_reviews_per_day?: number };
};

function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 rounded-2xl bg-white p-7 ring-1 ring-cf-border">
      <div className="text-[11px] font-semibold tracking-[0.14em] text-cf-muted">{eyebrow}</div>
      <h2 className="mt-1 font-serif text-[22px] font-semibold tracking-tight text-cf-ink">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Row({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-cf-border py-3 last:border-0">
      <div>
        <div className="text-[13px] font-medium text-cf-ink">{label}</div>
        {hint && <div className="mt-0.5 text-[12px] text-cf-muted">{hint}</div>}
      </div>
      <div className="text-[13px] text-cf-ink-2">{value}</div>
    </div>
  );
}

function Toggle({ on }: { on: boolean }) {
  return (
    <span className={`inline-flex h-5 w-9 items-center rounded-full px-0.5 ${on ? 'bg-cf-blue' : 'bg-cf-cream-2'}`}>
      <span className={`size-4 rounded-full bg-white shadow-sm transition ${on ? 'translate-x-4' : ''}`} />
    </span>
  );
}

export default function SettingsPage() {
  const [firms, setFirms] = useState<Firm[]>([]);
  const [yourFirmId, setYourFirmId] = useState('BayBridge_Auto_Injury');

  useEffect(() => {
    const stored = document.cookie.split('; ').find((c) => c.startsWith('firm_id='))?.split('=')[1];
    if (stored) setYourFirmId(stored);
    fetch('/api/firms').then((r) => r.json()).then(setFirms);
  }, []);

  const yourFirm = firms.find((f) => f.firm_id === yourFirmId);

  return (
    <div className="mx-auto max-w-[960px] px-10 py-10">
      <div className="text-[11px] font-semibold tracking-[0.18em] text-cf-blue">WORKSPACE · CONFIGURATION</div>
      <h1 className="mt-2 font-serif text-[44px] leading-tight font-semibold tracking-tight text-cf-ink">Settings</h1>
      <p className="mt-3 max-w-[640px] text-[14px] leading-[1.55] text-cf-muted">
        Configure firm intake rules, routing thresholds, and notification preferences. Changes apply to the active firm workspace.
      </p>

      <Section eyebrow="FIRM PROFILE" title="Your firm">
        <Row label="Firm name" value={yourFirm?.firm_name ?? '—'} />
        <Row label="Firm ID" value={<span className="font-mono text-cf-muted">{yourFirm?.firm_id ?? '—'}</span>} />
        <Row label="Coverage area" value={(yourFirm?.coverage ?? []).join(' · ') || '—'} />
        <Row label="Best-fit criteria" value={(yourFirm?.best_fit ?? []).slice(0, 3).join(', ') || '—'} hint="Used by the router to score inbound leads" />
      </Section>

      <Section eyebrow="INTAKE ROUTING" title="Decision thresholds">
        <Row
          label="Auto-accept confidence"
          value={<span className="font-mono">≥ 0.80</span>}
          hint="Above this, the router schedules a consult without manual review"
        />
        <Row
          label="Auto-refer confidence"
          value={<span className="font-mono">≤ 0.45</span>}
          hint="Below this, the router sends to the best-fit partner firm"
        />
        <Row
          label="Urgent escalation window"
          value="2 hours"
          hint="Statute-of-limitations and minor-in-car cases bypass the queue"
        />
        <Row label="Daily review cap" value={<span className="font-mono">{yourFirm?.capacity_today?.max_new_reviews_per_day ?? 5}</span>} />
      </Section>

      <Section eyebrow="GUARDRAILS · TRUEFOUNDRY" title="Safety policy">
        <Row label="No legal advice" value={<Toggle on />} hint="Block case-strength opinions and settlement estimates" />
        <Row label="Minor-in-car escalation" value={<Toggle on />} hint="Route to attorney review when a minor was a passenger" />
        <Row label="Language access" value={<Toggle on />} hint="Enforce bilingual handoff for non-English intake" />
        <Row label="Input + output moderation" value={<Toggle on />} hint="Screen every transcript and referral packet" />
        <Row label="Audit log persistence" value={<span className="text-cf-green">100%</span>} hint="Every routing decision is signed and stored" />
      </Section>

      <Section eyebrow="NOTIFICATIONS" title="Alerts">
        <Row label="New lead in queue" value={<Toggle on />} />
        <Row label="Referral status changed" value={<Toggle on />} />
        <Row label="Capacity reached" value={<Toggle on />} hint="Notify when consult slots hit 0" />
        <Row label="Daily digest email" value={<Toggle on={false} />} />
      </Section>

      <div className="mt-10 flex justify-end gap-3">
        <button className="rounded-xl bg-white px-4 py-2 text-[13px] font-semibold text-cf-ink ring-1 ring-cf-border hover:bg-cf-cream-2">
          Cancel
        </button>
        <button className="rounded-xl bg-cf-blue px-4 py-2 text-[13px] font-semibold text-white hover:bg-cf-blue/90">
          Save changes
        </button>
      </div>
    </div>
  );
}
