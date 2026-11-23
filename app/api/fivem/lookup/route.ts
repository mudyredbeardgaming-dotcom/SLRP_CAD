import { NextRequest, NextResponse } from 'next/server';
import { readDataFile } from '@/lib/dataStore';
import { requireGameServer } from '@/lib/fivem/auth';
import { markSeen } from '@/lib/fivem/store';

export const dynamic = 'force-dynamic';

const readData = async () => (await readDataFile()) || {};

const fullName = (c: any) => `${c.firstName || ''} ${c.lastName || ''}`.trim();

/** Open records (warrant/BOLO etc.) whose suspect name matches, same rule as the CAD lookup screen. */
const flagsFor = (records: any[], name: string) =>
  records
    .filter(r => name && r.suspectName?.toLowerCase().includes(name.toLowerCase()) && r.status !== 'CLOSED')
    .map(r => ({ id: r.id, type: r.type, status: r.status, charges: r.charges }));

/**
 * Game server lookups for in-game commands such as /runplate and /runname.
 *   GET /api/fivem/lookup?plate=ABC123
 *   GET /api/fivem/lookup?name=John%20Smith
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

  if (plate) {
    const vehicles = civilians.flatMap(c =>
      (c.dmvRecords || [])
        .filter((r: any) => r.type === 'VEHICLE REGISTRATION' && String(r.data?.plateNumber || '').toUpperCase() === plate)
        .map((r: any) => ({
          plate: r.data.plateNumber,
          year: r.data.year,
          make: r.data.make,
          model: r.data.model,
          color: r.data.color,
          status: r.data.status,
          owner: fullName(c),
          ownerId: c.id,
          flags: flagsFor(records, fullName(c)),
        }))
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
        .map((r: any) => ({ type: r.data?.licenseType, number: r.data?.licenseNumber, status: r.data?.status })),
      flags: flagsFor(records, fullName(c)),
    }));
  return NextResponse.json({ ok: true, query: { name }, results: people });
}
