import {
  BridgeEvent,
  FIVEM_PROTOCOL_VERSION,
  FiveMBridgeState,
  FiveMCommand,
  FiveMInboundEvent,
  FiveMServerInfo,
  OutboxEntry,
  PendingAlert,
  UNIT_STATUSES,
  UnitTelemetry,
} from './types';
import { isBridgeEnabled } from './auth';

/**
 * In-memory bridge state (server side only).
 *
 * Live telemetry is ephemeral by nature, so it is kept in memory rather than
 * in data/cad-data.json. That also keeps the game from racing with the CAD
 * clients, which save the whole data file. Note: this assumes a single
 * Next.js server process (the current Railway setup). Moving to multiple
 * instances would need a shared store such as Redis.
 */

/** No heartbeat for this long = disconnected. The resource sends one every 15s. */
const HEARTBEAT_TIMEOUT_MS = 45_000;
/** Drop a unit's live position when it hasn't reported for this long. */
const TELEMETRY_TTL_MS = 60_000;
const MAX_EVENTS = 200;
const MAX_OUTBOX = 500;
const MAX_PENDING = 100;

interface StoreShape {
  server: FiveMServerInfo;
  aop: string | null;
  telemetry: Map<string, UnitTelemetry>;
  events: BridgeEvent[];
  eventSeq: number;
  pending: PendingAlert[];
  outbox: OutboxEntry[];
  outboxSeq: number;
}

// Kept on globalThis so dev-mode hot reloads don't wipe the state.
const g = globalThis as unknown as { __strataFiveM?: StoreShape };
const store: StoreShape =
  g.__strataFiveM ??
  (g.__strataFiveM = {
    server: {},
    aop: null,
    telemetry: new Map(),
    events: [],
    eventSeq: 0,
    pending: [],
    outbox: [],
    outboxSeq: 0,
  });

export const normalizeCallsign = (callsign: unknown) => String(callsign ?? '').trim().toUpperCase();

const pushEvent = (event: BridgeEvent['event']) => {
  store.eventSeq += 1;
  store.events.push({ seq: store.eventSeq, at: Date.now(), event });
  if (store.events.length > MAX_EVENTS) store.events.splice(0, store.events.length - MAX_EVENTS);
};

const pushPending = (alert: Omit<PendingAlert, 'id' | 'receivedAt'>) => {
  const receivedAt = Date.now();
  store.pending.push({ id: `${alert.kind}-${receivedAt}-${Math.random().toString(36).slice(2, 8)}`, receivedAt, ...alert });
  if (store.pending.length > MAX_PENDING) store.pending.splice(0, store.pending.length - MAX_PENDING);
};

const pruneTelemetry = () => {
  const cutoff = Date.now() - TELEMETRY_TTL_MS;
  store.telemetry.forEach((t, key) => {
    if ((t.updatedAt ?? 0) < cutoff) store.telemetry.delete(key);
  });
};

/** Apply one event from the game server. Returns an error string if it was rejected. */
export function applyInboundEvent(raw: FiveMInboundEvent): string | null {
  if (!raw || typeof raw !== 'object' || typeof (raw as any).type !== 'string') return 'missing event type';
  const now = Date.now();

  switch (raw.type) {
    case 'heartbeat':
      store.server = {
        serverName: raw.serverName ?? store.server.serverName,
        playerCount: raw.playerCount,
        maxPlayers: raw.maxPlayers,
        resourceVersion: raw.resourceVersion ?? store.server.resourceVersion,
        commands: raw.commands ?? store.server.commands,
        lastHeartbeat: now,
      };
      return null;

    case 'unit_update': {
      if (!Array.isArray(raw.units)) return 'unit_update.units must be an array';
      for (const u of raw.units) {
        const callsign = normalizeCallsign(u?.callsign);
        if (!callsign) continue;
        store.telemetry.set(callsign, { ...u, callsign, updatedAt: now });
      }
      return null;
    }

    case 'unit_left': {
      const callsign = normalizeCallsign(raw.callsign);
      store.telemetry.delete(callsign);
      pushEvent({ type: 'unit_left', callsign });
      return null;
    }

    case 'unit_status': {
      const callsign = normalizeCallsign(raw.callsign);
      if (!callsign) return 'unit_status.callsign is required';
      if (!UNIT_STATUSES.includes(raw.status)) return `unknown status "${raw.status}"`;
      pushEvent({ type: 'unit_status', callsign, status: raw.status });
      return null;
    }

    case 'panic': {
      const callsign = normalizeCallsign(raw.callsign);
      if (!callsign) return 'panic.callsign is required';
      pushEvent({ type: 'panic', callsign, officer: raw.officer, location: raw.location });
      pushPending({ kind: 'panic', callsign, officer: raw.officer, location: raw.location });
      return null;
    }

    case 'call_911':
      if (!raw.description) return 'call_911.description is required';
      pushPending({
        kind: 'call_911',
        caller: raw.caller,
        phone: raw.phone,
        description: String(raw.description).slice(0, 2000),
        location: raw.location,
        serverId: raw.serverId,
      });
      return null;

    case 'aop_update':
      store.aop = String(raw.aop ?? '').slice(0, 120) || null;
      pushEvent({ type: 'aop_update', aop: store.aop ?? '', setBy: raw.setBy });
      return null;

    default:
      return `unknown event type "${(raw as any).type}"`;
  }
}

export function getBridgeState(since: number | null): FiveMBridgeState {
  pruneTelemetry();
  const lastHeartbeat = store.server.lastHeartbeat ?? 0;
  return {
    enabled: isBridgeEnabled(),
    connected: Date.now() - lastHeartbeat < HEARTBEAT_TIMEOUT_MS,
    protocolVersion: FIVEM_PROTOCOL_VERSION,
    server: store.server,
    aop: store.aop,
    telemetry: Object.fromEntries(store.telemetry),
    pending: store.pending,
    // since=null means "just give me the cursor" (a fresh client shouldn't replay history)
    events: since === null ? [] : store.events.filter(e => e.seq > since),
    cursor: store.eventSeq,
  };
}

export function acknowledgePending(id: string): boolean {
  const before = store.pending.length;
  store.pending = store.pending.filter(p => p.id !== id);
  return store.pending.length !== before;
}

export function enqueueCommand(command: FiveMCommand): OutboxEntry {
  if (command.type === 'aop_update') store.aop = command.aop || null;
  store.outboxSeq += 1;
  const entry = { seq: store.outboxSeq, at: Date.now(), command };
  store.outbox.push(entry);
  if (store.outbox.length > MAX_OUTBOX) store.outbox.splice(0, store.outbox.length - MAX_OUTBOX);
  return entry;
}

/** Any authenticated request from the game server counts as a sign of life. */
export function markSeen() {
  store.server.lastHeartbeat = Date.now();
}

/**
 * Commands for the game server to run since `since`.
 * - since = null: a resource that just started; return only the cursor so it
 *   doesn't replay old notifications.
 * - since > cursor: the CAD restarted and its sequence reset, so everything
 *   still queued is new to the game server.
 */
export function getOutbox(since: number | null) {
  if (since === null) return { commands: [] as OutboxEntry[], cursor: store.outboxSeq };
  const commands = since > store.outboxSeq ? store.outbox : store.outbox.filter(c => c.seq > since);
  return { commands, cursor: store.outboxSeq };
}
