import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { db } from '@/lib/firebase'
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore'
import { Contact, fetchGoogleContacts } from '@/lib/contacts'

interface CachedContacts {
  contacts: Contact[]
  cachedAt: Timestamp
  userId: string
}

// Helper function to get user ID from email (since we don't have user ID in session)
function getUserCacheKey(token: string): string {
  // Use a hash of the token as the cache key
  return `user_${token.substring(0, 20)}`
}

// Check if cache is still valid (24 hours)
function isCacheValid(cachedAt: Timestamp): boolean {
  const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000
  return cachedAt.toMillis() > twentyFourHoursAgo
}

// Get cached contacts from Firestore
async function getCachedContacts(userId: string): Promise<Contact[] | null> {
  if (!db) {
    console.warn('Firebase not initialized, skipping cache')
    return null
  }

  try {
    const cacheDoc = doc(db, 'contact-cache', userId)
    const cacheSnapshot = await getDoc(cacheDoc)
    
    if (cacheSnapshot.exists()) {
      const cacheData = cacheSnapshot.data() as CachedContacts
      
      if (isCacheValid(cacheData.cachedAt)) {
        console.log(`✅ Returning ${cacheData.contacts.length} cached contacts`)
        return cacheData.contacts
      } else {
        console.log('Cache expired, will fetch fresh data')
      }
    } else {
      console.log('No cache found')
    }
  } catch (error) {
    console.error('Error reading cache:', error)
  }
  
  return null
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
    console.log(`✅ Cached ${contacts.length} contacts for user ${userId}`)
  } catch (error) {
    console.error('Error saving to cache:', error)
  }
}























export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const userId = getUserCacheKey(token)
    
    // Check if force refresh is requested
    const { searchParams } = new URL(request.url)
    const forceRefresh = searchParams.get('refresh') === 'true'
    
    // Check for cached contacts first (unless force refresh is requested)
    if (!forceRefresh) {
      const cachedContacts = await getCachedContacts(userId)
      if (cachedContacts) {
        console.log('Returning cached contacts immediately')
        return NextResponse.json(cachedContacts)
      }
    } else {
      console.log('Force refresh requested, bypassing cache')
    }
    
    // No valid cache, fetch fresh data
    console.log('No valid cache found, fetching fresh contacts')
    
    // Properly configure OAuth2 client with credentials for token refresh
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
    )
    
    // Set the access token
    auth.setCredentials({ access_token: token })

    const contacts = await fetchGoogleContacts(auth)
    
    // Cache the fresh contacts
    await saveContactsToCache(userId, contacts)
    
    return NextResponse.json(contacts)
  } catch (error: unknown) {
    console.error('Error fetching contacts:', error)
    
    // Handle authentication-specific errors
    const errorObj = error as { code?: number; message?: string }
    if (errorObj.code === 401 || errorObj.message?.includes('invalid authentication')) {
      return NextResponse.json({ error: 'Invalid or expired access token' }, { status: 401 })
    }
    
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 })
  }
} 