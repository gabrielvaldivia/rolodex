"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { Contact, ContactEdit } from "@/types";
import { saveToLocalStorage, loadFromLocalStorage, removeFromLocalStorage } from "@/lib/utils";

export const useContacts = () => {
  const { data: session, status } = useSession();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [cachedContacts, setCachedContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [backgroundSyncing, setBackgroundSyncing] = useState(false);
  const [freshDataLoaded, setFreshDataLoaded] = useState(false);
  const hasLoadedContacts = useRef(false);

  // Function to apply edits to contacts
  const applyEditsToContacts = async (
    baseContacts: Contact[]
  ): Promise<Contact[]> => {
    try {
      const response = await fetch("/api/contacts/edits");
      if (!response.ok) {
        console.error("Failed to fetch edits:", response.status);
        return baseContacts;
      }

      const editsObject = await response.json();
      console.log(
        "Loaded edits with tags:",
        Object.values(editsObject).slice(0, 3)
      );

      return baseContacts.map((contact) => {
        const edit = editsObject[contact.id];
        if (edit) {
          return {
            ...contact,
            name: edit.name !== undefined ? edit.name : contact.name,
            email: edit.email !== undefined ? edit.email : contact.email,
            company:
              edit.company !== undefined ? edit.company : contact.company,
            hidden: edit.hidden !== undefined ? edit.hidden : contact.hidden,
            starred:
              edit.starred !== undefined ? edit.starred : contact.starred,
            tags: edit.tags !== undefined ? edit.tags : contact.tags,
            photoUrl:
              edit.photoUrl !== undefined ? edit.photoUrl : contact.photoUrl,
          };
        }
        return contact;
      });
    } catch (error) {
      console.error("Error applying edits:", error);
      return baseContacts;
    }
  };

  // Cache contacts in localStorage
  const saveContactsToCache = (contacts: Contact[]) => {
    try {
      saveToLocalStorage("rolodex-contacts-cache", JSON.stringify(contacts));
      saveToLocalStorage("rolodex-contacts-cache-timestamp", Date.now());
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

  // Load contacts from localStorage cache
  const loadContactsFromCache = (): Contact[] | null => {
    try {
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

      // Check if cache is less than 24 hours old
      const cacheAge = Date.now() - timestamp;
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

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

      if (cacheAge > maxAge) {
        console.log("Cache expired, will fetch fresh data");
        return null;
      }

      // Parse the cached data
      const contacts = JSON.parse(cached);

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

      console.log("📦 Loaded", contacts.length, "contacts from cache");
      return contacts;
    } catch (error) {
      console.error("❌ Failed to load contacts from cache:", error);
      // Clear corrupted cache
      clearContactsCache();
      return null;
    }
  };

  const loadContacts = async () => {
    // First, try to load from cache for immediate display
    const cachedContacts = loadContactsFromCache();
    if (cachedContacts) {
      console.log("🚀 Showing cached contacts immediately");
      setContacts(cachedContacts);
      setCachedContacts(cachedContacts);
      
      // Then fetch fresh data in the background (only if we have a session)
      if (session) {
        console.log("🔄 Fetching fresh contacts from backend");
        // Use a small delay to ensure cached contacts are displayed first
        setTimeout(() => {
          fetchContacts(true); // background = true
        }, 100);
      }
    } else {
      console.log("📭 No cached contacts available, will show loading state");
      // If no cached contacts, fetch immediately (not in background)
      if (session) {
        console.log("🔄 Fetching contacts immediately (no cache)");
        fetchContacts(false); // not background = false
      }
    }
  };

  const fetchContacts = async (background = false) => {
    if (background) {
      setBackgroundSyncing(true);
    } else {
      setLoading(true);
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

      const data = await response.json();

      // Handle different response formats
      // The refresh endpoint returns {success, message, contactsCount, contacts}
      // The regular endpoint returns the contacts array directly
      const contacts = data.contacts || data;

      // Apply any existing edits to the contacts
      const contactsWithEdits = await applyEditsToContacts(contacts);
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
    const cachedContacts = loadContactsFromCache();
    if (cachedContacts) {
      console.log("🚀 Loading cached contacts on mount");
      setContacts(cachedContacts);
      setCachedContacts(cachedContacts);
    }
  }, []);

  // Load fresh contacts when session is available
  useEffect(() => {
    if (session && !hasLoadedContacts.current) {
      hasLoadedContacts.current = true;
      
      // If we don't have any contacts loaded yet, load them
      if (contacts.length === 0) {
        loadContacts();

        // Add a timeout to prevent infinite loading
        const timeout = setTimeout(() => {
          if (contacts.length === 0 && !backgroundSyncing) {
            console.log(
              "⏰ Loading timeout reached, clearing cache and retrying"
            );
            clearContactsCache();
            loadContacts();
          }
        }, 30000); // 30 seconds timeout

        return () => clearTimeout(timeout);
      } else {
        // If we already have contacts (from cache), just fetch fresh data in background
        console.log("🔄 Fetching fresh contacts from backend");
        fetchContacts(true); // background = true
      }
    }
  }, [session]);

  return {
    contacts,
    setContacts,
    loading,
    backgroundSyncing,
    freshDataLoaded,
    fetchContacts,
    loadContacts,
    clearContactsCache,
    loadContactsFromCache,
  };
}; 