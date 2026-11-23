import { NextRequest, NextResponse } from 'next/server';
import { withDataLock, writeDataFile } from '@/lib/dataStore';
import { replayGameChanges } from '@/lib/fivem/characters';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    await withDataLock(async () => {
      // Keep characters/licenses/vehicles the game added since this browser last loaded
      replayGameChanges(data);
      await writeDataFile(data);
    });

    return NextResponse.json({ success: true, message: 'Data saved successfully' });
  } catch (error) {
    console.error('Error saving data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save data' },
      { status: 500 }
    );
  }
}
