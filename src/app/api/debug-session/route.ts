import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authConfig } from '@/lib/auth';

interface ExtendedSession {
  user?: {
    email?: string;
    name?: string;
    image?: string;
  };
  accessToken?: string;
  error?: string;
  accessTokenExpires?: number;
}

export async function GET() {
  try {
    const session = await getServerSession(authConfig);
    const extendedSession = session as ExtendedSession;
    
    // Don't expose the actual tokens in production, just their presence and basic info
    const debugInfo = {
      hasSession: !!session,
      hasUser: !!session?.user,
      userEmail: session?.user?.email,
      hasAccessToken: !!extendedSession?.accessToken,
      hasError: !!extendedSession?.error,
      sessionError: extendedSession?.error,
      // Show first few chars of access token to verify it exists
      accessTokenPreview: extendedSession?.accessToken 
        ? `${extendedSession.accessToken.substring(0, 10)}...`
        : 'No access token',
      // Token expiry info if available
      tokenExpires: extendedSession?.accessTokenExpires 
        ? new Date(extendedSession.accessTokenExpires * 1000).toISOString()
        : 'No expiry info',
      isTokenExpired: extendedSession?.accessTokenExpires 
        ? Date.now() > extendedSession.accessTokenExpires * 1000
        : 'Unknown'
    };

    return NextResponse.json(debugInfo);
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to get session',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 