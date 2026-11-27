import { randomBytes } from 'crypto';
import { readDataFile } from '../dataStore';
import { mutate } from '../fivem/characters';

/**
 * "Sign in with Discord" for CAD accounts (website and desktop app).
 *
 * Off until DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET are set on the CAD host.
 *   DISCORD_REDIRECT_URI  optional, defaults to <site>/api/auth/discord/callback
 *                         (must match a redirect in the Discord developer portal)
 *
 * Flow:
 *   Link:   signed-in user -> POST /link-start (username + password) -> Discord
 *           -> /callback stores officerCredentials[].discord = { id, username, ... }
 *   Login:  /login -> Discord -> /callback finds the account with that Discord id
 *           -> one-time ticket -> /?discordTicket=... -> the CAD redeems it (POST /redeem)
 *
 * Only Discord's "identify" scope is requested (id, username, avatar).
 */

const STATE_TTL_MS = 10 * 60_000;
const TICKET_TTL_MS = 2 * 60_000;
const PROTECT_MS = 15 * 60_000;

// Overridable for tests; production uses Discord's real endpoints.
const OAUTH_BASE = () => (process.env.DISCORD_OAUTH_BASE || 'https://discord.com/oauth2').replace(/\/+$/, '');
const API_BASE = () => (process.env.DISCORD_API_BASE || 'https://discord.com/api').replace(/\/+$/, '');

type Pending = { mode: 'login' | 'link'; username?: string; redirectUri: string; expires: number };
type Ticket = { username: string; expires: number };
interface DiscordState {
  states: Map<string, Pending>;
  tickets: Map<string, Ticket>;
  /** username -> latest link (or null = unlinked), re-applied on browser saves for PROTECT_MS */
  links: Map<string, { link: any | null; at: number }>;
}
const g = globalThis as unknown as { __strataDiscord?: DiscordState };
const S: DiscordState = g.__strataDiscord ?? (g.__strataDiscord = { states: new Map(), tickets: new Map(), links: new Map() });

const token = () => randomBytes(24).toString('base64url');
const sweep = () => {
  const now = Date.now();
  S.states.forEach((v, k) => { if (v.expires < now) S.states.delete(k); });
  S.tickets.forEach((v, k) => { if (v.expires < now) S.tickets.delete(k); });
};

export const discordEnabled = () => !!(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET);

export const redirectUriFor = (origin: string) =>
  process.env.DISCORD_REDIRECT_URI || `${origin.replace(/\/+$/, '')}/api/auth/discord/callback`;

/** Discord authorize URL for a new login or link attempt. */
export function startAuth(mode: 'login' | 'link', redirectUri: string, username?: string) {
  sweep();
  const state = token();
  S.states.set(state, { mode, username, redirectUri, expires: Date.now() + STATE_TTL_MS });
  const q = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID || '',
    response_type: 'code',
    scope: 'identify',
    redirect_uri: redirectUri,
    state,
    prompt: mode === 'login' ? 'none' : 'consent',
  });
  return `${OAUTH_BASE()}/authorize?${q.toString()}`;
}

/** Username + password check against the data file (the CAD's login is browser-side). */
export async function verifyCredentials(username: unknown, password: unknown) {
  const data = (await readDataFile()) || {};
  const cred = (data.officerCredentials || []).find((c: any) =>
    String(c.username).toLowerCase() === String(username || '').toLowerCase() && c.password === password);
  return cred || null;
}

async function discordUser(code: string, redirectUri: string) {
  const tokenRes = await fetch(`${API_BASE()}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID || '',
      client_secret: process.env.DISCORD_CLIENT_SECRET || '',
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });
  if (!tokenRes.ok) throw new Error(`Discord token exchange failed (${tokenRes.status})`);
  const { access_token } = await tokenRes.json();
  const meRes = await fetch(`${API_BASE()}/users/@me`, { headers: { Authorization: `Bearer ${access_token}` } });
  if (!meRes.ok) throw new Error(`Discord user lookup failed (${meRes.status})`);
  const me = await meRes.json();
  if (!me?.id) throw new Error('Discord returned no user');
  return {
    id: String(me.id),
    username: String(me.username || ''),
    displayName: String(me.global_name || me.username || ''),
    avatar: me.avatar ? `https://cdn.discordapp.com/avatars/${me.id}/${me.avatar}.png?size=64` : null,
  };
}

/**
 * Finish the Discord round trip. Returns where to send the browser:
 *   '/?discord=linked' | '/?discordTicket=...' | '/?discordError=<reason>'
 */
export async function finishAuth(state: unknown, code: unknown, error?: unknown): Promise<string> {
  sweep();
  const pending = S.states.get(String(state || ''));
  if (pending) S.states.delete(String(state));
  if (!pending) return '/?discordError=expired';
  if (error || !code) return `/?discordError=${error === 'access_denied' ? 'cancelled' : 'failed'}`;

  let user;
  try {
    user = await discordUser(String(code), pending.redirectUri);
  } catch (e) {
    console.error('Discord sign-in failed:', e);
    return '/?discordError=failed';
  }

  if (pending.mode === 'link') {
    const ok = await mutate(data => {
      const creds: any[] = Array.isArray(data.officerCredentials) ? data.officerCredentials : [];
      const cred = creds.find(c => c.username === pending.username);
      if (!cred) return false;
      // one Discord account -> one CAD account
      creds.forEach(other => {
        if (other !== cred && other.discord?.id === user.id) {
          delete other.discord;
          S.links.set(other.username, { link: null, at: Date.now() });
        }
      });
      cred.discord = { ...user, linkedAt: new Date().toISOString() };
      S.links.set(cred.username, { link: cred.discord, at: Date.now() });
      return true;
    });
    return ok ? '/?discord=linked' : '/?discordError=account';
  }

  const data = (await readDataFile()) || {};
  const cred = (data.officerCredentials || []).find((c: any) => c.discord?.id === user.id);
  if (!cred) return '/?discordError=not-linked';
  const ticket = token();
  S.tickets.set(ticket, { username: cred.username, expires: Date.now() + TICKET_TTL_MS });
  return `/?discordTicket=${encodeURIComponent(ticket)}`;
}

/** One-time ticket -> the CAD account to sign in (same object the password login uses). */
export async function redeemTicket(ticket: unknown) {
  sweep();
  const t = S.tickets.get(String(ticket || ''));
  if (!t) return null;
  S.tickets.delete(String(ticket));
  const data = (await readDataFile()) || {};
  return (data.officerCredentials || []).find((c: any) => c.username === t.username) || null;
}

export async function unlinkDiscord(username: string) {
  return mutate(data => {
    const cred = (data.officerCredentials || []).find((c: any) => c.username === username);
    if (cred) delete cred.discord;
    S.links.set(username, { link: null, at: Date.now() });
    return !!cred;
  });
}

/** Keep recent link / unlink changes when a browser saves data it loaded before them. */
export function replayDiscordLinks(data: any) {
  if (!data || !Array.isArray(data.officerCredentials)) return data;
  const cutoff = Date.now() - PROTECT_MS;
  S.links.forEach((entry, username) => {
    if (entry.at < cutoff) return void S.links.delete(username);
    const cred = data.officerCredentials.find((c: any) => c.username === username);
    if (!cred) return;
    if (entry.link) cred.discord = entry.link;
    else delete cred.discord;
  });
  return data;
}
