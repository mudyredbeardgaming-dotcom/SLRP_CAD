import { NextRequest, NextResponse } from 'next/server';
import {
  discordEnabled, finishAuth, redeemTicket, redirectUriFor, startAuth, unlinkDiscord, verifyCredentials,
} from '@/lib/auth/discord';

export const dynamic = 'force-dynamic';

/** Public origin of the CAD (Railway sits behind a proxy). */
const originOf = (req: NextRequest) => {
  const proto = req.headers.get('x-forwarded-proto') || req.nextUrl.protocol.replace(':', '');
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || req.nextUrl.host;
  return `${proto}://${host}`;
};
/** The account without its password (what the browser keeps in its session). */
const publicAccount = (cred: any) => {
  const { password: _pw, ...rest } = cred;
  return rest;
};
const off = () => NextResponse.json({ ok: false, error: 'Discord sign-in is not configured on this CAD.' }, { status: 503 });

/**
 * GET  /api/auth/discord/status      -> { enabled }
 * GET  /api/auth/discord/login       -> redirect to Discord (sign in)
 * GET  /api/auth/discord/callback    -> Discord returns here; redirects back into the CAD
 */
export async function GET(req: NextRequest, { params }: { params: { action: string } }) {
  const origin = originOf(req);
  switch (params.action) {
    case 'status':
      return NextResponse.json({ enabled: discordEnabled() });
    case 'login':
      if (!discordEnabled()) return off();
      return NextResponse.redirect(startAuth('login', redirectUriFor(origin)));
    case 'callback': {
      const sp = req.nextUrl.searchParams;
      const to = await finishAuth(sp.get('state'), sp.get('code'), sp.get('error'));
      return NextResponse.redirect(`${origin}${to}`);
    }
    default:
      return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  }
}

/**
 * POST /api/auth/discord/link-start  { username, password } -> { url }  (open it to link Discord)
 * POST /api/auth/discord/unlink      { username, password } -> { ok }
 * POST /api/auth/discord/redeem      { ticket }             -> { officer }  (one-time, after /callback)
 */
export async function POST(req: NextRequest, { params }: { params: { action: string } }) {
  let body: any = {};
  try { body = await req.json(); } catch {}
  switch (params.action) {
    case 'link-start': {
      if (!discordEnabled()) return off();
      const cred = await verifyCredentials(body.username, body.password);
      if (!cred) return NextResponse.json({ ok: false, error: 'Wrong password.' }, { status: 401 });
      return NextResponse.json({ ok: true, url: startAuth('link', redirectUriFor(originOf(req)), cred.username) });
    }
    case 'unlink': {
      const cred = await verifyCredentials(body.username, body.password);
      if (!cred) return NextResponse.json({ ok: false, error: 'Wrong password.' }, { status: 401 });
      await unlinkDiscord(cred.username);
      return NextResponse.json({ ok: true });
    }
    case 'redeem': {
      const cred = await redeemTicket(body.ticket);
      if (!cred) return NextResponse.json({ ok: false, error: 'Sign-in link expired. Try again.' }, { status: 401 });
      return NextResponse.json({ ok: true, officer: publicAccount(cred) });
    }
    default:
      return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  }
}
