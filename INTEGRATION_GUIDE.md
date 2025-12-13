# JSON Data Integration Guide

## Quick Start

Your CAD system is now integrated with JSON-based data storage. Here's what was set up:

### Files Created

1. **`/data/cad-data.json`** (6.1 KB)
   - Main operational database
   - Contains: Units, Calls, Civilians, Reports, Records, Officer Credentials
   - Automatically loaded and saved by the system

2. **`/data/dispatch-data.json`** (1.8 KB)
   - Reference data for dispatch operations
   - Contains: Call codes, Unit statuses, Call statuses
   - Currently informational; can be expanded

3. **`DATA_STRUCTURE.md`** (Comprehensive documentation)
   - Complete schema documentation
   - Field descriptions and examples
   - API endpoint documentation

4. **`INTEGRATION_GUIDE.md`** (This file)
   - Quick reference and troubleshooting

---

## How It Works

### Data Flow Diagram

```
┌─────────────────────────────────────────┐
│         Frontend (React)                │
│  - Dispatch Tab                         │
│  - Police Tab                           │
│  - Civilian Tab                         │
└────────────────┬────────────────────────┘
                 │
     ┌───────────┴──────────┐
     │                      │
     ▼                      ▼
┌──────────────┐    ┌──────────────┐
│ GET Request  │    │ POST Request │
│ /api/load    │    │ /api/save    │
└───────┬──────┘    └──────┬───────┘
        │                  │
        └──────────┬───────┘
                   ▼
        ┌──────────────────────┐
        │  Next.js API Route   │
        │  route.ts            │
        └──────────┬───────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │  /data/cad-data.json │
        │  (Persistent Storage)│
        └──────────────────────┘
```

### Automatic Operations

1. **On App Startup**
   - Load session from localStorage (authentication state)
   - Fetch `/api/load-data` to get current data from JSON
   - Populate React state with loaded data

2. **During Use**
   - Any changes to calls, reports, records, etc. update React state immediately
   - After 1 second of inactivity, debounced save triggers
   - Backend saves data to `cad-data.json`

3. **Every 5 Seconds**
   - Refresh data from server to sync multi-user changes
   - Only refreshes when no forms/modals are open
   - Prevents overwriting user input

---

## Current Data in System

### Units (7 total)
- Unit-1, Unit-2, Unit-3 (Police)
- Engine-1 (Fire)
- Medic-1 (EMS)
- Tow-1, Tow-2 (Towing)

### Calls (3 active)
1. **25-001** - Robbery in Progress (Pillbox Medical Center)
2. **25-002** - Traffic Stop (Maze Bank Arena)
3. **25-003** - Traffic Collision (Del Perro Freeway)

### Characters (1)
- John Smith (char_001)
  - Vehicle: Plate SMITH01
  - License: Valid Driver's License

### Officer Credentials (7)
- Police: johnson, smith, davis (password: deputy123)
- Fire: firefighter1, medic1 (fire123, medic123)
- Tow: tow1, tow2 (tow123)

---

## Common Tasks

### Adding a New Character
1. Go to Civilian tab
2. Click "Add Character"
3. Fill in details (Name, DOB, SSN, Phone, Address)
4. System automatically saves to `cad-data.json`

### Creating a Dispatch Call
1. Go to Dispatch tab
2. Click "New Call"
3. Select call code, location, priority
4. Assign units
5. System saves automatically

### Creating a Police Report
1. Login as police officer
2. Go to Records Panel > Reports
3. Select report type (Traffic Collision, Supplemental, etc.)
4. Fill in details
5. Click Save - automatically written to JSON file

### Viewing Saved Data
1. All data is in `/data/cad-data.json`
2. Open file with text editor to view raw JSON
3. Format is human-readable with proper indentation

---

## API Endpoints

### Load Data
```
GET /api/load-data
```
Returns current data from `cad-data.json`

**Example Response:**
```json
{
  "units": [...],
  "calls": [...],
  "civilians": [...],
  "officerReports": [...],
  "officerRecords": [...],
  "officerCredentials": [...]
}
```

### Save Data
```
POST /api/save-data
Content-Type: application/json

{
  "units": [...],
  "calls": [...],
  ...
}
```

**Example Response:**
```json
{
  "success": true,
  "message": "Data saved successfully"
}
```

---

## Troubleshooting

### Data Not Saving
- Check browser console for errors (F12)
- Verify `/data` directory exists
- Check file permissions on `/data/cad-data.json`
- Restart development server: `npm run dev`

### Changes Lost After Refresh
- Ensure data was saved (watch network tab in DevTools)
- Check that `/api/save-data` returns 200 status
- Verify file write permissions

### Characters Not Appearing in Lookups
- Must be saved as "civilian" in the system
- Check that character has valid dmvRecords array
- Verify character firstname/lastname are not empty

### Officers Can't Login
- Check credentials in `cad-data.json` → officerCredentials
- Username/password must match exactly (case-sensitive)
- Ensure role is set correctly (police, fire, tow)

---

## Production Considerations

### Before Going Live

1. **Backup Strategy**
   - Regular backups of `/data/cad-data.json`
   - Consider cloud backup (AWS S3, Azure Blob, etc.)
   - Implement version control for data snapshots

2. **Security**
   - Hash officer passwords using bcrypt
   - Implement JWT authentication
   - Add role-based access control
   - Restrict API endpoints to authenticated users
   - Use HTTPS in production

3. **Performance**
   - Current JSON approach works for 100-1000s of records
   - For larger deployments, migrate to database (PostgreSQL)
   - Consider caching with Redis
   - Implement data pagination for large result sets

4. **Data Integrity**
   - Add validation on data input
   - Implement audit logging
   - Add conflict resolution for concurrent edits
   - Regular data consistency checks

5. **Scaling**
   - Multi-instance deployment needs shared file storage or database
   - Current implementation only works with single server
   - Consider message queue (RabbitMQ) for multi-user sync

---

## File Locations Reference

| File | Purpose | Type |
|------|---------|------|
| `/data/cad-data.json` | Main operational database | Generated/Modified |
| `/data/dispatch-data.json` | Reference data | Reference |
| `/app/api/load-data/route.ts` | Load data API | Backend |
| `/app/api/save-data/route.ts` | Save data API | Backend |
| `/components/CADSystem.tsx` | Main UI component | Frontend |
| `DATA_STRUCTURE.md` | Schema documentation | Documentation |
| `INTEGRATION_GUIDE.md` | This file | Documentation |

---

## Next Steps

1. **Test the system**
   - Login with provided credentials
   - Create a test character
   - Create a test dispatch call
   - Verify data persists after refresh

2. **Customize data**
   - Edit `/data/cad-data.json` to add more:
     - Initial units
     - Pre-created characters
     - Officer credentials
     - Call codes

3. **Add more officers**
   - Add entries to `officerCredentials` in cad-data.json
   - Format: username, password, unitId, displayName, role, department

4. **Extend functionality**
   - Add more DMV record types
   - Create additional report types
   - Implement new record types
   - Add custom data fields

---

## Support

For detailed information, see:
- `DATA_STRUCTURE.md` - Complete schema documentation
- `/app/api/` - API implementation
- `/components/CADSystem.tsx` - Frontend logic
- Network tab (DevTools) - Monitor API calls
