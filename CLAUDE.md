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
│   ├── layout.tsx      # Root layout, metadata, fonts
│   ├── page.tsx        # Main page that renders CADSystem
│   ├── icon.svg        # Favicon (StrataMDT mark)
│   └── globals.css     # Tailwind imports + StrataMDT design system classes
├── components/
│   ├── Brand.tsx       # BRAND config, BrandMark, BrandLockup (logo swap point)
│   └── CADSystem.tsx   # Main application component (monolithic)
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
2. **Police (Sheriff)** - Officer view with unit status, active calls, records management
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
- **Sheriff (Police)**: blue
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
- **Operational shell (Dispatch/Sheriff/Fire/Tow)**: sticky top bar (lockup, role pill, segmented nav, dispatcher COM button), a unit status strip for unit roles (identity card, status buttons with 10-codes and active-state highlight, separated PANIC button), and a bottom taskbar (Menu button, pinned Records shortcuts, PST clock).
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

- Final StrataMDT logo artwork (wire up via `components/Brand.tsx`)
- Database integration (currently using JSON file persistence)
- Real-time sync between users (WebSocket/Server-Sent Events)
- Multi-instance deployment support
- Separate the monolithic component into smaller modules
- Implement proper authentication with JWT tokens
- Add password hashing for production
- Implement audit logging for all operations
