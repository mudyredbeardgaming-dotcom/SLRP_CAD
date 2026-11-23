import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

/** Shared secret between the CAD host and the FiveM resource (see .env.example). */
const apiKey = () => process.env.FIVEM_API_KEY?.trim() || '';

export const isBridgeEnabled = () => apiKey().length > 0;

/**
 * Checks `Authorization: Bearer <FIVEM_API_KEY>` (or `x-api-key`).
 * Returns a NextResponse to send back on failure, or null when the caller is allowed.
 */
export function requireGameServer(request: NextRequest): NextResponse | null {
  const expected = apiKey();
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: 'FiveM bridge disabled: set FIVEM_API_KEY on the CAD host' },
      { status: 503 }
    );
  }

  const header = request.headers.get('authorization') || '';
  const provided = header.toLowerCase().startsWith('bearer ')
    ? header.slice(7).trim()
    : (request.headers.get('x-api-key') || '').trim();

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ ok: false, error: 'Invalid API key' }, { status: 401 });
  }
  return null;
}
