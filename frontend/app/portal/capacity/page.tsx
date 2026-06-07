'use client';

import { useEffect, useState } from 'react';

type Firm = {
  firm_id: string;
  firm_name: string;
  capacity_today?: { consult_slots_today?: number; urgent_slots_today?: number; max_new_reviews_per_day?: number };
  attorneys?: Array<{ name: string; focus?: string; slots_today?: string[] }>;
};

function firmInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

export default function CapacityPage() {
  const [firms, setFirms] = useState<Firm[]>([]);
  const [yourFirmId, setYourFirmId] = useState('BayBridge_Auto_Injury');

  useEffect(() => {
    const stored = document.cookie.split('; ').find((c) => c.startsWith('firm_id='))?.split('=')[1];
    if (stored) setYourFirmId(stored);
    fetch('/api/firms').then((r) => r.json()).then(setFirms);
  }, []);

  const yourFirm = firms.find((f) => f.firm_id === yourFirmId);

  return (
    <div className="mx-auto max-w-[1100px] px-10 py-10">
      <div className="text-[11px] font-semibold tracking-[0.18em] text-cf-blue">CAPACITY · TODAY</div>
      <h1 className="mt-2 font-serif text-[44px] leading-tight font-semibold tracking-tight text-cf-ink">Attorney Capacity</h1>
      <p className="mt-3 max-w-[640px] text-[14px] leading-[1.55] text-cf-muted">
        Live consult slots across the network. Caseflow consumes capacity on accept and protects it on referral.
      </p>

      {yourFirm && (
        <div className="mt-8 rounded-2xl bg-white p-6 ring-1 ring-cf-border">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-md bg-cf-blue text-[13px] font-semibold text-white">{firmInitials(yourFirm.firm_name)}</span>
            <div>
              <h3 className="text-[16px] font-semibold text-cf-ink">{yourFirm.firm_name}</h3>
              <p className="text-[12px] text-cf-muted">
                {yourFirm.capacity_today?.consult_slots_today ?? 0} consult ·{' '}
                {yourFirm.capacity_today?.urgent_slots_today ?? 0} urgent ·{' '}
                {yourFirm.capacity_today?.max_new_reviews_per_day ?? 0} max reviews / day
              </p>
            </div>
          </div>
          <div className="my-5 border-t border-cf-border" />
          <div className="text-[11px] font-semibold tracking-[0.14em] text-cf-muted">ATTORNEYS</div>
          <div className="mt-3 space-y-3">
            {(yourFirm.attorneys ?? []).map((a) => (
              <div key={a.name} className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[14px] font-medium text-cf-ink">{a.name}</div>
                  <div className="text-[12px] text-cf-muted">{a.focus}</div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {(a.slots_today && a.slots_today.length > 0)
                    ? a.slots_today.map((s) => (
                        <span key={s} className="rounded-full bg-cf-cream px-2.5 py-1 font-mono text-[12px] text-cf-ink-2 ring-1 ring-cf-border">{s}</span>
                      ))
                    : <span className="text-[12px] text-cf-muted">no slots open</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
