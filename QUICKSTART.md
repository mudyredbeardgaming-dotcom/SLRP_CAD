# Quick Start Guide - 5 Minutes to Running

Get the CAD system running locally in 5 minutes!

## Step 1: Install Node.js (if you don't have it)

Download and install Node.js 18 or higher from [nodejs.org](https://nodejs.org)

Check your installation:
```bash
node --version  # Should show v18.0.0 or higher
npm --version   # Should show 9.0.0 or higher
```

## Step 2: Install Dependencies

Open your terminal in the project folder and run:

```bash
npm install
```

This will take 1-2 minutes to download all dependencies.

## Step 3: Run the Development Server

```bash
npm run dev
```

You should see:
```
- ready started server on 0.0.0.0:3000
- Local: http://localhost:3000
```

## Step 4: Open in Browser

Open your web browser and go to:
```
http://localhost:3000
```

**That's it!** Your CAD system is now running! 🎉

## What to Try First

1. **Test Civilian Mode**:
   - Click "Civilian" on the main screen
   - Submit a test incident report
   - See it appear in the dispatch queue

2. **Test Dispatch Mode**:
   - Go back (Exit button)
   - Click "Dispatch"
   - See the call you just created
   - Create a new call manually
   - Try assigning units

3. **Test Police Mode**:
   - Go back to main menu
   - Click "Police"
   - Select a unit (A-101, A-102, or A-103)
   - View your active call
   - Update your status

## Common Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Stop the server
Ctrl+C (or Cmd+C on Mac)
```

## Customizing Before You Deploy

### 1. Change Server Name

Edit `components/CADSystem.tsx` and find:
```typescript
<h1>Silver Lining Roleplay</h1>
<p>Los Santos Sheriff Office</p>
```

Replace with your server name!

### 2. Add Your Call Codes

Find the `CALL_CODES` array:
```typescript
const CALL_CODES = [
  'CALL FOR SERVICE',
  'YOUR CUSTOM CODE HERE',
  // Add more...
];
```

### 3. Configure Permissions

Find the `permissions` state:
```typescript
const [permissions, setPermissions] = useState({
  canAccessDispatch: true,  // Change to false to lock
  canAccessPolice: true      // Change to false to lock
});
```

## Next Steps

- ✅ Test locally (you just did this!)
- ⬜ Customize for your server
- ⬜ Deploy to Railway (see DEPLOYMENT_GUIDE.md)
- ⬜ Share with your community

## Need Help?

- Check README.md for full documentation
- See DEPLOYMENT_GUIDE.md for deploying to Railway
- Review the code in `components/CADSystem.tsx`

## Troubleshooting

**Port 3000 already in use?**
```bash
# Kill the process using port 3000
npx kill-port 3000

# Or use a different port
npm run dev -- -p 3001
```

**Dependencies failed to install?**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and try again
rm -rf node_modules
npm install
```

**TypeScript errors?**

Don't worry! The app will still run. TypeScript errors are just warnings during development.

---

**Time to First Screen**: ~5 minutes  
**Difficulty**: Beginner-friendly  
**Cost**: $0 (free to run locally)

Enjoy your CAD system! 🚔
