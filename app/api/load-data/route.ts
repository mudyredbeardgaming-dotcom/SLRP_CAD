import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    // Path to data file
    const dataFilePath = path.join(process.cwd(), 'data', 'cad-data.json');

    // Try to read the file
    try {
      const fileContent = await fs.readFile(dataFilePath, 'utf-8');
      const data = JSON.parse(fileContent);
      return NextResponse.json(data);
    } catch (error) {
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
            displayName: 'Deputy Johnson'
          },
          {
            username: 'smith',
            password: 'deputy123',
            unitId: 'Unit-2',
            displayName: 'Deputy Smith'
          },
          {
            username: 'davis',
            password: 'deputy123',
            unitId: 'Unit-3',
            displayName: 'Deputy Davis'
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
