import { NextRequest, NextResponse } from 'next/server';
import { isBridgeEnabled } from '@/lib/fivem/auth';
import { createLinkCode, unlinkAccount } from '@/lib/fivem/characters';

export const dynamic = 'force-dynamic';

/**
 * CAD civilian portal <-> FiveM account linking.
 *   { "action": "code",   "username": "civilian1" } -> { code, expiresAt }  (player types /linkcad CODE in game)
 *   { "action": "unlink", "username": "civilian1" }
 *
 * Note: like the rest of the CAD API this trusts the username sent by the
 * browser; tighten it when real (JWT) auth is added.
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
  const username = String(body?.username || '').trim();
  if (!username) return NextResponse.json({ ok: false, error: 'username is required' }, { status: 400 });

  if (body.action === 'code') return NextResponse.json({ ok: true, ...createLinkCode(username) });
  if (body.action === 'unlink') return NextResponse.json(await unlinkAccount(username));
  return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
}
