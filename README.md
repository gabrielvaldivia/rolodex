# Simple Rolodex Tool

A minimal Rolodex application that integrates with Google services to display your contacts with last contact information.

## Features

- **Google OAuth Authentication**: Sign in with your Google account
- **Contact Management**: View all contacts from your Google account
- **Last Contact Tracking**: See when you last contacted each person
- **Search Functionality**: Search through your contacts
- **Minimal UI**: Clean, distraction-free interface using shadcn/ui components

## Setup Instructions

### Quick Setup

1. **Follow the detailed setup guide**: See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for complete Google OAuth configuration
2. **Update your `.env.local`** with your actual Google credentials (file already created)
3. **Install dependencies and run**: `npm install && npm run dev`

### Environment Variables

Your `.env.local` file has been created with the following structure:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID_HERE
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET_HERE

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=hJ/nlMV4OxlTG+DTqobLsZ+S2u+JSLcW9azZOvZ++LI=
```

**Important**: Replace `YOUR_GOOGLE_CLIENT_ID_HERE` and `YOUR_GOOGLE_CLIENT_SECRET_HERE` with your actual Google OAuth credentials.

### 3. Install Dependencies

```bash
npm install
```

### 4. Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Click "Sign in with Google"
2. Grant necessary permissions for Gmail, Calendar, and Contacts
3. View your contacts in the table
4. Use the search bar to find specific contacts
5. Click "Sign out" when finished

## Technology Stack

- **Framework**: Next.js 15 with App Router
- **Authentication**: NextAuth.js
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS
- **Language**: TypeScript

## API Integration

The application now integrates with real Google APIs to fetch your actual contact data:

- **Gmail API**: Extracts contacts from your sent and received emails
- **Calendar API**: Finds contacts from your calendar events and meetings
- **People API**: Accesses your Google Contacts

The system automatically merges contacts from all sources and shows the most recent interaction date.

## Development

The application is structured with:

- `src/app/page.tsx` - Main Rolodex interface
- `src/app/api/auth/[...nextauth]/route.ts` - NextAuth configuration
- `src/app/api/contacts/route.ts` - Contact data API
- `src/lib/auth.ts` - Authentication configuration
- `src/components/ui/` - shadcn/ui components

## License

MIT
