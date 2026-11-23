import { NextRequest, NextResponse } from 'next/server';
import { requireGameServer } from '@/lib/fivem/auth';
import { applyInboundEvent, markSeen } from '@/lib/fivem/store';
import { linkAccount, registerVehicle, setLicense, upsertCharacter } from '@/lib/fivem/characters';
import { issueCitation } from '@/lib/fivem/records';
import { FiveMInboundEvent } from '@/lib/fivem/types';

export const dynamic = 'force-dynamic';

const MAX_EVENTS_PER_REQUEST = 100;

/** Character-sync events are written to the CAD data file and return a result. */
async function applyPersisted(event: any): Promise<unknown | undefined> {
  switch (event?.type) {
    case 'account_link':
      return linkAccount(event.code, event.owner, event.playerName);
    case 'character_upsert':
      return upsertCharacter(event.owner, event.character);
    case 'license_set':
      return setLicense(event.characterId, event.license);
    case 'vehicle_register':
      return registerVehicle(event.characterId, event.vehicle);
    case 'citation_issued':
      return issueCitation(event.citation);
    default:
      return undefined;
  }
}

/**
 * Game server -> CAD.
 * Body: a single event `{ "type": "...", ... }` or a batch `{ "events": [ ... ] }`.
 * Response: { ok, accepted, errors: [{ index, error }], results: [{ index, result }] }
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
  const errors: { index: number; error: string }[] = [];
  const results: { index: number; result: unknown }[] = [];

  // In order: a character must exist before its licenses/vehicles
  for (let index = 0; index < events.length; index++) {
    const event = events[index];
    try {
      const result = await applyPersisted(event);
      if (result !== undefined) {
        results.push({ index, result });
        continue;
      }
      const error = applyInboundEvent(event);
      if (error) errors.push({ index, error });
    } catch (e: any) {
      errors.push({ index, error: e?.message || 'failed' });
    }
  }

  return NextResponse.json({ ok: errors.length === 0, accepted: events.length - errors.length, errors, results });
}
