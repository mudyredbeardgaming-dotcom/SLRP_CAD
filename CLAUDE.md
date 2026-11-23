# CLAUDE.md - StrataMDT

## Project Overview

StrataMDT is a Mobile Data Terminal / Computer-Aided Dispatch (CAD) system for GTA V FiveM roleplay communities. The application provides dispatch, police, fire/EMS, tow, and civilian interfaces for managing emergency calls, units, and records.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript/TSX
- **Styling**: Tailwind CSS + a small design-system layer in `app/globals.css`
- **Fonts**: Inter (sans) and JetBrains Mono (mono) via `next/font`
- **Icons**: Lucide React
- **State Management**: React useState hooks (local state)
- **Deployment**: Railway

## Project Structure

```
StrataMDT/
├── app/
│   ├── api/            # load-data, save-data, fivem/* (bridge endpoints)
│   ├── layout.tsx      # Root layout, metadata, fonts
│   ├── page.tsx        # Main page that renders CADSystem
│   ├── icon.svg        # Favicon (StrataMDT mark)
│   └── globals.css     # Tailwind imports + StrataMDT design system classes
├── components/
│   ├── Brand.tsx       # BRAND config, BrandMark, BrandLockup (logo swap point)
│   ├── LiveMap.tsx     # FiveM live unit map (Law Enforcement → Live Map)
│   └── CADSystem.tsx   # Main application component (monolithic)
├── lib/dataStore.ts    # Locked, atomic access to data/cad-data.json (server)
├── lib/permissions.ts  # SELF_DISPATCH / GROUP_UNITS policies (ranks/subdivisions lists)
├── lib/cadDate.ts      # CAD date (Pacific time), +1 year, EXPIRED status helpers (browser + server)
├── lib/fivem/          # FiveM bridge: protocol types, in-memory store, API-key auth, character sync, useFiveMBridge hook
├── fivem/strata-mdt/   # Sample FiveM resource (Lua) + fivem/README.md protocol docs
├── public/             # Static assets (legacy role logos still live here)
├── package.json
├── tailwind.config.js  # Palette (gray override + accent), radii, shadows, animations
├── tsconfig.json
└── next.config.js
```

## Main Component: CADSystem.tsx

The entire application lives in `components/CADSystem.tsx`. This is a large monolithic component (~13000 lines) containing:

### Roles/Views
1. **Dispatch** - Full CAD interface for dispatchers
2. **Police (Law Enforcement)** - Officer view with unit status, active calls, records management
3. **Fire/EMS** - Unit status and active call view
4. **Tow** - Tow unit view
5. **Civilian** - Character management with DMV records

### Key Features
- **Authentication**: Officer login with persistent sessions (localStorage)
- **Version-based session invalidation**: `APP_VERSION` constant forces re-login on updates
- **Real-time clock**: Updates every second (paused during form editing to prevent re-renders)
- **Export/Import**: JSON-based data backup

### State Management Patterns
- All state is managed with `useState` hooks at the component level
- State that needs `<any>` type annotation to avoid TypeScript errors
- Session data stored in localStorage under key `cadSession`
- `isClient` state prevents hydration mismatches (SSR vs client)

### Important Patterns

**Preventing Hydration Errors:**
```tsx
const [isClient, setIsClient] = useState(false);

useEffect(() => {
  setIsClient(true);
  // Load localStorage data here
}, []);

if (!isClient) {
  return <div>Loading...</div>;
}
```

**Preventing Form Input Issues:**
- Clock updates are paused when forms are open (`civilianView`, `showNewCall`, etc.)
- Nested components that need state should be render functions, not component functions
- Use `any` types for complex state objects to avoid TypeScript strictness issues

## Build Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## TypeScript Configuration

The project uses strict mode but with `noImplicitAny: false` to allow flexibility:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": false
  }
}
```

## Key Constants & Data

### Departments (DEPARTMENTS array)
Only `B.C.S.O` and `L.S.P.D`. Used by the Unit Information modal and every department/agency dropdown in the report and record forms (rendered with `DEPARTMENTS.map`). Don't add hard-coded agency `<option>`s.

### Subdivisions (SUBDIVISIONS array)
TED, K-9, AIR, CIU, IA, SRT, MARINE, CVE, DO, WC, BCSO-PATROL, BCSO-SUPV, LSPD-PATROL, LSPD-SUPV. Entries with a `dept` only show for that department (`subdivisionsFor(dept)`). Stored on `unit.subdivision`; the Unit Information modal also edits `unit.aop` (free text).

### Call Codes (CALL_CODES array)
Standard dispatch call types

### DMV Record Types
- Vehicle Registration
- License (Driver, Pilot, Boat, Fishing, Hunting, Medical Marijuana)
- Medical History
- Security Guard License
- Registered Firearm
- Out of State Warrant
- Probation
- Parole
- Medical Hazard

### Report Types (Police Records Panel)
- Traffic Collision Report
- Supplemental Report
- Use of Force Report
- General Report
- Vehicle Tow/Release Report
- Detective Request Form
- Detective Report
- Trespass Warning
- Restraining Order
- Evidence Locker

### Record Types (Police Records Panel)
- Arrest
- BOLO
- Warrant
- Citation

### BOLO panel
Records Management → BOLO (`activeRecordsPanel === 'bolo'`, `boloPanelJSX`) lists every officer's BOLO records that are active. Deactivating sets `status: 'INACTIVE'` (+ `deactivatedAt`/`deactivatedBy`), which removes the BOLO from the Active list. Deactivated BOLOs stay under the Inactive tab and can be reactivated. Deactivate/Reactivate is available on the card and in the BOLO record footer. The record form modal is `recordFormModalJSX`, which both the Records and BOLO panels render.

### Lookup and person history
Selecting a person in Lookup ("Verify ID") shows, in order:
1. A **WANTED** banner, or a green "no active warrants or BOLOs" line. The banner lists active WARRANT records, out-of-state warrants from the person's DMV records, and active BOLOs on the person or on one of their registered plates.
2. The ID card.
3. Arrest history: ARREST records and ARREST reports.
4. Reports the person is named in, with their role.
5. Citations.
6. DMV records.

Matching is `personMatches(person, name, id)`. A stored civilian id wins (`subjectId`, `arresteeId`, `trespasserId`, `party.personId`, `victimOfForce.personId`, `involvedPersons[].civilianId`). Without an id it falls back to an exact name match that ignores middle initials. Typing a name by hand clears the stored id.

Every report and record has an **Involved Persons** section (`renderInvolvedPersons(data, setData, noun)`, stored as `involvedPersons` `[{civilianId, name, dob, role}]`; roles SUSPECT, VICTIM, WITNESS, REPORTING PARTY, OTHER). `reportRolesFor` also derives roles from each report's own person fields (arrestee, trespasser, party 1/2 + involvement, victim of force, driver, witnesses). Report and record forms are `reportFormModalJSX` / `recordFormModalJSX`, so they open on top of the Records, BOLO and Lookup panels.

Characters store `dateOfBirth`, `cellPhone`, `streetResidence`; use `civName`/`civDob`/`civPhone`/`civAddress` (they also read the legacy `dob`/`phone`/`address`).

Records (BOLO, warrant, arrest, citation) show in Lookup's "Involved In Reports & Records" through their Involved Persons. A BOLO with the person as an involved SUSPECT also puts them in the WANTED banner.

### Unit dashboard (Law Enforcement / Fire-EMS)
`renderUnitDashboard()` shows Active Call, Call History and Live Map as tiled windows on one screen (`renderDashWindow`). Layout state `unitLayout` `{preset: side|top|columns, order, s1, s2, maximized}` is saved per role in localStorage (`strataUnitLayout:<role>`).
- Drag a window's title bar onto another window to swap them (HTML5 drag and drop).
- Drag the gaps to resize. Resizing writes the `--s1`/`--s2` CSS variables directly and commits on release.
- Double-click a title bar, or use its button, to maximize a window.
- Windows keep a fixed DOM order and are only repositioned, so the map keeps its pan and zoom.
- Below 1024px the windows stack.

### Self-dispatch
The Active Call window has an **Open Calls** tab (`renderOpenCalls`). It shows the unit's own call type by default: LE for police, `callTitle === 'FD'` for fire.
- Attach (`selfAttach`) and Clear from call (`selfDetach`) add a call note.
- Who can self-dispatch is set in `lib/permissions.ts` (`SELF_DISPATCH`). Empty rank and subdivision lists mean every unit can.
- `officerCredentials[].selfDispatch` true/false overrides it per account. Admins always can.

### Unit groups (two officers in one vehicle)
Dispatch → Units → **Group units**. LE / Fire supervisors get a **Units** nav tab with the same screen (`renderDispatchUnits`), limited to their own service (`unitRoleOf`). `canGroupUnits` in `lib/permissions.ts` (`GROUP_UNITS` ranks/subdivisions, default `*-SUPV` subdivisions and supervisor ranks; empty lists = nobody; `officerCredentials[].groupUnits` overrides; dispatch and admins always). Stored on units as `groupId` / `groupName`.
- A group moves as one: `assignUnit`, `unassignUnit`, `createCall` auto-assign and `updateUnitStatus` apply to every member through `groupIdsOf`. PANIC stays with the unit that pressed it.
- Groups with fewer than 2 members dissolve (`dissolveSmallGroups`). Grouping units that are on different active calls is refused.
- The live map draws group members within about 30 m as one marker. The unit list and status strip show "Riding with". Dispatch has its own **Live Map** tab.

### DMV expiration dates
- "Today" is the CAD date in Pacific time (`cadToday()` in `lib/cadDate.ts`), not the browser's or server's date.
- `liveDmvRecord(s)` shows a registration, insurance or license as **EXPIRED** once its date is before today, for VALID, ACTIVE or empty statuses. It only changes what is displayed; the stored record is untouched.
- Use these helpers everywhere a status is shown: Lookup, the civilian portal, report vehicle and party searches, and `/api/fivem/lookup`.
- New licenses and registrations default to one year from the CAD date:
  - in the civilian portal, `renderExpiryInput` has an "Auto 1 yr" button, and blank dates are filled on save;
  - from FiveM, through `lib/fivem/characters.ts`.
- From the game, `expires` / `registrationExpires` / `insuranceExpires` take `YYYY-MM-DD` or `"auto"`.

### Citations from FiveM
- `citation_issued` (`lib/fivem/records.ts`) writes a CITATION record into `officerRecords`. It matches the officer by linked identifier, then callsign, and stores `officerUsername`. It matches the subject by synced character, then exact name, and stores `subjectId`. It also sets `source: 'FIVEM'` and an optional `externalId`, which prevents duplicates.
- Like character sync, the record is re-added on `/api/save-data` for 15 minutes (`replayGameRecords`).
- The Records panel lists **Mine** (by `officerUsername`, else officer name) or **All**.
- The civilian portal shows a **Citations** section per character (`citationsFor`).
- Lua side: `fivem/strata-mdt/server_citations.lua` provides `/cite`, `exports.IssueCitation` and the `strata-mdt:citationFiled` event. `server_sync.lua` handles player-chosen expiry dates (`strata:chooseExpiry`, `/dlexpiry`, `/regexpiry`).

### Charges
Every charge list stores `counts` per charge (times charged with the same offense) and edits it with `renderCountsInput` (−/+ stepper). Bond totals multiply by counts (`chargeCount(c)`).

## Branding

- Product name: **StrataMDT** (wordmark renders as "Strata" + accent-colored "MDT").
- All brand values live in `components/Brand.tsx` (`BRAND`). Never hard-code the name or logo paths in `CADSystem.tsx`; use `BRAND.name`, `<BrandMark />`, or `<BrandLockup />`.
- **Logos**: final artwork is still pending. Until then `BrandMark` renders a built-in SVG "strata" mark, and role cards use Lucide icons. To use real logos, put the files in `/public` and set `BRAND.logo` and/or `BRAND.roleLogos.{dispatch,civilian,police,fire,tow}`.
- The legacy PNGs in `/public` (`SLRPLogo.png`, `COMLogo.png`, etc.) are no longer referenced.

## Design System (UI v2.0)

The UI is a sleek dark theme built from layered surfaces, hairline borders, and a single sky/cyan accent. Prefer the component classes below over long ad-hoc Tailwind strings so the look stays consistent.

### Palette (tailwind.config.js)
- `gray-*` is **overridden** with a cool, blue-tinted scale (`gray-950` #07090d … `gray-50`), including extra `750` and `850` steps. Page = `gray-900`, panels = `gray-800`.
- `accent-300…700`: brand accent (sky/cyan). Use for primary actions, focus states, and active selections.
- Borders: use translucent hairlines (`border-white/[0.06]` or `[0.08]`) instead of `border-gray-600/700`.
- Shadows: `shadow-panel`, `shadow-modal`, `shadow-glow`. Animations: `animate-fade-in`, `animate-scale-in`.

### Component classes (app/globals.css)
| Class | Use |
|-------|-----|
| `field` | Every text input / select / textarea (recessed, accent focus). Modifiers: `field-sm`, `field-xs`, `field-warn`, `field-danger` |
| `field-label` | Form labels |
| `panel` | Top-level card on the page background |
| `panel-card` | Card nested inside a panel or modal |
| `well` | Recessed inner area (notes, previews) |
| `subcard` | Raised row inside a card (charges, linked items) |
| `section-title text-{color}-400` | Form section headers (small caps label with a colored bar) |
| `modal-backdrop` / `modal-surface` / `modal-header` | Modal overlay, container, header bar |
| `btn` + `btn-primary` / `btn-secondary` / `btn-success` / `btn-danger` / `btn-ghost`, `btn-sm` | Buttons |
| `icon-btn` | Square icon-only button (e.g. close X) |
| `menu-list` / `menu-item` | Dropdowns and autocomplete lists |
| `chip`, `eyebrow` | Small pill badge; small uppercase overline label |
| `seg` / `seg-item` / `seg-item-active` | Segmented navigation (dispatch tabs) |
| `status-btn` | Unit status buttons in the header status strip |

### Role accents
Role color is a highlight (pill, dot, icon chip, header underline), not a thick border:
- **Dispatch**: emerald/green
- **Civilian**: purple
- **Law Enforcement (Police)**: blue
- **Fire/EMS**: red
- **Tow**: orange
- **Admin**: Full access to all roles

### Semantic color usage
- Accent (sky/cyan): primary actions, focus rings, active selection
- Green/emerald: success, available status
- Red: danger, PANIC, BOLO, close-call warnings
- Yellow: draft/primary-unit badges, warnings
- Orange: records, tow
- Purple: records management, civilian

## Screens

- **Login**: centered card over an ambient gradient/grid background, StrataMDT mark + wordmark, inputs with leading icons, show/hide password toggle, accent sign-in button, version footer.
- **Role selection**: top bar (lockup, user chip, Sign Out), "Where are you working today?" heading, five role cards with icon chips; unavailable roles are dimmed with a "No access" label.
- **Operational shell (Dispatch/Law Enforcement/Fire/Tow)**: sticky top bar (lockup, role pill, segmented nav, dispatcher COM button), a unit status strip for unit roles (identity card, status buttons with 10-codes and active-state highlight, separated PANIC button), and a bottom taskbar (Menu button, pinned Records shortcuts, PST clock).
- **Civilian portal**: sticky top bar with purple role pill and Change Role button; character cards grid; dashed empty state.

## Common Issues & Solutions

### Form inputs losing focus
- Ensure form components are render functions, not nested components
- Add form-related state to clock update dependency check

### Hydration mismatch errors
- Never access `localStorage` during initial render
- Use `isClient` state pattern to defer client-only code

### TypeScript errors with state
- Use `<any>` or `<any[]>` type annotations for complex state
- Cast event targets: `e.target as HTMLInputElement`

## Testing Credentials (Development)

All test credentials are stored in `/data/cad-data.json` under `officerCredentials`. See `TESTING_LOGINS.md` for complete list and testing scenarios.

### Quick Reference:
- **Police**: johnson / deputy123, smith / deputy123, davis / deputy123
- **Fire**: firefighter1 / fire123, medic1 / medic123
- **Tow**: tow1 / tow123, tow2 / tow123
- **Dispatch**: dispatcher1 / dispatch123
- **Civilian**: civilian1 / civilian123
- **Admin**: admin1 / admin123, admin2 / admin123

## Role Permissions Matrix

| Role | Dispatch | Civilian | Law Enforcement | Fire/EMS | Tow |
|------|----------|----------|---------|----------|-----|
| Police | ❌ | ✅ | ✅ | ❌ | ❌ |
| Fire | ❌ | ✅ | ❌ | ✅ | ❌ |
| Tow | ❌ | ✅ | ❌ | ❌ | ✅ |
| Dispatch | ✅ | ✅ | ❌ | ❌ | ❌ |
| Civilian | ❌ | ✅ | ❌ | ❌ | ❌ |
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ |

## FiveM Bridge

Basis for connecting a FiveM server. Full protocol and setup: `fivem/README.md`.
- Off unless `FIVEM_API_KEY` is set on the CAD host. The game server authenticates with `Authorization: Bearer <key>`.
- Game -> CAD: `POST /api/fivem/ingest` (heartbeat, unit_update, unit_left, unit_status, panic, call_911, aop_update; persisted: account_link, character_upsert, license_set, vehicle_register, citation_issued). CAD -> game: the game polls `GET /api/fivem/outbox?since=`. Lookups: `GET /api/fivem/lookup?plate=|name=`.
- CAD UI: `useFiveMBridge` polls `/api/fivem/state` (paused while forms/modals are open, same reason as the clock). It drives the top-bar FiveM chip, the "Incoming from FiveM" queue on the Dispatch board, and live locations on unit cards.
- Units are matched to players by **callsign** (case-insensitive).
- Character sync (`lib/fivem/characters.ts`): in-game characters, licenses and vehicles become civilians and DMV records in `cad-data.json` (ids `FIVEM-<characterId>`, `FIVEM-...-LIC-<TYPE>`, `FIVEM-VEH-<PLATE>`). Game writes go through `lib/dataStore.ts` (`withDataLock`, atomic writes), and `/api/save-data` calls `replayGameChanges` so a browser saving stale data can't drop recent game changes (15 min window).
- Account linking: civilian portal "Get link code" → player types `/linkcad CODE` → `officerCredentials[].fivemLink`. Civilians carry `ownerUsername`; the portal shows only the user's own (admins see all; owner-less legacy civilians stay visible).
- Lua resource commands are all configurable in `fivem/strata-mdt/config.lua` (`Config.Commands`); the heartbeat reports the configured names (`fivem.server.commands`).
- Live map: `components/LiveMap.tsx` (top-level component so pan/zoom survive CADSystem re-renders), fills its parent (unit list is an overlay drawer); shown as a window on the Law Enforcement / Fire-EMS unit dashboard and on the Dispatch **Live Map** tab. Map image is the GTA V atlas in `public/map/` (overview + HD for close zoom, dark/atlas style toggle); calibration in `lib/fivem/mapConfig.ts`. Setting `image: null` falls back to a grid with region labels.
- Bridge state is in memory (`lib/fivem/store.ts`, on `globalThis`), not in `cad-data.json`, so a single server instance is assumed.
- CAD actions that should reach the game call `fivem.send(...)` (see createCall, assignUnit, closeCall, updateUnitStatus). Game-originated changes are applied locally and saved, never echoed back.

## Deployment

Deployed on Railway. See `DEPLOYMENT_GUIDE.md` for details.

The `railway.json` configuration handles the deployment settings.

## Future Considerations

- Final StrataMDT logo artwork (wire up via `components/Brand.tsx`)
- Database integration (currently using JSON file persistence)
- Real-time sync between users (WebSocket/Server-Sent Events)
- FiveM: waypoints for assigned calls, finer map calibration / tiled map, ESX/QBCore job sync, shared store (Redis) for multi-instance
- Multi-instance deployment support
- Separate the monolithic component into smaller modules
- Implement proper authentication with JWT tokens
- Add password hashing for production
- Implement audit logging for all operations
