// frontend/app/api/leads/route.ts
import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

const LEADS_PATH = path.join(process.cwd(), '..', 'agent-py', 'data', 'leads.json');

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const firmId = searchParams.get('firm_id');

  if (!existsSync(LEADS_PATH)) {
    return NextResponse.json([]);
  }

  const leads = JSON.parse(readFileSync(LEADS_PATH, 'utf-8'));

  if (firmId) {
    const filtered = leads.filter((l: any) => l.firm_id === firmId);
    return NextResponse.json(filtered);
  }

  return NextResponse.json(leads);
}
