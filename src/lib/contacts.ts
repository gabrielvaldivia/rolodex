import { google } from 'googleapis'

export interface Contact {
  id: string
  name: string
  email: string
  company?: string
  lastContact: string
  source: string
  lastEmailSubject?: string
  lastEmailPreview?: string
  lastMeetingName?: string
  photoUrl?: string
}

// Helper functions for extracting data from email headers
function extractEmailFromHeader(header: string): string {
  const emailMatch = header.match(/<(.+?)>/)
  return emailMatch ? emailMatch[1] : header.trim()
}

function extractNameFromHeader(header: string): string {
  const nameMatch = header.match(/^([^<]+)/)
  return nameMatch ? nameMatch[1].trim().replace(/"/g, '') : ''
}

function extractEmailsFromHeader(header: string): string[] {
  const emails = header.split(',').map(email => extractEmailFromHeader(email.trim()))
  return emails.filter(email => email.includes('@'))
}

function extractNameFromEmailOrDisplay(email: string, displayName?: string): string {
  if (displayName && displayName !== email) {
    return displayName
  }
  
  const nameFromEmail = email.split('@')[0]
  return nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1)
}

function extractCompanyFromEmail(email: string): string {
  const domain = email.split('@')[1]
  if (!domain) return ''
  
  const company = domain.split('.')[0]
  return company.charAt(0).toUpperCase() + company.slice(1)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractEmailBody(payload: any): string {
  if (!payload) return ''
  
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf-8')
  }
  
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8')
      }
    }
  }
  
  return ''
}

export async function fetchGmailContacts(auth: InstanceType<typeof google.auth.OAuth2>): Promise<Contact[]> {
  console.log('📧 Starting Gmail contacts fetch...')

  const gmail = google.gmail({ version: 'v1', auth })
  const gmailContacts = new Map<string, Contact>()
  
  // Test Gmail API access
  try {
    console.log('🧪 Testing Gmail API access...')
    const testResponse = await gmail.users.getProfile({ userId: 'me' })
    console.log('✅ Gmail API access successful:', testResponse.data.emailAddress)
  } catch (testError) {
    console.error('❌ Gmail API access failed:', testError)
    console.error('Gmail API error details:', {
      message: testError instanceof Error ? testError.message : String(testError),
      code: (testError as { code?: number })?.code,
      status: (testError as { status?: number })?.status
    })
  }

  // Get the user's email address
  let userEmail = ''
  try {
    const profile = await gmail.users.getProfile({ userId: 'me' })
    userEmail = profile.data.emailAddress || ''
    console.log(`👤 User email: ${userEmail}`)
  } catch (error) {
    console.error('❌ Error getting user profile:', error)
    console.error('Profile error details:', {
      message: error instanceof Error ? error.message : String(error),
      code: (error as { code?: number })?.code,
      status: (error as { status?: number })?.status
    })
  }

  try {
    // Get recent emails for comprehensive contact discovery
    console.log('📧 Fetching Gmail messages...')
    const emailResponse = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 2500, // Increased to match Calendar events for better coverage
      q: 'in:sent OR in:inbox', // Get both sent and received emails
    })
    
    console.log(`📧 Found ${emailResponse.data.messages?.length || 0} Gmail messages`)

    if (emailResponse.data.messages) {

      const messagesToProcess = emailResponse.data.messages
      
      // Track email threads to prioritize received emails
      const emailThreads = new Map<string, { received: Contact | null; sent: Contact | null }>()
      
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
          const subject = subjectHeader?.value || ''
          const dateString = dateHeader?.value || new Date().toISOString()
          
          try {
            const parsedDate = new Date(dateString)
            if (isNaN(parsedDate.getTime())) continue
            
            const preview = emailBody ? emailBody.replace(/\s+/g, ' ').trim() : ''
            
            // Process From header (received emails)
            if (fromHeader?.value) {
              const fromEmail = extractEmailFromHeader(fromHeader.value)
              const fromName = extractNameFromHeader(fromHeader.value)
              
              // Skip if this is the user's own email
              if (fromEmail !== userEmail) {
                const contact: Contact = {
                  id: fromEmail,
                  name: fromName || fromEmail,
                  email: fromEmail,
                  company: extractCompanyFromEmail(fromEmail),
                  lastContact: parsedDate.toISOString(),
                  source: 'Gmail',
                  lastEmailSubject: subject,
                  lastEmailPreview: preview
                }
                
                // Track this as a received email in the thread
                const threadKey = `${fromEmail}-${subject}`
                const thread = emailThreads.get(threadKey) || { received: null, sent: null }
                if (!thread.received || new Date(contact.lastContact) > new Date(thread.received.lastContact)) {
                  thread.received = contact
                }
                emailThreads.set(threadKey, thread)
              }
            }
            
            // Process To header (sent emails)
            if (toHeader?.value) {
              const toEmails = extractEmailsFromHeader(toHeader.value)
              const fromEmail = fromHeader?.value ? extractEmailFromHeader(fromHeader.value) : ''
              
              // Only process if this is actually sent by the user
              if (fromEmail === userEmail) {
                for (const toEmail of toEmails) {
                  if (toEmail !== userEmail) {
                    const toName = extractNameFromHeader(toHeader.value)
                    
                    const contact: Contact = {
                      id: toEmail,
                      name: toName || toEmail,
                      email: toEmail,
                      company: extractCompanyFromEmail(toEmail),
                      lastContact: parsedDate.toISOString(),
                      source: 'Gmail',
                      lastEmailSubject: subject,
                      lastEmailPreview: preview
                    }
                    
                    // Track this as a sent email in the thread
                    const threadKey = `${toEmail}-${subject}`
                    const thread = emailThreads.get(threadKey) || { received: null, sent: null }
                    if (!thread.sent || new Date(contact.lastContact) > new Date(thread.sent.lastContact)) {
                      thread.sent = contact
                    }
                    emailThreads.set(threadKey, thread)
                  }
                }
              }
            }
          } catch (dateError) {
            console.log(`Date parsing error: ${dateError}`)
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
      
      // Now process the threads to create final contacts
      for (const [threadKey, thread] of emailThreads) {
        const email = threadKey.split('-')[0] // Extract email from thread key
        
        // Prioritize received emails over sent emails for the same thread
        let finalContact: Contact | null = null
        
        if (thread.received && thread.sent) {
          // Both received and sent emails exist for this thread
          if (new Date(thread.received.lastContact) >= new Date(thread.sent.lastContact)) {
            // Use received email if it's more recent or same date
            finalContact = thread.received
          } else {
            // Use sent email if it's more recent, but keep received email data if available
            finalContact = {
              ...thread.sent,
              lastEmailSubject: thread.received.lastEmailSubject,
              lastEmailPreview: thread.received.lastEmailPreview
            }
          }
        } else if (thread.received) {
          finalContact = thread.received
        } else if (thread.sent) {
          finalContact = thread.sent
        }
        
        if (finalContact) {
          const existingContact = gmailContacts.get(email)
          if (!existingContact || new Date(finalContact.lastContact) > new Date(existingContact.lastContact)) {
            gmailContacts.set(email, finalContact)
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Error fetching Gmail contacts:', error)
    console.error('Gmail error details:', {
      message: error instanceof Error ? error.message : String(error),
      code: (error as { code?: number })?.code,
      status: (error as { status?: number })?.status
    })
  }

  console.log(`✅ Found ${gmailContacts.size} contacts from Gmail`)
  return Array.from(gmailContacts.values())
}

export async function fetchCalendarContacts(auth: InstanceType<typeof google.auth.OAuth2>): Promise<Contact[]> {
  console.log('📅 Starting Calendar contacts fetch...')
  const calendar = google.calendar({ version: 'v3', auth })
  const calendarContacts = new Map<string, Contact>()

  try {
    console.log('📅 Fetching Calendar events...')
    const calendarResponse = await calendar.events.list({
      calendarId: 'primary',
      maxResults: 2500,
      singleEvents: true,
      orderBy: 'startTime',
    })
    
    console.log(`📅 Found ${calendarResponse.data.items?.length || 0} Calendar events`)

    if (calendarResponse.data.items) {
      for (const event of calendarResponse.data.items) {
        // Use the event start time as the "last contact" time, but only for past events
        const eventDate = event.start?.dateTime || event.start?.date
        if (!eventDate) continue

        // Skip repeating events to avoid complexity
        if (event.recurringEventId) {
          continue // Skip recurring events
        }

        try {
          const parsedDate = new Date(eventDate)
          if (isNaN(parsedDate.getTime())) continue
          
          // Only include events that have already happened (past events)
          const now = new Date()
          if (parsedDate > now) {
            continue // Skip future events
          }

          // Process attendees
          if (event.attendees) {
            for (const attendee of event.attendees) {
              if (attendee.email) {
                const name = extractNameFromEmailOrDisplay(attendee.email, attendee.displayName || undefined)
                
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
            const name = extractNameFromEmailOrDisplay(event.organizer.email, event.organizer.displayName || undefined)
            
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
            const name = extractNameFromEmailOrDisplay(event.creator.email, event.creator.displayName || undefined)
            
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
    console.error('❌ Error fetching Calendar contacts:', error)
    console.error('Calendar error details:', {
      message: error instanceof Error ? error.message : String(error),
      code: (error as { code?: number })?.code,
      status: (error as { status?: number })?.status
    })
  }

  console.log(`✅ Found ${calendarContacts.size} contacts from Calendar`)
  return Array.from(calendarContacts.values())
}

export async function fetchContactPhotos(auth: InstanceType<typeof google.auth.OAuth2>, contacts: Contact[]): Promise<Contact[]> {
  console.log('🖼️ Fetching contact photos from People API...')
  const people = google.people({ version: 'v1', auth })
  const contactsWithPhotos = [...contacts]
  
  try {
    // First, try to get contacts using the People API connections
    try {
      console.log('Fetching from People API connections...')
      const connectionsResponse = await people.people.connections.list({
        resourceName: 'people/me',
        pageSize: 1000,
        personFields: 'emailAddresses,photos,names'
      })
      
      if (connectionsResponse.data.connections) {
        console.log(`Found ${connectionsResponse.data.connections.length} connections from People API`)
        
        // Create a map of email -> photo URL for faster lookup
        const photoMap = new Map<string, string>()
        
        connectionsResponse.data.connections.forEach(person => {
          if (person.emailAddresses && person.photos) {
            person.emailAddresses.forEach(email => {
              if (email.value && person.photos && person.photos.length > 0) {
                const photo = person.photos[0]
                if (photo.url) {
                  // Add size parameter to get a reasonable sized avatar
                  const photoUrl = photo.url.includes('=') ? photo.url : `${photo.url}=s150-c`
                  photoMap.set(email.value.toLowerCase(), photoUrl)
                  console.log(`Found photo for ${email.value}: ${photoUrl.substring(0, 50)}...`)
                }
              }
            })
          }
        })
        
        console.log(`Photo map has ${photoMap.size} entries`)
        
        // Apply photos to our contacts
        let photosApplied = 0
        contactsWithPhotos.forEach(contact => {
          const photoUrl = photoMap.get(contact.email.toLowerCase())
          if (photoUrl) {
            contact.photoUrl = photoUrl
            photosApplied++
            console.log(`Applied photo to ${contact.email}`)
          }
        })
        
        console.log(`Applied ${photosApplied} photos from People API connections`)
      }
    } catch (error) {
      console.log(`Error fetching People API connections: ${error}`)
    }
    
    const photosFound = contactsWithPhotos.filter(c => c.photoUrl).length
    console.log(`✅ Found ${photosFound} contact photos out of ${contactsWithPhotos.length} contacts`)
    
    // Log first few contacts with photos for debugging
    const contactsWithPhotoUrls = contactsWithPhotos.filter(c => c.photoUrl).slice(0, 3)
    if (contactsWithPhotoUrls.length > 0) {
      console.log('Sample contacts with photos:', contactsWithPhotoUrls.map(c => ({ 
        email: c.email, 
        photoUrl: c.photoUrl?.substring(0, 50) + '...' 
      })))
    }
    
  } catch (error) {
    console.error('Error fetching contact photos:', error)
  }
  
  return contactsWithPhotos
}

export async function fetchGoogleContacts(auth: InstanceType<typeof google.auth.OAuth2>) {
  console.log('🚀 Starting parallel fetch of Gmail and Calendar contacts...')
  
  // Test authentication first
  try {
    console.log('🔐 Testing authentication...')
    const credentials = await auth.getAccessToken()
    console.log('✅ Authentication successful, access token available')
    console.log('🔑 Access token length:', credentials.token?.length || 0)
  } catch (authError) {
    console.error('❌ Authentication failed:', authError)
    return []
  }
  
  try {
    // Fetch Gmail and Calendar contacts in parallel
    const [gmailContacts, calendarContacts] = await Promise.all([
      fetchGmailContacts(auth),
      fetchCalendarContacts(auth)
    ])

    console.log(`📊 Gmail contacts: ${gmailContacts.length}, Calendar contacts: ${calendarContacts.length}`)

    

  // Merge contacts, prioritizing the most recent interaction for each email
  const contactsMap = new Map<string, Contact>()
  
  // Add Gmail contacts first
  gmailContacts.forEach(contact => {
    contactsMap.set(contact.email, contact)
  })
  
  // Add Calendar contacts, intelligently merging names and keeping most recent data
  calendarContacts.forEach(contact => {
    const existing = contactsMap.get(contact.email)
    if (!existing) {
      // No existing contact, add the Calendar contact
      contactsMap.set(contact.email, contact)
    } else {
      // Merge contacts: keep most recent data but prefer Calendar name if it's better
      const useCalendarName = 
        // Use Calendar name if it's not just the email address
        (contact.name !== contact.email && contact.name.length > 0) &&
        // And Gmail name is just the email, very basic, or Calendar name is clearly better
        (existing.name === existing.email || 
         existing.name.length < contact.name.length ||
         // Prefer names with spaces (full names) over single words
         (contact.name.includes(' ') && !existing.name.includes(' ')))
      
      const mergedContact: Contact = {
        ...existing,
        // Keep most recent contact date
        lastContact: new Date(contact.lastContact) > new Date(existing.lastContact) 
          ? contact.lastContact 
          : existing.lastContact,
        // Use better name
        name: useCalendarName ? contact.name : existing.name,
        // Keep Calendar meeting info if Calendar contact is more recent
        ...(new Date(contact.lastContact) > new Date(existing.lastContact) && {
          lastMeetingName: contact.lastMeetingName,
          source: contact.source
        })
      }
      
      contactsMap.set(contact.email, mergedContact)
    }
  })

  // Convert map to array and filter out contacts without proper dates
  let contacts = Array.from(contactsMap.values()).filter(contact => {
    return contact.lastContact && contact.lastContact !== 'Unknown'
  })

  console.log(`✅ Processed ${contacts.length} unique contacts from Gmail and Calendar interactions`)
  
  // Fetch contact photos
  contacts = await fetchContactPhotos(auth, contacts)
  
  return contacts
  } catch (error) {
    console.error('❌ Error in fetchGoogleContacts:', error)
    return []
  }
} 