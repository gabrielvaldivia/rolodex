import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

interface ContactEdit {
  id: string
  name?: string
  email?: string
  company?: string
  updatedAt: string
}

const EDITS_FILE = path.join(process.cwd(), 'data', 'contact-edits.json')

// Ensure the data directory exists
function ensureDataDirectory() {
  const dataDir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
}

// Load existing edits from file
function loadEdits(): Record<string, ContactEdit> {
  try {
    ensureDataDirectory()
    if (fs.existsSync(EDITS_FILE)) {
      const data = fs.readFileSync(EDITS_FILE, 'utf8')
      return JSON.parse(data)
    }
  } catch (error) {
    console.error('Error loading edits:', error)
  }
  return {}
}

// Save edits to file
function saveEdits(edits: Record<string, ContactEdit>) {
  try {
    ensureDataDirectory()
    fs.writeFileSync(EDITS_FILE, JSON.stringify(edits, null, 2))
  } catch (error) {
    console.error('Error saving edits:', error)
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = await request.json()

    // Load existing edits
    const editsPath = path.join(process.cwd(), 'data', 'contact-edits.json')
    let editsObject: Record<string, ContactEdit> = {}
    
    if (fs.existsSync(editsPath)) {
      const editsData = fs.readFileSync(editsPath, 'utf-8')
      editsObject = JSON.parse(editsData)
    }

    // Create or update the edit
    const newEdit: ContactEdit = {
      id,
      name: body.name || '',
      email: body.email || '',
      company: body.company || '',
      updatedAt: new Date().toISOString()
    }

    // Update the object
    editsObject[id] = newEdit

    // Save back to file
    fs.writeFileSync(editsPath, JSON.stringify(editsObject, null, 2))

    return NextResponse.json({ success: true, edit: newEdit })
  } catch (error) {
    console.error('Error updating contact:', error)
    return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const edits = loadEdits()
    
    return NextResponse.json(edits[id] || null)
  } catch (error) {
    console.error('Error fetching contact edit:', error)
    return NextResponse.json({ error: 'Failed to fetch contact edit' }, { status: 500 })
  }
} 