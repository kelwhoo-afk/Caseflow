// frontend/app/api/leads/[id]/route.ts
import { NextResponse } from 'next/server';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';

const LEADS_PATH = path.join(process.cwd(), '..', 'agent-py', 'data', 'leads.json');

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!existsSync(LEADS_PATH)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const leads = JSON.parse(readFileSync(LEADS_PATH, 'utf-8'));
  const lead = leads.find((l: any) => l.packet_id === id);
  if (!lead) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(lead);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const updates = await req.json();
  const leads = JSON.parse(readFileSync(LEADS_PATH, 'utf-8'));
  const idx = leads.findIndex((l: any) => l.packet_id === id);
  if (idx === -1) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  // Deep merge updates.
  function merge(base: any, patch: any) {
    for (const key of Object.keys(patch)) {
      if (typeof patch[key] === 'object' && patch[key] !== null && !Array.isArray(patch[key])) {
        base[key] = base[key] || {};
        merge(base[key], patch[key]);
      } else {
        base[key] = patch[key];
      }
    }
  }
  merge(leads[idx], updates);
  writeFileSync(LEADS_PATH, JSON.stringify(leads, null, 2));
  return NextResponse.json(leads[idx]);
}
