# Firebase Setup Guide for Rolodex

This guide will help you set up Firebase Firestore to persist your contact edits across sessions.

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter a project name (e.g., "rolodex-app")
4. Continue through the setup (you can disable Google Analytics if you don't need it)
5. Click "Create project"

## Step 2: Enable Firestore Database

1. In your Firebase project, go to "Build" → "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" (for development)
4. Select your preferred location
5. Click "Done"

## Step 3: Get Firebase Configuration

1. Go to "Project Settings" (gear icon in sidebar)
2. Scroll down to "Your apps"
3. Click the web icon (`</>`) to add a web app
4. Enter an app nickname (e.g., "rolodex-web")
5. Click "Register app"
6. Copy the configuration object that looks like this:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id",
};
```

## Step 4: Update Environment Variables

1. Open your `.env.local` file
2. Add the Firebase configuration variables:

```env
# Google OAuth Configuration (existing)
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_here

# Firebase Configuration (new)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

## Step 5: Test the Application

1. Start your development server:

   ```bash
   npm run dev
   ```

2. Open [http://localhost:3000](http://localhost:3000)
3. Sign in with Google
4. Make some edits to contacts (change names, hide contacts, etc.)
5. **Refresh the page** - your changes should persist!
6. **Restart the server** - your changes should still be there!

## Step 6: Configure Firestore Security Rules (Optional)

For production, you should set up proper security rules:

1. Go to "Firestore Database" → "Rules"
2. Replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to contact-edits collection
    match /contact-edits/{document} {
      allow read, write: if request.auth != null;
    }
  }
}
```

3. Click "Publish"

## What's Changed

- **Persistent Storage**: Contact edits now save to Firebase Firestore instead of local files
- **Real-time Sync**: Changes are immediately saved to the cloud
- **Cross-session Persistence**: Your edits will persist across browser sessions and server restarts
- **Scalable**: Works in serverless environments like Vercel

## Data Structure

Your contact edits are stored in Firestore with this structure:

```
contact-edits/
├── user@example.com (document ID = contact email)
│   ├── id: "user@example.com"
│   ├── name: "Updated Name"
│   ├── email: "user@example.com"
│   ├── company: "Updated Company"
│   ├── hidden: false
│   └── updatedAt: timestamp
```

## Troubleshooting

1. **"Firebase config not found"**: Make sure all environment variables are set correctly
2. **"Permission denied"**: Check that Firestore is in test mode or authentication is working
3. **"Module not found"**: Make sure you ran `npm install` after adding Firebase

Your contact edits will now persist across sessions! 🎉
