/**
 * StrataMDT <-> FiveM bridge protocol.
 *
 * Direction                     Transport
 * ---------------------------   ---------------------------------------------
 * Game server -> CAD (inbound)  POST /api/fivem/ingest   (Bearer FIVEM_API_KEY)
 * CAD -> Game server (outbound) GET  /api/fivem/outbox   (Bearer FIVEM_API_KEY, polled by the game)
 * Game server lookups           GET  /api/fivem/lookup   (Bearer FIVEM_API_KEY)
 * CAD browser <- bridge state   GET  /api/fivem/state    (polled by the CAD UI)
 * CAD browser -> bridge         POST /api/fivem/command  (queue an outbound command / ack an alert)
 *
 * The game server always initiates the connection (push events, poll for
 * commands), so it never needs an open inbound port. See fivem/README.md.
 */

export const FIVEM_PROTOCOL_VERSION = 1;

/** Unit statuses understood by the CAD (matches unit.status in CADSystem). */
export type UnitStatus = 'available' | 'busy' | 'unavailable' | 'enroute' | 'onscene' | 'panic';

export const UNIT_STATUSES: UnitStatus[] = ['available', 'busy', 'unavailable', 'enroute', 'onscene', 'panic'];

export interface GameLocation {
  street?: string;
  crossStreet?: string;
  zone?: string;
  postal?: string;
  x?: number;
  y?: number;
  z?: number;
  heading?: number;
}

/** Live position/vehicle data for one player who has set a callsign in game. */
export interface UnitTelemetry {
  callsign: string;
  playerName?: string;
  serverId?: number;
  location?: GameLocation;
  vehicle?: { model?: string; plate?: string; speed?: number } | null;
  /** Set by the CAD when received (ms since epoch). */
  updatedAt?: number;
}

// ---------------------------------------------------------------------------
// Inbound: game server -> CAD
// ---------------------------------------------------------------------------

export type FiveMInboundEvent =
  | {
      type: 'heartbeat';
      serverName?: string;
      playerCount?: number;
      maxPlayers?: number;
      resourceVersion?: string;
    }
  | { type: 'unit_update'; units: UnitTelemetry[] }
  | { type: 'unit_left'; callsign: string }
  | { type: 'unit_status'; callsign: string; status: UnitStatus }
  | { type: 'panic'; callsign: string; officer?: string; location?: GameLocation }
  | {
      type: 'call_911';
      caller?: string;
      phone?: string;
      description: string;
      location?: GameLocation;
      serverId?: number;
    }
  | { type: 'aop_update'; aop: string; setBy?: string };

/**
 * Events re-broadcast to CAD browsers. Every connected CAD applies these
 * locally; they are idempotent (setting a status twice is harmless).
 */
export interface BridgeEvent {
  seq: number;
  at: number;
  event: Extract<FiveMInboundEvent, { type: 'unit_status' | 'panic' | 'aop_update' | 'unit_left' }>;
}

/**
 * Items that need a human (dispatcher) to act on exactly once, e.g. a 911
 * call that should become a CAD call. They stay queued until acknowledged.
 */
export interface PendingAlert {
  id: string;
  kind: 'call_911' | 'panic';
  receivedAt: number;
  callsign?: string;
  officer?: string;
  caller?: string;
  phone?: string;
  description?: string;
  location?: GameLocation;
  serverId?: number;
}

// ---------------------------------------------------------------------------
// Outbound: CAD -> game server
// ---------------------------------------------------------------------------

export interface OutboundCall {
  id: string;
  code?: string;
  priority?: string;
  address?: string;
  postal?: string;
  description?: string;
}

export type FiveMCommand =
  | { type: 'call_assigned'; callsigns: string[]; call: OutboundCall }
  | { type: 'call_closed'; callsigns: string[]; callId: string }
  | { type: 'unit_status'; callsign: string; status: UnitStatus }
  | { type: 'notify'; message: string; callsigns?: string[] }
  | { type: 'aop_update'; aop: string };

export interface OutboxEntry {
  seq: number;
  at: number;
  command: FiveMCommand;
}

// ---------------------------------------------------------------------------
// State served to the CAD UI
// ---------------------------------------------------------------------------

export interface FiveMServerInfo {
  serverName?: string;
  playerCount?: number;
  maxPlayers?: number;
  resourceVersion?: string;
  lastHeartbeat?: number;
}

export interface FiveMBridgeState {
  /** False when FIVEM_API_KEY is not configured on the CAD host. */
  enabled: boolean;
  /** True when a heartbeat arrived recently. */
  connected: boolean;
  protocolVersion: number;
  server: FiveMServerInfo;
  aop: string | null;
  telemetry: Record<string, UnitTelemetry>;
  pending: PendingAlert[];
  events: BridgeEvent[];
  /** Highest event seq the server has issued; pass back as `since`. */
  cursor: number;
}
