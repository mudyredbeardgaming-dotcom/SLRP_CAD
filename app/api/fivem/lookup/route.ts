import { NextRequest, NextResponse } from 'next/server';
import { readDataFile } from '@/lib/dataStore';
import { requireGameServer } from '@/lib/fivem/auth';
import { markSeen } from '@/lib/fivem/store';
import { cadToday, liveDmvRecord } from '@/lib/cadDate';
import { isFireReport, isSubmitted, normPlate, plateHistory, rolesIn } from '@/lib/history';

export const dynamic = 'force-dynamic';

const readData = async () => (await readDataFile()) || {};

const fullName = (c: any) => `${c.firstName || ''} ${c.lastName || ''}`.trim();
const normName = (n: unknown) =>
  String(n || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(w => w.length > 1).join(' ');

/** Active warrants and BOLOs on this civilian (stored civilian id, else exact name), like the CAD's Lookup. */
const flagsFor = (records: any[], civ: any) =>
  records
    .filter(r => {
      const isOpen = r.type === 'WARRANT'
        ? (r.warrantStatus || 'ACTIVE') !== 'CLOSED' && !['CLOSED', 'INACTIVE', 'SERVED'].includes(String(r.status || '').toUpperCase())
        : r.type === 'BOLO' && r.status !== 'INACTIVE';
      if (!isOpen) return false;
      if (r.subjectId) return r.subjectId === civ.id;
      const n = normName(r.subjectName);
      return !!n && n === normName(fullName(civ));
    })
    .map(r => ({ id: r.id, type: r.type, status: r.status, charges: r.charges }));

/**
 * Game server lookups for in-game commands such as /runplate and /runname.
 *   GET /api/fivem/lookup?plate=ABC123
 *   GET /api/fivem/lookup?name=John%20Smith
 * Registration, insurance and license statuses read EXPIRED once their date
 * is before today's CAD date.
 */
export async function GET(request: NextRequest) {
  const denied = requireGameServer(request);
  if (denied) return denied;
  markSeen();

  const plate = request.nextUrl.searchParams.get('plate')?.trim().toUpperCase();
  const name = request.nextUrl.searchParams.get('name')?.trim().toLowerCase();
  if (!plate && !name) {
    return NextResponse.json({ ok: false, error: 'Pass ?plate= or ?name=' }, { status: 400 });
  }

  const data = await readData();
  const civilians: any[] = data.civilians || [];
  const records: any[] = data.officerRecords || [];
  const today = cadToday();
  // Everything LEO can see in the CAD's Lookup: no drafts, no Fire/EMS reports
  const items: any[] = [...(data.officerReports || []).filter((r: any) => !isFireReport(r)), ...records].filter(isSubmitted);
  const isActiveBolo = (r: any) => r.type === 'BOLO' && r.status !== 'INACTIVE';

  if (plate) {
    const vehicles = civilians.flatMap(c =>
      (c.dmvRecords || [])
        .filter((r: any) => r.type === 'VEHICLE REGISTRATION' && String(r.data?.plateNumber || '').toUpperCase() === plate)
        .map((raw: any) => {
          const r = liveDmvRecord(raw, today);
          return {
            plate: r.data.plateNumber,
            year: r.data.year,
            make: r.data.make,
            model: r.data.model,
            color: r.data.color,
            status: r.data.registrationStatus || null,
            registrationStatus: r.data.registrationStatus || null,
            registrationExpiration: r.data.registrationExpiration || null,
            insuranceStatus: r.data.insuranceStatus || null,
            insuranceExpiration: r.data.insuranceExpiration || null,
            owner: fullName(c),
            ownerId: c.id,
            flags: flagsFor(records, c),
            // Reports / records this plate appears on, and active BOLOs on the plate itself
            history: plateHistory(items, r.data.plateNumber).length,
            plateBolos: records.filter(b => isActiveBolo(b) && isSubmitted(b) && normPlate(b.vehiclePlate) === normPlate(r.data.plateNumber))
              .map(b => ({ id: b.id, recordNumber: b.recordNumber })),
          };
        })
    );
    return NextResponse.json({ ok: true, query: { plate }, results: vehicles });
  }

  const people = civilians
    .filter(c => fullName(c).toLowerCase().includes(name!))
    .slice(0, 10)
    .map(c => ({
      id: c.id,
      name: fullName(c),
      dob: c.dateOfBirth || c.dob,
      phone: c.cellPhone || c.phone,
      address: c.streetResidence || c.address,
      licenses: (c.dmvRecords || [])
        .filter((r: any) => r.type === 'LICENSE')
        .map((raw: any) => {
          const r = liveDmvRecord(raw, today);
          return { type: r.data?.licenseType, number: r.data?.licenseNumber, status: r.data?.status, expires: r.data?.expirationDate || null };
        }),
      citations: records.filter(r => r.type === 'CITATION' && (r.subjectId ? r.subjectId === c.id : normName(r.subjectName) === normName(fullName(c)))).length,
      arrests: items.filter(x => x.type === 'ARREST' && rolesIn(x, c).includes('ARRESTEE')).length,
      // Every report / record the person is on (named, or one of their plates)
      history: items.filter(x => rolesIn(x, c).length > 0).length,
      flags: flagsFor(records, c),
    }));
  return NextResponse.json({ ok: true, query: { name }, results: people });
}
