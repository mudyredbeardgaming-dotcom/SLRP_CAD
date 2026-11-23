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

/** The player behind a character. `identifier` is the server's primary one (e.g. "license:abc..."). */
export interface FiveMOwner {
  identifier: string;
  identifiers?: string[];
  name?: string;
}

/** A framework character (QBCore citizenid, ESX identifier, ...). */
export interface GameCharacter {
  id: string;
  firstName: string;
  lastName: string;
  middleInitial?: string;
  /** Any of YYYY-MM-DD, MM/DD/YYYY, YYYY/MM/DD */
  dob?: string;
  /** 0/1, "m"/"f", "male"/"female" */
  gender?: string | number;
  phone?: string;
  address?: string;
  postal?: string;
  height?: string;
  weight?: string;
}

export interface GameLicense {
  /** CAD license type, e.g. "DRIVER LICENSE" (the resource maps framework names via Config.LicenseMap). */
  type: string;
  /** VALID (default), SUSPENDED, EXPIRED, PENDING */
  status?: string;
  number?: string;
  class?: string;
  motorcycle?: string;
  /** Expiration date (YYYY-MM-DD) or "auto" = one year from the CAD date. */
  expires?: string;
  restrictions?: string;
  /** Years until expiry for a new license (default 1). */
  validYears?: number;
}

export interface GameVehicle {
  plate: string;
  model?: string;
  make?: string;
  color?: string;
  year?: string;
  vin?: string;
  /** CAD vehicle type: SEDAN, COUPE, SUV, TRUCK, MOTORCYCLE, ... */
  vehicleType?: string;
  registrationStatus?: string;
  insuranceStatus?: string;
  /** Registration / insurance expiration (YYYY-MM-DD) or "auto" = one year from the CAD date. */
  registrationExpires?: string;
  insuranceExpires?: string;
  /** Years until registration/insurance expiry for a new vehicle (default 1). */
  validYears?: number;
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
      /** Command names as configured on the server, e.g. { linkcad: "linkcad" } */
      commands?: Record<string, string>;
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
  | { type: 'aop_update'; aop: string; setBy?: string }
  // Character sync (persisted to data/cad-data.json; see lib/fivem/characters.ts)
  | { type: 'account_link'; code: string; owner: FiveMOwner; playerName?: string }
  | { type: 'character_upsert'; owner: FiveMOwner; character: GameCharacter }
  | { type: 'license_set'; characterId: string; license: GameLicense }
  | { type: 'vehicle_register'; characterId: string; vehicle: GameVehicle }
  // Officer records written in game (persisted; see lib/fivem/records.ts)
  | { type: 'citation_issued'; citation: GameCitation };

/** Event types written to data/cad-data.json instead of the in-memory store. */
export const PERSISTED_EVENT_TYPES = ['account_link', 'character_upsert', 'license_set', 'vehicle_register', 'citation_issued'] as const;

/** One offense on a citation. */
export interface GameCitationCharge {
  charge: string;
  /** e.g. "VC 22350" */
  code?: string;
  /** INFRACTION (default), MISDEMEANOR, FELONY, WARNING, CORRECTABLE */
  type?: string;
  fine?: number;
  counts?: number;
}

/**
 * A citation an officer wrote in game. It becomes a CITATION record in the CAD,
 * listed under that officer's records and on the cited civilian's record.
 */
export interface GameCitation {
  /** The officer who wrote it. Matched to a CAD account by linked identifier, then by callsign. */
  officer: { callsign?: string; name?: string; identifier?: string; badge?: string };
  /** The cited person. `characterId` (framework id) links it to the synced civilian. */
  subject: { characterId?: string; name?: string; dob?: string; phone?: string; address?: string };
  charges: GameCitationCharge[];
  vehicle?: { plate?: string; make?: string; model?: string; color?: string; year?: string };
  location?: GameLocation;
  notes?: string;
  /** The game's own citation id, so re-sending the same citation does not duplicate it. */
  externalId?: string;
}

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
  commands?: Record<string, string>;
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
