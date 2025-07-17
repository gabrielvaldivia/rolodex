# Google OAuth Setup Guide

Follow these steps to set up Google OAuth and enable access to Gmail, Calendar, and Contacts APIs.

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter a project name (e.g., "Rolodex Tool")
4. Click "Create"

## Step 2: Enable Required APIs

1. In the Google Cloud Console, navigate to "APIs & Services" → "Library"
2. Search for and enable the following APIs:
   - **Gmail API**
   - **Google Calendar API**
   - **People API** (for contacts)

For each API:

- Click on the API name
- Click "Enable"
- Wait for it to be enabled

## Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Choose "External" user type (unless you have a Google Workspace)
3. Click "Create"
4. Fill in the required information:
   - **App name**: Rolodex Tool
   - **User support email**: Your email
   - **Developer contact information**: Your email
5. Click "Save and Continue"
6. On the "Scopes" page, click "Add or Remove Scopes"
7. Add these scopes:
   - `../auth/userinfo.email`
   - `../auth/userinfo.profile`
   - `../auth/gmail.readonly`
   - `../auth/calendar.readonly`
   - `../auth/contacts.readonly`
8. Click "Save and Continue"
9. On "Test users" page, add your email address
10. Click "Save and Continue"

## Step 4: Create OAuth Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Choose "Web application"
4. Enter a name (e.g., "Rolodex Web Client")
5. Add Authorized JavaScript origins:
   - `http://localhost:3000`
6. Add Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
7. Click "Create"
8. **Copy the Client ID and Client Secret** (you'll need these next)

## Step 5: Update Environment Variables

1. Open your `.env.local` file
2. Replace the placeholder values with your actual credentials:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_actual_client_id_here
GOOGLE_CLIENT_SECRET=your_actual_client_secret_here

# NextAuth Configuration (already set)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=hJ/nlMV4OxlTG+DTqobLsZ+S2u+JSLcW9azZOvZ++LI=
```

## Step 6: Test the Application

1. Make sure your development server is running:

   ```bash
   npm run dev
   ```

2. Open [http://localhost:3000](http://localhost:3000)
3. Click "Sign in with Google"
4. Grant the requested permissions
5. You should see your actual contacts from Gmail, Calendar, and Google Contacts!

## Troubleshooting

### Common Issues:

1. **"Error 403: access_denied"**

   - Make sure you've enabled all required APIs
   - Check that your OAuth consent screen is properly configured
   - Ensure your email is added as a test user

2. **"Error 400: redirect_uri_mismatch"**

   - Verify the redirect URI in Google Cloud Console matches exactly: `http://localhost:3000/api/auth/callback/google`

3. **"Invalid client ID"**

   - Double-check that you copied the Client ID correctly
   - Make sure there are no extra spaces in your `.env.local` file

4. **No contacts showing**
   - Check the browser console for API errors
   - Ensure you granted all requested permissions during OAuth flow
   - Try signing out and signing in again

### Security Notes:

- Keep your Client Secret secure and never commit it to version control
- The `.env.local` file is already in `.gitignore`
- For production, you'll need to verify your domain and remove the "testing" status

## Next Steps

Once everything is working:

1. **Add more data sources**: Extend the API to include more Google services
2. **Improve contact matching**: Better algorithms to merge contacts from different sources
3. **Add contact details**: Click on contacts to see more information
4. **Export functionality**: Allow users to export their contact data

Your Rolodex tool is now connected to your actual Google data!
