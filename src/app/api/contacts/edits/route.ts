import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { collection, getDocs, doc, setDoc, serverTimestamp, Timestamp, Firestore } from 'firebase/firestore'

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

const EDITS_COLLECTION = 'contact-edits'

// Load existing edits from Firestore
async function loadEdits(): Promise<Record<string, ContactEdit>> {
  if (!db) {
    console.warn('Firebase not initialized, returning empty edits')
    return {}
  }
  
  try {
    const editsRef = collection(db as Firestore, EDITS_COLLECTION)
    const querySnapshot = await getDocs(editsRef)
    const edits: Record<string, ContactEdit> = {}
    
    querySnapshot.forEach((doc) => {
      const data = doc.data() as ContactEdit
      edits[doc.id] = {
        ...data,
        id: doc.id,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt
      }
    })
    
    return edits
  } catch (error) {
    console.error('Error loading edits from Firestore:', error)
    return {}
  }
}

// Save edit to Firestore
async function saveEdit(edit: ContactEdit): Promise<void> {
  if (!db) {
    console.warn('Firebase not initialized, edit not saved for:', edit.id)
    return
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

export async function GET() {
  if (!db) {
    console.warn('Firebase not initialized, returning empty edits')
    return NextResponse.json({})
  }

  try {
    const editsCollection = collection(db as Firestore, 'contact-edits')
    const snapshot = await getDocs(editsCollection)
    
    const edits: Record<string, ContactEdit> = {}
    
    snapshot.forEach((doc) => {
      const data = doc.data()
      const edit: ContactEdit = {
        id: doc.id,
        name: data.name,
        email: data.email,
        company: data.company,
        hidden: data.hidden,
        starred: data.starred,
        tags: data.tags,
        updatedAt: data.updatedAt
      }
      
      // Only include photoUrl if it exists (avoid undefined values)
      if (data.photoUrl) {
        edit.photoUrl = data.photoUrl
      }
      
      edits[doc.id] = edit
    })
    
    return NextResponse.json(edits)
  } catch (error) {
    console.error('Error fetching edits:', error)
    return NextResponse.json({ error: 'Failed to fetch edits' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const edit: ContactEdit = {
      id: body.id,
      name: body.name,
      email: body.email,
      company: body.company,
      hidden: body.hidden,
      starred: body.starred,
      tags: body.tags
    }
    
    await saveEdit(edit)
    
    return NextResponse.json({ success: true, edit })
  } catch (error) {
    console.error('Error saving contact edit:', error)
    return NextResponse.json({ error: 'Failed to save contact edit' }, { status: 500 })
  }
} 