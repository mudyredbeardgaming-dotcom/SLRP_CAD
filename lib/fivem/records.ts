import { randomInt } from 'crypto';
import { cadToday, CAD_TIME_ZONE } from '../cadDate';
import { mutate } from './characters';
import type { GameCitation, GameLocation } from './types';

/**
 * Officer records created in game (currently: citations) -> officerRecords in
 * data/cad-data.json.
 *
 * The record looks exactly like one written in the CAD's Citation form, so it
 * shows in the officer's Records list, in Lookup and on the civilian's record.
 * Like the character sync, new records are remembered for PROTECT_MS and
 * re-added on /api/save-data if a browser saves data that predates them.
 */

const PROTECT_MS = 15 * 60_000;
const MAX_CHARGES = 25;

const g = globalThis as unknown as { __strataGameRecords?: Map<string, { record: any; at: number }> };
const recent: Map<string, { record: any; at: number }> = g.__strataGameRecords ?? (g.__strataGameRecords = new Map());

const clean = (v: unknown, max = 80) => String(v ?? '').trim().slice(0, max);
const upper = (v: unknown) => String(v ?? '').trim().toUpperCase();
/** Lower-case name without punctuation or middle initials, same rule as the CAD's Lookup. */
const normName = (n: unknown) =>
  String(n || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(w => w.length > 1).join(' ');
const civName = (c: any) => [c?.firstName, c?.lastName].filter(Boolean).join(' ') || c?.name || '';
const civIdFor = (characterId: unknown) => `FIVEM-${String(characterId ?? '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64)}`;
const CHARGE_TYPES = ['INFRACTION', 'MISDEMEANOR', 'FELONY', 'WARNING', 'CORRECTABLE'];

const formatLocation = (l?: GameLocation) =>
  [l?.street, l?.crossStreet].filter(Boolean).join(' / ') || clean(l?.zone, 80);

/** Officer's CAD account: linked FiveM identifier first, then the unit with this callsign. */
function findOfficer(data: any, officer: GameCitation['officer']) {
  const creds: any[] = Array.isArray(data.officerCredentials) ? data.officerCredentials : [];
  const units: any[] = Array.isArray(data.units) ? data.units : [];
  const callsign = upper(officer?.callsign);
  let cred = officer?.identifier ? creds.find(c => c?.fivemLink?.identifier === officer.identifier) : null;
  const unit = callsign
    ? units.find(u => upper(u.callsign) === callsign)
    : cred?.unitId ? units.find(u => u.id === cred.unitId) : null;
  if (!cred && unit) cred = creds.find(c => c.unitId === unit.id && (c.role === 'police' || c.role === 'admin'));
  return { cred, unit, callsign: callsign || upper(unit?.callsign) };
}

/** The cited civilian: synced character id first, else a single exact name match. */
function findSubject(data: any, subject: GameCitation['subject']) {
  const civs: any[] = Array.isArray(data.civilians) ? data.civilians : [];
  if (subject?.characterId) {
    const byId = civs.find(c => c.id === civIdFor(subject.characterId) || c.id === subject.characterId);
    if (byId) return byId;
  }
  const n = normName(subject?.name);
  if (!n) return null;
  const matches = civs.filter(c => normName(civName(c)) === n);
  return matches.length === 1 ? matches[0] : null;
}

const nextRecordNumber = (data: any) => {
  const nums = [...(data.officerReports || []), ...(data.officerRecords || [])]
    .map((r: any) => Number(r?.recordNumber))
    .filter(n => Number.isFinite(n));
  return Math.max(9999, ...nums) + 1;
};

export async function issueCitation(c: GameCitation) {
  if (!c || typeof c !== 'object') throw new Error('citation is required');
  const charges = (Array.isArray(c.charges) ? c.charges : []).filter(x => x && clean(x.charge));
  if (charges.length === 0) throw new Error('citation.charges needs at least one charge');
  if (charges.length > MAX_CHARGES) throw new Error(`At most ${MAX_CHARGES} charges per citation`);
  if (!clean(c.subject?.name) && !c.subject?.characterId) throw new Error('citation.subject needs a name or characterId');
  if (!clean(c.officer?.callsign) && !clean(c.officer?.name) && !c.officer?.identifier) throw new Error('citation.officer needs a callsign, name or identifier');

  return mutate(data => {
    data.officerRecords = Array.isArray(data.officerRecords) ? data.officerRecords : [];
    const externalId = clean(c.externalId, 64);
    if (externalId) {
      const existing = data.officerRecords.find((r: any) => r.source === 'FIVEM' && r.externalId === externalId);
      if (existing) return { recordId: existing.id, recordNumber: existing.recordNumber, duplicate: true, linkedCivilian: existing.subjectId || null };
    }

    const { cred, unit, callsign } = findOfficer(data, c.officer);
    const civ = findSubject(data, c.subject);
    const now = new Date();
    const time = new Intl.DateTimeFormat('en-GB', { timeZone: CAD_TIME_ZONE, hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
    const day = new Intl.DateTimeFormat('en-US', { timeZone: CAD_TIME_ZONE, weekday: 'long' }).format(now).toUpperCase();

    const record = {
      id: `REC-FIVEM-${now.getTime()}-${randomInt(1000, 9999)}`,
      type: 'CITATION',
      recordNumber: nextRecordNumber(data),
      status: 'ACTIVE',
      // Goes to the Supervisor Panel like a citation submitted in the CAD
      reviewStatus: 'PENDING',
      submittedAt: now.toISOString(),
      source: 'FIVEM',
      externalId: externalId || undefined,
      // Officer
      officer: cred?.displayName || unit?.officer || clean(c.officer?.name, 60) || callsign,
      officerUsername: cred?.username || null,
      badge: clean(c.officer?.badge, 20) || cred?.badgeNumber || cred?.badge || '',
      callsign,
      department: cred?.department || unit?.department || '',
      // Subject (linked to the civilian when found, so it shows on their record)
      subjectId: civ?.id || null,
      subjectName: civ ? civName(civ) : clean(c.subject?.name, 80),
      subjectDOB: civ?.dateOfBirth || civ?.dob || clean(c.subject?.dob, 20),
      subjectPhone: civ?.cellPhone || civ?.phone || clean(c.subject?.phone, 20),
      subjectAddress: civ?.streetResidence || civ?.address || clean(c.subject?.address, 120),
      // When / where
      dateOfViolation: cadToday(now),
      timeOfViolation: time,
      dayOfWeek: day,
      locationOfViolation: formatLocation(c.location),
      postal: clean(c.location?.postal, 10),
      // Vehicle
      vehiclePlate: upper(c.vehicle?.plate).replace(/\s+/g, '').slice(0, 10),
      vehicleMake: clean(c.vehicle?.make, 40),
      vehicleModel: clean(c.vehicle?.model, 40),
      vehicleColor: clean(c.vehicle?.color, 40),
      vehicleYear: clean(c.vehicle?.year, 4),
      charges: charges.map((x, i) => {
        const type = upper(x.type);
        const counts = Math.min(99, Math.max(1, Math.round(Number(x.counts) || 1)));
        return {
          id: now.getTime() + i,
          charge: clean(x.charge, 120),
          titleCode: clean(x.code, 30),
          chargeType: CHARGE_TYPES.includes(type) ? type : 'INFRACTION',
          counts,
          bondType: 'CITATION RELEASE',
          bondAmount: Math.max(0, Math.min(1_000_000, Number(x.fine) || 0)),
          jailTime: '',
        };
      }),
      notes: clean(c.notes, 1000),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    data.officerRecords.push(record);
    recent.set(record.id, { record: JSON.parse(JSON.stringify(record)), at: Date.now() });

    const total = record.charges.reduce((s, x) => s + x.bondAmount * x.counts, 0);
    return {
      recordId: record.id,
      recordNumber: record.recordNumber,
      officer: record.officer,
      officerLinked: !!cred,
      linkedCivilian: record.subjectId,
      subjectName: record.subjectName,
      total,
    };
  });
}

/** Re-add game-created records missing from data a browser is about to save (see replayGameChanges). */
export function replayGameRecords(data: any) {
  if (!data || typeof data !== 'object') return data;
  const cutoff = Date.now() - PROTECT_MS;
  data.officerRecords = Array.isArray(data.officerRecords) ? data.officerRecords : [];
  recent.forEach((entry, id) => {
    if (entry.at < cutoff) return void recent.delete(id);
    if (!data.officerRecords.some((r: any) => r.id === id)) data.officerRecords.push(JSON.parse(JSON.stringify(entry.record)));
  });
  return data;
}
