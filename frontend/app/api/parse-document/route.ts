// frontend/app/api/parse-document/route.ts
//
// Receives a multipart upload (file + packet_id), forwards the file to
// Unsiloed's parse API, polls until the job finishes, walks the returned
// chunks/segments to extract police-report fields, and PATCHes the matching
// lead in agent-py/data/leads.json.

import { NextResponse } from 'next/server';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';

const LEADS_PATH = path.join(process.cwd(), '..', 'agent-py', 'data', 'leads.json');
const UNSILOED_BASE = process.env.UNSILOED_API_URL || 'https://prod.visionapi.unsiloed.ai';

type Segment = {
  segment_type?: string;
  content?: string;
  markdown?: string;
  page_number?: number;
};

type ParseResult = {
  job_id: string;
  status: string;
  started_at?: string;
  finished_at?: string;
  total_chunks?: number;
  chunks?: Array<{ segments?: Segment[] }>;
  message?: string;
};

function flattenText(result: ParseResult): string {
  if (!result.chunks) return '';
  const parts: string[] = [];
  for (const chunk of result.chunks) {
    for (const seg of chunk.segments ?? []) {
      const txt = seg.markdown || seg.content;
      if (txt) parts.push(txt);
    }
  }
  return parts.join('\n');
}

function countSegments(result: ParseResult): number {
  if (!result.chunks) return 0;
  return result.chunks.reduce((n, c) => n + (c.segments?.length ?? 0), 0);
}

// Extract canonical police-report fields from a flattened text blob.
//
// Unsiloed serializes the PDF into markdown — labelled key/value lines plus
// markdown tables. We scan line-by-line and build a label -> value map, then
// pick the canonical fields out of it. Only the FIRST occurrence of each
// label wins, so later sections (e.g. "Officer Tanaka, Badge 31092" inside
// the narrative) can't poison earlier extractions.
function extractFields(text: string): Record<string, string | null> {
  const lines = text.split('\n').map((l) => l.trim());
  const kv: Record<string, string> = {};

  const put = (key: string, value: string) => {
    const k = key.trim().toLowerCase();
    const v = value.trim();
    if (!k || !v) return;
    if (!(k in kv)) kv[k] = v;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Markdown table row:  | Key: | Value |   or  | Key |  Value |
    const tableMatch = line.match(/^\|\s*([^|:]+?)\s*:?\s*\|\s*([^|]+?)\s*\|/);
    if (tableMatch) {
      put(tableMatch[1], tableMatch[2]);
      continue;
    }

    // "Key: Value" on one line.
    const inline = line.match(/^([A-Za-z][A-Za-z #\-]{1,30}?)\s*:\s*(.+)$/);
    if (inline) {
      put(inline[1], inline[2]);
      continue;
    }

    // Label-only on this line, value on the next non-empty line.
    const labelOnly = line.match(/^([A-Za-z][A-Za-z #\-]{1,30}?)\s*:\s*$/);
    if (labelOnly) {
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j]) {
          put(labelOnly[1], lines[j]);
          break;
        }
      }
    }
  }

  return {
    report_number: kv['report #'] || kv['report no'] || kv['report'] || null,
    incident_date: kv['incident date'] || null,
    badge_number: kv['badge #'] || kv['badge no'] || kv['badge'] || null,
    citing_officer: kv['officer'] || null,
    at_fault_driver: kv['at-fault driver'] || kv['at fault driver'] || null,
    citation_code: kv['citation code'] || kv['citation'] || null,
    location: kv['location'] || null,
  };
}

async function pollUntilDone(jobId: string, apiKey: string, maxMs = 90_000): Promise<ParseResult> {
  const start = Date.now();
  const url = `${UNSILOED_BASE}/parse/${jobId}`;
  let delay = 1500;
  while (Date.now() - start < maxMs) {
    const r = await fetch(url, {
      headers: { accept: 'application/json', 'api-key': apiKey },
    });
    if (!r.ok) {
      const body = await r.text();
      throw new Error(`Poll failed (${r.status}): ${body.slice(0, 200)}`);
    }
    const j = (await r.json()) as ParseResult;
    if (j.status === 'Succeeded') return j;
    if (j.status === 'Failed') throw new Error(`Parse failed: ${j.message || 'no detail'}`);
    await new Promise((res) => setTimeout(res, delay));
    delay = Math.min(delay + 500, 4000);
  }
  throw new Error('Parse timed out after 90s');
}

function patchLeadLegal(packetId: string, legal: Record<string, string | null>) {
  if (!existsSync(LEADS_PATH)) return;
  const leads = JSON.parse(readFileSync(LEADS_PATH, 'utf-8'));
  const idx = leads.findIndex((l: { packet_id: string }) => l.packet_id === packetId);
  if (idx === -1) return;
  leads[idx].legal = { ...(leads[idx].legal ?? {}), ...legal };
  // Mark report as filed when we extracted a number.
  if (legal.report_number) {
    leads[idx].legal.police_report_filed = 'Yes';
    leads[idx].legal.police_report_number = legal.report_number;
  }
  if (legal.citing_officer) leads[idx].legal.citing_officer = legal.citing_officer;
  if (legal.badge_number) leads[idx].legal.badge_number = legal.badge_number;
  if (legal.at_fault_driver) leads[idx].legal.at_fault_driver = legal.at_fault_driver;
  if (legal.citation_code) leads[idx].legal.citation_code = legal.citation_code;
  writeFileSync(LEADS_PATH, JSON.stringify(leads, null, 2));
}

export async function POST(req: Request) {
  const apiKey = process.env.UNSILOED_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'UNSILOED_API_KEY not configured' }, { status: 500 });
  }

  const form = await req.formData();
  const file = form.get('file');
  const packetId = form.get('packet_id');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file (multipart) is required' }, { status: 400 });
  }

  // Forward to Unsiloed.
  const upstream = new FormData();
  upstream.append('file', file, file.name);
  upstream.append('use_high_resolution', 'true');
  upstream.append('layout_analysis', 'smart_layout_detection');
  upstream.append('ocr_strategy', 'auto_detection');

  const submitStart = Date.now();
  const submit = await fetch(`${UNSILOED_BASE}/parse`, {
    method: 'POST',
    headers: { accept: 'application/json', 'api-key': apiKey },
    body: upstream,
  });

  if (!submit.ok) {
    const body = await submit.text();
    return NextResponse.json(
      { error: `Unsiloed submit failed (${submit.status}): ${body.slice(0, 300)}` },
      { status: 502 },
    );
  }

  const submitJson = (await submit.json()) as { job_id: string; status: string };
  const jobId = submitJson.job_id;

  try {
    const result = await pollUntilDone(jobId, apiKey);
    const elapsedMs = Date.now() - submitStart;

    const text = flattenText(result);
    const fields = extractFields(text);

    if (typeof packetId === 'string' && packetId) {
      patchLeadLegal(packetId, fields);
    }

    return NextResponse.json({
      ok: true,
      job_id: jobId,
      elapsed_ms: elapsedMs,
      total_chunks: result.total_chunks ?? 0,
      total_segments: countSegments(result),
      extracted_fields: fields,
      preview: text.slice(0, 500),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'parse failed', job_id: jobId },
      { status: 500 },
    );
  }
}
