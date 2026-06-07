// frontend/app/api/place-lead/route.ts
import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { Resend } from 'resend';

const LEADS_PATH = path.join(process.cwd(), '..', 'agent-py', 'data', 'leads.json');

function shortId(id: string) {
  const tail = id.replace(/[^a-f0-9]/gi, '').slice(-4).toUpperCase();
  return `LD-${tail || '0000'}`;
}

function escape(str: string | null | undefined): string {
  if (!str) return '—';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildHtml(lead: any): string {
  const caseId = shortId(lead.packet_id);
  const firmName = lead.triage?.firm_id || lead.routing?.assigned_firm || '—';
  const priority = (lead.routing?.priority || 'normal').toUpperCase();
  const path = (lead.triage?.path || 'review').toLowerCase();
  const pathLabel =
    path === 'review' ? 'Needs attorney review' : path === 'referral' ? 'Auto-refer' : 'Decline / resource';
  const confidence = Math.round((lead.triage?.moss_scores?.[0]?.score ?? 0.82) * 100);
  const reason = lead.triage?.reason || lead.transcript_summary || 'See case packet for full details.';

  const callerName = escape(lead.caller?.full_name);
  const callerPhone = escape(lead.caller?.phone);
  const callerEmail = escape(lead.caller?.email);

  const accidentType = escape(lead.routing?.subtype?.replace(/_/g, ' ') || lead.accident?.type);
  const accidentDate = escape(lead.accident?.date);
  const accidentLocation = escape(
    lead.accident?.location?.description ||
      (lead.accident?.location?.city
        ? `${lead.accident.location.city}${lead.accident.location.state ? ', ' + lead.accident.location.state : ''}`
        : null),
  );
  const accidentDesc = escape(lead.accident?.description);
  const injury = escape(lead.injuries?.description);
  const minor = lead.injuries?.passengers_injured ? 'Yes' : 'No';
  const policeReport = lead.legal?.police_report_filed
    ? `Filed — ${escape(lead.legal?.police_report_number ?? 'pending')}`
    : '—';

  const transcript = (lead.transcript || [])
    .slice(0, 8)
    .map(
      (t: { role: string; text: string }) =>
        `<p style="margin:6px 0;font-size:13px;color:#3a3a3a;"><strong style="color:#1c5fb3;">${escape(
          t.role,
        )}:</strong> ${escape(t.text)}</p>`,
    )
    .join('');

  return `
<!doctype html>
<html>
<body style="margin:0;padding:0;background:#f5f1e8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f5f1e8;padding:32px 0;">
    <tr><td align="center">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="640" style="max-width:640px;background:#ffffff;border-radius:16px;border:1px solid #e6e1d4;overflow:hidden;">
        <tr><td style="padding:32px 40px 24px 40px;border-bottom:1px solid #e6e1d4;">
          <div style="font-size:11px;font-weight:600;letter-spacing:0.18em;color:#1c5fb3;text-transform:uppercase;">CaseFlow Auto · New Case</div>
          <h1 style="margin:8px 0 0 0;font-family:Georgia,serif;font-size:28px;font-weight:600;color:#1a1a1a;">${callerName}</h1>
          <div style="margin-top:6px;font-family:monospace;font-size:13px;color:#7a7a7a;">${caseId} · ${firmName}</div>
        </td></tr>

        <tr><td style="padding:24px 40px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="padding:8px 12px;background:#fef3c7;border-radius:8px;font-size:12px;font-weight:600;color:#92400e;">${pathLabel}</td>
              <td style="padding:8px 12px;text-align:right;font-size:12px;color:#7a7a7a;">Priority: <strong style="color:#1a1a1a;">${priority}</strong> · Confidence: <strong style="color:#1a1a1a;">${confidence}%</strong></td>
            </tr>
          </table>
          <p style="margin:16px 0 0 0;font-size:14px;line-height:1.55;color:#3a3a3a;">${escape(reason)}</p>
        </td></tr>

        <tr><td style="padding:0 40px 24px 40px;">
          <div style="font-size:11px;font-weight:600;letter-spacing:0.14em;color:#7a7a7a;text-transform:uppercase;margin-bottom:12px;">Structured Case Packet</div>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="font-size:13px;color:#3a3a3a;">
            <tr><td style="padding:8px 0;border-bottom:1px solid #e6e1d4;color:#7a7a7a;">Caller phone</td><td style="padding:8px 0;border-bottom:1px solid #e6e1d4;text-align:right;font-family:monospace;color:#1a1a1a;font-weight:500;">${callerPhone}</td></tr>
            <tr><td style="padding:8px 0;border-bottom:1px solid #e6e1d4;color:#7a7a7a;">Caller email</td><td style="padding:8px 0;border-bottom:1px solid #e6e1d4;text-align:right;color:#1a1a1a;font-weight:500;">${callerEmail}</td></tr>
            <tr><td style="padding:8px 0;border-bottom:1px solid #e6e1d4;color:#7a7a7a;">Accident type</td><td style="padding:8px 0;border-bottom:1px solid #e6e1d4;text-align:right;color:#1a1a1a;font-weight:500;">${accidentType}</td></tr>
            <tr><td style="padding:8px 0;border-bottom:1px solid #e6e1d4;color:#7a7a7a;">Accident date</td><td style="padding:8px 0;border-bottom:1px solid #e6e1d4;text-align:right;color:#1a1a1a;font-weight:500;">${accidentDate}</td></tr>
            <tr><td style="padding:8px 0;border-bottom:1px solid #e6e1d4;color:#7a7a7a;">Location</td><td style="padding:8px 0;border-bottom:1px solid #e6e1d4;text-align:right;color:#1a1a1a;font-weight:500;">${accidentLocation}</td></tr>
            <tr><td style="padding:8px 0;border-bottom:1px solid #e6e1d4;color:#7a7a7a;">Injury</td><td style="padding:8px 0;border-bottom:1px solid #e6e1d4;text-align:right;color:#1a1a1a;font-weight:500;">${injury}</td></tr>
            <tr><td style="padding:8px 0;border-bottom:1px solid #e6e1d4;color:#7a7a7a;">Minor involved</td><td style="padding:8px 0;border-bottom:1px solid #e6e1d4;text-align:right;color:#1a1a1a;font-weight:500;">${minor}</td></tr>
            <tr><td style="padding:8px 0;color:#7a7a7a;">Police report</td><td style="padding:8px 0;text-align:right;color:#1a1a1a;font-weight:500;">${policeReport}</td></tr>
          </table>
          <div style="margin-top:16px;padding:12px;background:#f5f1e8;border-radius:8px;font-size:13px;line-height:1.55;color:#3a3a3a;">
            <strong style="color:#1a1a1a;">Accident description:</strong><br/>${accidentDesc}
          </div>
        </td></tr>

        ${
          transcript
            ? `<tr><td style="padding:0 40px 24px 40px;">
          <div style="font-size:11px;font-weight:600;letter-spacing:0.14em;color:#7a7a7a;text-transform:uppercase;margin-bottom:12px;">Transcript Excerpt</div>
          <div style="padding:16px;background:#f5f1e8;border-radius:8px;">${transcript}</div>
        </td></tr>`
            : ''
        }

        <tr><td style="padding:0 40px 32px 40px;text-align:center;border-top:1px solid #e6e1d4;padding-top:24px;">
          <a href="#" style="display:inline-block;background:#1c5fb3;color:#ffffff;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600;text-decoration:none;margin:0 6px;">Accept &amp; Schedule</a>
          <a href="#" style="display:inline-block;background:#ffffff;color:#1a1a1a;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600;text-decoration:none;border:1px solid #e6e1d4;margin:0 6px;">Decline &amp; Refer</a>
          <p style="margin:20px 0 0 0;font-size:12px;color:#7a7a7a;">Routed by CaseFlow Auto · Moss semantic match · TrueFoundry guardrails · LiveKit voice intake</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
`;
}

export async function POST(req: Request) {
  try {
    const { packet_id, recipient_email } = await req.json();

    if (!packet_id || !recipient_email) {
      return NextResponse.json({ error: 'packet_id and recipient_email required' }, { status: 400 });
    }

    if (!existsSync(LEADS_PATH)) {
      return NextResponse.json({ error: 'leads not found' }, { status: 404 });
    }

    const leads = JSON.parse(readFileSync(LEADS_PATH, 'utf-8'));
    const lead = leads.find((l: any) => l.packet_id === packet_id);
    if (!lead) {
      return NextResponse.json({ error: 'lead not found' }, { status: 404 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL || 'CaseFlow Auto <onboarding@resend.dev>';
    if (!apiKey) {
      return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
    }

    const resend = new Resend(apiKey);
    const caseId = shortId(lead.packet_id);
    const callerName = lead.caller?.full_name || 'Unknown caller';
    const firmName = lead.triage?.firm_id || lead.routing?.assigned_firm || 'your firm';
    const subject = `New case ${caseId} — ${callerName} for ${firmName}`;

    const { data, error } = await resend.emails.send({
      from,
      to: recipient_email,
      subject,
      html: buildHtml(lead),
    });

    if (error) {
      return NextResponse.json({ error: error.message ?? 'send failed' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: data?.id, recipient: recipient_email });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'unknown error' }, { status: 500 });
  }
}
