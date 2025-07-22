import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check environment variables
    const hasGoogleClientId = !!process.env.GOOGLE_CLIENT_ID;
    const hasGoogleClientSecret = !!process.env.GOOGLE_CLIENT_SECRET;
    const hasNextAuthSecret = !!process.env.NEXTAUTH_SECRET;
    const hasNextAuthUrl = !!process.env.NEXTAUTH_URL;

    return NextResponse.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: {
        hasGoogleClientId,
        hasGoogleClientSecret,
        hasNextAuthSecret,
        hasNextAuthUrl,
      }
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 