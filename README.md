# Simple Rolodex Tool

A minimal Rolodex application that integrates with Google services to display your contacts with last contact information.

## Features

- **Google OAuth Authentication**: Sign in with your Google account
- **Contact Management**: View all contacts from your Google account
- **Last Contact Tracking**: See when you last contacted each person
- **Search Functionality**: Search through your contacts
- **Contact Editing**: Edit contact names, companies, and hide contacts
- **Persistent Storage**: Changes are saved to Firebase Firestore and persist across sessions
- **Hide/Show Contacts**: Toggle visibility of contacts you want to hide from the main view
- **Minimal UI**: Clean, distraction-free interface using shadcn/ui components

## Setup Instructions

### Quick Setup

1. **Follow the detailed setup guides**:
   - [Google OAuth Setup](./SETUP_GUIDE.md) for Google API integration
   - [Firebase Setup](./FIREBASE_SETUP.md) for persistent storage
2. **Update your `.env.local`** with your actual credentials
3. **Install dependencies and run**: `npm install && npm run dev`

### Environment Variables

Your `.env.local` file should include:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID_HERE
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET_HERE

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_here

# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### Installation

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Click "Sign in with Google"
2. Grant necessary permissions for Gmail, Calendar, and Contacts
3. View your contacts in the table
4. **Edit contacts**: Click on any contact to edit their information
5. **Hide contacts**: Use the toggle in the contact edit panel to hide contacts
6. **Show hidden contacts**: Use the "Show Hidden" button in the header to toggle visibility
7. Use the search bar to find specific contacts
8. Click "Sign out" when finished

## Technology Stack

- **Framework**: Next.js 15 with App Router
- **Authentication**: NextAuth.js
- **Database**: Firebase Firestore
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS
- **Language**: TypeScript

## API Integration

The application integrates with multiple APIs:

- **Gmail API**: Extracts contacts from your sent and received emails
- **Calendar API**: Finds contacts from your calendar events and meetings
- **People API**: Accesses your Google Contacts
- **Firebase Firestore**: Stores your contact edits and preferences

The system automatically merges contacts from all sources and shows the most recent interaction date.

## Data Persistence

Contact edits are stored in Firebase Firestore with the following features:

- **Real-time sync**: Changes are immediately saved to the cloud
- **Cross-session persistence**: Your edits persist across browser sessions and server restarts
- **Serverless-friendly**: Works in deployment environments like Vercel
- **Scalable**: Handles multiple users and large contact lists

## Development

The application is structured with:

- `src/app/page.tsx` - Main Rolodex interface
- `src/app/api/auth/[...nextauth]/route.ts` - NextAuth configuration
- `src/app/api/contacts/route.ts` - Contact data API
- `src/app/api/contacts/edits/route.ts` - Contact edits API (Firebase)
- `src/app/api/contacts/[id]/route.ts` - Individual contact API (Firebase)
- `src/lib/auth.ts` - Authentication configuration
- `src/lib/firebase.ts` - Firebase configuration
- `src/components/ui/` - shadcn/ui components

## License

MIT
