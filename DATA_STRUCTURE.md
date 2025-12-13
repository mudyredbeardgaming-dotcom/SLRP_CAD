# CAD System Data Structure

## Overview

The Silver Lining CAD system uses JSON-based data storage with the following files:

### Primary Data File: `/data/cad-data.json`

This is the main database file containing all operational data for the CAD system. It's automatically loaded on application startup and saved whenever data changes.

#### File Location
- **Development/Runtime**: `data/cad-data.json` (created in project root)
- **API Endpoint**: `/api/load-data` (GET), `/api/save-data` (POST)

---

## Data Structure

### 1. **units** (Array)
Array of all dispatch units (police, fire, tow, etc.)

**Fields:**
- `id` (string) - Unique identifier for the unit
- `callsign` (string) - Radio callsign (e.g., "A-101", "ENGINE-1")
- `status` (string) - Current status (available, busy, out-of-service)
- `officer` (string) - Name of unit operator
- `assignedCall` (string|null) - ID of currently assigned call
- `aop` (string) - Area of Patrol/Station
- `agency` (string) - Agency name (LSSO, LSFD, etc.)
- `rank` (string) - Officer rank
- `department` (string) - Department assignment
- `location` (string) - Current location
- `callHistory` (array) - Historical call records

**Example:**
```json
{
  "id": "Unit-1",
  "callsign": "A-101",
  "status": "available",
  "officer": "Officer Johnson",
  "assignedCall": null,
  "aop": "Area 3",
  "agency": "LSSO",
  "rank": "Deputy",
  "department": "SO-AREA 3A",
  "location": "Postal 1234",
  "callHistory": []
}
```

---

### 2. **calls** (Array)
Array of all dispatch calls in the system

**Fields:**
- `id` (string) - Unique identifier (e.g., "call_001")
- `callNumber` (string) - Sequential call number (e.g., "25-001")
- `callCode` (string) - 10-code or call code (e.g., "10-34")
- `callCodeDescription` (string) - Description of call code
- `dispatchTime` (ISO 8601 string) - When call was dispatched
- `location` (string) - Call location/address
- `description` (string) - Detailed call description
- `priority` (string) - Priority level (LOW, MEDIUM, HIGH)
- `status` (string) - Call status (PENDING, ACTIVE, ON_HOLD, CLOSED)
- `assignedUnits` (array) - Units assigned to this call
- `dispatcher` (string) - Dispatcher name
- `notes` (string) - Additional notes/comments

**Example:**
```json
{
  "id": "call_001",
  "callNumber": "25-001",
  "callCode": "10-34",
  "callCodeDescription": "Robbery in Progress",
  "dispatchTime": "2025-12-13T10:30:00Z",
  "location": "Pillbox Medical Center, Los Santos",
  "description": "Armed robbery reported at medical center",
  "priority": "HIGH",
  "status": "ACTIVE",
  "assignedUnits": [],
  "dispatcher": "Dispatcher Davis",
  "notes": "Suspect possibly armed with handgun, use caution"
}
```

---

### 3. **civilians** (Array)
Array of all civilian characters in the system

**Fields:**
- `id` (string) - Character ID (e.g., "char_001")
- `firstName` (string) - Character's first name
- `lastName` (string) - Character's last name
- `dob` (string) - Date of birth (YYYY-MM-DD)
- `ssn` (string) - Social Security Number
- `phone` (string) - Phone number
- `address` (string) - Home address
- `createdDate` (ISO 8601 string) - When character was created
- `dmvRecords` (array) - DMV records for this character

**DMV Record Types:**
- VEHICLE REGISTRATION
- LICENSE (Driver, Pilot, Boat, etc.)
- MEDICAL HISTORY
- SECURITY GUARD LICENSE
- REGISTERED FIREARM
- OUT OF STATE WARRANT
- PROBATION
- PAROLE
- MEDICAL HAZARD

**Example:**
```json
{
  "id": "char_001",
  "firstName": "John",
  "lastName": "Smith",
  "dob": "1990-05-15",
  "ssn": "123-45-6789",
  "phone": "555-0101",
  "address": "123 Main St, Los Santos",
  "createdDate": "2025-12-13T00:00:00Z",
  "dmvRecords": [
    {
      "id": "vreg_001",
      "type": "VEHICLE REGISTRATION",
      "data": {
        "plateNumber": "SMITH01",
        "year": 2023,
        "make": "Bravado",
        "model": "Banshee",
        "color": "Black"
      }
    }
  ]
}
```

---

### 4. **officerReports** (Array)
Array of all police reports created by officers

**Standard Fields:**
- `id` (string) - Unique report ID
- `type` (string) - Report type (see below)
- `recordNumber` (number) - Record number
- `officer` (string) - Officer name
- `badge` (string) - Officer badge number
- `callsign` (string) - Officer callsign
- `department` (string) - Department
- `date` (ISO 8601 string) - Report date
- `status` (string) - DRAFT, SUBMITTED, APPROVED
- `createdAt` (ISO 8601 string) - Creation timestamp
- `updatedAt` (ISO 8601 string) - Last update timestamp

**Report Types:**
1. TRAFFIC COLLISION REPORT - Vehicle accidents with damage assessment
2. SUPPLEMENTAL REPORT - Additional information to original report with evidence tracking
3. USE OF FORCE REPORT - Force deployment documentation
4. GENERAL REPORT - Miscellaneous incident reports
5. VEHICLE TOW/RELEASE REPORT - Vehicle impound documentation
6. DETECTIVE REQUEST FORM - Request for detective investigation
7. DETECTIVE REPORT - Detective investigation findings
8. TRESPASS WARNING - Warning issued to individual
9. RESTRAINING ORDER - Court-ordered restraining document
10. EVIDENCE LOCKER - Evidence storage records

---

### 5. **officerRecords** (Array)
Array of all police records (arrests, BOLOs, warrants, citations)

**Record Types:**
- ARREST - Booking information
- BOLO - Be On Lookout alert
- WARRANT - Arrest or search warrant
- CITATION - Traffic or other citation

**Standard Fields:**
- `id` (string) - Unique record ID
- `type` (string) - Record type (above)
- `recordNumber` (number) - Record number
- `officer` (string) - Officer name
- `badge` (string) - Officer badge
- `date` (ISO 8601 string) - Record date
- `status` (string) - Record status
- `createdAt` (ISO 8601 string) - Creation timestamp
- `updatedAt` (ISO 8601 string) - Last update timestamp

---

### 6. **officerCredentials** (Array)
Array of officer/user login credentials

**Fields:**
- `username` (string) - Login username
- `password` (string) - Password (currently plain text, should be hashed in production)
- `unitId` (string) - Associated unit ID
- `displayName` (string) - Display name
- `role` (string) - User role (police, fire, tow, dispatch)
- `department` (string) - Department affiliation

---

## Secondary Data File: `/data/dispatch-data.json`

Contains reference data for the dispatch system (call codes, statuses, etc.)

**Contents:**
- `callCodes` - Reference list of all 10-codes
- `unitStatuses` - Possible unit statuses
- `callStatuses` - Possible call statuses

---

## Data Flow

1. **Application Startup**
   - Frontend loads session from localStorage
   - Calls `/api/load-data` to fetch current data from `cad-data.json`
   - Updates React state with fetched data

2. **Data Changes**
   - User creates/updates calls, reports, records, characters, etc.
   - Changes update React state immediately
   - Debounced save (1 second) sends data to `/api/save-data`
   - Backend writes updated data to `cad-data.json`
   - Periodic refresh (5 seconds) loads latest data from file

3. **Multi-User Sync**
   - Periodic refresh prevents overwriting user edits in forms
   - Lock mechanisms prevent concurrent editing issues
   - Debouncing prevents excessive file I/O

---

## API Endpoints

### `GET /api/load-data`
Loads all current data from `cad-data.json`

**Response:** JSON object with all data arrays

### `POST /api/save-data`
Saves provided data to `cad-data.json`

**Request Body:** Complete data object with all arrays

---

## Important Notes

### Data Persistence
- All data is stored in JSON files on the server
- Changes are automatically synced to disk
- No database is required for basic functionality

### Scaling Considerations
- For large-scale deployments, migrate to a database (PostgreSQL, MongoDB, etc.)
- Current JSON approach works well for small to medium deployments
- Consider adding data versioning and backup mechanisms

### Security
- Officer credentials are currently stored in plain text
- In production, implement proper authentication and password hashing
- Restrict API access to authorized users only
- Add role-based access control (RBAC)

### Backup
- Regularly backup the `/data` directory
- Consider implementing automated backups
- Keep multiple versions of data files

---

## Example: Adding a New Character

```json
{
  "id": "char_002",
  "firstName": "Jane",
  "lastName": "Doe",
  "dob": "1992-03-20",
  "ssn": "987-65-4321",
  "phone": "555-0102",
  "address": "456 Oak Ave, Los Santos",
  "createdDate": "2025-12-13T12:00:00Z",
  "dmvRecords": []
}
```

Add this object to the `civilians` array in `cad-data.json`, then the system will automatically include this character in lookups and records.
