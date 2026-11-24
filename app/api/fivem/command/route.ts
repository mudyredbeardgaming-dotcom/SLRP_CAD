import { NextRequest, NextResponse } from 'next/server';
import { isBridgeEnabled } from '@/lib/fivem/auth';
import { acknowledgePending, enqueueCommand, normalizeCallsign } from '@/lib/fivem/store';
import { FiveMCommand, UNIT_STATUSES } from '@/lib/fivem/types';

export const dynamic = 'force-dynamic';

const cleanCallsigns = (list: unknown) =>
  (Array.isArray(list) ? list : []).map(normalizeCallsign).filter(Boolean);

/**
 * CAD browser -> bridge.
 *   { "action": "ack", "id": "<pending alert id>" }  dismiss a 911/panic alert
 *   { "action": "send", "command": { ...FiveMCommand } } queue a command for the game
 */
export async function POST(request: NextRequest) {
  if (!isBridgeEnabled()) {
    return NextResponse.json({ ok: false, error: 'FiveM bridge disabled' }, { status: 503 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Body must be JSON' }, { status: 400 });
  }

  if (body?.action === 'ack') {
    return NextResponse.json({ ok: acknowledgePending(String(body.id || '')) });
  }

  if (body?.action === 'send') {
    const c = body.command || {};
    let command: FiveMCommand | null = null;

    switch (c.type) {
      case 'call_assigned':
        if (c.call?.id) {
          command = {
            type: 'call_assigned',
            callsigns: cleanCallsigns(c.callsigns),
            call: {
              id: String(c.call.id),
              code: c.call.code,
              priority: c.call.priority != null ? String(c.call.priority) : undefined,
              address: c.call.address,
              postal: c.call.postal,
              description: c.call.description ? String(c.call.description).slice(0, 500) : undefined,
              // Position for the unit's GPS waypoint
              ...(Number.isFinite(Number(c.call.x)) && Number.isFinite(Number(c.call.y)) && c.call.x !== null && c.call.y !== null
                ? { x: Number(c.call.x), y: Number(c.call.y), gpsApprox: !!c.call.gpsApprox }
                : {}),
            },
          };
        }
        break;
      case 'call_closed':
        if (c.callId) command = { type: 'call_closed', callsigns: cleanCallsigns(c.callsigns), callId: String(c.callId) };
        break;
      case 'unit_status':
        if (c.callsign && UNIT_STATUSES.includes(c.status)) {
          command = { type: 'unit_status', callsign: normalizeCallsign(c.callsign), status: c.status };
        }
        break;
      case 'notify':
        if (c.message) {
          command = {
            type: 'notify',
            message: String(c.message).slice(0, 300),
            callsigns: c.callsigns ? cleanCallsigns(c.callsigns) : undefined,
          };
        }
        break;
      case 'aop_update':
        command = { type: 'aop_update', aop: String(c.aop ?? '').slice(0, 120) };
        break;
    }

    if (!command) {
      return NextResponse.json({ ok: false, error: 'Invalid or unknown command' }, { status: 400 });
    }
    return NextResponse.json({ ok: true, seq: enqueueCommand(command).seq });
  }

  return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
}
