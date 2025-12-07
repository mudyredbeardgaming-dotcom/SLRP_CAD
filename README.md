# Silver Lining CAD System

A comprehensive Computer-Aided Dispatch (CAD) system designed for roleplay servers, featuring dispatch management, police unit tracking, and civilian reporting interfaces.

![CAD System](https://img.shields.io/badge/version-1.0.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![React](https://img.shields.io/badge/React-18-blue)
![Tailwind](https://img.shields.io/badge/Tailwind-3-38bdf8)

## Features

### 🚔 Dispatch Interface
- Create and manage emergency calls
- Assign units to calls automatically or manually
- Track call priorities (P1, P2, P3)
- Real-time unit status monitoring
- Call notes and documentation
- Export/Import session data

### 👮 Police/Deputy Interface
- Personal unit dashboard (MDT)
- View active call assignments
- Update unit status (10-8, 10-6, 10-7, etc.)
- Access call history
- View detailed call information
- Manage unit information

### 👤 Civilian Interface
- Report incidents to law enforcement
- Emergency and non-emergency reporting
- Simple, user-friendly interface

### 📊 System Features
- **Real-time Updates**: All changes sync across the interface instantly
- **Auto-Assignment**: Automatically assigns available units to new calls
- **Priority System**: Color-coded priority levels for quick identification
- **10-Codes**: Police 10-code support for status updates
- **Call Notes**: Document important information on calls
- **Paste Documents**: Quick paste feature for driver's licenses, registrations, etc.
- **Data Export/Import**: Save your session and reload it later
- **Responsive Design**: Works on desktop and mobile devices

## Quick Start

### Prerequisites
- Node.js 18.0.0 or higher
- npm or yarn package manager

### Local Development

1. **Clone or download the repository**
   ```bash
   git clone <your-repo-url>
   cd silver-lining-cad-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Run development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

## Deployment on Railway

Railway is a cloud platform that makes it easy to deploy applications. Here's how to deploy this CAD system:

### Method 1: Deploy from GitHub (Recommended)

1. **Push your code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Go to Railway**
   - Visit [railway.app](https://railway.app)
   - Sign in with GitHub
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Configure the deployment**
   - Railway will auto-detect the Next.js app
   - Click "Deploy Now"
   - Wait for the build to complete

4. **Access your app**
   - Railway will provide a URL (e.g., `your-app.up.railway.app`)
   - Click the URL to access your CAD system

### Method 2: Deploy from CLI

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**
   ```bash
   railway login
   ```

3. **Initialize project**
   ```bash
   railway init
   ```

4. **Deploy**
   ```bash
   railway up
   ```

5. **Open your app**
   ```bash
   railway open
   ```

### Environment Variables (Optional)

If you want to add custom configurations:

1. Go to your Railway project dashboard
2. Click on "Variables"
3. Add environment variables as needed

Example variables you might want to add:
```
NODE_ENV=production
NEXT_PUBLIC_APP_NAME=Silver Lining CAD
```

## Configuration

### Permissions

To restrict access to Dispatch or Police roles, edit the `permissions` state in `components/CADSystem.tsx`:

```typescript
const [permissions, setPermissions] = useState({
  canAccessDispatch: false,  // Set to false to require admin approval
  canAccessPolice: false      // Set to false to require admin approval
});
```

### Customization

#### Call Codes
Edit the `CALL_CODES` array in `components/CADSystem.tsx`:
```typescript
const CALL_CODES = [
  'CALL FOR SERVICE', 
  'ASSAULT', 
  'BURGLARY', 
  // Add more codes here
];
```

#### Departments
Edit the `DEPARTMENTS` array to match your server structure:
```typescript
const DEPARTMENTS = [
  'SO-ADMIN',
  'SO-PATROL',
  // Add your departments here
];
```

#### Initial Units
Modify the `initialUnits` array in the `useEffect` hook to set default units when the app loads.

## Usage Guide

### For Dispatchers

1. **Select Dispatch Role** from the main menu
2. **Create New Calls**:
   - Click "New Call" button
   - Fill in call details (location, type, priority)
   - System will auto-assign to available units
3. **Manage Units**:
   - Go to "Units" tab
   - Select a unit
   - Update status using 10-code buttons
4. **Monitor Active Calls**:
   - View all active calls on Dispatch tab
   - Click a call to see details and manage assignments

### For Police/Deputies

1. **Select Police Role** from the main menu
2. **Choose Your Unit** from the available units
3. **View Active Call**:
   - See your assigned call details
   - Update your status as needed
4. **Manage Status**:
   - Use status buttons: 10-8 (Available), 10-6 (Busy), 10-76 (Enroute), 10-23 (On-Scene)
5. **View Call History**:
   - Access closed calls you've been assigned to
   - Review call details and notes

### For Civilians

1. **Select Civilian Role** from the main menu
2. **Report an Incident**:
   - Fill out the incident report form
   - Provide location and description
   - Submit to notify law enforcement

## Data Management

### Export Data
1. Click the menu button (bottom left)
2. Select "Export/Import Data"
3. Click "Download Backup"
4. Save the JSON file

### Import Data
1. Click the menu button (bottom left)
2. Select "Export/Import Data"
3. Click "Choose File" under Import
4. Select your previously exported JSON file

**Note**: Data is stored in-memory during each session. Always export important data before closing the browser!

## Technical Stack

- **Framework**: Next.js 14 (React 18)
- **Styling**: Tailwind CSS 3
- **Icons**: Lucide React
- **Language**: TypeScript
- **Deployment**: Railway (or Vercel, Netlify)

## File Structure

```
silver-lining-cad-system/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home page
│   └── globals.css         # Global styles
├── components/
│   └── CADSystem.tsx       # Main CAD component
├── public/                 # Static assets
├── package.json           # Dependencies
├── next.config.js         # Next.js config
├── tailwind.config.js     # Tailwind config
├── tsconfig.json          # TypeScript config
└── README.md              # This file
```

## Troubleshooting

### Build Errors

**Error**: `Module not found: Can't resolve 'lucide-react'`
**Solution**: Run `npm install` to install all dependencies

**Error**: Port already in use
**Solution**: Change the port or kill the process:
```bash
# Find process on port 3000
lsof -ti:3000
# Kill it
kill -9 <PID>
```

### Railway Deployment Issues

**Build fails on Railway**:
1. Check the build logs in Railway dashboard
2. Ensure `package.json` has correct scripts
3. Verify Node.js version in `engines` field

**App deploys but shows blank page**:
1. Check browser console for errors
2. Verify all imports are correct
3. Check Railway logs for runtime errors

## Support

For issues or questions:
1. Check the [Issues](../../issues) section
2. Review Railway documentation at [docs.railway.app](https://docs.railway.app)
3. Check Next.js documentation at [nextjs.org](https://nextjs.org)

## License

This project is provided as-is for roleplay server use. Feel free to modify and customize for your needs.

## Credits

Built for **Silver Lining Roleplay** - Los Santos Sheriff Office

---

**Version**: 1.0.0  
**Last Updated**: December 2024  
**Maintained By**: Your Team

## Roadmap

Future enhancements planned:
- [ ] Database integration for persistent storage
- [ ] Multi-user real-time synchronization
- [ ] Mobile app version
- [ ] Advanced reporting and analytics
- [ ] Vehicle and person lookup integration
- [ ] Map integration for call locations
- [ ] Audio alerts for new calls
- [ ] Print functionality for reports

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
