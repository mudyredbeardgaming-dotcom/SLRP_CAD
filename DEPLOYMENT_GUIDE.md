# Railway Deployment Guide - Step by Step

This guide will walk you through deploying the Silver Lining CAD System to Railway, making it accessible to anyone with the URL.

## Prerequisites

- A GitHub account
- A Railway account (free tier available)
- Git installed on your computer

## Step 1: Prepare Your Code

### 1.1 Download the Project Files

If you received this as a ZIP file:
1. Extract all files to a folder on your computer
2. Name the folder something like `silver-lining-cad`

### 1.2 Initialize Git Repository

Open your terminal/command prompt in the project folder and run:

```bash
git init
git add .
git commit -m "Initial commit - Silver Lining CAD System"
```

## Step 2: Create GitHub Repository

### 2.1 On GitHub.com

1. Go to [github.com](https://github.com) and sign in
2. Click the "+" icon in the top right
3. Select "New repository"
4. Name it `silver-lining-cad` (or any name you prefer)
5. Choose "Public" (required for free Railway deployment)
6. Do NOT initialize with README (you already have one)
7. Click "Create repository"

### 2.2 Push Your Code

Copy the commands from GitHub's "push an existing repository" section:

```bash
git remote add origin https://github.com/YOUR-USERNAME/silver-lining-cad.git
git branch -M main
git push -u origin main
```

Replace `YOUR-USERNAME` with your actual GitHub username.

## Step 3: Deploy to Railway

### 3.1 Create Railway Account

1. Go to [railway.app](https://railway.app)
2. Click "Login" in the top right
3. Choose "Login with GitHub"
4. Authorize Railway to access your GitHub account

### 3.2 Create New Project

1. Once logged in, click "New Project"
2. Select "Deploy from GitHub repo"
3. If this is your first time, you'll need to "Configure GitHub App"
   - Select which repositories Railway can access
   - Choose "Only select repositories" and select your CAD repo
   - Click "Save"

### 3.3 Select Your Repository

1. Find your `silver-lining-cad` repository in the list
2. Click on it to start deployment

### 3.4 Wait for Deployment

Railway will automatically:
- Detect that it's a Next.js application
- Install dependencies
- Build the application
- Deploy it to a URL

This usually takes 2-5 minutes. You'll see:
- ✓ Build successful
- ✓ Deployment successful

### 3.5 Access Your Application

1. Once deployed, Railway will show you a URL (like `your-app.up.railway.app`)
2. Click "View Logs" to see the deployment status
3. Click on the "Settings" tab
4. Under "Domains", you'll see your app's URL
5. Click the URL to open your CAD system!

## Step 4: Configure Your Application (Optional)

### 4.1 Custom Domain

If you want to use your own domain:

1. Go to your Railway project
2. Click "Settings"
3. Scroll to "Domains"
4. Click "Custom Domain"
5. Enter your domain name
6. Follow the DNS configuration instructions

### 4.2 Environment Variables

To add custom settings:

1. In Railway, click on your project
2. Click "Variables"
3. Click "New Variable"
4. Add variables like:
   ```
   NEXT_PUBLIC_APP_NAME=Silver Lining CAD
   NEXT_PUBLIC_SERVER_NAME=Your Server Name
   ```

### 4.3 Configure Permissions

To restrict who can access Dispatch and Police roles:

1. Go to your GitHub repository
2. Edit `components/CADSystem.tsx`
3. Find the `permissions` state:
   ```typescript
   const [permissions, setPermissions] = useState({
     canAccessDispatch: false,  // Change to false
     canAccessPolice: false      // Change to false
   });
   ```
4. Commit and push:
   ```bash
   git add .
   git commit -m "Update permissions"
   git push
   ```
5. Railway will automatically redeploy with the changes!

## Step 5: Share With Your Community

Your CAD system is now live! Share the URL with your community:

**Example URL**: `https://silver-lining-cad.up.railway.app`

Users can:
- Access it from any device with a web browser
- Choose their role (Dispatch, Police, or Civilian)
- Use the system for roleplay scenarios

## Updating Your Application

Whenever you make changes to your code:

```bash
# Make your changes to the files
git add .
git commit -m "Description of your changes"
git push
```

Railway will automatically detect the changes and redeploy!

## Troubleshooting

### Problem: Build Failed

**Solution**:
1. Check the build logs in Railway
2. Common issues:
   - Missing dependencies: Make sure `package.json` is correct
   - Syntax errors: Check your code for typos
   - TypeScript errors: Review any TypeScript errors in the logs

### Problem: App Deploys But Shows Blank Page

**Solution**:
1. Check the browser console (F12)
2. Check Railway logs for runtime errors
3. Verify all file paths are correct

### Problem: "This site can't be reached"

**Solution**:
1. Wait a few minutes - deployment might still be in progress
2. Check Railway dashboard to see if deployment is complete
3. Try the URL in an incognito/private window

### Problem: Changes Not Showing Up

**Solution**:
1. Make sure you pushed your changes to GitHub:
   ```bash
   git status  # Should show "nothing to commit"
   ```
2. Check Railway to see if it's rebuilding
3. Hard refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)

## Monitoring Usage

Railway provides:
- **Deployment logs**: See what's happening during builds
- **Application logs**: See runtime activity
- **Metrics**: View CPU, memory, and network usage
- **Usage alerts**: Get notified if you're approaching limits

### Free Tier Limits

Railway's free tier includes:
- $5 of usage per month
- 500 hours of runtime
- 100 GB network egress

This is typically enough for small to medium roleplay communities!

## Best Practices

1. **Regular Updates**: Keep your dependencies updated
2. **Backup Data**: Users should export their data regularly
3. **Monitor Logs**: Check logs occasionally for errors
4. **Test Changes**: Test locally before pushing to production

## Database Integration (Future Enhancement)

For persistent storage across sessions:

1. Add a Railway PostgreSQL database to your project
2. Integrate an ORM like Prisma
3. Modify the CAD system to save data to the database

This is more advanced but provides real data persistence!

## Getting Help

- Railway Discord: [discord.gg/railway](https://discord.gg/railway)
- Railway Docs: [docs.railway.app](https://docs.railway.app)
- GitHub Issues: Report bugs in your repository's Issues section

## Cost Estimate

For a typical roleplay server with ~50 active users:
- **Free Tier**: Usually sufficient if under 500 hours/month
- **Paid Plan**: $5-10/month if you exceed free tier

Railway only charges for what you use!

---

**Congratulations!** Your CAD system is now deployed and accessible to your entire community. 🎉

## Quick Reference Commands

```bash
# Update your app
git add .
git commit -m "Your changes"
git push

# View local version
npm run dev

# Check git status
git status

# View commit history
git log --oneline
```

## Next Steps

1. ✅ Deploy to Railway
2. ✅ Share URL with community
3. ⬜ Set up custom domain (optional)
4. ⬜ Configure permissions
5. ⬜ Add your server's branding
6. ⬜ Customize call codes and departments
7. ⬜ Consider database integration for production use

---

**Support**: If you encounter issues, check the main README.md or create an issue on GitHub.
