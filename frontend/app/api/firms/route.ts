// frontend/app/api/firms/route.ts
import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

const FIRMS_PATH = path.join(process.cwd(), '..', 'agent-py', 'data', 'firms', 'auto_network_firms.json');

export async function GET() {
  if (!existsSync(FIRMS_PATH)) {
    return NextResponse.json([]);
  }
  const firms = JSON.parse(readFileSync(FIRMS_PATH, 'utf-8'));
  return NextResponse.json(firms);
}
