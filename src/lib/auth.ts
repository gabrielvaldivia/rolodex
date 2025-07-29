import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

export const authConfig = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/contacts.readonly https://www.googleapis.com/auth/contacts.other.readonly',
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    })
  ],
  callbacks: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async jwt({ token, account }: { token: any; account: any }) {
      if (account) {
        console.log('New account login, storing tokens')
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.accessTokenExpires = account.expires_at
        token.refreshTokenExpires = account.refresh_token_expires_in
      }
      
      // Return previous token if the access token has not expired yet
      if (Date.now() < token.accessTokenExpires * 1000) {
        return token
      }
      
      // Access token has expired, try to update it
      console.log('Access token expired, refreshing...')
      return await refreshAccessToken(token)
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async session({ session, token }: { session: any; token: any }) {
      session.accessToken = token.accessToken
      session.error = token.error
      session.refreshToken = token.refreshToken
      session.accessTokenExpires = token.accessTokenExpires
      return session
    }
  },
  session: {
    strategy: 'jwt' as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function refreshAccessToken(token: any) {
  try {
    console.log('Attempting to refresh access token...')
    
    const url = 'https://oauth2.googleapis.com/token'
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken,
      }),
    })

    const refreshedTokens = await response.json()

    if (!response.ok) {
      console.error('Token refresh failed:', refreshedTokens)
      throw refreshedTokens
    }

    console.log('Token refresh successful')
    
    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
    }
  } catch (error) {
    console.error('Error refreshing access token:', error)
    return {
      ...token,
      error: 'RefreshAccessTokenError',
    }
  }
}

// Utility function to refresh tokens in API routes
export async function refreshTokenInAPI(refreshToken: string): Promise<{ accessToken: string; expiresIn: number } | null> {
  try {
    console.log('Refreshing token in API route...')
    
    const url = 'https://oauth2.googleapis.com/token'
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    })

    const refreshedTokens = await response.json()

    if (!response.ok) {
      console.error('API token refresh failed:', refreshedTokens)
      return null
    }

    console.log('API token refresh successful')
    
    return {
      accessToken: refreshedTokens.access_token,
      expiresIn: refreshedTokens.expires_in
    }
  } catch (error) {
    console.error('Error refreshing token in API:', error)
    return null
  }
}

export default NextAuth(authConfig) 