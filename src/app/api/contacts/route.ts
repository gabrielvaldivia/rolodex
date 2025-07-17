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

async function fetchGoogleContacts(auth: InstanceType<typeof google.auth.OAuth2>) {
  const contactsMap = new Map<string, Contact>()

  try {
    // We don't fetch Google Contacts anymore - skip this section
    console.log('Skipping Google Contacts (focusing on email/calendar interactions only)')
  } catch (error) {
    console.error('Error fetching Google Contacts:', error)
  }

  // Fetch emails from Gmail API (with better rate limiting)
  console.log('Fetching Gmail emails...')
  const gmail = google.gmail({ version: 'v1', auth })

  // Get ALL emails, not just recent ones
  const emailResponse = await gmail.users.messages.list({
    userId: 'me',
    maxResults: 100, // Reduced from 500 to be more conservative
    q: 'in:sent OR in:inbox', // Get both sent and received emails
  })

  if (emailResponse.data.messages) {
    console.log(`Found ${emailResponse.data.messages.length} emails, processing ALL...`)
    const messagesToProcess = emailResponse.data.messages // Process ALL messages
    
    for (let i = 0; i < messagesToProcess.length; i++) {
      const message = messagesToProcess[i]
      try {
        if (!message.id) continue
        
        // Much more conservative rate limiting
        if (i > 0 && i % 5 === 0) {
          console.log(`Processing email ${i + 1}/${messagesToProcess.length}, pausing...`)
          await new Promise(resolve => setTimeout(resolve, 2000)) // 2 second pause every 5 emails
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
              
              if (!contactsMap.has(email) || new Date(contact.lastContact) > new Date(contactsMap.get(email)!.lastContact)) {
                contactsMap.set(email, contact)
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
                
                if (!contactsMap.has(email) || new Date(contact.lastContact) > new Date(contactsMap.get(email)!.lastContact)) {
                  contactsMap.set(email, contact)
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

  console.log('✅ Finished processing Gmail emails')

  // Fetch Calendar events
  console.log('Fetching Calendar events...')
  const calendar = google.calendar({ version: 'v3', auth })
  
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
              console.log(`Calendar attendee with display name: {
  email: '${attendee.email}',
  displayName: '${attendee.displayName || 'N/A'}',
  extractedName: '${name}'
}`)
              
              const contact: Contact = {
                id: attendee.email,
                name: name,
                email: attendee.email,
                company: extractCompanyFromEmail(attendee.email),
                lastContact: parsedDate.toISOString(),
                source: 'Calendar',
                lastMeetingName: event.summary || 'Meeting'
              }
              
              if (!contactsMap.has(attendee.email) || new Date(contact.lastContact) > new Date(contactsMap.get(attendee.email)!.lastContact)) {
                contactsMap.set(attendee.email, contact)
              }
            }
          }
        }

        // Process organizer
        if (event.organizer?.email) {
          const name = event.organizer.displayName || event.organizer.email
          console.log(`Calendar organizer with display name: {
  email: '${event.organizer.email}',
  displayName: '${event.organizer.displayName || 'N/A'}',
  extractedName: '${name}'
}`)
          
          const contact: Contact = {
            id: event.organizer.email,
            name: name,
            email: event.organizer.email,
            company: extractCompanyFromEmail(event.organizer.email),
            lastContact: parsedDate.toISOString(),
            source: 'Calendar',
            lastMeetingName: event.summary || 'Meeting'
          }
          
          if (!contactsMap.has(event.organizer.email) || new Date(contact.lastContact) > new Date(contactsMap.get(event.organizer.email)!.lastContact)) {
            contactsMap.set(event.organizer.email, contact)
          }
        }

        // Process creator
        if (event.creator?.email) {
          const name = event.creator.displayName || event.creator.email
          console.log(`Calendar creator with display name: {
  email: '${event.creator.email}',
  displayName: '${event.creator.displayName || 'N/A'}',
  extractedName: '${name}'
}`)
          
          const contact: Contact = {
            id: event.creator.email,
            name: name,
            email: event.creator.email,
            company: extractCompanyFromEmail(event.creator.email),
            lastContact: parsedDate.toISOString(),
            source: 'Calendar',
            lastMeetingName: event.summary || 'Meeting'
          }
          
          if (!contactsMap.has(event.creator.email) || new Date(contact.lastContact) > new Date(contactsMap.get(event.creator.email)!.lastContact)) {
            contactsMap.set(event.creator.email, contact)
          }
        }
      } catch (dateError) {
        console.log(`Calendar date parsing error: ${dateError}`)
      }
    }
  }

  // Convert map to array and filter out contacts without proper dates
  const contacts = Array.from(contactsMap.values()).filter(contact => {
    return contact.lastContact && contact.lastContact !== 'Unknown'
  })

  console.log(`✅ Processed ${contacts.length} unique contacts from Gmail and Calendar interactions (ALL TIME)`)
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