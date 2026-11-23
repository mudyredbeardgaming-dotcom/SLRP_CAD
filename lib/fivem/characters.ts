import { randomInt } from 'crypto';
import { readDataFile, withDataLock, writeDataFile } from '../dataStore';
import { cadDatePlusYears, cadToday, isPastCadDate } from '../cadDate';
import type { FiveMOwner, GameCharacter, GameLicense, GameVehicle } from './types';

/**
 * In-game characters, licenses and vehicles -> CAD civilians.
 *
 * These are written straight into data/cad-data.json. CAD browsers also save
 * that whole file every few seconds, so a browser holding slightly old data
 * could drop what the game just added. To prevent that, every game change is
 * remembered here for PROTECT_MS and re-applied on each /api/save-data
 * (`replayGameChanges`).
 */

const PROTECT_MS = 15 * 60_000;
const LINK_CODE_TTL_MS = 10 * 60_000;

type Stamped<T> = T & { at: number };
interface ProtectState {
  /** civilian id -> latest snapshot from the game */
  civilians: Map<string, Stamped<{ civilian: any }>>;
  /** DMV record id -> where it lives */
  records: Map<string, Stamped<{ civId: string; record: any }>>;
  /** CAD username -> link (or null for a recent unlink) */
  links: Map<string, Stamped<{ link: any | null }>>;
  /** link code -> CAD username */
  codes: Map<string, { username: string; expires: number }>;
}

const g = globalThis as unknown as { __strataCharSync?: ProtectState };
const P: ProtectState =
  g.__strataCharSync ??
  (g.__strataCharSync = { civilians: new Map(), records: new Map(), links: new Map(), codes: new Map() });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Dates follow the CAD clock (Pacific time), see lib/cadDate.ts
const today = () => cadToday();
const addYears = (years: number) => cadDatePlusYears(Number.isFinite(years) && years > 0 ? years : 1);
/** Default validity for new licenses and registrations, from the CAD date. */
const DEFAULT_VALID_YEARS = 1;
/**
 * A date the player picked, or "auto" (one year from the CAD date).
 * Returns '' when the value is missing or not a usable date.
 */
const chosenDate = (v: unknown) => {
  if (v == null || v === '') return '';
  if (String(v).trim().toLowerCase() === 'auto') return addYears(DEFAULT_VALID_YEARS);
  const iso = isoDate(v);
  const year = Number(iso.slice(0, 4));
  return iso && year >= 1900 && year <= 2200 ? iso : '';
};
/** A new future date lifts an EXPIRED status; any other status is kept. */
const revive = (status: unknown, date: string) =>
  String(status || '').toUpperCase() === 'EXPIRED' && date && !isPastCadDate(date) ? 'VALID' : status;
const upper = (v: unknown) => String(v ?? '').trim().toUpperCase();
const clean = (v: unknown, max = 80) => String(v ?? '').trim().slice(0, max);
const civIdFor = (characterId: unknown) => `FIVEM-${String(characterId ?? '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64)}`;

/** Small stable hash, used for license numbers / VINs that don't change between syncs. */
const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};
const digits = (seed: string, n: number) => String(hash(seed)).padStart(10, '0').slice(-n);
const VIN_CHARS = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';
const vinFor = (plate: string) => {
  let h = hash(`vin:${plate}`);
  let out = '';
  for (let i = 0; i < 17; i++) {
    out += VIN_CHARS[h % VIN_CHARS.length];
    h = hash(out + plate);
  }
  return out;
};

/** "1990-05-15", "05/15/1990", "1990/05/15" -> "1990-05-15" (CAD date inputs need ISO). */
const isoDate = (v: unknown) => {
  const s = String(v ?? '').trim();
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (m) return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  return '';
};

/** 0/1, "m"/"f", "male"/"female" -> "M"/"F" (CAD's sex field). */
const sexOf = (v: unknown) => {
  const s = String(v ?? '').trim().toLowerCase();
  if (s === '1' || s.startsWith('f')) return 'F';
  if (s === '0' || s.startsWith('m')) return 'M';
  return '';
};

const ensureShape = (data: any) => {
  data.civilians = Array.isArray(data.civilians) ? data.civilians : [];
  data.officerCredentials = Array.isArray(data.officerCredentials) ? data.officerCredentials : [];
  return data;
};

/** CAD account whose FiveM link matches this player, if any. */
const linkedUsername = (data: any, owner?: FiveMOwner) => {
  const id = owner?.identifier;
  if (!id) return null;
  const cred = data.officerCredentials.find((c: any) => c?.fivemLink?.identifier === id);
  return cred?.username || null;
};

export async function mutate<T>(fn: (data: any) => T): Promise<T> {
  return withDataLock(async () => {
    const data = ensureShape((await readDataFile()) || {});
    const result = fn(data);
    await writeDataFile(data);
    return result;
  });
}

const findCivilian = (data: any, characterId: unknown) => {
  const id = civIdFor(characterId);
  return data.civilians.find((c: any) => c.id === id);
};

const protectCivilian = (civ: any) => P.civilians.set(civ.id, { civilian: JSON.parse(JSON.stringify(civ)), at: Date.now() });
const protectRecord = (civId: string, record: any) =>
  P.records.set(record.id, { civId, record: JSON.parse(JSON.stringify(record)), at: Date.now() });

// ---------------------------------------------------------------------------
// Account linking (CAD login <-> FiveM player)
// ---------------------------------------------------------------------------

/** Called by the CAD civilian portal. Returns a short code the player types in game. */
export function createLinkCode(username: string) {
  const now = Date.now();
  P.codes.forEach((v, k) => {
    if (v.expires < now || v.username === username) P.codes.delete(k);
  });
  let code = '';
  do code = Array.from({ length: 6 }, () => VIN_CHARS[randomInt(VIN_CHARS.length)]).join('');
  while (P.codes.has(code));
  const expires = now + LINK_CODE_TTL_MS;
  P.codes.set(code, { username, expires });
  return { code, expiresAt: expires };
}

export async function linkAccount(code: unknown, owner: FiveMOwner, playerName?: string) {
  const entry = P.codes.get(upper(code));
  if (!entry || entry.expires < Date.now()) throw new Error('Link code is invalid or has expired. Generate a new one in the CAD.');
  if (!owner?.identifier) throw new Error('Missing player identifier');
  P.codes.delete(upper(code));

  return mutate(data => {
    const cred = data.officerCredentials.find((c: any) => c.username === entry.username);
    if (!cred) throw new Error('CAD account no longer exists');

    // One game identity -> one CAD account
    for (const other of data.officerCredentials) {
      if (other !== cred && other.fivemLink?.identifier === owner.identifier) {
        delete other.fivemLink;
        P.links.set(other.username, { link: null, at: Date.now() });
      }
    }
    cred.fivemLink = { identifier: owner.identifier, identifiers: owner.identifiers || [], playerName: clean(playerName, 64), linkedAt: new Date().toISOString() };
    P.links.set(cred.username, { link: cred.fivemLink, at: Date.now() });

    // Claim characters this player already created in game
    let claimed = 0;
    for (const civ of data.civilians) {
      if (civ.fivem?.identifier === owner.identifier && civ.ownerUsername !== cred.username) {
        civ.ownerUsername = cred.username;
        protectCivilian(civ);
        claimed++;
      }
    }
    return { username: cred.username, claimed };
  });
}

export async function unlinkAccount(username: string) {
  return mutate(data => {
    const cred = data.officerCredentials.find((c: any) => c.username === username);
    if (cred) delete cred.fivemLink;
    P.links.set(username, { link: null, at: Date.now() });
    return { ok: true };
  });
}

// ---------------------------------------------------------------------------
// Characters, licenses, vehicles
// ---------------------------------------------------------------------------

export async function upsertCharacter(owner: FiveMOwner, ch: GameCharacter) {
  if (!ch?.id) throw new Error('character.id is required');
  if (!ch.firstName || !ch.lastName) throw new Error('character.firstName and lastName are required');

  return mutate(data => {
    const id = civIdFor(ch.id);
    const ownerUsername = linkedUsername(data, owner);
    // Only fields the game actually sent; CAD-only details (height, scars...) are left alone
    const fromGame: any = {
      firstName: clean(ch.firstName, 40),
      lastName: clean(ch.lastName, 40),
    };
    if (ch.middleInitial) fromGame.middleInitial = clean(ch.middleInitial, 1).toUpperCase();
    if (isoDate(ch.dob)) fromGame.dateOfBirth = isoDate(ch.dob);
    if (sexOf(ch.gender)) fromGame.sex = sexOf(ch.gender);
    if (ch.phone) fromGame.cellPhone = clean(ch.phone, 20);
    if (ch.address) fromGame.streetResidence = clean(ch.address, 120);
    if (ch.postal) fromGame.postalCode = clean(ch.postal, 10);
    if (ch.height) fromGame.height = clean(ch.height, 10);
    if (ch.weight) fromGame.weight = clean(ch.weight, 10);

    const fivem = { characterId: String(ch.id), identifier: owner?.identifier || null, playerName: clean(owner?.name, 64) || undefined };
    let civ = data.civilians.find((c: any) => c.id === id);
    let created = false;
    if (civ) {
      Object.assign(civ, fromGame, { fivem: { ...civ.fivem, ...fivem, syncedAt: new Date().toISOString() } });
      if (ownerUsername) civ.ownerUsername = ownerUsername;
    } else {
      created = true;
      civ = {
        id,
        photo: null,
        firstName: '',
        lastName: '',
        middleInitial: '',
        dateOfBirth: '',
        sex: 'M',
        aka: '',
        streetResidence: '',
        postalCode: '',
        height: '',
        weight: '',
        hairColor: 'BLACK',
        eyeColor: 'BROWN',
        scarsMarksTattoos: '',
        cellPhone: '',
        organDonor: false,
        deceased: false,
        records: [],
        dmvRecords: [],
        ...fromGame,
        ownerUsername: ownerUsername || null,
        fivem: { ...fivem, syncedAt: new Date().toISOString() },
        createdAt: new Date().toISOString(),
      };
      data.civilians.push(civ);
    }
    protectCivilian(civ);
    return { civilianId: id, created, linkedTo: civ.ownerUsername || null };
  });
}

export async function setLicense(characterId: unknown, lic: GameLicense) {
  const type = upper(lic?.type);
  if (!type) throw new Error('license.type is required');

  return mutate(data => {
    const civ = findCivilian(data, characterId);
    if (!civ) throw new Error('Unknown character: sync the character before its licenses');
    civ.dmvRecords = Array.isArray(civ.dmvRecords) ? civ.dmvRecords : [];

    const recId = `${civ.id}-LIC-${type.replace(/[^A-Z0-9]/g, '')}`;
    let rec = civ.dmvRecords.find((r: any) => r.id === recId);
    const created = !rec;
    if (!rec) {
      rec = {
        id: recId,
        type: 'LICENSE',
        data: {
          licenseType: type,
          licenseNumber: clean(lic.number, 20) || `${type[0]}${digits(recId, 7)}`,
          status: 'VALID',
          issuedDate: today(),
          expirationDate: addYears(lic.validYears ?? DEFAULT_VALID_YEARS),
          ...(type === 'DRIVER LICENSE' ? { licenseClass: 'C', motorcycleEndorsement: 'NONE' } : {}),
        },
        source: 'FIVEM',
        createdAt: new Date().toISOString(),
        characterId: civ.id,
        characterName: `${civ.firstName} ${civ.lastName}`,
      };
      civ.dmvRecords.push(rec);
    }
    if (lic.status) rec.data.status = upper(lic.status);
    if (lic.class) rec.data.licenseClass = upper(lic.class);
    if (lic.motorcycle) rec.data.motorcycleEndorsement = upper(lic.motorcycle);
    const expires = chosenDate(lic.expires);
    if (lic.expires != null && lic.expires !== '' && !expires) throw new Error('license.expires must be a date (YYYY-MM-DD) or "auto"');
    if (expires) {
      rec.data.expirationDate = expires;
      if (!lic.status) rec.data.status = revive(rec.data.status, expires);
    }
    if (lic.restrictions) rec.data.restrictions = clean(lic.restrictions, 200);
    rec.updatedAt = new Date().toISOString();

    protectRecord(civ.id, rec);
    return { recordId: recId, created, licenseType: type, status: rec.data.status, expirationDate: rec.data.expirationDate };
  });
}

export async function registerVehicle(characterId: unknown, veh: GameVehicle) {
  const plate = upper(veh?.plate).replace(/\s+/g, '');
  if (!plate) throw new Error('vehicle.plate is required');

  return mutate(data => {
    const civ = findCivilian(data, characterId);
    if (!civ) throw new Error('Unknown character: sync the character before its vehicles');
    civ.dmvRecords = Array.isArray(civ.dmvRecords) ? civ.dmvRecords : [];
    const recId = `FIVEM-VEH-${plate.replace(/[^A-Z0-9]/g, '')}`;

    // Sold/transferred in game: take it off the previous owner
    let transferredFrom: string | null = null;
    for (const other of data.civilians) {
      if (other === civ || !Array.isArray(other.dmvRecords)) continue;
      const before = other.dmvRecords.length;
      other.dmvRecords = other.dmvRecords.filter((r: any) => r.id !== recId);
      if (other.dmvRecords.length !== before) transferredFrom = other.id;
    }

    let rec = civ.dmvRecords.find((r: any) => r.id === recId);
    const created = !rec;
    if (!rec) {
      rec = {
        id: recId,
        type: 'VEHICLE REGISTRATION',
        data: {
          plateNumber: plate,
          vin: clean(veh.vin, 17).toUpperCase() || vinFor(plate),
          registrationStatus: upper(veh.registrationStatus) || 'VALID',
          registrationExpiration: addYears(veh.validYears ?? DEFAULT_VALID_YEARS),
          insuranceStatus: upper(veh.insuranceStatus) || 'VALID',
          insuranceExpiration: addYears(veh.validYears ?? DEFAULT_VALID_YEARS),
          registrationDate: today(),
        },
        source: 'FIVEM',
        createdAt: new Date().toISOString(),
        characterId: civ.id,
        characterName: `${civ.firstName} ${civ.lastName}`,
      };
      civ.dmvRecords.push(rec);
    }
    const d = rec.data;
    if (veh.make) d.make = clean(veh.make, 40);
    if (veh.model) d.model = clean(veh.model, 40);
    if (veh.color) d.color = clean(veh.color, 40);
    if (veh.year) d.year = clean(veh.year, 4);
    if (veh.vehicleType) d.vehicleType = upper(veh.vehicleType);
    for (const [field, dateKey, statusKey] of [
      ['registrationExpires', 'registrationExpiration', 'registrationStatus'],
      ['insuranceExpires', 'insuranceExpiration', 'insuranceStatus'],
    ] as const) {
      const raw = (veh as any)[field];
      if (raw == null || raw === '') continue;
      const date = chosenDate(raw);
      if (!date) throw new Error(`vehicle.${field} must be a date (YYYY-MM-DD) or "auto"`);
      d[dateKey] = date;
      d[statusKey] = revive(d[statusKey], date);
    }
    d.ownerName = `${civ.firstName} ${civ.lastName}`;
    rec.characterId = civ.id;
    rec.characterName = d.ownerName;
    rec.updatedAt = new Date().toISOString();

    protectRecord(civ.id, rec);
    return { recordId: recId, created, plate, transferredFrom, registrationExpiration: d.registrationExpiration, insuranceExpiration: d.insuranceExpiration };
  });
}

// ---------------------------------------------------------------------------
// Replay on CAD saves
// ---------------------------------------------------------------------------

/**
 * Re-apply recent game changes to data a CAD browser is about to save, in
 * case that browser hadn't loaded them yet. Only fills in what's missing (and
 * the server-owned link/ownership fields), so normal CAD edits win otherwise.
 */
export function replayGameChanges(data: any) {
  if (!data || typeof data !== 'object') return data;
  const cutoff = Date.now() - PROTECT_MS;
  ensureShape(data);

  P.civilians.forEach((entry, id) => {
    if (entry.at < cutoff) return void P.civilians.delete(id);
    const civ = data.civilians.find((c: any) => c.id === id);
    if (!civ) data.civilians.push(JSON.parse(JSON.stringify(entry.civilian)));
    else {
      civ.fivem = entry.civilian.fivem;
      if (entry.civilian.ownerUsername) civ.ownerUsername = entry.civilian.ownerUsername;
    }
  });

  P.records.forEach((entry, recId) => {
    if (entry.at < cutoff) return void P.records.delete(recId);
    const owner = data.civilians.find((c: any) => c.id === entry.civId);
    if (!owner) return;
    // Drop a stale copy still sitting on a previous owner
    for (const civ of data.civilians) {
      if (civ !== owner && Array.isArray(civ.dmvRecords)) civ.dmvRecords = civ.dmvRecords.filter((r: any) => r.id !== recId);
    }
    owner.dmvRecords = Array.isArray(owner.dmvRecords) ? owner.dmvRecords : [];
    if (!owner.dmvRecords.some((r: any) => r.id === recId)) owner.dmvRecords.push(JSON.parse(JSON.stringify(entry.record)));
  });

  P.links.forEach((entry, username) => {
    if (entry.at < cutoff) return void P.links.delete(username);
    const cred = data.officerCredentials.find((c: any) => c.username === username);
    if (!cred) return;
    if (entry.link) cred.fivemLink = entry.link;
    else delete cred.fivemLink;
  });

  return data;
}
