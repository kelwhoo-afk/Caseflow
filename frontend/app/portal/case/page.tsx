'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type Lead = {
  packet_id: string;
  created_at: string;
  caller: { full_name: string | null };
  accident?: { type?: string | null; location?: { city?: string | null; state?: string | null } };
  routing?: { subtype?: string | null; priority?: string | null };
  triage?: { path?: string | null; reason?: string | null };
  status?: string;
};

const PRIORITY_PILL: Record<string, string> = {
  urgent: 'bg-cf-red-soft text-cf-red',
  high: 'bg-cf-red-soft text-cf-red',
  medium: 'bg-cf-amber-soft text-cf-amber',
  normal: 'bg-cf-cream-2 text-cf-muted',
  low: 'bg-cf-cream-2 text-cf-muted',
};

const PATH_LABEL: Record<string, string> = {
  review: 'Needs attorney review',
  referral: 'Auto-refer',
  decline: 'Decline / resource',
};

function shortId(packetId: string): string {
  const tail = packetId.replace(/[^a-f0-9]/gi, '').slice(-4).toUpperCase();
  return `LD-${tail || '0000'}`;
}

function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const mins = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export default function CaseReviewIndexPage() {
  const [leads, setLeads] = useState<Lead[]>([]);

  useEffect(() => {
    const load = () => fetch('/api/leads').then((r) => r.json()).then(setLeads).catch(() => {});
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, []);

  const reviewLeads = useMemo(
    () =>
      [...leads]
        .filter((l) => (l.triage?.path ?? 'review') !== 'decline')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [leads]
  );

  return (
    <div className="mx-auto max-w-[1100px] px-10 py-10">
      <div className="text-[11px] font-semibold tracking-[0.18em] text-cf-blue">CASES · AWAITING DECISION</div>
      <h1 className="mt-2 font-serif text-[44px] leading-tight font-semibold tracking-tight text-cf-ink">Case Review</h1>
      <p className="mt-3 max-w-[640px] text-[14px] leading-[1.55] text-cf-muted">
        Select a lead to open the structured case packet, recommendation, and decision controls.
      </p>

      {reviewLeads.length === 0 ? (
        <div className="mt-10 rounded-2xl bg-white p-10 text-center ring-1 ring-cf-border">
          <div className="text-[14px] font-medium text-cf-ink">No cases awaiting review</div>
          <p className="mt-1 text-[13px] text-cf-muted">
            New leads will appear here as Caseflow finishes intake.{' '}
            <Link href="/portal/queue" className="text-cf-blue underline">
              Go to Intake Queue
            </Link>
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {reviewLeads.map((l) => {
            const priority = l.routing?.priority ?? 'normal';
            const path = l.triage?.path ?? 'review';
            const where = [l.accident?.location?.city, l.accident?.location?.state].filter(Boolean).join(', ');
            return (
              <Link
                key={l.packet_id}
                href={`/portal/case/${l.packet_id}`}
                className="flex items-center gap-5 rounded-2xl bg-white p-5 ring-1 ring-cf-border transition hover:ring-cf-ink/30"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-[11px] font-mono tracking-wider text-cf-muted">
                    <span>{shortId(l.packet_id)}</span>
                    <span>·</span>
                    <span>{relativeTime(l.created_at)}</span>
                  </div>
                  <div className="mt-1 text-[16px] font-semibold text-cf-ink">
                    {l.caller.full_name ?? 'Unknown caller'}
                  </div>
                  <div className="mt-0.5 truncate text-[13px] text-cf-ink-2">
                    {[l.routing?.subtype, where, l.accident?.type].filter(Boolean).join(' · ') || l.triage?.reason || '—'}
                  </div>
                </div>
                <div className="flex flex-none items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${PRIORITY_PILL[priority] ?? PRIORITY_PILL.normal}`}>
                    {priority[0].toUpperCase() + priority.slice(1)}
                  </span>
                  <span className="rounded-full bg-cf-cream-2 px-2.5 py-1 text-[12px] text-cf-ink-2">
                    {PATH_LABEL[path] ?? path}
                  </span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="size-4 text-cf-muted">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
