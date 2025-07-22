# Troubleshooting Blank Page Issue

## Common Causes and Solutions

### 1. Missing Environment Variables

The most common cause of a blank page is missing Google OAuth credentials.

**Check your `.env.local` file contains:**

```
GOOGLE_CLIENT_ID=your_actual_google_client_id
GOOGLE_CLIENT_SECRET=your_actual_google_client_secret
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_random_secret_key

# Firebase Configuration (required)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 2. How to Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable these APIs:
   - Gmail API
   - Calendar API
   - Contacts API (People API)
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Set authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copy the Client ID and Client Secret to your `.env.local`

### 3. Generate NEXTAUTH_SECRET

```bash
# In terminal, run:
openssl rand -base64 32
```

Copy the output to `NEXTAUTH_SECRET` in `.env.local`

### 4. Firebase Setup

Follow the Firebase setup guide in `FIREBASE_SETUP.md`

## Diagnostic Steps

1. **Visit Debug Page**: Go to `http://localhost:3000/debug`
2. **Check Browser Console**: Press F12 → Console tab for JavaScript errors
3. **Verify Environment**: The debug page will show which variables are missing
4. **Test Authentication**: Try signing in from the main page

## If Still Blank After Setup

1. **Restart the dev server**:

   ```bash
   npm run dev
   ```

2. **Clear browser cache and cookies** for localhost

3. **Check the browser console** for specific error messages

4. **Verify API endpoints**:
   - Visit `http://localhost:3000/api/test`
   - Should show server status and environment check

## Quick Fix Checklist

- [ ] `.env.local` file exists with all required variables
- [ ] Google OAuth client ID and secret are valid
- [ ] NEXTAUTH_SECRET is generated and set
- [ ] Firebase configuration is complete
- [ ] Development server restarted after env changes
- [ ] Browser cache cleared
- [ ] No JavaScript errors in browser console

## Still Having Issues?

If the debug page shows everything is configured correctly but the main page is still blank:

1. Check the browser Network tab (F12 → Network) for failed API requests
2. Look for specific error messages in the server terminal
3. Try signing out and signing in again if partially authenticated
4. Verify Google OAuth consent screen is properly configured
