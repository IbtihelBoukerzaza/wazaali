# Render Deployment Steps - Detailed Guide

## Step 1: Go to Render.com
1. Open browser: https://render.com
2. Click "Sign Up" (top right)
3. Sign up with GitHub account
4. Authorize Render to access your GitHub

## Step 2: Create New Web Service
1. After login, click "New" (top left)
2. Select "Web Service"
3. Click "Connect Repository"

## Step 3: Connect Your Repository
1. Search for: `wazaali` (your repo name)
2. Select the repository: `IbtihelBoukerzaza/wazaali`
3. Click "Connect"

## Step 4: Configure Service
1. **Name:** `waze3li-backend` (or any name you prefer)
2. **Root Directory:** `backend` (IMPORTANT - select your backend folder)
3. **Build Command:** `npm install`
4. **Start Command:** `node server.js`
5. **Node Version:** `18` (or latest)
6. **Instance Type:** `Free` (select free tier)

## Step 5: Deploy
1. Click "Create Web Service"
2. Wait for deployment (2-3 minutes)
3. **Copy your URL:** `https://your-app-name.onrender.com`

## Step 6: Get Your URL
After deployment, Render shows:
```
Live URL: https://your-app-name.onrender.com
```

## Step 7: Update Frontend
In `src/services/firestoreService.js`, update:
```javascript
const BACKEND_URL = 'https://your-app-name.onrender.com';
```

## Step 8: Test
1. Build APK: `expo build:android`
2. Install on phone
3. Test admin approve/reject
4. Check email delivery ✅

## Important Notes
- **Root Directory MUST be `backend`** (not project root)
- **Build Command MUST be `npm install`** (installs dependencies)
- **Start Command MUST be `node server.js`** (runs your server)
- **Free tier works** for your needs

## Troubleshooting
If deployment fails:
- Check that backend folder is selected correctly
- Verify package.json has correct scripts
- Ensure GitHub repo has backend files
- Check Render logs for errors

## Success Indicators
✅ Service shows "Live" status
✅ URL ends with `.onrender.com`
✅ Can access `/api/health` endpoint
✅ Emails send when admin approves/rejects
