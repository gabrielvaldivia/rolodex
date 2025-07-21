import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

interface Contact {
  id: string
  name: string
  email: string
  company?: string
  lastContact: string
  source: string
  lastEmailSubject?: string
  lastEmailPreview?: string
  lastMeetingName?: string
}

async function fetchGmailContacts(auth: InstanceType<typeof google.auth.OAuth2>): Promise<Contact[]> {
  console.log('Fetching Gmail emails...')
  const gmail = google.gmail({ version: 'v1', auth })
  const gmailContacts = new Map<string, Contact>()

  try {
    // Get recent emails for faster initial sync
    const emailResponse = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 25, // Reduced for faster sync - focus on recent contacts
      q: 'in:sent OR in:inbox', // Get both sent and received emails
    })

    if (emailResponse.data.messages) {
      console.log(`Found ${emailResponse.data.messages.length} emails, processing...`)
      const messagesToProcess = emailResponse.data.messages
      
      for (let i = 0; i < messagesToProcess.length; i++) {
        const message = messagesToProcess[i]
        try {
          if (!message.id) continue
          
          // Optimized rate limiting for better performance
          if (i > 0 && i % 10 === 0) {
            console.log(`Processing email ${i + 1}/${messagesToProcess.length}, pausing...`)
            await new Promise(resolve => setTimeout(resolve, 500)) // Shorter pause, less frequent
          }
          
          const messageDetail = await gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'full'
          })

          const headers = messageDetail.data.payload?.headers || []
          const fromHeader = headers.find(h => h.name === 'From')
          const toHeader = headers.find(h => h.name === 'To')
          const dateHeader = headers.find(h => h.name === 'Date')
          const subjectHeader = headers.find(h => h.name === 'Subject')
          
          // Extract email body content
          const emailBody = extractEmailBody(messageDetail.data.payload)

          if (fromHeader?.value) {
            const email = extractEmailFromHeader(fromHeader.value)
            const name = extractNameFromHeader(fromHeader.value)
            const dateString = dateHeader?.value || new Date().toISOString()
            
            try {
              const parsedDate = new Date(dateString)
              if (!isNaN(parsedDate.getTime())) {
                const subject = subjectHeader?.value || ''
                const preview = emailBody ? emailBody.replace(/\s+/g, ' ').trim() : ''
                
                const contact: Contact = {
                  id: email,
                  name: name || email,
                  email: email,
                  company: extractCompanyFromEmail(email),
                  lastContact: parsedDate.toISOString(),
                  source: 'Gmail',
                  lastEmailSubject: subject,
                  lastEmailPreview: preview
                }
                
                if (!gmailContacts.has(email) || new Date(contact.lastContact) > new Date(gmailContacts.get(email)!.lastContact)) {
                  gmailContacts.set(email, contact)
                }
              }
            } catch (dateError) {
              console.log(`Date parsing error for ${email}: ${dateError}`)
            }
          }

          if (toHeader?.value) {
            const emails = extractEmailsFromHeader(toHeader.value)
            for (const email of emails) {
              const name = extractNameFromHeader(toHeader.value)
              const dateString = dateHeader?.value || new Date().toISOString()
              
              try {
                const parsedDate = new Date(dateString)
                if (!isNaN(parsedDate.getTime())) {
                  const subject = subjectHeader?.value || ''
                  const preview = emailBody ? emailBody.replace(/\s+/g, ' ').trim() : ''
                  
                  const contact: Contact = {
                    id: email,
                    name: name || email,
                    email: email,
                    company: extractCompanyFromEmail(email),
                    lastContact: parsedDate.toISOString(),
                    source: 'Gmail',
                    lastEmailSubject: subject,
                    lastEmailPreview: preview
                  }
                  
                  if (!gmailContacts.has(email) || new Date(contact.lastContact) > new Date(gmailContacts.get(email)!.lastContact)) {
                    gmailContacts.set(email, contact)
                  }
                }
              } catch (dateError) {
                console.log(`Date parsing error for ${email}: ${dateError}`)
              }
            }
          }
        } catch (error: unknown) {
          if (error && typeof error === 'object' && 'code' in error && error.code === 403) {
            console.log(`Rate limit hit at email ${i + 1}, waiting 5 seconds...`)
            await new Promise(resolve => setTimeout(resolve, 5000))
            continue
          }
          console.error('Error processing email:', error)
        }
      }
    }
  } catch (error) {
    console.error('Error fetching Gmail contacts:', error)
  }

  console.log(`✅ Found ${gmailContacts.size} contacts from Gmail`)
  return Array.from(gmailContacts.values())
}

async function fetchCalendarContacts(auth: InstanceType<typeof google.auth.OAuth2>): Promise<Contact[]> {
  console.log('Fetching Calendar events...')
  const calendar = google.calendar({ version: 'v3', auth })
  const calendarContacts = new Map<string, Contact>()

  try {
    const calendarResponse = await calendar.events.list({
      calendarId: 'primary',
      maxResults: 2500,
      singleEvents: true,
      orderBy: 'startTime',
    })

    if (calendarResponse.data.items) {
      for (const event of calendarResponse.data.items) {
        const eventDate = event.start?.dateTime || event.start?.date
        if (!eventDate) continue

        try {
          const parsedDate = new Date(eventDate)
          if (isNaN(parsedDate.getTime())) continue

          // Process attendees
          if (event.attendees) {
            for (const attendee of event.attendees) {
              if (attendee.email) {
                const name = attendee.displayName || attendee.email
                
                const contact: Contact = {
                  id: attendee.email,
                  name: name,
                  email: attendee.email,
                  company: extractCompanyFromEmail(attendee.email),
                  lastContact: parsedDate.toISOString(),
                  source: 'Calendar',
                  lastMeetingName: event.summary || 'Meeting'
                }
                
                if (!calendarContacts.has(attendee.email) || new Date(contact.lastContact) > new Date(calendarContacts.get(attendee.email)!.lastContact)) {
                  calendarContacts.set(attendee.email, contact)
                }
              }
            }
          }

          // Process organizer
          if (event.organizer?.email) {
            const name = event.organizer.displayName || event.organizer.email
            
            const contact: Contact = {
              id: event.organizer.email,
              name: name,
              email: event.organizer.email,
              company: extractCompanyFromEmail(event.organizer.email),
              lastContact: parsedDate.toISOString(),
              source: 'Calendar',
              lastMeetingName: event.summary || 'Meeting'
            }
            
            if (!calendarContacts.has(event.organizer.email) || new Date(contact.lastContact) > new Date(calendarContacts.get(event.organizer.email)!.lastContact)) {
              calendarContacts.set(event.organizer.email, contact)
            }
          }

          // Process creator
          if (event.creator?.email) {
            const name = event.creator.displayName || event.creator.email
            
            const contact: Contact = {
              id: event.creator.email,
              name: name,
              email: event.creator.email,
              company: extractCompanyFromEmail(event.creator.email),
              lastContact: parsedDate.toISOString(),
              source: 'Calendar',
              lastMeetingName: event.summary || 'Meeting'
            }
            
            if (!calendarContacts.has(event.creator.email) || new Date(contact.lastContact) > new Date(calendarContacts.get(event.creator.email)!.lastContact)) {
              calendarContacts.set(event.creator.email, contact)
            }
          }
        } catch (dateError) {
          console.log(`Calendar date parsing error: ${dateError}`)
        }
      }
    }
  } catch (error) {
    console.error('Error fetching Calendar contacts:', error)
  }

  console.log(`✅ Found ${calendarContacts.size} contacts from Calendar`)
  return Array.from(calendarContacts.values())
}

async function fetchGoogleContacts(auth: InstanceType<typeof google.auth.OAuth2>) {
  console.log('🚀 Starting parallel fetch of Gmail and Calendar contacts...')
  
  // Fetch Gmail and Calendar contacts in parallel
  const [gmailContacts, calendarContacts] = await Promise.all([
    fetchGmailContacts(auth),
    fetchCalendarContacts(auth)
  ])

  // Merge contacts, prioritizing the most recent interaction for each email
  const contactsMap = new Map<string, Contact>()
  
  // Add Gmail contacts first
  gmailContacts.forEach(contact => {
    contactsMap.set(contact.email, contact)
  })
  
  // Add Calendar contacts, updating if more recent
  calendarContacts.forEach(contact => {
    const existing = contactsMap.get(contact.email)
    if (!existing || new Date(contact.lastContact) > new Date(existing.lastContact)) {
      contactsMap.set(contact.email, contact)
    }
  })

  // Convert map to array and filter out contacts without proper dates
  const contacts = Array.from(contactsMap.values()).filter(contact => {
    return contact.lastContact && contact.lastContact !== 'Unknown'
  })

  console.log(`✅ Processed ${contacts.length} unique contacts from Gmail and Calendar interactions`)
  return contacts
}

function extractEmailFromHeader(header: string): string {
  const match = header.match(/<(.+?)>/)
  return match ? match[1] : header.trim()
}

function extractNameFromHeader(header: string): string {
  const match = header.match(/^(.+?)\s*</)
  return match ? match[1].trim().replace(/"/g, '') : ''
}

function extractEmailsFromHeader(header: string): string[] {
  const emails: string[] = []
  const matches = header.matchAll(/<(.+?)>/g)
  for (const match of matches) {
    emails.push(match[1])
  }
  return emails.length > 0 ? emails : [header.trim()]
}

function extractEmailBody(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return ''
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payloadObj = payload as Record<string, any>
  
  // If it's a multipart message, find the text/plain part
  if (payloadObj.parts && Array.isArray(payloadObj.parts)) {
    for (const part of payloadObj.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8')
      }
      // Recursively check nested parts
      if (part.parts) {
        const nestedBody = extractEmailBody(part)
        if (nestedBody) return nestedBody
      }
    }
  }
  
  // If it's a single part text/plain message
  if (payloadObj.mimeType === 'text/plain' && payloadObj.body?.data) {
    return Buffer.from(payloadObj.body.data, 'base64').toString('utf-8')
  }
  
  return ''
}



function extractCompanyFromEmail(email: string): string | undefined {
  // Skip common email providers
  const commonProviders = [
    'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com',
    'aol.com', 'protonmail.com', 'me.com', 'mac.com'
  ]
  
  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain || commonProviders.includes(domain)) {
    return undefined
  }
  
  // Extract company name from domain
  const domainParts = domain.split('.')
  if (domainParts.length >= 2) {
    // Get the main part of the domain (before .com, .org, etc.)
    const mainDomain = domainParts[domainParts.length - 2]
    // Capitalize first letter
    return mainDomain.charAt(0).toUpperCase() + mainDomain.slice(1)
  }
  
  return undefined
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Properly configure OAuth2 client with credentials for token refresh
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
    )
    
    // Set the access token
    auth.setCredentials({ access_token: token })

    const contacts = await fetchGoogleContacts(auth)
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