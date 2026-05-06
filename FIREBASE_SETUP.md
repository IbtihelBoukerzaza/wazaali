# Firebase Setup Instructions

This document provides step-by-step instructions for setting up Firebase for the Wazali application.

## Prerequisites

- A Google account
- Firebase Console access

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or "Create a project"
3. Enter your project name (e.g., "wazali-app")
4. Follow the setup wizard and enable Google Analytics (optional)
5. Click "Create project"

## Step 2: Enable Authentication

1. In the Firebase Console, go to **Build** > **Authentication**
2. Click **Get Started**
3. Select **Email/Password** sign-in method
4. Enable it and click **Save**

## Step 3: Set up Firestore Database

1. Go to **Build** > **Firestore Database**
2. Click **Create database**
3. Choose a location (select one closest to your users)
4. Select **Start in Test Mode** (for development) or **Start in Production Mode**
5. Click **Enable**

## Step 4: Set up Storage (for product images)

1. Go to **Build** > **Storage**
2. Click **Get Started**
3. Choose your storage rules (start in Test Mode for development)
4. Click **Done**

## Step 5: Get Firebase Configuration

1. Go to **Project Settings** (gear icon in the top left)
2. Scroll down to "Your apps" section
3. Click the **</>** icon (Web) to add a web app
4. Give your app a name (e.g., "Wazali Web")
5. **Don't** check "Firebase Hosting" for now
6. Click **Register app**
7. Copy the `firebaseConfig` object

## Step 6: Update Firebase Configuration

1. Open `src/config/firebase.js` in your project
2. Replace the placeholder values with your actual Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

## Step 7: Install Dependencies

Run the following command to install all required dependencies:

```bash
npm install
```

Or if you're using yarn:

```bash
yarn install
```

## Step 8: Create an Admin User

Since the app requires admin approval for new accounts, you'll need to create the first admin user manually:

1. Go to **Authentication** in Firebase Console
2. Click **Add user**
3. Enter email and password for the admin
4. Click **Add user**
5. Go to **Firestore Database**
6. Navigate to the `users` collection
7. Add a new document with the admin's UID as the document ID
8. Set the following fields:
   - `uid`: (the user's UID from Authentication)
   - `name`: "Admin"
   - `email`: (the admin's email)
   - `phone`: (phone number)
   - `role`: "admin"
   - `approved`: true
   - `createdAt`: (current timestamp)

## Firestore Security Rules

For development, you can use the following test rules. **Update these for production!**

### Firestore Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

### Storage Rules

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```

## Database Structure

### Users Collection
```
users/{userId}
  - uid: string
  - name: string
  - email: string
  - role: string (admin, shop_owner, factory_owner)
  - approved: boolean
  - createdAt: timestamp
```

### Products Collection
```
products/{productId}
  - name: string
  - price: number
  - quantity: number
  - description: string
  - image: string (URL)
  - factoryId: string
  - createdAt: timestamp
```

### Orders Collection
```
orders/{orderId}
  - shopId: string
  - shopName: string
  - factoryId: string
  - factoryName: string
  - items: array
    - name: string
    - price: number
    - quantity: number
  - status: string (pending, accepted, rejected, completed)
  - createdAt: timestamp
```

## Testing the App

1. Start the development server:
   ```bash
   npm start
   ```

2. Sign up as a new user (Shop Owner or Factory Owner)
3. Log in as the Admin user to approve the account
4. Log in as the approved user to test role-specific features

## Production Considerations

Before deploying to production:

1. **Update Security Rules**: Implement proper authentication-based rules
2. **Enable App Check**: Add app verification for additional security
3. **Set up Monitoring**: Enable Crashlytics and Performance Monitoring
4. **Configure Analytics**: Set up proper event tracking
5. **Review Billing**: Understand Firebase pricing and set budgets

## Troubleshooting

### Authentication Errors
- Ensure Email/Password sign-in is enabled in Firebase Console
- Check that your Firebase config is correct
- Verify network connectivity

### Firestore Errors
- Check that Firestore is enabled
- Verify your security rules allow read/write operations
- Ensure you're using the correct project ID

### Storage Errors
- Verify Storage is enabled
- Check storage rules
- Ensure you have proper permissions

## Support

For more information, visit:
- [Firebase Documentation](https://firebase.google.com/docs)
- [React Native Firebase](https://rnfirebase.io/)
