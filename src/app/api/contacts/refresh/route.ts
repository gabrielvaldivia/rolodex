import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { db } from '@/lib/firebase'
import { doc, setDoc, Timestamp } from 'firebase/firestore'
import { Contact, fetchGoogleContacts } from '@/lib/contacts'

interface CachedContacts {
  contacts: Contact[]
  cachedAt: Timestamp
  userId: string
}

// Helper function to get user ID from token
function getUserCacheKey(token: string): string {
  return `user_${token.substring(0, 20)}`
}

// Save contacts to cache in Firestore
async function saveContactsToCache(userId: string, contacts: Contact[]): Promise<void> {
  if (!db) {
    console.warn('Firebase not initialized, skipping cache save')
    return
  }

  try {
    const cacheData: CachedContacts = {
      contacts,
      cachedAt: Timestamp.now(),
      userId
    }
    
    const cacheDoc = doc(db, 'contact-cache', userId)
    await setDoc(cacheDoc, cacheData)
    console.log(`✅ Background refresh: Cached ${contacts.length} contacts for user ${userId}`)
  } catch (error) {
    console.error('Error saving to cache:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const userId = getUserCacheKey(token)
    
    console.log('Background refresh: Starting contact refresh for user', userId)
    
    // Properly configure OAuth2 client
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
    )
    
    auth.setCredentials({ access_token: token })

    // Fetch fresh contacts
    const contacts = await fetchGoogleContacts(auth)
    
    // Update cache with fresh data
    await saveContactsToCache(userId, contacts)
    
    return NextResponse.json({ 
      success: true, 
      message: `Refreshed ${contacts.length} contacts`,
      contactsCount: contacts.length 
    })
  } catch (error: unknown) {
    console.error('Background refresh error:', error)
    
    const errorObj = error as { code?: number; message?: string }
    if (errorObj.code === 401 || errorObj.message?.includes('invalid authentication')) {
      return NextResponse.json({ error: 'Invalid or expired access token' }, { status: 401 })
    }
    
    return NextResponse.json({ error: 'Failed to refresh contacts' }, { status: 500 })
  }
} 