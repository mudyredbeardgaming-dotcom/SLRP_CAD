import { NextRequest, NextResponse } from 'next/server';
import { getBridgeState } from '@/lib/fivem/store';

export const dynamic = 'force-dynamic';

/**
 * CAD browser <- bridge. Polled by the CAD UI (lib/fivem/useFiveMBridge.ts).
 *   ?since=<cursor>  only return events newer than the cursor
 *   (no since)       return the current cursor with no events
 */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('since');
  const since = raw === null || raw === '' || Number.isNaN(Number(raw)) ? null : Number(raw);
  return NextResponse.json(getBridgeState(since));
}
