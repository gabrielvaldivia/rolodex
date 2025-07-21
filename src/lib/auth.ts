import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

export const authConfig = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/contacts.readonly',
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
      return session
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function refreshAccessToken(token: any) {
  try {
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
      throw refreshedTokens
    }

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

export default NextAuth(authConfig) 