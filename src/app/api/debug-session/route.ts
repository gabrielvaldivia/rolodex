import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authConfig } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authConfig);
    
    // Don't expose the actual tokens in production, just their presence and basic info
    const debugInfo = {
      hasSession: !!session,
      hasUser: !!session?.user,
      userEmail: session?.user?.email,
      hasAccessToken: !!(session as any)?.accessToken,
      hasError: !!(session as any)?.error,
      sessionError: (session as any)?.error,
      // Show first few chars of access token to verify it exists
      accessTokenPreview: (session as any)?.accessToken 
        ? `${((session as any).accessToken as string).substring(0, 10)}...`
        : 'No access token',
      // Token expiry info if available
      tokenExpires: (session as any)?.accessTokenExpires 
        ? new Date((session as any).accessTokenExpires * 1000).toISOString()
        : 'No expiry info',
      isTokenExpired: (session as any)?.accessTokenExpires 
        ? Date.now() > (session as any).accessTokenExpires * 1000
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