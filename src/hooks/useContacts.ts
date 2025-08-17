"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { Contact, ContactEdit } from "@/types";
import { saveToLocalStorage, loadFromLocalStorage, removeFromLocalStorage } from "@/lib/utils";
import { db } from "@/lib/firebase";

export const useContacts = () => {
  const { data: session, status } = useSession();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [cachedContacts, setCachedContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [backgroundSyncing, setBackgroundSyncing] = useState(false);
  const [freshDataLoaded, setFreshDataLoaded] = useState(false);
  const [progress, setProgress] = useState(0);
  const hasLoadedContacts = useRef(false);

  // Function to apply edits to contacts
  const applyEditsToContacts = async (
    baseContacts: Contact[]
  ): Promise<Contact[]> => {
    try {
      console.log("🔄 Fetching edits from /api/contacts/edits...");
      const response = await fetch("/api/contacts/edits");
      
      // If the API fails, just return the base contacts without edits
      if (!response.ok) {
        console.warn("⚠️ Failed to fetch edits:", response.status, "- continuing without edits");
        return baseContacts;
      }

      const editsObject = await response.json();
      
      // If we got an empty object or no edits, return base contacts
      if (!editsObject || Object.keys(editsObject).length === 0) {
        console.log("📝 No edits found, using base contacts");
        return baseContacts;
      }
      
      console.log("📝 Loaded edits object:", editsObject);
      console.log(
        "Loaded edits with tags:",
        Object.values(editsObject).slice(0, 3)
      );
      


      return baseContacts.map((contact) => {
        const edit = editsObject[contact.id];
        if (edit) {
          const updatedContact = {
            ...contact,
            name: edit.name !== undefined ? edit.name : contact.name,
            email: edit.email !== undefined ? edit.email : contact.email,
            company:
              edit.company !== undefined ? edit.company : contact.company, // This now properly handles null
            hidden: edit.hidden !== undefined ? edit.hidden : contact.hidden,
            starred:
              edit.starred !== undefined ? edit.starred : contact.starred,
            tags: edit.tags !== undefined ? edit.tags : contact.tags,
            photoUrl:
              edit.photoUrl !== undefined ? edit.photoUrl : contact.photoUrl,
          };
          
          // Debug: log if company was changed
          if (edit.company !== undefined && edit.company !== contact.company) {
            console.log(`🏢 Applied company edit for contact ${contact.id}:`, {
              oldCompany: contact.company,
              newCompany: edit.company,
              contactName: contact.name
            });
          }
          
          // Debug: log if tags were changed
          if (edit.tags && JSON.stringify(edit.tags) !== JSON.stringify(contact.tags)) {
            console.log(`🔄 Applied edit for contact ${contact.id}:`, {
              oldTags: contact.tags,
              newTags: edit.tags,
              company: contact.company
            });
          }
          
          return updatedContact;
        }
        return contact;
      });
    } catch (error) {
      console.warn("⚠️ Error applying edits, continuing without edits:", error);
      return baseContacts;
    }
  };

  // Cache contacts in localStorage
  const saveContactsToCache = (contacts: Contact[]) => {
    try {
      // Ensure we're saving contacts with their complete data including tags
      const contactsToCache = contacts.map(contact => ({
        ...contact,
        tags: contact.tags || [], // Ensure tags are always an array
      }));
      
      saveToLocalStorage("rolodex-contacts-cache", JSON.stringify(contactsToCache));
      saveToLocalStorage("rolodex-contacts-cache-timestamp", Date.now());
      
      console.log("💾 Cached contacts with tags:", contactsToCache.filter(c => c.tags && c.tags.length > 0).length);
    } catch (error) {
      console.error("Failed to save contacts to cache:", error);
    }
  };

  // Clear contacts cache
  const clearContactsCache = () => {
    try {
      removeFromLocalStorage("rolodex-contacts-cache");
      removeFromLocalStorage("rolodex-contacts-cache-timestamp");
      console.log("🗑️ Contacts cache cleared");
    } catch (error) {
      console.error("Failed to clear contacts cache:", error);
    }
  };

  // Force refresh cache (useful for manual refresh)
  const forceRefreshCache = async () => {
    console.log("🔄 Force refreshing cache...");
    clearContactsCache();
    setLoading(true);
    try {
      await fetchContacts(false); // not background
    } finally {
      setLoading(false);
    }
  };

  // Debug function to create test contacts in cache
  const createTestCache = () => {
    const testContacts: Contact[] = [
      {
        id: "test1@example.com",
        name: "Test Contact 1",
        email: "test1@example.com",
        company: "Test Company",
        tags: ["test", "demo"],
        lastContact: new Date().toISOString(),
        source: "Gmail",
        hidden: false,
        starred: false,
        lastEmailSubject: "Test Subject",
        lastEmailPreview: "Test preview",
        lastMeetingName: "Test Meeting",
        photoUrl: ""
      }
    ];
    
    console.log("🧪 Creating test cache with", testContacts.length, "contacts");
    saveContactsToCache(testContacts);
    setContacts(testContacts);
    setCachedContacts(testContacts);
    setLoading(false);
    
    // Debug: check if cache was actually saved
    setTimeout(() => {
      console.log("🧪 Cache verification:", {
        localStorageHasCache: !!localStorage.getItem("rolodex-contacts-cache"),
        localStorageHasTimestamp: !!localStorage.getItem("rolodex-contacts-cache-timestamp"),
        stateContacts: contacts.length,
        stateCachedContacts: cachedContacts.length
      });
    }, 100);
  };

  // Check if cache is stale and needs refreshing
  const isCacheStale = (): boolean => {
    try {
      const timestamp = loadFromLocalStorage<number | null>("rolodex-contacts-cache-timestamp", null);
      if (!timestamp) return true;
      
      const cacheAge = Date.now() - timestamp;
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
      return cacheAge > maxAge;
    } catch (error) {
      console.error("Failed to check cache staleness:", error);
      return true;
    }
  };

  // Load contacts from localStorage cache
  const loadContactsFromCache = (): Contact[] | null => {
    try {
      console.log("🔍 Attempting to load contacts from cache...");
      
      const cached = loadFromLocalStorage<string | null>("rolodex-contacts-cache", null);
      const timestamp = loadFromLocalStorage<number | null>("rolodex-contacts-cache-timestamp", null);

      console.log("🔍 Cache debug:", {
        hasCached: !!cached,
        hasTimestamp: !!timestamp,
        cachedLength: cached ? cached.length : 0,
        cachedPreview: cached && typeof cached === 'string' ? cached.substring(0, 50) + "..." : "null",
      });

      if (!cached || !timestamp) {
        console.log("❌ No cache found or missing timestamp");
        return null;
      }

      // Check if cache is less than 7 days old (more user-friendly)
      const cacheAge = Date.now() - timestamp;
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

      console.log("⏰ Cache age check:", {
        now: new Date().toISOString(),
        timestamp: new Date(timestamp).toISOString(),
        cacheAgeMs: cacheAge,
        cacheAgeHours: Math.round(cacheAge / (1000 * 60 * 60)),
        maxAgeMs: maxAge,
        maxAgeHours: Math.round(maxAge / (1000 * 60 * 60)),
        isExpired: cacheAge > maxAge,
      });

      console.log("⏰ Cache age:", {
        cacheAge: Math.round(cacheAge / (1000 * 60 * 60)),
        maxAge: Math.round(maxAge / (1000 * 60 * 60)),
        isExpired: cacheAge > maxAge,
      });

      // For now, let's be more lenient with cache expiration
      if (cacheAge > maxAge) {
        console.log("⚠️ Cache expired, but let's use it anyway for debugging");
        // return null; // Comment out expiration for now
      }

      // Parse the cached data
      const contacts = JSON.parse(cached);
      console.log("🔍 Parsed cache data:", {
        type: typeof contacts,
        isArray: Array.isArray(contacts),
        length: contacts?.length || 0,
        firstItem: contacts?.[0] ? {
          hasId: !!contacts[0].id,
          hasEmail: !!contacts[0].email,
          hasName: !!contacts[0].name,
          hasTags: !!contacts[0].tags,
          tagsLength: contacts[0].tags?.length || 0
        } : 'no items'
      });

      // Validate that we got a proper array of contacts
      if (!Array.isArray(contacts)) {
        console.error("❌ Cached data is not an array:", typeof contacts);
        clearContactsCache(); // Clear corrupted cache
        return null;
      }

      // Check if the array is empty or contains invalid data
      if (contacts.length === 0) {
        console.log("📭 Cache contains empty array, will fetch fresh data");
        clearContactsCache(); // Clear empty cache
        return null;
      }

      // Validate that the first contact has the expected structure
      if (
        contacts.length > 0 &&
        (!contacts[0] || typeof contacts[0] !== "object" || !contacts[0].email)
      ) {
        console.error(
          "❌ Cached contacts have invalid structure:",
          contacts[0]
        );
        clearContactsCache(); // Clear corrupted cache
        return null;
      }

      // Ensure all contacts have tags array
      const validatedContacts = contacts.map(contact => ({
        ...contact,
        tags: contact.tags || [], // Ensure tags are always an array
      }));

      console.log("📦 Loaded", validatedContacts.length, "contacts from cache");
      console.log("🏷️ Contacts with tags:", validatedContacts.filter(c => c.tags && c.tags.length > 0).length);
      
      return validatedContacts;
    } catch (error) {
      console.error("❌ Failed to load contacts from cache:", error);
      // Clear corrupted cache
      clearContactsCache();
      return null;
    }
  };

  const fetchContacts = async (background = false) => {
    if (background) {
      setBackgroundSyncing(true);
    } else {
      setLoading(true);
      setProgress(0);
      console.log("📊 Progress: 0% - Starting...");
      // Add initial progress update
      await new Promise(resolve => setTimeout(resolve, 100));
      setProgress(10);
      console.log("📊 Progress: 10% - Initialized");
    }
    try {
      // Check if we have a valid session with access token
      const sessionWithToken = session as {
        accessToken?: string;
        error?: string;
        refreshToken?: string;
      };

      if (!sessionWithToken?.accessToken) {
        console.error("❌ No access token in session:", sessionWithToken);
        if (sessionWithToken?.error === "RefreshAccessTokenError") {
          console.error("❌ Token refresh failed, signing out...");
          signOut();
          return;
        }
        throw new Error("Authentication required");
      }

      // Update progress - authentication check complete
      if (!background) {
        console.log("📊 Progress: 20% - Authentication check complete");
        setProgress(20);
        await new Promise(resolve => setTimeout(resolve, 200)); // Small delay to make progress visible
      }

      // Use regular endpoint for initial load (with caching), refresh endpoint for background sync
      const endpoint = background ? "/api/contacts/refresh" : "/api/contacts";
      const method = background ? "POST" : "GET";

      const requestOptions: RequestInit = {
        method,
        headers: {
          Authorization: `Bearer ${sessionWithToken.accessToken}`,
        },
      };

      // For background refresh, include refresh token in body
      if (background && sessionWithToken.refreshToken) {
        requestOptions.body = JSON.stringify({
          refreshToken: sessionWithToken.refreshToken,
        });
        requestOptions.headers = {
          ...requestOptions.headers,
          "Content-Type": "application/json",
        };
      }

      // Update progress - starting API request
      if (!background) {
        console.log("📊 Progress: 40% - Starting API request");
        setProgress(40);
        await new Promise(resolve => setTimeout(resolve, 200)); // Small delay to make progress visible
      }
      
      const response = await fetch(endpoint, requestOptions);

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 401) {
          console.error(
            "Authentication failed. Please sign in again to get updated permissions for contact photos."
          );

          // For background sync, don't force sign out - just log the error
          if (background) {
            console.log(
              "Background sync failed due to authentication error - will retry later"
            );
            return;
          }

          // For initial load, force sign out to refresh the session with new scopes
          alert(
            "Please sign out and sign in again to enable contact photo fetching with updated permissions."
          );
          signOut();
          return;
        }
        throw new Error(errorData.error || "Failed to fetch contacts");
      }

      // Update progress - API response received
      if (!background) {
        console.log("📊 Progress: 60% - API response received");
        setProgress(60);
        await new Promise(resolve => setTimeout(resolve, 200)); // Small delay to make progress visible
      }
      
      const data = await response.json();

      // Handle different response formats
      // The refresh endpoint returns {success, message, contactsCount, contacts}
      // The regular endpoint returns the contacts array directly
      const contacts = data.contacts || data;

      // Update progress - applying edits
      if (!background) {
        console.log("📊 Progress: 80% - Applying edits");
        setProgress(80);
        await new Promise(resolve => setTimeout(resolve, 200)); // Small delay to make progress visible
      }
      
      // Apply any existing edits to the contacts
      const contactsWithEdits = await applyEditsToContacts(contacts);
      
      // Update progress based on actual email processing
      if (!background && contactsWithEdits.length > 0) {
        console.log(`📊 Progress: 80-90% - Processing ${contactsWithEdits.length} emails in batches`);
        // Simulate processing progress for each batch of emails
        const batchSize = Math.max(1, Math.floor(contactsWithEdits.length / 10));
        for (let i = 0; i < contactsWithEdits.length; i += batchSize) {
          const currentProgress = 80 + (i / contactsWithEdits.length) * 10;
          console.log(`📊 Progress: ${Math.round(currentProgress)}% - Processed ${i + batchSize}/${contactsWithEdits.length} emails`);
          setProgress(Math.min(currentProgress, 90));
          await new Promise(resolve => setTimeout(resolve, 50)); // Faster updates for email processing
        }
      }
      
      console.log(
        "Contacts with edits applied:",
        contactsWithEdits.slice(0, 3)
      ); // Debug: check if photos persist after edits
      console.log(
        "Contact photos found:",
        contactsWithEdits.filter((c) => c.photoUrl).length,
        "out of",
        contactsWithEdits.length,
        "total contacts"
      ); // Debug: count how many contacts have photos

      // Update progress - finalizing
      if (!background) {
        console.log("📊 Progress: 90% - Finalizing");
        setProgress(90);
        await new Promise(resolve => setTimeout(resolve, 200)); // Small delay to make progress visible
      }
      
      // Save to cache and update state
      saveContactsToCache(contactsWithEdits);
      setContacts(contactsWithEdits);

      console.log(
        `✅ ${background ? "Background" : "Initial"} contacts loaded:`,
        contactsWithEdits.length
      );

      // If we got 0 contacts and this is not a background sync, show a message
      if (contactsWithEdits.length === 0 && !background) {
        console.log("⚠️ No contacts found - this might indicate an API issue");
      }

      // If this was a background fetch, show a subtle indicator
      if (background) {
        console.log("✅ Fresh contacts loaded in background");
        setFreshDataLoaded(true);
        // Clear the indicator after 3 seconds
        setTimeout(() => setFreshDataLoaded(false), 3000);
      }

      // Update progress - complete
      if (!background) {
        console.log("📊 Progress: 100% - Complete!");
        setProgress(100);
        await new Promise(resolve => setTimeout(resolve, 300)); // Longer delay to show completion
      }
      
      // Backend caching is now handled automatically by the API
    } catch (error) {
      console.error("Error fetching contacts:", error);

      // Check if it's an authentication error
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes("Gmail API error") ||
        errorMessage.includes("401")
      ) {
        if (background) {
          console.log("❌ Background sync failed, keeping existing contacts");
        } else {
          alert(
            "Your Google account needs to be re-authenticated to access Gmail and Calendar data. Please sign out and sign in again."
          );
        }
      }
    } finally {
      if (background) {
        setBackgroundSyncing(false);
      } else {
        setLoading(false);
      }
    }
  };

  // Load cached contacts immediately on mount
  useEffect(() => {
    console.log("🔍 Mount effect - checking for cached contacts...");
    
    // Debug: check what's actually in localStorage
    console.log("🔍 localStorage debug:", {
      hasCache: !!localStorage.getItem("rolodex-contacts-cache"),
      hasTimestamp: !!localStorage.getItem("rolodex-contacts-cache-timestamp"),
      cacheRaw: localStorage.getItem("rolodex-contacts-cache")?.substring(0, 100),
      timestampRaw: localStorage.getItem("rolodex-contacts-cache-timestamp")
    });
    
    const cachedContacts = loadContactsFromCache();
    console.log("🔍 Cache check result:", {
      hasCached: !!cachedContacts,
      cachedLength: cachedContacts?.length || 0,
      currentLoading: loading
    });
    
    if (cachedContacts) {
      console.log("🚀 Loading cached contacts on mount");
      
      // Apply edits to cached contacts so they show the correct state
      applyEditsToContacts(cachedContacts).then((cachedContactsWithEdits) => {
        console.log("🔍 Edits applied to cached contacts:", {
          before: cachedContacts.length,
          after: cachedContactsWithEdits.length,
          hasChanges: JSON.stringify(cachedContactsWithEdits) !== JSON.stringify(cachedContacts)
        });
        
        setContacts(cachedContactsWithEdits);
        setCachedContacts(cachedContactsWithEdits);
        
        // CRITICAL FIX: Update the localStorage cache with the edited contacts
        // This ensures that when the page reloads, the edits are preserved
        if (JSON.stringify(cachedContactsWithEdits) !== JSON.stringify(cachedContacts)) {
          console.log("🔄 Updating localStorage cache with edited contacts");
          saveContactsToCache(cachedContactsWithEdits);
        }
        
        setLoading(false); // Never show loading when we have cache
        console.log("✅ Cached contacts loaded, loading set to false");
      });
    } else {
      // No cached contacts, but don't show loading screen
      setLoading(false);
      console.log("📭 No cached contacts found, loading set to false");
    }
  }, []);

  // Load fresh contacts when session is available
  useEffect(() => {
    if (session && !hasLoadedContacts.current) {
      hasLoadedContacts.current = true;
      
      // If we have cached contacts, just fetch fresh data in background
      if (cachedContacts.length > 0) {
        console.log("🔄 Fetching fresh contacts from backend (background)");
        fetchContacts(true); // background = true
      } else {
        // Only fetch immediately if no cache exists
        console.log("🔄 Fetching contacts immediately (no cache)");
        fetchContacts(false); // not background
      }
    }
  }, [session]);

  // Log Firebase status for debugging
  useEffect(() => {
    if (session) {
      console.log("🔍 Firebase status check:");
      console.log("  - Firebase DB available:", !!db);
      console.log("  - Cached contacts:", cachedContacts.length);
      console.log("  - Current contacts:", contacts.length);
      
      if (!db) {
        console.log("⚠️ Firebase not configured - contact edits won't persist across sessions");
        console.log("📖 See FIREBASE_SETUP.md for setup instructions");
      }
    }
  }, [session, db, cachedContacts.length, contacts.length]);

  return {
    contacts,
    setContacts,
    loading,
    backgroundSyncing,
    freshDataLoaded,
    progress,
    fetchContacts,
    clearContactsCache,
    loadContactsFromCache,
    cachedContacts,
    forceRefreshCache,
    isCacheStale,
    createTestCache,
  };
}; 