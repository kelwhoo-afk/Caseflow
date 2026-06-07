'use client';

import { useEffect, useState } from 'react';

type Firm = {
  firm_id: string;
  firm_name: string;
  role?: string;
  coverage?: string[];
  best_fit?: string[];
  capacity_today?: { consult_slots_today?: number; urgent_slots_today?: number; max_new_reviews_per_day?: number };
};

function firmInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function CapacityBars({ used, total }: { used: number; total: number }) {
  const cells = [0, 1, 2, 3, 4];
  return (
    <div className="flex gap-1">
      {cells.map((i) => (
        <span
          key={i}
          className={`h-5 w-2.5 rounded-sm ${i < used ? 'bg-cf-green' : 'bg-cf-cream-2'}`}
        />
      ))}
    </div>
  );
}

export default function FirmsPage() {
  const [firms, setFirms] = useState<Firm[]>([]);
  const [yourFirmId, setYourFirmId] = useState('BayBridge_Auto_Injury');

  useEffect(() => {
    const stored = document.cookie.split('; ').find((c) => c.startsWith('firm_id='))?.split('=')[1];
    if (stored) setYourFirmId(stored);
    fetch('/api/firms').then((r) => r.json()).then(setFirms);
  }, []);

  return (
    <div className="mx-auto max-w-[1200px] px-10 py-10">
      <div className="text-[11px] font-semibold tracking-[0.18em] text-cf-blue">REFERRAL NETWORK</div>
      <h1 className="mt-2 font-serif text-[44px] leading-tight font-semibold tracking-tight text-cf-ink">Firm Network</h1>
      <p className="mt-3 max-w-[640px] text-[14px] leading-[1.55] text-cf-muted">
        Partner firms, their best-fit criteria, coverage, and live consult capacity. Caseflow
        routes non-fit leads to the strongest match with open capacity.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
        {firms.map((f) => {
          const isYou = f.firm_id === yourFirmId;
          const slots = f.capacity_today?.consult_slots_today ?? 0;
          const urgent = f.capacity_today?.urgent_slots_today ?? 0;
          const max = f.capacity_today?.max_new_reviews_per_day ?? 5;
          return (
            <div
              key={f.firm_id}
              className={`rounded-2xl bg-white p-6 ${isYou ? 'ring-2 ring-cf-blue' : 'ring-1 ring-cf-border'}`}
            >
              <div className="flex items-start gap-3">
                <span className="grid size-10 flex-none place-items-center rounded-md bg-cf-blue text-[13px] font-semibold text-white">
                  {firmInitials(f.firm_name)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[16px] font-semibold text-cf-ink">{f.firm_name}</h3>
                    {isYou && (
                      <span className="rounded bg-cf-blue-soft px-2 py-0.5 text-[10px] font-semibold tracking-[0.14em] text-cf-blue-ink">YOUR FIRM</span>
                    )}
                  </div>
                  <p className="mt-1 text-[13px] text-cf-muted">{(f.coverage ?? []).join(' · ')}</p>
                </div>
              </div>
              <div className="my-4 border-t border-cf-border" />

              <div className="text-[11px] font-semibold tracking-[0.14em] text-cf-muted">BEST FIT</div>
              <p className="mt-1.5 text-[14px] text-cf-ink-2">{(f.best_fit ?? []).slice(0, 4).join(', ')}</p>

              <div className="mt-5 flex items-center justify-between">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-mono text-[20px] font-semibold text-cf-green">{slots > 0 ? slots : urgent}</span>
                  <span className="text-[13px] text-cf-muted">
                    {slots > 0 ? 'consult slots today' : urgent > 0 ? 'urgent slot today' : 'review slots today'}
                  </span>
                </div>
                <CapacityBars used={Math.min(5, slots + urgent)} total={max} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-10 rounded-2xl bg-white p-7 ring-1 ring-cf-border">
        <div className="text-[11px] font-semibold tracking-[0.14em] text-cf-muted">HOW CAPACITY IS CONSUMED</div>
        <p className="mt-2 text-[14px] leading-[1.55] text-cf-ink-2">
          Each <span className="font-medium">accept</span> reduces a firm’s consult slots for the day. Each
          <span className="font-medium"> referral</span> opens a tracking record but keeps the receiving firm’s
          capacity intact until they confirm. Caseflow re-routes when no partner has open capacity.
        </p>
      </div>
    </div>
  );
}
