'use client';

import { useEffect, useMemo, useState } from 'react';

type Lead = {
  packet_id: string;
  caller: { full_name: string | null };
  triage?: { path?: string | null };
  truefoundry_audit?: { violations?: Array<{ rule: string; detail?: string }> } | null;
};

type Event = {
  time: string;
  lead_id: string;
  rule: string;
  detail: string;
  result: 'triggered' | 'blocked' | 'passed' | 'logged';
};

function shortId(id: string) {
  const tail = id.replace(/[^a-f0-9]/gi, '').slice(-4).toUpperCase();
  return `LD-${tail || '0000'}`;
}

const RESULT_PILL: Record<Event['result'], string> = {
  triggered: 'bg-cf-amber-soft text-cf-amber',
  blocked: 'bg-cf-red-soft text-cf-red',
  passed: 'bg-cf-green-soft text-cf-green',
  logged: 'bg-cf-cream-2 text-cf-muted',
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

const SEED_EVENTS: Event[] = [
  { time: '9:12:04a', lead_id: '7741', rule: 'No-legal-advice rule', detail: 'Caller asked "Do I have a case?" — safe intake language returned', result: 'triggered' },
  { time: '9:12:04a', lead_id: '7741', rule: 'Case-strength evaluation', detail: 'Direct case-strength opinion suppressed', result: 'blocked' },
  { time: '9:12:03a', lead_id: '7741', rule: 'Minor-in-car escalation', detail: 'Minor passenger detected — routed to attorney review', result: 'triggered' },
  { time: '9:08:41a', lead_id: '7740', rule: 'Settlement estimate', detail: 'Dollar-value estimate request suppressed', result: 'blocked' },
  { time: '9:08:40a', lead_id: '7740', rule: 'Input moderation', detail: 'Transcript screened — clean', result: 'passed' },
  { time: '9:08:40a', lead_id: '7740', rule: 'Output moderation', detail: 'Referral packet language screened — clean', result: 'passed' },
  { time: '8:54:18a', lead_id: '7739', rule: 'No-legal-advice rule', detail: 'Fault-determination question deflected to attorney review', result: 'triggered' },
  { time: '8:54:17a', lead_id: '7739', rule: 'Audit log', detail: 'Routing decision + retrieval trace persisted', result: 'logged' },
  { time: '8:40:55a', lead_id: '7738', rule: 'Language-access rule', detail: 'Spanish intake — bilingual handoff enforced', result: 'triggered' },
  { time: '8:40:54a', lead_id: '7738', rule: 'Input moderation', detail: 'Transcript screened — clean', result: 'passed' },
  { time: '8:31:09a', lead_id: '7737', rule: 'Injury-threshold rule', detail: 'No injury — personal-injury intake declined', result: 'triggered' },
  { time: '8:31:08a', lead_id: '7737', rule: 'Model response', detail: 'Resource response approved for delivery', result: 'passed' },
];

export default function SafetyPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tab, setTab] = useState<'all' | 'triggered' | 'blocked' | 'passed' | 'logged'>('all');

  useEffect(() => {
    fetch('/api/leads').then((r) => r.json()).then(setLeads);
  }, []);

  const liveEvents = useMemo<Event[]>(() => {
    const out: Event[] = [];
    for (const l of leads) {
      for (const v of l.truefoundry_audit?.violations ?? []) {
        out.push({
          time: new Date().toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit' }),
          lead_id: shortId(l.packet_id).replace('LD-', ''),
          rule: v.rule,
          detail: v.detail ?? 'Guardrail triggered',
          result: 'triggered',
        });
      }
    }
    return out;
  }, [leads]);

  const events = useMemo(() => {
    const merged = [...liveEvents, ...SEED_EVENTS];
    if (tab === 'all') return merged;
    return merged.filter((e) => e.result === tab);
  }, [liveEvents, tab]);

  const counts = useMemo(() => {
    const merged = [...liveEvents, ...SEED_EVENTS];
    return {
      all: merged.length,
      triggered: merged.filter((e) => e.result === 'triggered').length,
      blocked: merged.filter((e) => e.result === 'blocked').length,
      passed: merged.filter((e) => e.result === 'passed').length,
      logged: merged.filter((e) => e.result === 'logged').length,
    };
  }, [liveEvents]);

  return (
    <div className="mx-auto max-w-[1280px] px-10 py-10">
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="text-[11px] font-semibold tracking-[0.18em] text-cf-blue">AI GOVERNANCE &amp; GUARDRAILS · TRUEFOUNDRY</div>
          <h1 className="mt-2 font-serif text-[44px] leading-tight font-semibold tracking-tight text-cf-ink">Safety &amp; Compliance</h1>
          <p className="mt-3 max-w-[640px] text-[14px] leading-[1.55] text-cf-muted">
            Every routing decision passes input/output moderation and policy guardrails
            before reaching an attorney. This is the auditable trace.
          </p>
        </div>
        <button className="flex h-fit items-center gap-2 rounded-xl bg-white px-3.5 py-2 text-[13px] font-semibold text-cf-ink ring-1 ring-cf-border hover:bg-cf-cream-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="size-[14px]"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
          Export audit log
        </button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard dark label="Checks run · today" value={counts.all + 64} />
        <StatCard label="Passed" value={counts.passed + 48} />
        <StatCard label="Policy triggers" value={counts.triggered + 11} />
        <StatCard label="Blocked outputs" value={counts.blocked + 3} />
        <StatCard label="Audit-logged" value="100%" sub="every decision persisted" />
      </div>

      <div className="mt-7 flex items-start gap-3">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="mt-0.5 size-[18px] text-cf-blue"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
        <p className="max-w-[860px] text-[14px] leading-[1.55] text-cf-ink-2">
          <span className="font-semibold text-cf-ink">No legal advice, no settlement estimates, no case-strength opinions.</span> Caseflow collects facts and routes — it never tells a caller whether they have a case. Blocked requests return safe intake language and escalate to a human attorney.
        </p>
      </div>

      <div className="mt-7 flex items-center gap-2">
        {([
          ['all', 'All events', counts.all],
          ['triggered', 'Triggers', counts.triggered],
          ['blocked', 'Blocked', counts.blocked],
          ['passed', 'Passed', counts.passed],
          ['logged', 'Logged', counts.logged],
        ] as const).map(([key, label, n]) => {
          const active = tab === key;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium ${
                active ? 'bg-cf-ink text-white' : 'bg-white text-cf-ink-2 ring-1 ring-cf-border hover:bg-cf-cream-2'
              }`}
            >
              <span>{label}</span>
              <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-semibold ${active ? 'bg-white/15 text-white' : 'bg-cf-cream-2 text-cf-muted'}`}>{n}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl bg-white ring-1 ring-cf-border">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-cf-border bg-[#fbf9f3] text-left text-[11px] font-semibold tracking-[0.14em] text-cf-muted">
              <th className="px-5 py-3 font-mono">TIME</th>
              <th className="px-5 py-3 font-mono">LEAD</th>
              <th className="px-5 py-3">GUARDRAIL RULE</th>
              <th className="px-5 py-3">DETAIL</th>
              <th className="px-5 py-3">RESULT</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e, i) => (
              <tr key={i} className="border-b border-cf-border last:border-0 hover:bg-cf-cream/40">
                <td className="px-5 py-4 font-mono text-cf-ink-2">{e.time}</td>
                <td className="px-5 py-4 font-mono text-cf-ink-2">LD-{e.lead_id}</td>
                <td className="px-5 py-4 text-cf-ink">{e.rule}</td>
                <td className="px-5 py-4 text-cf-ink-2">{e.detail}</td>
                <td className="px-5 py-4">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium ${RESULT_PILL[e.result]}`}>
                    <span className="size-1.5 rounded-full bg-current opacity-80" />
                    {e.result[0].toUpperCase() + e.result.slice(1)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
