'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type Lead = {
  packet_id: string;
  created_at: string;
  firm_id: string;
  caller: { full_name: string | null };
  accident: {
    type: string | null;
    description: string | null;
    location: { city: string | null; state?: string | null };
  };
  injuries?: { description?: string | null; status?: string | null };
  routing?: { subtype?: string | null; priority?: string | null };
  triage?: { path?: string | null; firm_id?: string | null; reason?: string | null };
  transcript?: Array<{ role: string; text: string }>;
  status?: string;
};

type Firm = {
  firm_id: string;
  firm_name: string;
  capacity_today?: { consult_slots_today?: number; urgent_slots_today?: number };
};

const PRIORITY_LABEL: Record<string, string> = {
  urgent: 'Urgent',
  high: 'High',
  medium: 'Medium-high',
  normal: 'Normal',
  low: 'Low',
};
const PRIORITY_STYLES: Record<string, { pill: string; bar: string; dot: string }> = {
  urgent: { pill: 'bg-cf-red-soft text-cf-red', bar: 'bg-cf-red', dot: 'bg-cf-red' },
  high: { pill: 'bg-cf-red-soft text-cf-red', bar: 'bg-cf-red', dot: 'bg-cf-red' },
  medium: { pill: 'bg-cf-amber-soft text-cf-amber', bar: 'bg-cf-amber', dot: 'bg-cf-amber' },
  normal: { pill: 'bg-cf-cream-2 text-cf-muted', bar: 'bg-cf-border-2', dot: 'bg-cf-muted-2' },
  low: { pill: 'bg-cf-cream-2 text-cf-muted', bar: 'bg-cf-border-2', dot: 'bg-cf-muted-2' },
};
const PATH_STYLES: Record<string, { pill: string; label: string }> = {
  review: { pill: 'bg-cf-amber-soft text-cf-amber', label: 'Needs attorney review' },
  referral: { pill: 'bg-cf-blue-soft text-cf-blue-ink', label: 'Auto-refer' },
  decline: { pill: 'bg-cf-cream-2 text-cf-muted', label: 'Decline / resource' },
};

function shortId(packetId: string): string {
  const tail = packetId.replace(/[^a-f0-9]/gi, '').slice(-4).toUpperCase();
  return `LD-${tail || '0000'}`;
}

function channelFor(lead: Lead): { label: string; icon: 'phone' | 'voicemail' | 'web' } {
  if (lead.transcript && lead.transcript.length > 4) return { label: 'PHONE', icon: 'phone' };
  if (lead.transcript && lead.transcript.length > 0) return { label: 'VOICEMAIL', icon: 'voicemail' };
  return { label: 'WEBSITE FORM', icon: 'web' };
}

function firmInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function subtitleSnippet(lead: Lead): string {
  const candidates = [
    lead.accident.description,
    lead.transcript?.find((t) => t.role === 'user' || t.role === 'caller')?.text,
    lead.triage?.reason,
  ].filter(Boolean) as string[];
  return candidates[0] || 'Caller details pending — packet built from intake.';
}

const ChannelIcon = ({ kind }: { kind: 'phone' | 'voicemail' | 'web' }) => {
  if (kind === 'phone')
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-[14px]"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
    );
  if (kind === 'voicemail')
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-[14px]"><circle cx="6" cy="12" r="4" /><circle cx="18" cy="12" r="4" /><line x1="6" y1="16" x2="18" y2="16" /></svg>
    );
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-[14px]"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18" /></svg>
  );
};

const TagIcon = {
  flag: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-[13px]"><path d="M4 22V4a1 1 0 0 1 1-1h11l-2 4 2 4H5" /></svg>,
  pin: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-[13px]"><circle cx="12" cy="9" r="2.5" /><path d="M12 22s7-7.5 7-13a7 7 0 1 0-14 0c0 5.5 7 13 7 13z" /></svg>,
  shield: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-[13px]"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
};

const Chevron = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4 text-cf-muted-2"><path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

export default function QueuePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [firms, setFirms] = useState<Firm[]>([]);
  const [tab, setTab] = useState<'all' | 'review' | 'referral' | 'decline'>('all');

  useEffect(() => {
    const firmId = document.cookie.split('; ').find((c) => c.startsWith('firm_id='))?.split('=')[1] || 'BayBridge_Auto_Injury';
    const poll = async () => {
      const [r1, r2] = await Promise.all([
        fetch(`/api/leads?firm_id=${firmId}`),
        fetch('/api/firms'),
      ]);
      if (r1.ok) setLeads(await r1.json());
      if (r2.ok) setFirms(await r2.json());
    };
    poll();
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, []);

  const counts = useMemo(() => {
    const c = { all: leads.length, review: 0, referral: 0, decline: 0 };
    for (const l of leads) {
      const p = l.triage?.path;
      if (p === 'review') c.review++;
      else if (p === 'referral') c.referral++;
      else if (p === 'decline') c.decline++;
    }
    return c;
  }, [leads]);

  const filtered = useMemo(() => {
    if (tab === 'all') return leads;
    return leads.filter((l) => l.triage?.path === tab);
  }, [leads, tab]);

  return (
    <div className="mx-auto max-w-[1200px] px-10 py-10">
      {/* Eyebrow + Title + Status pill */}
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="text-[11px] font-semibold tracking-[0.18em] text-cf-blue">CASEFLOW · LIVE</div>
          <h1 className="mt-2 font-serif text-[44px] leading-tight font-semibold tracking-tight text-cf-ink">Intake Queue</h1>
          <p className="mt-3 max-w-[560px] text-[14px] leading-[1.55] text-cf-muted">
            First-pass intake analysis on inbound car-accident leads. Each lead is scored, routed,
            and ready for your confirmation — select one to review the packet and decision.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-cf-green-soft px-3 py-1.5 text-[13px] font-medium text-cf-green">
          <span className="size-1.5 rounded-full bg-cf-green" />
          {leads.length} active leads
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-8 flex flex-wrap items-center gap-2">
        {([
          ['all', 'All leads', counts.all],
          ['review', 'Needs attorney review', counts.review],
          ['referral', 'Auto-refer', counts.referral],
          ['decline', 'Decline / resource', counts.decline],
        ] as const).map(([key, label, count]) => {
          const active = tab === key;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium transition-colors ${
                active ? 'bg-cf-ink text-white' : 'bg-white text-cf-ink-2 ring-1 ring-cf-border hover:bg-cf-cream-2'
              }`}
            >
              <span>{label}</span>
              <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-semibold ${
                active ? 'bg-white/15 text-white' : 'bg-cf-cream-2 text-cf-muted'
              }`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Cards */}
      <div className="mt-6 space-y-4">
        {filtered.map((lead) => {
          const priority = (lead.routing?.priority || 'normal').toLowerCase();
          const ps = PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.normal;
          const path = (lead.triage?.path || 'review').toLowerCase();
          const pathStyle = PATH_STYLES[path] ?? PATH_STYLES.review;
          const channel = channelFor(lead);
          const recommendedFirmName = lead.triage?.firm_id || firms[0]?.firm_name || '—';
          const firm = firms.find((f) => f.firm_name === recommendedFirmName || f.firm_id === recommendedFirmName);
          const initials = firmInitials(recommendedFirmName);

          const slots = firm?.capacity_today?.consult_slots_today ?? 0;
          const microStat =
            path === 'review' ? `${initials} ${slots} → ${Math.max(0, slots - 1)} if accepted` :
            path === 'referral' ? `${initials} ${slots} → ${Math.max(0, slots - 1)} on accept` :
            'No attorney capacity used';
          const statusText =
            path === 'review' ? 'Waiting for attorney decision' :
            path === 'referral' ? 'Referral ready' :
            'Resource response ready';

          return (
            <Link
              key={lead.packet_id}
              href={`/portal/case/${lead.packet_id}`}
              className="group block overflow-hidden rounded-2xl bg-white ring-1 ring-cf-border transition-shadow hover:shadow-[0_2px_14px_rgba(40,30,15,0.06)]"
            >
              <div className="flex">
                {/* Priority bar */}
                <div className={`w-1 flex-none ${ps.bar}`} />

                {/* Lead body */}
                <div className="flex-1 px-7 py-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5 text-cf-muted">
                        <ChannelIcon kind={channel.icon} />
                        <span className="text-[11px] font-semibold tracking-[0.14em]">{channel.label}</span>
                        <span className="font-mono text-[12px] text-cf-muted-2">{shortId(lead.packet_id)}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <h3 className="text-[18px] font-semibold text-cf-ink">
                          {lead.caller?.full_name || 'Unknown caller'}
                        </h3>
                        {!lead.caller?.full_name && (
                          <span className="rounded bg-cf-cream-2 px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.12em] text-cf-muted">UNIDENTIFIED</span>
                        )}
                      </div>
                      <p className="mt-2 max-w-[640px] font-serif text-[15px] italic leading-[1.55] text-cf-ink-2">
                        “{subtitleSnippet(lead)}”
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {lead.routing?.subtype && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-cf-cream px-2.5 py-1 text-[12px] text-cf-ink-2 ring-1 ring-cf-border">
                            {TagIcon.flag}{lead.routing.subtype.replace(/_/g, ' ')}
                          </span>
                        )}
                        {lead.accident?.location?.city && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-cf-cream px-2.5 py-1 text-[12px] text-cf-ink-2 ring-1 ring-cf-border">
                            {TagIcon.pin}{lead.accident.location.city}{lead.accident.location.state ? `, ${lead.accident.location.state}` : ''}
                          </span>
                        )}
                        {lead.injuries?.description && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-cf-cream px-2.5 py-1 text-[12px] text-cf-ink-2 ring-1 ring-cf-border">
                            {TagIcon.shield}{lead.injuries.description}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium ${ps.pill}`}>
                      <span className={`size-1.5 rounded-full ${ps.dot}`} />
                      {PRIORITY_LABEL[priority] ?? 'Normal'}
                    </div>
                  </div>
                </div>

                {/* Route panel */}
                <div className="flex w-[300px] flex-none items-center gap-3 border-l border-cf-border bg-[#fbf9f3] px-6 py-6">
                  <div className="min-w-0 flex-1">
                    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium ${pathStyle.pill}`}>
                      {path === 'referral'
                        ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-[13px]"><path d="M7 17 17 7M9 7h8v8" strokeLinecap="round" /></svg>
                        : path === 'review'
                          ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="size-[13px]"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
                          : TagIcon.flag}
                      {pathStyle.label}
                    </span>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="grid size-7 flex-none place-items-center rounded-md bg-cf-blue text-[11px] font-semibold text-white">{initials}</span>
                      <span className="truncate text-[14px] font-semibold text-cf-ink">{recommendedFirmName}</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5 text-[12px] text-cf-muted">
                      <span className="size-1.5 rounded-full bg-cf-blue" />
                      {statusText}
                    </div>
                    <div className="mt-1 font-mono text-[11px] text-cf-muted-2">{microStat}</div>
                  </div>
                  <Chevron />
                </div>
              </div>
            </Link>
          );
        })}

        {filtered.length === 0 && (
          <div className="rounded-2xl bg-white px-10 py-16 text-center ring-1 ring-cf-border">
            <p className="font-serif text-[18px] text-cf-ink-2">No leads in this view yet.</p>
            <p className="mt-1 text-[13px] text-cf-muted">Inbound intakes will appear here as the Intake Agent finishes calls.</p>
          </div>
        )}
      </div>
    </div>
  );
}
