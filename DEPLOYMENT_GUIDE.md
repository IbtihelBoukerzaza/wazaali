# APK Email Deployment Guide

## Problem
Local backend (`localhost:5000`) not accessible from APK on client's phone.

## Best Solution: Render.com (Free)

### Why Render.com?
- ✅ **Completely free** tier available
- ✅ **HTTPS URL** for secure APK communication  
- ✅ **Easy deployment** from GitHub
- ✅ **Auto-deploy** on git push
- ✅ **Node.js support** perfect for your backend
- ✅ **Reliable uptime** and performance

## Step-by-Step Setup

### 1. Prepare Backend Repository
```bash
cd backend
git init
git add .
git commit -m "Add email backend for Waze3li"
git remote add origin https://github.com/yourusername/waze3li-backend.git
git push -u origin main
```

### 2. Deploy to Render.com
```bash
# Install Render CLI
npm install -g render-cli

# Deploy your backend
render deploy
```

### 3. Get Your Render URL
After deployment, Render gives you:
```
https://your-app-name.onrender.com
```

### 4. Update Frontend URL
In `src/services/firestoreService.js`, update:
```javascript
const BACKEND_URL = 'https://your-app-name.onrender.com';
```

### 5. Build and Test APK
```bash
# Build APK with new backend URL
expo build:android

# Install on client phone
# Test admin approve/reject functionality
# Check email delivery ✅
```

## Alternative Options

### Option A: EmailJS (Zero Backend)
```javascript
// Install: npm install emailjs-com
// Direct email from frontend - no server needed
import emailjs from 'emailjs-com';

const sendEmail = async (userEmail, status, userName) => {
  await emailjs.send('service_id', 'template_id', {
    to_email: userEmail,
    status: status,
    user_name: userName
  });
};
```

### Option B: Firebase Cloud Functions (Blaze Plan)
```javascript
// functions/index.js
exports.sendStatusEmail = functions.https.onCall(async (data) => {
  // Your email logic here
});
```

### Option C: Vercel (Free)
```bash
# Deploy to Vercel
vercel --prod
```

## Quick Start Commands

```bash
# Deploy to Render (Recommended)
cd backend
render deploy

# Or use EmailJS (No deployment needed)
npm install emailjs-com
```

## Testing Checklist

- [ ] Backend deployed to Render.com
- [ ] Frontend URL updated
- [ ] APK built with new URL
- [ ] Admin approves user → Email sent ✅
- [ ] Admin rejects user → Email sent ✅
- [ ] Client receives professional Arabic emails

## Expected Results

**When admin approves user:**
- ✅ User receives green "تمت الموافقة" email
- ✅ Can login to app
- ✅ Professional Arabic content

**When admin rejects user:**
- ✅ User receives red "تم رفض حسابك" email  
- ✅ Can re-register with same email
- ✅ Support contact information provided

**Render.com is your best choice** - free, reliable, and perfect for your APK email needs.
