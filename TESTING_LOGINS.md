# StrataMDT - Testing Logins

## Overview
This document contains all test login credentials for testing StrataMDT. Use these accounts to test different roles and functionality.

---

## Test Credentials

### Police Officers (Sheriff's Office)
| Username | Password | Role | Unit | Department |
|----------|----------|------|------|-----------|
| johnson | deputy123 | Police | Unit-1 | LSSO |
| smith | deputy123 | Police | Unit-2 | LSSO |
| davis | deputy123 | Police | Unit-3 | LSSO |

**Notes:**
- Police officers can access the Sheriff role only
- Dispatch, Fire/EMS, and Tow buttons will be grayed out
- Police have access to unit status updates, records, and reports

---

### Fire/EMS Personnel
| Username | Password | Role | Unit | Department |
|----------|----------|------|------|-----------|
| firefighter1 | fire123 | Fire | Engine-1 | LSFD |
| medic1 | medic123 | Fire | Medic-1 | LSFD |

**Notes:**
- Fire/EMS personnel can access the Fire/EMS role only
- Dispatch, Sheriff, and Tow buttons will be grayed out
- Fire/EMS have access to unit status updates

---

### Tow Service
| Username | Password | Role | Unit | Department |
|----------|----------|------|------|-----------|
| tow1 | tow123 | Tow | Tow-1 | Mike's Towing |
| tow2 | tow123 | Tow | Tow-2 | Quick Tow |

**Notes:**
- Tow operators can access the Tow role only
- Dispatch, Sheriff, and Fire/EMS buttons will be grayed out
- Tow have access to unit status updates

---

### Dispatch
| Username | Password | Role | Unit | Department |
|----------|----------|------|------|-----------|
| dispatcher1 | dispatch123 | Dispatch | DISPATCH-1 | Dispatch |

**Notes:**
- Dispatchers can access the Dispatch role only
- All other role buttons will be grayed out
- Dispatchers have full access to the dispatch interface for managing calls

---

### Civilian
| Username | Password | Role | Unit | Department |
|----------|----------|------|------|-----------|
| civilian1 | civilian123 | Civilian | CIVILIAN-1 | Civilian |

**Notes:**
- Civilians can access the Civilian role only
- Dispatch, Sheriff, Fire/EMS, and Tow buttons will be grayed out
- Civilians have access to character management and DMV records

---

### Administrator (Full Access)
| Username | Password | Role | Unit | Department |
|----------|----------|------|------|-----------|
| admin1 | admin123 | Admin | ADMIN-1 | System Administration |
| admin2 | admin123 | Admin | ADMIN-2 | System Administration |

**Notes:**
- Admins have access to ALL roles
- All role buttons will be fully enabled
- Admins can switch between any role interface
- Use for comprehensive testing and system administration

---

## Test Characters (Civilian portal / Lookup)

These characters are in `data/cad-data.json`. They have no owner, so every account sees them in the Civilian portal, and LEO can run them in Lookup.

| Name | DOB | Plate(s) | Use it to test |
|------|-----|----------|----------------|
| John Smith | 1990-05-15 | SMITH01 | Original sample character |
| Maria Lopez | 1993-07-22 | 4LOP221 | Clean record: valid license, registration and insurance |
| Tony Vance | 1988-02-11 | 8ABC123 | Suspended license, on probation; owns the plate used in BOLO tests |
| Darnell Brooks | 1996-11-03 | DBRK770 | License, registration and insurance all show **EXPIRED** |
| Sarah Chen | 1990-04-09 | SCHEN01, SCHEN02 | Pilot license; two vehicles |
| Jake Miller | 1985-09-30 | JMIL555 | Out-of-state warrant (Liberty City), shows **WANTED** |
| Emily Carter | 2001-12-18 | (none) | No license on file, no vehicles |

Write a report or record naming one of them (Involved Persons, arrestee, a Party, BOLO subject...) or listing one of their plates. It then shows on their Lookup history, in plate runs, and under Records & Reports in the Civilian portal.

---

## Quick Test Scenarios

### Test Role-Based Access Control
1. Log in as `johnson` (Police)
   - Verify Dispatch button is grayed out
   - Verify Sheriff button is enabled
   - Click Sheriff and verify access

2. Log in as `firefighter1` (Fire)
   - Verify all buttons except Fire/EMS are grayed out
   - Click Fire/EMS and verify access

3. Log in as `dispatcher1` (Dispatch)
   - Verify only Dispatch button is enabled
   - All other buttons are grayed out

4. Log in as `civilian1` (Civilian)
   - Verify only Civilian button is enabled
   - All other buttons are grayed out

### Test Admin Access
1. Log in as `admin1` (Admin)
   - Verify all role buttons are enabled
   - Test switching between different roles
   - Verify each role interface is accessible

### Test Sign Out
1. From any role selection page
   - Click "Sign Out" button
   - Verify returned to login screen
   - Log in with a different account

---

## Default Sample Data

### Characters
- **John Smith** (ID: char_001)
  - Vehicle: Plate SMITH01 (Bravado Banshee)
  - License: Valid Driver's License

### Active Dispatch Calls
1. **25-001** - Robbery in Progress (Pillbox Medical Center) - HIGH Priority
2. **25-002** - Traffic Stop (Maze Bank Arena) - MEDIUM Priority
3. **25-003** - Traffic Collision (Del Perro Freeway) - HIGH Priority

---

## Tips for Testing

- **Reset Session**: Click "Sign Out" to clear session and log in as a different user
- **Data Persistence**: All created data (characters, calls, reports) is automatically saved to `/data/cad-data.json`
- **Browser Console**: Open DevTools (F12) to see console logs for debugging
- **Network Tab**: Monitor API calls in Network tab to verify data is being saved/loaded

---

## Support

For issues or questions about test credentials, refer to:
- `CLAUDE.md` - Project overview and architecture
- `INTEGRATION_GUIDE.md` - Data integration details
- `DATA_STRUCTURE.md` - Data schema documentation

---

*Last Updated: December 15, 2025*
*Version: 1.0*
