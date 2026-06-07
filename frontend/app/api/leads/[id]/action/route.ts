// frontend/app/api/leads/[id]/action/route.ts
import { NextResponse } from 'next/server';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

const LEADS_PATH = path.join(process.cwd(), '..', 'agent-py', 'data', 'leads.json');

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { action, ...data } = await req.json();
  const leads = JSON.parse(readFileSync(LEADS_PATH, 'utf-8'));
  const idx = leads.findIndex((l: any) => l.packet_id === id);
  if (idx === -1) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const lead = leads[idx];

  switch (action) {
    case 'accept_schedule':
      lead.status = 'consult_booked';
      lead.routing.assigned_firm = data.firm;
      lead.scheduled_attorney = data.attorney;
      lead.scheduled_time = data.time;
      break;
    case 'approve_referral':
      lead.status = 'placing';
      break;
    case 'decline':
      lead.status = 'declined';
      lead.routing.decline_reason = data.reason || 'staff_declined';
      break;
    case 'request_info':
      lead.status = 'missing_info';
      break;
    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }

  writeFileSync(LEADS_PATH, JSON.stringify(leads, null, 2));
  return NextResponse.json(lead);
}
