/**
 * Who appears on a report or record, and as what.
 *
 * Shared by the CAD (Lookup, civilian portal) and the server (in-game
 * /runname and /runplate), so a person's or plate's history is the same
 * everywhere.
 *
 * A person matches by stored civilian id when the field has one (picked from
 * a search), otherwise by exact name ignoring middle initials and punctuation.
 */

export const civName = (c: any) => [c?.firstName, c?.lastName].filter(Boolean).join(' ') || c?.name || '';
/** "John A. Smith" -> "john smith" */
export const normName = (n: unknown) =>
  String(n || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(w => w.length > 1).join(' ');
export const normPlate = (p: unknown) => String(p ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');

export function personMatches(person: any, name: unknown, id?: unknown) {
  if (!person) return false;
  if (id) return id === person.id;
  const n = normName(name);
  return !!n && n === normName(civName(person));
}

/** Plates registered to a character (DMV vehicle registrations). */
export function registeredPlates(person: any): Set<string> {
  return new Set(
    (person?.dmvRecords || [])
      .filter((r: any) => r?.type === 'VEHICLE REGISTRATION')
      .map((r: any) => normPlate(r.data?.plateNumber))
      .filter(Boolean),
  );
}

/** Every plate written on a report or record: [label, plate]. */
export function platesIn(item: any): [string, string][] {
  const out: [string, string][] = [];
  const add = (label: string, p: unknown) => { const n = normPlate(p); if (n && !out.some(([, x]) => x === n)) out.push([label, n]); };
  add('VEHICLE', item?.vehiclePlate);
  add('VEHICLE', item?.plate);
  add('VEHICLE', item?.vehicle?.plate);
  add('VEHICLE 1', item?.vehicle1?.plate);
  add('VEHICLE 1', item?.vehicle1?.plateNumber);
  add('VEHICLE 2', item?.vehicle2?.plate);
  add('VEHICLE 2', item?.vehicle2?.plateNumber);
  return out;
}

const RECORD_SUBJECT_ROLE: Record<string, string> = {
  WARRANT: 'WARRANT SUBJECT',
  BOLO: 'BOLO SUBJECT',
  CITATION: 'CITED',
};

/**
 * Roles `person` has on a report or record (upper-case, unique):
 * Involved Persons, arrestee, trespasser, parties (with involvement), subject
 * of force, driver, witnesses, record subject (warrant / BOLO / citation),
 * patient (Fire/EMS), and "VEHICLE <plate>" when one of their registered
 * plates is on it.
 */
export function rolesIn(item: any, person: any): string[] {
  if (!item || !person) return [];
  const roles: string[] = [];
  const m = (name: unknown, id?: unknown) => personMatches(person, name, id);
  (item.involvedPersons || []).forEach((x: any) => { if (m(x.name, x.civilianId)) roles.push(x.role || 'INVOLVED'); });
  if (m(item.arresteeName, item.arresteeId)) roles.push('ARRESTEE');
  if (m(item.trespasserName, item.trespasserId)) roles.push('TRESPASSER');
  [1, 2].forEach(n => {
    const party = item[`party${n}`];
    if (!party || !m(party.name, party.personId)) return;
    const inv = item[`party${n}Involvement`];
    roles.push(inv === 'OTHER' ? (item[`party${n}InvolvementOther`] || 'OTHER')
      : inv || (item.type === 'VEHICLE TOW/RELEASE REPORT' ? 'REGISTERED OWNER'
        : item.type === 'TRAFFIC COLLISION REPORT' ? `PARTY ${n}` : 'INVOLVED PARTY'));
  });
  if (item.victimOfForce && m(item.victimOfForce.name, item.victimOfForce.personId)) roles.push('SUBJECT OF FORCE');
  if (m(item.driverInformationName) || m(item.driverName)) roles.push('DRIVER');
  if (m(item.witness1Name) || m(item.witness2Name)) roles.push('WITNESS');
  if (RECORD_SUBJECT_ROLE[item.type] && m(item.subjectName, item.subjectId)) roles.push(RECORD_SUBJECT_ROLE[item.type]);
  if (item.patient && m(item.patient.name, item.patient.civilianId)) roles.push('PATIENT');
  if (item.type === 'TOW REPORT' && m(item.ownerName, item.ownerId)) roles.push('REGISTERED OWNER');
  const mine = registeredPlates(person);
  if (mine.size) platesIn(item).forEach(([label, plate]) => { if (mine.has(plate)) roles.push(`${label} ${plate}`); });
  return Array.from(new Set(roles.map(r => String(r).toUpperCase())));
}

/** Reports/records that mention a plate: [{ item, roles: ['VEHICLE 1', ...] }]. */
export function plateHistory(items: any[], plate: unknown) {
  const p = normPlate(plate);
  if (!p) return [];
  return items
    .map(item => ({ item, roles: platesIn(item).filter(([, x]) => x === p).map(([label]) => label) }))
    .filter(x => x.roles.length > 0);
}

/** Not a draft (drafts are private to their author). */
export const isSubmitted = (item: any) =>
  String(item?.reviewStatus || '').toUpperCase() !== 'DRAFT' && String(item?.status || '').toUpperCase() !== 'DRAFT';

export const isFireReport = (r: any) => r?.service === 'FIRE' || ['FIRE INVESTIGATION REPORT', 'MEDICAL PATIENT REPORT'].includes(r?.type);
