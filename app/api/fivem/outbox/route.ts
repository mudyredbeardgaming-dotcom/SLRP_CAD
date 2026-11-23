import { NextRequest, NextResponse } from 'next/server';
import { requireGameServer } from '@/lib/fivem/auth';
import { getOutbox, markSeen } from '@/lib/fivem/store';

export const dynamic = 'force-dynamic';

/**
 * CAD -> game server. The FiveM resource polls this every few seconds:
 *   GET /api/fivem/outbox            -> first poll, returns only the cursor
 *   GET /api/fivem/outbox?since=42   -> commands queued after #42
 */
export async function GET(request: NextRequest) {
  const denied = requireGameServer(request);
  if (denied) return denied;

  markSeen();
  const raw = request.nextUrl.searchParams.get('since');
  const since = raw === null || raw === '' || Number.isNaN(Number(raw)) ? null : Number(raw);
  return NextResponse.json({ ok: true, ...getOutbox(since) });
}
