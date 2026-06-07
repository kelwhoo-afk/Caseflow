// frontend/app/api/portal-token/route.ts
import { NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';

const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;

export async function POST(req: Request) {
  const { roomName } = await req.json();

  if (!API_KEY || !API_SECRET || !LIVEKIT_URL) {
    return NextResponse.json({ error: 'LiveKit not configured' }, { status: 500 });
  }

  const token = new AccessToken(API_KEY, API_SECRET, {
    identity: `portal-observer-${Date.now()}`,
    ttl: '15m',
  });

  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: false,
    canPublishData: false,
    canSubscribe: true,
  });

  const jwt = await token.toJwt();
  return NextResponse.json({
    serverUrl: LIVEKIT_URL,
    token: jwt,
  });
}
