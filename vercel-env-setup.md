# Vercel Environment Variables Setup

## Your Vercel Project

- **URL:** https://rolodex-gikpt8h4f-gabrielvaldivias-projects.vercel.app
- **Project:** gabrielvaldivias-projects/rolodex

## Step 1: Go to Vercel Dashboard

1. Visit: https://vercel.com/dashboard
2. Click on your "rolodex" project
3. Go to "Settings" → "Environment Variables"

## Step 2: Add These Environment Variables

Copy these from your local `.env.local` file:

```bash
# Required for production:
NEXTAUTH_URL=https://rolodex-gikpt8h4f-gabrielvaldivias-projects.vercel.app
NEXTAUTH_SECRET=your_nextauth_secret_here
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# Firebase (copy from your .env.local):
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

**Important:** Set `NEXTAUTH_URL` to your production URL (shown above)

## Step 3: Update Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "APIs & Services" → "Credentials"
3. Edit your OAuth 2.0 Client ID
4. Add this to "Authorized redirect URIs":
   ```
   https://rolodex-gikpt8h4f-gabrielvaldivias-projects.vercel.app/api/auth/callback/google
   ```

## Step 4: Redeploy

After adding environment variables, redeploy:

```bash
npx vercel --prod
```
