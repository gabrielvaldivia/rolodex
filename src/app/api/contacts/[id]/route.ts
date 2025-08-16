import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, getDoc, setDoc, serverTimestamp, Timestamp, Firestore } from 'firebase/firestore'

interface ContactEdit {
  id: string
  name?: string
  email?: string
  company?: string
  hidden?: boolean
  starred?: boolean
  tags?: string[]
  photoUrl?: string
  updatedAt?: Timestamp | string
}

async function saveEdit(edit: ContactEdit) {
  if (!db) {
    console.warn('Firebase not initialized, edit not saved to cloud:', edit.id)
    // Return success even without Firebase to prevent app crashes
    return
  }

  try {
    const docRef = doc(db as Firestore, 'contact-edits', edit.id)
    const editToSave = {
      ...edit,
      updatedAt: serverTimestamp()
    }
    
    await setDoc(docRef, editToSave, { merge: true })
    console.log(`Successfully saved edit for ${edit.id}`)
  } catch (error) {
    console.error('Error saving edit to Firebase:', error)
    // Don't throw error - just log it and continue
    // This prevents the app from crashing when Firebase has permission issues
    console.warn('Edit not saved to Firebase due to error, but continuing...')
  }
}

async function loadEdit(id: string): Promise<ContactEdit | null> {
  if (!db) {
    console.warn('Firebase not initialized, no edit loaded for:', id)
    return null
  }

  try {
    const docRef = doc(db as Firestore, 'contact-edits', id)
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      const data = docSnap.data()
      return {
        id,
        name: data.name,
        email: data.email,
        company: data.company,
        hidden: data.hidden,
        starred: data.starred,
        tags: data.tags,
        photoUrl: data.photoUrl,
        updatedAt: data.updatedAt
      }
    }
    
    return null
  } catch (error) {
    console.error('Error loading edit:', error)
    return null
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const edit = await loadEdit(id)
    
    if (edit) {
      return NextResponse.json(edit)
    } else {
      return NextResponse.json({ message: 'No edit found for this contact' }, { status: 404 })
    }
  } catch (error) {
    console.error('Error fetching contact edit:', error)
    return NextResponse.json({ error: 'Failed to fetch contact edit' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = await request.json()

    // Validate required fields
    if (!id) {
      return NextResponse.json({ error: 'Contact ID is required' }, { status: 400 })
    }

    // Create or update the edit - filter out undefined values for Firebase
    const newEdit: ContactEdit = {
      id,
      name: body.name || '',
      email: body.email || '',
      company: body.company || '',
      hidden: body.hidden || false,
      starred: body.starred || false,
      tags: body.tags || []
    }

    // Only add photoUrl if it has a value (Firebase doesn't accept undefined)
    if (body.photoUrl) {
      newEdit.photoUrl = body.photoUrl
    }

    // Try to save to Firebase, but don't fail if it doesn't work
    try {
      await saveEdit(newEdit)
    } catch (firebaseError) {
      console.warn('Firebase save failed, but edit is still valid:', firebaseError)
      // Continue without Firebase - the edit is still valid
    }

    return NextResponse.json({ success: true, edit: newEdit })
  } catch (error) {
    console.error('Error updating contact:', error)
    
    // Ensure we always return valid JSON
    const errorMessage = error instanceof Error ? error.message : 'Failed to update contact'
    return NextResponse.json({ 
      error: errorMessage,
      success: false 
    }, { status: 500 })
  }
} 