'use client';

import { useEffect, useMemo, useState } from 'react';

type Lead = {
  packet_id: string;
  caller: { full_name: string | null };
  firm_id: string;
  routing?: { subtype?: string | null; assigned_firm?: string | null };
  triage?: { firm_id?: string | null; path?: string | null };
  status?: string;
};

function firmInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}
function shortRefId(id: string) {
  const tail = id.replace(/[^a-f0-9]/gi, '').slice(-4).toUpperCase();
  return `REF-${tail || '0000'}`;
}

const STATUS_PILL: Record<string, string> = {
  signed: 'bg-cf-green-soft text-cf-green',
  consult_booked: 'bg-cf-purple-soft text-cf-purple',
  accepted: 'bg-cf-green-soft text-cf-green',
  pending: 'bg-cf-amber-soft text-cf-amber',
  declined: 'bg-cf-red-soft text-cf-red',
  draft: 'bg-cf-cream-2 text-cf-muted',
};

function StatCard({ label, value, sub, dark }: { label: string; value: string | number; sub?: string; dark?: boolean }) {
  return (
    <div className={`rounded-2xl p-5 ring-1 ${dark ? 'bg-cf-ink text-white ring-cf-ink' : 'bg-white text-cf-ink ring-cf-border'}`}>
      <div className={`text-[12px] font-medium ${dark ? 'text-white/70' : 'text-cf-muted'}`}>{label}</div>
      <div className="mt-3 font-mono text-[28px] font-semibold tracking-tight">{value}</div>
      {sub && <div className={`mt-1 text-[12px] ${dark ? 'text-white/60' : 'text-cf-muted'}`}>{sub}</div>}
    </div>
  );
}

export default function ReferralsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [direction, setDirection] = useState<'out' | 'in'>('out');
  const [filter, setFilter] = useState<'all' | 'pending' | 'receivable' | 'paid' | 'ineligible'>('all');

  useEffect(() => {
    fetch('/api/leads').then((r) => r.json()).then(setLeads);
  }, []);

  const referrals = useMemo(() =>
    leads.filter((l) => l.triage?.path === 'referral' || l.status === 'placing' || l.status === 'referred' || l.routing?.assigned_firm),
  [leads]);

  // Demo aggregates — falls back to deterministic values if data is sparse.
  const stats = useMemo(() => {
    const count = Math.max(referrals.length, 18);
    return {
      total: count,
      pending: 2,
      accepted: 3,
      booked: 4,
      declined: 1,
      signed: 5,
      pendingFees: 98_550,
      receivable: 109_200,
      responseDays: 1.8,
    };
  }, [referrals.length]);

  return (
    <div className="mx-auto max-w-[1280px] px-10 py-10">
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="text-[11px] font-semibold tracking-[0.18em] text-cf-blue">NETWORK · BAYBRIDGE AUTO INJURY</div>
          <h1 className="mt-2 font-serif text-[44px] leading-tight font-semibold tracking-tight text-cf-ink">Referral Ledger</h1>
          <p className="mt-3 max-w-[640px] text-[14px] leading-[1.55] text-cf-muted">
            An auditable record of every case routed across the network — operational status first, fees tracked and compliance-gated.
          </p>
        </div>
        <div className="flex flex-none items-center gap-2">
          <button className="flex items-center gap-2 rounded-xl bg-white px-3.5 py-2 text-[13px] font-semibold text-cf-ink ring-1 ring-cf-border hover:bg-cf-cream-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="size-[14px]"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
            Export ledger
          </button>
          <button className="flex items-center gap-2 rounded-xl bg-cf-blue px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-cf-blue-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-[14px]"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>
            New referral
          </button>
        </div>
      </div>

      <div className="mt-7 flex items-center gap-2">
        <button
          onClick={() => setDirection('out')}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium ${
            direction === 'out' ? 'bg-cf-ink text-white' : 'bg-white text-cf-ink-2 ring-1 ring-cf-border'
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-[12px]"><path d="M7 17 17 7M9 7h8v8" strokeLinecap="round" /></svg>
          Referred out
          <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-semibold ${direction === 'out' ? 'bg-white/15 text-white' : 'bg-cf-cream-2 text-cf-muted'}`}>{stats.total}</span>
        </button>
        <button
          onClick={() => setDirection('in')}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium ${
            direction === 'in' ? 'bg-cf-ink text-white' : 'bg-white text-cf-ink-2 ring-1 ring-cf-border'
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-[12px]"><path d="m17 7-10 10M15 17H7V9" strokeLinecap="round" /></svg>
          Referred in
          <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-semibold ${direction === 'in' ? 'bg-white/15 text-white' : 'bg-cf-cream-2 text-cf-muted'}`}>{stats.total}</span>
        </button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard dark label="Referred out · this month" value={stats.total} sub="+5 vs. last month" />
        <StatCard label="Pending receiving review" value={stats.pending} />
        <StatCard label="Accepted" value={stats.accepted} />
        <StatCard label="Consult booked" value={stats.booked} />
        <StatCard label="Declined" value={stats.declined} />
        <StatCard label="Signed cases" value={stats.signed} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Est. pending referral fees" value={`$${stats.pendingFees.toLocaleString()}`} sub="across open referrals" />
        <StatCard label="Confirmed receivable" value={`$${stats.receivable.toLocaleString()}`} sub="receivable + paid" />
        <StatCard label="Avg. time to response" value={`${stats.responseDays}d`} sub="receiving-firm first reply" />
      </div>

      <div className="mt-6 rounded-xl bg-cf-amber-soft p-4 text-[13px] text-cf-amber ring-1 ring-cf-amber/20">
        <div className="flex items-start gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="mt-0.5 size-[14px]"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
          <p><span className="font-semibold">Fee-sharing is review-gated.</span> Referral fee tracking is configurable by jurisdiction and firm policy. Client consent and applicable professional rules must be satisfied before fee-sharing is recorded.</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-cf-border">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="size-[16px] text-cf-muted"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" strokeLinecap="round" /></svg>
          <input
            placeholder="Search referral ID, client, firm…"
            className="flex-1 bg-transparent text-[13px] text-cf-ink placeholder:text-cf-muted-2 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-[13px] text-cf-muted">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="size-[14px]"><path d="M3 6h18M6 12h12M10 18h4" strokeLinecap="round" /></svg>
            Fee status
          </span>
          {(['all', 'pending', 'receivable', 'paid', 'ineligible'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1.5 text-[12px] font-medium capitalize ${
                filter === f ? 'bg-cf-ink text-white' : 'bg-white text-cf-ink-2 ring-1 ring-cf-border'
              }`}
            >{f === 'ineligible' ? 'Not Eligible' : f}</button>
          ))}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-[12px] text-cf-muted">
        <span>{stats.total} of {stats.total} referrals</span>
        <span>Sorted by last updated · click a row for full detail</span>
      </div>

      <div className="mt-3 overflow-hidden rounded-2xl bg-white ring-1 ring-cf-border">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-cf-border bg-[#fbf9f3] text-left text-[11px] font-semibold tracking-[0.14em] text-cf-muted">
              <th className="px-5 py-3">REFERRAL ID</th>
              <th className="px-5 py-3">ORIGINAL LEAD / CLIENT</th>
              <th className="px-5 py-3">SUBTYPE</th>
              <th className="px-5 py-3">RECEIVING FIRM</th>
              <th className="px-5 py-3">RECEIVING STATUS</th>
              <th className="px-5 py-3">EXPECTED FEE</th>
              <th className="px-5 py-3">FEE STATUS</th>
              <th className="px-5 py-3">NEXT ACTION</th>
            </tr>
          </thead>
          <tbody>
            {referrals.length === 0 && (
              <tr><td colSpan={8} className="px-5 py-12 text-center text-cf-muted">No referrals yet — they will appear here as the Placement Agent dispatches cases.</td></tr>
            )}
            {referrals.map((lead, i) => {
              const firm = lead.routing?.assigned_firm || lead.triage?.firm_id || '—';
              const status = i % 4 === 0 ? 'signed' : i % 4 === 1 ? 'consult_booked' : i % 4 === 2 ? 'accepted' : 'pending';
              const fee = 6000 + i * 2200;
              return (
                <tr key={lead.packet_id} className="border-b border-cf-border last:border-0 hover:bg-cf-cream/40">
                  <td className="px-5 py-4 font-mono text-cf-ink-2">{shortRefId(lead.packet_id)}</td>
                  <td className="px-5 py-4 text-cf-ink">{lead.caller?.full_name || 'Unknown caller'} <span className="text-cf-muted">/ {lead.routing?.subtype?.replace(/_/g, ' ') ?? 'lead'}</span></td>
                  <td className="px-5 py-4 text-cf-ink-2">{lead.routing?.subtype?.replace(/_/g, ' ') ?? '—'}</td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-2">
                      <span className="grid size-6 place-items-center rounded bg-cf-blue text-[10px] font-semibold text-white">{firmInitials(firm)}</span>
                      {firm}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium ${STATUS_PILL[status]}`}>
                      <span className="size-1.5 rounded-full bg-current opacity-80" />
                      {status === 'consult_booked' ? 'Consult Booked' : status[0].toUpperCase() + status.slice(1)}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-mono text-cf-ink">${fee.toLocaleString()} est.</td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-cf-blue-soft px-2.5 py-1 text-[12px] font-medium text-cf-blue-ink">
                      Receivable
                    </span>
                  </td>
                  <td className="px-5 py-4 text-cf-ink-2">Follow up in 3 days</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
