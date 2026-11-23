import { NextRequest, NextResponse } from 'next/server';
import { readDataFile, withDataLock } from '@/lib/dataStore';

// Must run on every request. Without this Next.js prerenders the route at build
// time and serves that snapshot forever, so saved data never comes back.
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Read inside the data lock so we never see a save that's half done
    const data = await withDataLock(readDataFile);
    if (data) {
      return NextResponse.json(data);
    } else {
      // If file doesn't exist, return empty data structure
      console.log('No saved data found, returning defaults');
      return NextResponse.json({
        units: [],
        calls: [],
        civilians: [],
        officerReports: [],
        officerRecords: [],
        officerCredentials: [
          {
            username: 'johnson',
            password: 'deputy123',
            unitId: 'Unit-1',
            displayName: 'Deputy Johnson',
            role: 'police',
            department: 'B.C.S.O'
          },
          {
            username: 'smith',
            password: 'deputy123',
            unitId: 'Unit-2',
            displayName: 'Deputy Smith',
            role: 'police',
            department: 'B.C.S.O'
          },
          {
            username: 'davis',
            password: 'deputy123',
            unitId: 'Unit-3',
            displayName: 'Deputy Davis',
            role: 'police',
            department: 'B.C.S.O'
          },
          {
            username: 'firefighter1',
            password: 'fire123',
            unitId: 'Engine-1',
            displayName: 'Firefighter Anderson',
            role: 'fire',
            department: 'LSFD'
          },
          {
            username: 'medic1',
            password: 'medic123',
            unitId: 'Medic-1',
            displayName: 'Paramedic Rodriguez',
            role: 'fire',
            department: 'LSFD'
          },
          {
            username: 'tow1',
            password: 'tow123',
            unitId: 'Tow-1',
            displayName: 'Mike (Towing)',
            role: 'tow',
            department: "Mike's Towing"
          },
          {
            username: 'tow2',
            password: 'tow123',
            unitId: 'Tow-2',
            displayName: 'Joe (Towing)',
            role: 'tow',
            department: 'Quick Tow'
          }
        ]
      });
    }
  } catch (error) {
    console.error('Error loading data:', error);
    return NextResponse.json(
      { error: 'Failed to load data' },
      { status: 500 }
    );
  }
}
