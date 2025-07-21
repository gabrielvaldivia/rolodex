import { NextRequest, NextResponse } from 'next/server'
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-ignore
import { db } from '@/lib/firebase'
import { doc, getDoc, setDoc, serverTimestamp, Timestamp, Firestore } from 'firebase/firestore'

interface ContactEdit {
  id: string
  name?: string
  email?: string
  company?: string
  hidden?: boolean
  updatedAt?: Timestamp | string
}

const EDITS_COLLECTION = 'contact-edits'

// Load existing edit from Firestore
async function loadEdit(id: string): Promise<ContactEdit | null> {
  if (!db) {
    console.warn('Firebase not initialized, cannot load edit')
    return null
  }
  
  try {
    const editRef = doc(db!, EDITS_COLLECTION, id)
    const docSnap = await getDoc(editRef)
    
    if (docSnap.exists()) {
      const data = docSnap.data() as ContactEdit
      return {
        ...data,
        id: docSnap.id,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt
      }
    }
    return null
  } catch (error) {
    console.error('Error loading edit from Firestore:', error)
    return null
  }
}

// Save edit to Firestore
async function saveEdit(edit: ContactEdit): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!(db as any)) {
    console.warn('Firebase not initialized, cannot save edit')
    throw new Error('Firebase not configured')
  }
  
  try {
    const editRef = doc(db as Firestore, EDITS_COLLECTION, edit.id)
    await setDoc(editRef, {
      ...edit,
      updatedAt: serverTimestamp()
    }, { merge: true })
  } catch (error) {
    console.error('Error saving edit to Firestore:', error)
    throw error
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

    // Create or update the edit
    const newEdit: ContactEdit = {
      id,
      name: body.name || '',
      email: body.email || '',
      company: body.company || '',
      hidden: body.hidden || false
    }

    await saveEdit(newEdit)

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

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const edit = await loadEdit(id)
    
    return NextResponse.json(edit)
  } catch (error) {
    console.error('Error fetching contact edit:', error)
    return NextResponse.json({ error: 'Failed to fetch contact edit' }, { status: 500 })
  }
} 