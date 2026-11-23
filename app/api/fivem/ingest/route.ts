import { NextRequest, NextResponse } from 'next/server';
import { requireGameServer } from '@/lib/fivem/auth';
import { applyInboundEvent, markSeen } from '@/lib/fivem/store';
import { FiveMInboundEvent } from '@/lib/fivem/types';

export const dynamic = 'force-dynamic';

const MAX_EVENTS_PER_REQUEST = 100;

/**
 * Game server -> CAD.
 * Body: a single event `{ "type": "...", ... }` or a batch `{ "events": [ ... ] }`.
 */
export async function POST(request: NextRequest) {
  const denied = requireGameServer(request);
  if (denied) return denied;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Body must be JSON' }, { status: 400 });
  }

  const events: FiveMInboundEvent[] = Array.isArray(body?.events) ? body.events : [body];
  if (events.length > MAX_EVENTS_PER_REQUEST) {
    return NextResponse.json({ ok: false, error: `At most ${MAX_EVENTS_PER_REQUEST} events per request` }, { status: 413 });
  }

  markSeen();
  const errors = events
    .map((event, index) => ({ index, error: applyInboundEvent(event) }))
    .filter(r => r.error);

  return NextResponse.json({ ok: errors.length === 0, accepted: events.length - errors.length, errors });
}
