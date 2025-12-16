# CLAUDE.md - Silver Lining CAD System

## Project Overview

This is a Computer-Aided Dispatch (CAD) system built for Silver Lining Roleplay, a GTA V FiveM roleplay community. The application provides dispatch, police, and civilian interfaces for managing emergency calls, units, and records.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript/TSX
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **State Management**: React useState hooks (local state)
- **Deployment**: Railway

## Project Structure

```
SilverLining-CAD/
├── app/
│   ├── layout.tsx      # Root layout with metadata
│   ├── page.tsx        # Main page that renders CADSystem
│   └── globals.css     # Global styles and Tailwind imports
├── components/
│   └── CADSystem.tsx   # Main application component (monolithic)
├── public/
│   └── SLRPLogo.png    # Silver Lining RP logo
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── next.config.js
```

## Main Component: CADSystem.tsx

The entire application lives in `components/CADSystem.tsx`. This is a large monolithic component (~5000+ lines) containing:

### Roles/Views
1. **Dispatch** - Full CAD interface for dispatchers
2. **Police** - Officer view with unit status, active calls, records management
3. **Civilian** - Character management with DMV records

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
Sheriff's Office divisions, Metro units, CSO units, etc.

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

## Styling Conventions

### Overall Theme
- Dark theme with gray-800/900 backgrounds (dark gray, clean appearance)
- SLRP branding with official logos for all roles
- Vivid azure/cyan accent color for interactive elements

### Color Coding by Role
- **Dispatch**: Green (border-green-500)
- **Civilian**: Purple (border-purple-500)
- **Sheriff (Police)**: Blue (border-blue-500)
- **Fire/EMS**: Red (border-red-500)
- **Tow**: Orange (border-orange-500)
- **Admin**: Full access to all colors

### Other Color Usage
- Blue: Primary actions, Lookup
- Green: Success, Reports, Available status
- Orange: Warnings, Records
- Red: Danger, BOLO, Close actions
- Purple: Records Management
- Yellow: Draft status, Warnings
- Cyan: Login screen border and button, focus rings
- Rounded corners (`rounded`, `rounded-lg`)
- Consistent padding (`p-4`, `px-4 py-2`)

### Branding Elements
- SLRP Logo (h-40) on main role selection page
- Role buttons display official logos:
  - COMLogo: Dispatch
  - CIVLogo: Civilian
  - LSSOLogo: Sheriff
  - LSFDLogo: Fire/EMS
  - TOWLogo: Tow
- Logo image height: h-12 for role buttons, h-24 for login screen

### Login Screen
- SLRP Logo (h-24) displayed prominently
- Title: "Silver Lining Role-Play"
- Vivid azure border (border-cyan-500)
- Cyan sign-in button (bg-cyan-600)
- Cyan input focus rings (focus:ring-cyan-500)
- Hidden demo credentials section

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

## Recent UI/UX Improvements (December 2025)

### Main Page (Role Selection)
- Redesigned with clean dark gray background (`bg-gray-800`)
- Larger SLRP logo (h-40) for better prominence
- Logo-based role buttons instead of text-only
- Role-specific color coding with vivid borders
- Removed welcome text and permission status indicators
- Added "Sign Out" button for testing account switching

### Login Screen
- Updated title from "CAD System Login" to "Silver Lining Role-Play"
- Replaced shield icon with SLRP logo (h-24)
- Changed border color to vivid azure (cyan-500)
- Updated sign-in button to cyan theme
- Updated input focus rings to cyan
- Hidden demo credentials section for cleaner UI

### Civilian Portal
- Header changed to purple gradient
- Removed "Civilian Portal" title
- Removed "Los Santos Sheriff Office" subtitle
- Cleaner header with just branding

### Dispatch Interface
- Header background changed to green gradient
- Visual consistency with role color coding

### Role Access Control
- Role-based button graying for non-authorized users
- Admin role grants access to all interfaces
- Removed lock icon text labels from buttons
- Button styling clearly indicates disabled state (gray border, reduced opacity)

## Role Permissions Matrix

| Role | Dispatch | Civilian | Sheriff | Fire/EMS | Tow |
|------|----------|----------|---------|----------|-----|
| Police | ❌ | ✅ | ✅ | ❌ | ❌ |
| Fire | ❌ | ✅ | ❌ | ✅ | ❌ |
| Tow | ❌ | ✅ | ❌ | ❌ | ✅ |
| Dispatch | ✅ | ✅ | ❌ | ❌ | ❌ |
| Civilian | ❌ | ✅ | ❌ | ❌ | ❌ |
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ |

## Deployment

Deployed on Railway. See `DEPLOYMENT_GUIDE.md` for details.

The `railway.json` configuration handles the deployment settings.

## Future Considerations

- Database integration (currently using JSON file persistence)
- Real-time sync between users (WebSocket/Server-Sent Events)
- Multi-instance deployment support
- Separate the monolithic component into smaller modules
- Implement proper authentication with JWT tokens
- Add password hashing for production
- Implement audit logging for all operations
