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

export async function GET(request: NextRequest) {
  try {
    const edits = loadEdits()
    return NextResponse.json(edits)
  } catch (error) {
    console.error('Error fetching contact edits:', error)
    return NextResponse.json({ error: 'Failed to fetch contact edits' }, { status: 500 })
  }
} 