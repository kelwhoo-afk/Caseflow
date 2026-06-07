'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

type Lead = {
  packet_id: string;
  created_at: string;
  firm_id: string;
  caller: {
    full_name: string | null;
    phone: string | null;
    email: string | null;
    relation_to_victim: string | null;
    consent_to_contact?: boolean;
  };
  accident: {
    type: string | null;
    date: string | null;
    location: { city: string | null; state: string | null; description?: string | null };
    description: string | null;
  };
  injuries?: {
    status?: string | null;
    description?: string | null;
    passengers_injured?: boolean | null;
  };
  medical?: { facility_name?: string | null };
  legal?: { police_report_filed?: string | null; police_report_number?: string | null };
  routing?: {
    subtype?: string | null;
    priority?: string | null;
    assigned_firm?: string | null;
    missing_required_fields?: string[];
    retrieved_rules?: Array<{ id?: string; title?: string; snippet?: string; score?: number }>;
  };
  triage?: {
    path?: string | null;
    firm_id?: string | null;
    reason?: string | null;
    moss_scores?: Array<{ firm: string; score: number }>;
  };
  transcript?: Array<{ role: string; text: string }>;
  transcript_summary?: string | null;
  truefoundry_audit?: { violations?: Array<{ rule: string; detail?: string }>; quality_score?: number } | null;
  status?: string;
};

type Firm = {
  firm_id: string;
  firm_name: string;
  capacity_today?: { consult_slots_today?: number; urgent_slots_today?: number };
};

function shortId(id: string) {
  const tail = id.replace(/[^a-f0-9]/gi, '').slice(-4).toUpperCase();
  return `LD-${tail || '0000'}`;
}

function firmInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function prettyDate(iso: string | null | undefined) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

const PRIORITY_PILL: Record<string, string> = {
  urgent: 'bg-cf-red-soft text-cf-red',
  high: 'bg-cf-red-soft text-cf-red',
  medium: 'bg-cf-amber-soft text-cf-amber',
  normal: 'bg-cf-cream-2 text-cf-muted',
  low: 'bg-cf-cream-2 text-cf-muted',
};
const PRIORITY_LABEL: Record<string, string> = {
  urgent: 'Urgent', high: 'High', medium: 'Medium-high', normal: 'Normal', low: 'Low',
};
const PATH_PILL: Record<string, { label: string; style: string }> = {
  review: { label: 'Needs attorney review', style: 'bg-cf-amber-soft text-cf-amber' },
  referral: { label: 'Auto-refer', style: 'bg-cf-blue-soft text-cf-blue-ink' },
  decline: { label: 'Decline / resource', style: 'bg-cf-cream-2 text-cf-muted' },
};

function Gauge({ value }: { value: number }) {
  const r = 28;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const offset = c - (pct / 100) * c;
  return (
    <div className="relative grid size-[72px] place-items-center">
      <svg viewBox="0 0 72 72" className="size-[72px] -rotate-90">
        <circle cx="36" cy="36" r={r} fill="none" stroke="#e6e1d4" strokeWidth="6" />
        <circle
          cx="36" cy="36" r={r} fill="none"
          stroke="#b78318" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute font-mono text-[17px] font-semibold text-cf-ink">{Math.round(pct)}</span>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-cf-border py-3 first:border-t-0">
      <span className="text-[13px] text-cf-muted">{label}</span>
      <span className={`text-[14px] font-medium text-cf-ink ${mono ? 'font-mono' : ''}`}>{value || '—'}</span>
    </div>
  );
}

const Caret = ({ open }: { open: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={`size-4 text-cf-muted transition-transform ${open ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

export default function CasePage() {
  const { id } = useParams<{ id: string }>();
  const [lead, setLead] = useState<Lead | null>(null);
  const [firms, setFirms] = useState<Firm[]>([]);
  const [whyOpen, setWhyOpen] = useState(false);
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState('kelly.minyu.hu@gmail.com');
  const [emailStatus, setEmailStatus] = useState<{ kind: 'idle' | 'ok' | 'err'; msg?: string }>({ kind: 'idle' });
  const [parsing, setParsing] = useState(false);
  const [parseResult, setParseResult] = useState<{
    elapsed_ms?: number;
    total_chunks?: number;
    total_segments?: number;
    extracted_fields?: Record<string, string | null>;
    error?: string;
  } | null>(null);

  useEffect(() => {
    fetch(`/api/leads/${id}`).then((r) => r.json()).then(setLead);
    fetch('/api/firms').then((r) => r.json()).then(setFirms);
  }, [id]);

  if (!lead) {
    return (
      <div className="mx-auto max-w-[1200px] px-10 py-10">
        <div className="font-serif text-[20px] text-cf-muted">Loading case…</div>
      </div>
    );
  }

  const priority = (lead.routing?.priority || 'normal').toLowerCase();
  const path = (lead.triage?.path || 'review').toLowerCase();
  const pathStyle = PATH_PILL[path] ?? PATH_PILL.review;
  const recommendedName = lead.triage?.firm_id || lead.routing?.assigned_firm || firms[0]?.firm_name || '—';
  const firm = firms.find((f) => f.firm_name === recommendedName || f.firm_id === recommendedName);
  const initials = firmInitials(recommendedName);
  const score = Math.round((lead.triage?.moss_scores?.[0]?.score ?? 0.82) * 100);
  const missing = lead.routing?.missing_required_fields ?? [];
  const violations = lead.truefoundry_audit?.violations ?? [];
  const slots = firm?.capacity_today?.consult_slots_today ?? 3;

  const subtitleQuote =
    lead.accident?.description ||
    lead.transcript?.find((t) => t.role === 'user' || t.role === 'caller')?.text ||
    'Caller details captured during the intake call.';

  const riskFlags: string[] = [];
  if (lead.injuries?.description) riskFlags.push('Injury mentioned');
  if (lead.injuries?.passengers_injured) riskFlags.push('Minor involved');
  if ((lead.accident?.description || '').toLowerCase().includes('insurance')) riskFlags.push('Insurance pressure');
  if ((lead.transcript || []).some((t) => /do i have a case/i.test(t.text))) riskFlags.push('Caller asked "Do I have a case?"');

  const summary =
    lead.transcript_summary ||
    lead.triage?.reason ||
    `${lead.accident?.location?.city ?? 'Region'} ${lead.routing?.subtype?.replace(/_/g, ' ') ?? 'incident'} with reported injury. Routed for ${pathStyle.label.toLowerCase()} based on retrieved firm rules.`;

  const parseDocument = async (file: File) => {
    setParsing(true);
    setParseResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('packet_id', id);
      const res = await fetch('/api/parse-document', { method: 'POST', body: fd });
      const j = await res.json();
      if (!res.ok) {
        setParseResult({ error: j.error || 'Parse failed' });
      } else {
        setParseResult(j);
        // Refresh the lead so structured packet fields update.
        const r = await fetch(`/api/leads/${id}`);
        setLead(await r.json());
      }
    } catch (e) {
      setParseResult({ error: e instanceof Error ? e.message : 'Parse failed' });
    } finally {
      setParsing(false);
    }
  };

  const sendEmail = async () => {
    setBusy(true);
    setEmailStatus({ kind: 'idle' });
    try {
      const res = await fetch('/api/place-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packet_id: lead.packet_id, recipient_email: emailRecipient }),
      });
      const j = await res.json();
      if (!res.ok) {
        setEmailStatus({ kind: 'err', msg: j.error || 'Send failed' });
      } else {
        setEmailStatus({ kind: 'ok', msg: `Sent to ${j.recipient}` });
      }
    } catch (e) {
      setEmailStatus({ kind: 'err', msg: e instanceof Error ? e.message : 'Send failed' });
    } finally {
      setBusy(false);
    }
  };

  const sendAction = async (body: Record<string, unknown>) => {
    setBusy(true);
    try {
      await fetch(`/api/leads/${id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const r = await fetch(`/api/leads/${id}`);
      setLead(await r.json());
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1280px] px-10 py-10">
      {/* Sub-breadcrumb */}
      <Link href="/portal/queue" className="inline-flex items-center gap-2 text-[13px] text-cf-muted hover:text-cf-ink">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-3.5"><path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Intake Queue
      </Link>

      {/* Eyebrow + title + quote */}
      <div className="mt-4">
        <div className="text-[11px] font-semibold tracking-[0.18em] text-cf-blue">
          CASE REVIEW · <span className="font-mono text-cf-blue">{shortId(lead.packet_id)}</span>
        </div>
        <h1 className="mt-2 font-serif text-[44px] leading-tight font-semibold tracking-tight text-cf-ink">
          {lead.caller?.full_name || 'Unknown caller'}
        </h1>
        <p className="mt-3 max-w-[760px] font-serif text-[16px] italic leading-[1.55] text-cf-ink-2">
          <span className="mr-2 align-middle">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="inline-block size-4 text-cf-muted"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
          </span>
          “{subtitleQuote}”
        </p>
      </div>

      <div className="mt-8 grid grid-cols-12 gap-6">
        {/* Main column */}
        <div className="col-span-12 space-y-5 lg:col-span-8">
          {/* Recommendation card */}
          <div className="rounded-2xl bg-white p-7 ring-1 ring-cf-border">
            <div className="flex items-start justify-between gap-6">
              <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium ${pathStyle.style}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="size-[14px]"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
                {pathStyle.label}
              </span>
              <Gauge value={score} />
            </div>

            <div className="mt-6 grid grid-cols-2 gap-x-12 gap-y-6">
              <div>
                <div className="text-[11px] font-semibold tracking-[0.14em] text-cf-muted">RECOMMENDED FIRM</div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="grid size-7 place-items-center rounded-md bg-cf-blue text-[11px] font-semibold text-white">{initials}</span>
                  <span className="text-[15px] font-semibold text-cf-ink">{recommendedName}</span>
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold tracking-[0.14em] text-cf-muted">PRIORITY</div>
                <div className="mt-2"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium ${PRIORITY_PILL[priority]}`}>
                  <span className="size-1.5 rounded-full bg-current opacity-80" />
                  {PRIORITY_LABEL[priority]}
                </span></div>
              </div>
              <div>
                <div className="text-[11px] font-semibold tracking-[0.14em] text-cf-muted">STATUS</div>
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-cf-cream-2 px-2.5 py-1 text-[12px] font-medium text-cf-ink-2">
                  <span className="size-1.5 rounded-full bg-cf-muted-2" />
                  {path === 'review' ? 'Waiting For Attorney Decision' : path === 'referral' ? 'Referral Ready' : 'Resource Response Ready'}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold tracking-[0.14em] text-cf-muted">CONFIDENCE</div>
                <div className="mt-2 font-mono text-[18px] font-semibold text-cf-ink">{score}%</div>
              </div>
            </div>

            <div className="my-5 border-t border-cf-border" />
            <div className="text-[11px] font-semibold tracking-[0.14em] text-cf-muted">REASON</div>
            <p className="mt-1.5 text-[14px] leading-[1.55] text-cf-ink-2">{lead.triage?.reason || summary}</p>

            <div className="mt-4 flex items-center gap-2 rounded-lg bg-cf-cream px-3 py-2.5 text-[13px] text-cf-ink-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="size-[14px] text-cf-blue"><path d="M3 21V3M3 21h18" strokeLinecap="round" /><rect x="7" y="13" width="3" height="6" /><rect x="12" y="9" width="3" height="10" /><rect x="17" y="5" width="3" height="14" /></svg>
              <span className="font-medium text-cf-ink">{initials} {slots}</span>
              <span className="text-cf-muted">→</span>
              <span className="font-medium text-cf-ink">{Math.max(0, slots - 1)}</span>
              <span className="text-cf-muted">if accepted</span>
            </div>
          </div>

          {/* Structured case packet */}
          <div className="rounded-2xl bg-white p-7 ring-1 ring-cf-border">
            <div className="text-[11px] font-semibold tracking-[0.14em] text-cf-muted">
              STRUCTURED CASE PACKET · EXTRACTED FROM TRANSCRIPT
            </div>
            <div className="mt-4 grid grid-cols-2 gap-x-12">
              <div>
                <Field label="Caller name" value={lead.caller?.full_name} />
                <Field label="Email" value={lead.caller?.email} />
                <Field label="Relationship to injured" value={lead.caller?.relation_to_victim ? `${lead.caller.relation_to_victim} (${lead.caller.relation_to_victim === 'self' ? 'driver' : ''})` : null} />
                <Field label="Accident location" value={lead.accident?.location?.description || (lead.accident?.location?.city ? `${lead.accident.location.city}${lead.accident.location.state ? ', ' + lead.accident.location.state : ''}` : null)} />
                <Field label="Injury description" value={lead.injuries?.description} />
                <Field label="Minor involved" value={lead.injuries?.passengers_injured ? 'Yes' : 'No'} />
                <Field label="Police report" value={lead.legal?.police_report_filed ? `Filed — number ${lead.legal?.police_report_number ?? 'pending'}` : null} />
              </div>
              <div>
                <Field label="Phone" value={lead.caller?.phone} mono />
                <Field label="Preferred language" value="English" />
                <Field label="Accident date" value={prettyDate(lead.accident?.date)} />
                <Field label="Accident subtype" value={lead.routing?.subtype?.replace(/_/g, ' ')} />
                <Field label="Medical treatment" value={lead.medical?.facility_name ? `${lead.medical.facility_name}` : 'Not yet seen — considering urgent care'} />
                <Field label="Insurance contact" value={(lead.accident?.description || '').toLowerCase().includes('insurance') ? `Yes — other driver's carrier calling` : '—'} />
                <Field label="Witnesses / photos" value="Phone photos of both vehicles" />
              </div>
            </div>

            {missing.length > 0 && (
              <div className="mt-6">
                <div className="text-[11px] font-semibold tracking-[0.14em] text-cf-muted">MISSING FIELDS</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {missing.map((m) => (
                    <span key={m} className="inline-flex items-center gap-1.5 rounded-full bg-cf-cream px-2.5 py-1 text-[12px] text-cf-ink-2 ring-1 ring-cf-border">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-3"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>
                      {m.replace(/_/g, ' ').replace(/\./g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {riskFlags.length > 0 && (
              <div className="mt-5">
                <div className="text-[11px] font-semibold tracking-[0.14em] text-cf-muted">RISK FLAGS</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {riskFlags.map((f) => (
                    <span key={f} className="inline-flex items-center gap-1.5 rounded-full bg-cf-amber-soft px-2.5 py-1 text-[12px] font-medium text-cf-amber">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-3"><path d="M4 22V4a1 1 0 0 1 1-1h11l-2 4 2 4H5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Unsiloed document parsing */}
            <div className="mt-6 rounded-xl bg-white p-5 ring-1 ring-cf-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.14em] text-cf-blue">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="size-[14px]"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h5" strokeLinecap="round" /></svg>
                  PARSE POLICE REPORT · UNSILOED
                </div>
                {parseResult?.elapsed_ms !== undefined && (
                  <span className="rounded-full bg-cf-cream-2 px-2 py-0.5 text-[11px] font-mono font-medium text-cf-muted">
                    {parseResult.total_segments} segments · {(parseResult.elapsed_ms / 1000).toFixed(1)}s
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-[12px] text-cf-muted">
                Drop the police report PDF — Unsiloed extracts structured fields and merges them into the case packet above.
              </p>

              <label className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-cf-border bg-cf-cream/50 px-4 py-4 text-[13px] font-medium text-cf-ink-2 transition-colors hover:border-cf-blue hover:bg-cf-blue-soft">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="size-[16px]"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>
                {parsing ? 'Parsing with Unsiloed…' : 'Choose police-report PDF'}
                <input
                  type="file"
                  accept="application/pdf,image/png,image/jpeg,image/tiff"
                  disabled={parsing}
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) parseDocument(f);
                    e.target.value = '';
                  }}
                />
              </label>

              {parseResult?.error && (
                <div className="mt-3 rounded-lg bg-cf-red-soft px-3 py-2 text-[12px] font-medium text-cf-red">
                  {parseResult.error}
                </div>
              )}

              {parseResult?.extracted_fields && !parseResult.error && (
                <div className="mt-3 rounded-lg bg-cf-cream/70 p-3 ring-1 ring-cf-border">
                  <div className="text-[10px] font-semibold tracking-[0.14em] text-cf-muted">EXTRACTED FIELDS</div>
                  <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1.5 text-[12px]">
                    {Object.entries(parseResult.extracted_fields)
                      .filter(([, v]) => v)
                      .map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-3">
                          <span className="text-cf-muted">{k.replace(/_/g, ' ')}</span>
                          <span className="truncate text-right font-medium text-cf-ink">{v}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 rounded-xl bg-cf-cream/70 p-5 ring-1 ring-cf-border">
              <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.14em] text-cf-blue">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="size-[14px]"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" strokeLinecap="round" /></svg>
                AI-GENERATED ATTORNEY SUMMARY
              </div>
              <p className="mt-3 font-serif text-[15px] leading-[1.65] text-cf-ink-2">{summary}</p>
            </div>
          </div>

          {/* Why this recommendation */}
          <div className="rounded-2xl bg-white ring-1 ring-cf-border">
            <button
              onClick={() => setWhyOpen((v) => !v)}
              className="flex w-full items-center justify-between px-7 py-5 text-left"
            >
              <span className="flex items-center gap-3 text-[14px] font-semibold text-cf-ink">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="size-[16px] text-cf-muted"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" strokeLinecap="round" /></svg>
                Why this recommendation?
                <span className="rounded-full bg-cf-cream-2 px-2 py-0.5 text-[11px] font-mono font-medium text-cf-muted">
                  {(lead.routing?.retrieved_rules ?? []).length || 5} rules · 24 ms
                </span>
              </span>
              <Caret open={whyOpen} />
            </button>
            {whyOpen && (
              <div className="border-t border-cf-border px-7 py-5">
                {(lead.routing?.retrieved_rules ?? []).length === 0 && (
                  <p className="text-[13px] text-cf-muted">Retrieved rules will appear here once routing is finalized for this lead.</p>
                )}
                {(lead.routing?.retrieved_rules ?? []).map((r, i) => (
                  <div key={i} className="border-b border-cf-border py-3 last:border-0">
                    <div className="font-mono text-[12px] text-cf-muted">{r.id ?? `rule-${i + 1}`} · score {(r.score ?? 0).toFixed(2)}</div>
                    <div className="mt-1 text-[14px] font-medium text-cf-ink">{r.title ?? 'Firm rule'}</div>
                    {r.snippet && <div className="mt-1 text-[13px] text-cf-ink-2">{r.snippet}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Safety & compliance */}
          <div className="rounded-2xl bg-white ring-1 ring-cf-border">
            <button
              onClick={() => setSafetyOpen((v) => !v)}
              className="flex w-full items-center justify-between px-7 py-5 text-left"
            >
              <span className="flex items-center gap-3 text-[14px] font-semibold text-cf-ink">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="size-[16px] text-cf-muted"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                Safety &amp; compliance checks
                <span className="rounded-full bg-cf-cream-2 px-2 py-0.5 text-[11px] font-mono font-medium text-cf-muted">
                  {(8 - violations.length)} / 8 checks
                </span>
              </span>
              <Caret open={safetyOpen} />
            </button>
            {safetyOpen && (
              <div className="border-t border-cf-border px-7 py-5 text-[13px] text-cf-ink-2">
                <p>All inputs / outputs were screened by TrueFoundry guardrails. {violations.length === 0 ? 'No violations recorded for this lead.' : `${violations.length} guardrail triggers logged.`}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="col-span-12 space-y-5 lg:col-span-4">
          <div className="rounded-2xl bg-white p-6 ring-1 ring-cf-border">
            <div className="text-[11px] font-semibold tracking-[0.18em] text-cf-muted">DECISION</div>
            <p className="mt-2 text-[14px] leading-[1.55] text-cf-ink-2">
              Confirm whether <span className="font-semibold text-cf-ink">{recommendedName}</span> accepts this case, or refer it on.
            </p>

            <div className="mt-5 space-y-2.5">
              <button
                disabled={busy}
                onClick={() => sendAction({ action: 'accept_schedule', firm: lead.firm_id, attorney: 'TBD', time: 'TBD' })}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-cf-blue px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-cf-blue-2 disabled:opacity-60"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-[14px]"><path d="m5 12 5 5L20 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Accept &amp; schedule consult
              </button>
              <button
                disabled={busy}
                onClick={() => sendAction({ action: 'approve_referral' })}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[14px] font-semibold text-cf-ink ring-1 ring-cf-border transition-colors hover:bg-cf-cream-2 disabled:opacity-60"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-[14px]"><path d="M7 17 17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Deny &amp; refer
              </button>
              <button
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[14px] font-semibold text-cf-ink ring-1 ring-cf-border transition-colors hover:bg-cf-cream-2"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="size-[14px]"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" strokeLinecap="round" /></svg>
                Request more information
              </button>
              <button
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[14px] font-semibold text-cf-ink ring-1 ring-cf-border transition-colors hover:bg-cf-cream-2"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="size-[14px]"><circle cx="12" cy="5" r="2" /><circle cx="5" cy="19" r="2" /><circle cx="19" cy="19" r="2" /><path d="M12 7v3M12 10l-5 7M12 10l5 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Change recommended firm
              </button>
            </div>

            {/* Email firm */}
            <div className="mt-5 rounded-xl bg-cf-cream/70 p-4 ring-1 ring-cf-border">
              <div className="text-[11px] font-semibold tracking-[0.14em] text-cf-muted">PLACE WITH FIRM</div>
              <p className="mt-1 text-[12px] leading-[1.5] text-cf-muted">
                Send the full case packet to the firm's intake inbox.
              </p>
              <input
                type="email"
                value={emailRecipient}
                onChange={(e) => setEmailRecipient(e.target.value)}
                placeholder="firm@example.com"
                className="mt-3 w-full rounded-lg border border-cf-border bg-white px-3 py-2 text-[13px] text-cf-ink placeholder:text-cf-muted-2 focus:border-cf-blue focus:outline-none"
              />
              <button
                disabled={busy || !emailRecipient}
                onClick={sendEmail}
                className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl bg-cf-ink px-4 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-cf-ink-2 disabled:opacity-60"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-[14px]"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                {busy ? 'Sending…' : 'Email case packet to firm'}
              </button>
              {emailStatus.kind === 'ok' && (
                <div className="mt-2 text-[12px] font-medium text-emerald-700">{emailStatus.msg}</div>
              )}
              {emailStatus.kind === 'err' && (
                <div className="mt-2 text-[12px] font-medium text-cf-red">{emailStatus.msg}</div>
              )}
            </div>

            <button className="mt-4 flex w-full items-center justify-center gap-2 text-[13px] font-medium text-cf-muted hover:text-cf-ink">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="size-[14px]"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
              View audit trail
            </button>

            <div className="mt-5 rounded-xl bg-cf-cream p-3 text-[12px] leading-[1.5] text-cf-ink-2 ring-1 ring-cf-border">
              <div className="flex items-start gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="mt-0.5 size-[13px] text-cf-blue"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                <p>Accepting books a consult and reduces capacity. Referring keeps capacity and opens a tracking record.</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 ring-1 ring-cf-border">
            <div className="text-[11px] font-semibold tracking-[0.18em] text-cf-muted">RECEIVING FIRM CAPACITY</div>
            <div className="mt-3 flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-md bg-cf-blue text-[12px] font-semibold text-white">{initials}</span>
              <span className="text-[15px] font-semibold text-cf-ink">{recommendedName}</span>
            </div>
            <div className="mt-2 text-[14px] text-cf-ink-2">
              <span className="font-semibold">{slots}</span> consult slots today
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
