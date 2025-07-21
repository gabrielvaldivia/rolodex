"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Settings,
  RefreshCw,
  ExternalLink,
  Eye,
  EyeOff,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RichText } from "@/components/RichText";
import { EmailText } from "@/components/EmailText";

interface Contact {
  id: string;
  name: string;
  email: string;
  company?: string;
  lastContact: string;
  photoUrl?: string;
  source: string;
  lastEmailSubject?: string;
  lastEmailPreview?: string;
  lastMeetingName?: string;
  hidden?: boolean;
}

interface ContactEdit {
  id: string;
  name: string;
  email: string;
  company: string;
  updatedAt: string;
  hidden?: boolean;
}

type SortField = "name" | "email" | "company" | "lastContact";
type SortDirection = "asc" | "desc";
type View = "contacts" | "companies";

interface Company {
  name: string;
  contactCount: number;
  lastContact: string;
  contacts: Contact[];
  hidden?: boolean;
  website?: string;
}

// Add relative date formatting function
const formatRelativeDate = (dateString: string): string => {
  if (dateString === "Unknown" || dateString === "Never") return "Unknown";

  const date = new Date(dateString);
  const now = new Date();

  // Handle invalid dates
  if (isNaN(date.getTime())) return "Unknown";

  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  // Handle future dates (shouldn't happen but good to handle)
  if (diffInMs < 0) {
    console.log(
      `Future date detected: ${dateString}, parsed as: ${date.toISOString()}, now: ${now.toISOString()}`
    );
    return "Just now";
  }

  // Handle very recent dates - show minutes and hours
  if (diffInDays === 0) {
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60)
      return `${diffInMinutes} minute${diffInMinutes === 1 ? "" : "s"}`;
    if (diffInHours < 24)
      return `${diffInHours} hour${diffInHours === 1 ? "" : "s"}`;
    return "Today";
  }

  if (diffInDays === 1) return "Yesterday";
  if (diffInDays < 7) return `${diffInDays} days`;
  if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7);
    return weeks === 1 ? "1 week" : `${weeks} weeks`;
  }
  if (diffInDays < 365) {
    const months = Math.floor(diffInDays / 30);
    return months === 1 ? "1 month" : `${months} months`;
  }

  // For contacts more than a year ago, use shortened format
  const years = Math.floor(diffInDays / 365);
  const remainingDays = diffInDays % 365;
  const months = Math.floor(remainingDays / 30);

  if (months === 0) return `${years}y`;
  return `${years}y ${months}m`;
};

// Add regular date formatting function for contact sheet
const formatRegularDate = (dateString: string): string => {
  if (dateString === "Unknown" || dateString === "Never") return "Unknown";

  const date = new Date(dateString);

  // Handle invalid dates
  if (isNaN(date.getTime())) return "Unknown";

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const month = monthNames[date.getMonth()];
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();

  // Convert to 12-hour format
  const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const ampm = hours >= 12 ? "pm" : "am";
  const minutesStr = minutes.toString().padStart(2, "0");

  return `${month} ${day} at ${hour12}:${minutesStr}${ampm}`;
};

// Generate website URL from company name
const generateCompanyWebsite = (companyName: string): string => {
  if (!companyName) return "";

  // Clean up the company name
  const cleanName = companyName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "") // Remove special characters
    .replace(/\s+/g, "") // Remove spaces
    .replace(/^(the|a|an)\s+/i, "") // Remove articles
    .replace(/(inc|llc|corp|ltd|company|co)$/i, ""); // Remove company suffixes

  if (!cleanName) return "";

  return `https://${cleanName}.com`;
};

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editedContact, setEditedContact] = useState<Contact | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [sortField, setSortField] = useState<SortField>("lastContact");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentView, setCurrentView] = useState<View>("contacts");
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isCompanySheetOpen, setIsCompanySheetOpen] = useState(false);
  const [editingCompanyName, setEditingCompanyName] = useState(false);
  const [editingCompanyWebsite, setEditingCompanyWebsite] = useState(false);
  const [originalCompanyName, setOriginalCompanyName] = useState("");
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaveError, setLastSaveError] = useState<string | null>(null);
  const [backgroundSyncing, setBackgroundSyncing] = useState(false);

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

      return baseContacts.map((contact) => {
        const edit = editsObject[contact.id];
        if (edit) {
          return {
            ...contact,
            name: edit.name || contact.name,
            email: edit.email || contact.email,
            company: edit.company || contact.company,
            hidden: edit.hidden || contact.hidden,
          };
        }
        return contact;
      });
    } catch (error) {
      console.error("Error applying edits:", error);
      return baseContacts;
    }
  };

  const handleCompanyClick = (company: Company) => {
    setSelectedCompany(company);
    setLastSaveError(null);
    setIsSaving(false);
    setEditingCompanyWebsite(false);
    setIsCompanySheetOpen(true);
  };

  const handleCloseCompanySheet = () => {
    setIsCompanySheetOpen(false);
    setSelectedCompany(null);
    setEditingCompanyName(false);
    setEditingCompanyWebsite(false);
    setOriginalCompanyName("");
    setLastSaveError(null);
    setIsSaving(false);
  };

  const updateCompanyName = async (oldName: string, newName: string) => {
    if (oldName === newName || !newName.trim()) return;

    setLastSaveError(null);
    setIsSaving(true);

    try {
      // Update all contacts that belong to this company
      const updatedContacts = contacts.map((contact) =>
        contact.company === oldName
          ? { ...contact, company: newName.trim() }
          : contact
      );

      setContacts(updatedContacts);

      // Update the selected company
      if (selectedCompany) {
        setSelectedCompany({
          ...selectedCompany,
          name: newName.trim(),
        });
      }

      // Save changes to the server for each contact
      const contactsToUpdate = contacts.filter(
        (contact) => contact.company === oldName
      );

      const responses = await Promise.all(
        contactsToUpdate.map((contact) =>
          fetch(`/api/contacts/${contact.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: contact.name,
              email: contact.email,
              company: newName.trim(),
              hidden: contact.hidden,
            }),
          })
        )
      );

      // Check if all requests were successful
      const failedRequests = responses.filter((response) => !response.ok);
      if (failedRequests.length > 0) {
        throw new Error(`Failed to update ${failedRequests.length} contact(s)`);
      }

      setEditingCompanyName(false);
      console.log(
        `Company name updated successfully for ${contactsToUpdate.length} contacts`
      );
    } catch (error) {
      console.error("Error updating company name:", error);
      setLastSaveError(
        error instanceof Error ? error.message : "Failed to update company name"
      );

      // Revert changes on error
      setContacts(contacts);

      // Reset selected company to original state
      if (selectedCompany) {
        setSelectedCompany({
          ...selectedCompany,
          name: oldName,
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const updateCompanyWebsite = async (
    companyName: string,
    newWebsite: string
  ) => {
    setLastSaveError(null);
    setIsSaving(true);

    try {
      // Update the selected company
      if (selectedCompany && selectedCompany.name === companyName) {
        setSelectedCompany({
          ...selectedCompany,
          website: newWebsite.trim(),
        });
      }

      setEditingCompanyWebsite(false);
      console.log(`Company website updated successfully for ${companyName}`);
    } catch (error) {
      console.error("Error updating company website:", error);
      setLastSaveError(
        error instanceof Error
          ? error.message
          : "Failed to update company website"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const openWebsite = (website: string) => {
    if (website && website !== "https://company.com") {
      // Add https:// if not present
      const url = website.startsWith("http") ? website : `https://${website}`;
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const openGmail = (contact: Contact) => {
    // Create Gmail search URL to find emails from this contact
    const searchQuery = `from:${contact.email}`;
    const gmailUrl = `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(
      searchQuery
    )}`;
    window.open(gmailUrl, "_blank", "noopener,noreferrer");
  };

  const openCalendar = (contact: Contact) => {
    // Create Google Calendar search URL to find meetings with this contact
    const searchQuery = contact.email;
    const calendarUrl = `https://calendar.google.com/calendar/u/0/r/search?q=${encodeURIComponent(
      searchQuery
    )}`;
    window.open(calendarUrl, "_blank", "noopener,noreferrer");
  };

  const updateCompanyHidden = async (companyName: string, hidden: boolean) => {
    setLastSaveError(null);
    setIsSaving(true);

    try {
      // Update all contacts that belong to this company
      const updatedContacts = contacts.map((contact) =>
        contact.company === companyName
          ? { ...contact, hidden: hidden }
          : contact
      );

      setContacts(updatedContacts);

      // Update the selected company
      if (selectedCompany && selectedCompany.name === companyName) {
        setSelectedCompany({
          ...selectedCompany,
          hidden: hidden,
          contacts: selectedCompany.contacts.map((contact) => ({
            ...contact,
            hidden: hidden,
          })),
        });
      }

      // Save changes to the server for each contact
      const contactsToUpdate = contacts.filter(
        (contact) => contact.company === companyName
      );

      const responses = await Promise.all(
        contactsToUpdate.map((contact) =>
          fetch(`/api/contacts/${contact.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: contact.name,
              email: contact.email,
              company: contact.company,
              hidden: hidden,
            }),
          })
        )
      );

      // Check if all requests were successful
      const failedRequests = responses.filter((response) => !response.ok);
      if (failedRequests.length > 0) {
        throw new Error(`Failed to update ${failedRequests.length} contact(s)`);
      }

      console.log(
        `Company ${hidden ? "hidden" : "shown"} successfully for ${
          contactsToUpdate.length
        } contacts`
      );
    } catch (error) {
      console.error("Error updating company hidden state:", error);
      setLastSaveError(
        error instanceof Error
          ? error.message
          : "Failed to update company visibility"
      );

      // Revert changes on error
      setContacts(contacts);
    } finally {
      setIsSaving(false);
    }
  };

  // Group contacts by company
  const groupContactsByCompany = (contacts: Contact[]): Company[] => {
    const companiesMap = new Map<string, Company>();

    contacts.forEach((contact) => {
      // Skip contacts without a company
      if (!contact.company || contact.company.trim() === "") {
        return;
      }

      const companyName = contact.company;

      if (!companiesMap.has(companyName)) {
        companiesMap.set(companyName, {
          name: companyName,
          contactCount: 0,
          lastContact: contact.lastContact,
          contacts: [],
          hidden: false,
          website: generateCompanyWebsite(companyName),
        });
      }

      const company = companiesMap.get(companyName)!;
      company.contactCount++;
      company.contacts.push(contact);

      // Update last contact date if this contact is more recent
      if (
        contact.lastContact !== "Unknown" &&
        company.lastContact !== "Unknown"
      ) {
        const contactDate = new Date(contact.lastContact);
        const companyDate = new Date(company.lastContact);
        if (contactDate > companyDate) {
          company.lastContact = contact.lastContact;
        }
      } else if (
        contact.lastContact !== "Unknown" &&
        company.lastContact === "Unknown"
      ) {
        company.lastContact = contact.lastContact;
      }
    });

    // Calculate company hidden state based on all contacts being hidden
    const companies = Array.from(companiesMap.values());
    companies.forEach((company) => {
      company.hidden = company.contacts.every((contact) => contact.hidden);
    });

    return companies;
  };

  const sortCompanies = (companies: Company[]) => {
    return [...companies].sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      switch (sortField) {
        case "name":
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case "company":
          aVal = a.contactCount;
          bVal = b.contactCount;
          break;
        case "lastContact":
          // Handle special case for "Unknown"
          if (a.lastContact === "Unknown") {
            aVal = new Date(0).getTime(); // Very old date
          } else {
            aVal = new Date(a.lastContact).getTime();
          }
          if (b.lastContact === "Unknown") {
            bVal = new Date(0).getTime();
          } else {
            bVal = new Date(b.lastContact).getTime();
          }
          break;
        default:
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
      }

      if (sortDirection === "asc") {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new field with ascending direction
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <span className="ml-1 text-gray-400">⇅</span>;
    }
    return sortDirection === "asc" ? (
      <span className="ml-1 text-gray-900">↑</span>
    ) : (
      <span className="ml-1 text-gray-900">↓</span>
    );
  };

  const sortContacts = (contacts: Contact[]) => {
    return [...contacts].sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      switch (sortField) {
        case "name":
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case "email":
          aVal = a.email.toLowerCase();
          bVal = b.email.toLowerCase();
          break;
        case "company":
          aVal = (a.company || "").toLowerCase();
          bVal = (b.company || "").toLowerCase();
          break;
        case "lastContact":
          // Handle special case for "Unknown"
          if (a.lastContact === "Unknown") {
            aVal = new Date(0).getTime(); // Very old date
          } else {
            aVal = new Date(a.lastContact).getTime();
          }
          if (b.lastContact === "Unknown") {
            bVal = new Date(0).getTime();
          } else {
            bVal = new Date(b.lastContact).getTime();
          }
          break;
        default:
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
      }

      if (sortDirection === "asc") {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });
  };

  useEffect(() => {
    if (session) {
      loadContacts();
    }
  }, [session]);

  // Auto-sync functionality moved to settings page
  useEffect(() => {
    if (!session) return;

    const autoSyncEnabled = localStorage.getItem("rolodex-auto-sync");
    if (autoSyncEnabled === "false") return;

    const checkAndSync = () => {
      const cachedTime = localStorage.getItem("rolodex-contacts-time");
      if (cachedTime) {
        const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000; // 6 hours ago
        if (parseInt(cachedTime) <= sixHoursAgo) {
          console.log(
            "Auto-sync: Cache expired, fetching new contacts in background"
          );
          fetchContacts(true); // Background sync
        }
      }
    };

    // Check immediately
    checkAndSync();

    // Set up interval to check every 5 minutes for expired cache
    const interval = setInterval(checkAndSync, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [session]);

  const loadContacts = async () => {
    // Check if we have cached contacts (less than 6 hours old)
    const cachedContacts = localStorage.getItem("rolodex-contacts");
    const cachedTime = localStorage.getItem("rolodex-contacts-time");

    if (cachedContacts && cachedTime) {
      const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000; // 6 hours ago
      if (parseInt(cachedTime) > sixHoursAgo) {
        console.log("Loading contacts from cache");
        const baseContacts = JSON.parse(cachedContacts);
        const contactsWithEdits = await applyEditsToContacts(baseContacts);
        setContacts(contactsWithEdits);
        return;
      }
    }

    // If no cache or cache is old, fetch new contacts
    fetchContacts();
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
      };

      if (!sessionWithToken?.accessToken) {
        console.error("No access token in session:", sessionWithToken);
        if (sessionWithToken?.error === "RefreshAccessTokenError") {
          console.error("Token refresh failed, signing out...");
          signOut();
          return;
        }
        throw new Error("Authentication required");
      }

      const response = await fetch("/api/contacts", {
        headers: {
          Authorization: `Bearer ${sessionWithToken.accessToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 401) {
          console.error("Authentication failed. Please sign in again.");
          // Force sign out to refresh the session
          signOut();
          return;
        }
        throw new Error(errorData.error || "Failed to fetch contacts");
      }

      const data = await response.json();

      // Apply any existing edits to the contacts
      const contactsWithEdits = await applyEditsToContacts(data);
      setContacts(contactsWithEdits);

      // Cache the contacts and timestamp
      localStorage.setItem("rolodex-contacts", JSON.stringify(data));
      localStorage.setItem("rolodex-contacts-time", Date.now().toString());

      // Update last sync time
      const now = new Date().toLocaleTimeString();
      localStorage.setItem("rolodex-last-sync", now);

      console.log(`Cached ${data.length} contacts`);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      // Clear any cached data on error
      localStorage.removeItem("rolodex-contacts");
      localStorage.removeItem("rolodex-contacts-time");
    } finally {
      setLoading(false);
      setBackgroundSyncing(false);
    }
  };

  const handleContactClick = (contact: Contact) => {
    setSelectedContact(contact);
    setEditedContact({ ...contact });
    setEditingName(false);
    setEditingEmail(false);
    setLastSaveError(null);
    setIsSaving(false);
    setIsSheetOpen(true);
  };

  const saveContactDebounced = async (contact: Contact) => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    setLastSaveError(null);
    setIsSaving(true);

    const timeout = setTimeout(async () => {
      try {
        console.log("Saving contact:", contact.id, {
          name: contact.name,
          email: contact.email,
          company: contact.company,
          hidden: contact.hidden,
        });

        const response = await fetch(`/api/contacts/${contact.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: contact.name,
            email: contact.email,
            company: contact.company,
            hidden: contact.hidden,
          }),
        });

        console.log("Response status:", response.status);
        console.log("Response headers:", response.headers);

        if (!response.ok) {
          const responseText = await response.text();
          console.error("Error response text:", responseText);

          let errorData;
          try {
            errorData = JSON.parse(responseText);
          } catch (parseError) {
            console.error(
              "Failed to parse error response as JSON:",
              parseError
            );
            throw new Error(
              `Server error: ${response.status} - ${responseText}`
            );
          }

          throw new Error(errorData.error || "Failed to save contact");
        }

        // Parse the successful response
        const responseText = await response.text();
        console.log("Success response text:", responseText);

        let responseData;
        try {
          responseData = JSON.parse(responseText);
          console.log("Parsed response data:", responseData);
        } catch (parseError) {
          console.error(
            "Failed to parse success response as JSON:",
            parseError
          );
          // If we can't parse the response but the status is ok, assume success
          console.log("Assuming success despite parse error");
        }

        // Update the contact in the contacts array
        const updatedContacts = contacts.map((c) =>
          c.id === contact.id ? contact : c
        );
        setContacts(updatedContacts);

        console.log("Contact saved successfully");
      } catch (error) {
        console.error("Error saving contact:", error);
        setLastSaveError(
          error instanceof Error ? error.message : "Failed to save contact"
        );
      } finally {
        setIsSaving(false);
      }
    }, 300); // Reduced debounce time to 300ms for better UX

    setSaveTimeout(timeout);
  };

  const handleCloseSheet = () => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    setIsSheetOpen(false);
    setSelectedContact(null);
    setEditedContact(null);
    setEditingName(false);
    setEditingEmail(false);
    setSaveTimeout(null);
    setLastSaveError(null);
    setIsSaving(false);
  };

  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch =
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (contact.company || "").toLowerCase().includes(searchTerm.toLowerCase());

    const isVisible = showHidden || !contact.hidden;

    return matchesSearch && isVisible;
  });

  const filteredCompanies = groupContactsByCompany(filteredContacts).filter(
    (company) => {
      const matchesSearch = company.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const isVisible = showHidden || !company.hidden;

      return matchesSearch && isVisible;
    }
  );

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-medium">Rolodex</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to access your contacts
          </p>
          <Button onClick={() => signIn("google")} variant="outline">
            Sign in with Google
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      {backgroundSyncing && (
        <div className="fixed top-4 right-4 z-50 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm text-blue-800 shadow-sm">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-3 w-3 animate-spin" />
            <span>Updating contacts in background...</span>
          </div>
        </div>
      )}
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-6">
            <h1
              className={`text-2xl font-medium cursor-pointer transition-colors ${
                currentView === "contacts"
                  ? "text-foreground"
                  : "text-gray-400 hover:text-gray-600"
              }`}
              onClick={() => setCurrentView("contacts")}
            >
              {filteredContacts.length} Contacts
            </h1>
            <h1
              className={`text-2xl font-medium cursor-pointer transition-colors ${
                currentView === "companies"
                  ? "text-foreground"
                  : "text-gray-400 hover:text-gray-600"
              }`}
              onClick={() => setCurrentView("companies")}
            >
              {filteredCompanies.length} Companies
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative max-w-sm">
              <Input
                placeholder={
                  currentView === "contacts"
                    ? "Search contacts..."
                    : "Search companies..."
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 pr-8"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-8 w-8 p-0 hover:bg-transparent"
                  onClick={() => setSearchTerm("")}
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                </Button>
              )}
            </div>
            <Button
              onClick={() => setShowHidden(!showHidden)}
              variant={showHidden ? "default" : "outline"}
              size="sm"
              title={showHidden ? "Hide hidden rows" : "Show hidden rows"}
            >
              {showHidden ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
            <Button
              onClick={() => fetchContacts()}
              variant="outline"
              size="sm"
              disabled={loading || backgroundSyncing}
              className="relative"
            >
              <RefreshCw
                className={`h-4 w-4 ${backgroundSyncing ? "animate-spin" : ""}`}
              />
              {backgroundSyncing && (
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-blue-500 rounded-full animate-pulse"></span>
              )}
            </Button>
            <Button
              onClick={() => router.push("/settings")}
              variant="outline"
              size="sm"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="text-sm text-muted-foreground">
              Syncing contacts from Google...
            </div>
            <div className="text-xs text-gray-400 mt-2">
              Fetching recent emails and calendar events (5-10 seconds)
            </div>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            {currentView === "contacts" ? (
              <Table className="table-fixed w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead
                      onClick={() => handleSort("name")}
                      className="cursor-pointer hover:bg-muted/50 w-1/5"
                    >
                      Name {getSortIcon("name")}
                    </TableHead>
                    <TableHead
                      onClick={() => handleSort("email")}
                      className="cursor-pointer hover:bg-muted/50 w-2/5"
                    >
                      Email {getSortIcon("email")}
                    </TableHead>
                    <TableHead
                      onClick={() => handleSort("company")}
                      className="cursor-pointer hover:bg-muted/50 w-1/5"
                    >
                      Company {getSortIcon("company")}
                    </TableHead>
                    <TableHead className="w-12 text-center">Source</TableHead>
                    <TableHead
                      onClick={() => handleSort("lastContact")}
                      className="cursor-pointer hover:bg-muted/50 whitespace-nowrap w-1/5 text-right"
                    >
                      Last Contact {getSortIcon("lastContact")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortContacts(filteredContacts).map((contact) => (
                    <TableRow
                      key={contact.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleContactClick(contact)}
                    >
                      <TableCell className="font-medium truncate pr-4">
                        <span className="truncate">{contact.name}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground truncate pr-4">
                        {contact.email}
                      </TableCell>
                      <TableCell className="text-muted-foreground truncate pr-4">
                        <span className="truncate">
                          {contact.company || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          {contact.source === "Gmail" ? (
                            <img
                              src="/icons/gmail.png"
                              alt="Gmail"
                              className="h-4 w-4"
                            />
                          ) : contact.source === "Calendar" ? (
                            <img
                              src="/icons/calendar.png"
                              alt="Calendar"
                              className="h-4 w-4"
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap text-right">
                        <span className="text-sm">
                          {formatRelativeDate(contact.lastContact)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Table className="table-fixed w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead
                      onClick={() => handleSort("name")}
                      className="cursor-pointer hover:bg-muted/50 w-2/5"
                    >
                      Company {getSortIcon("name")}
                    </TableHead>
                    <TableHead
                      onClick={() => handleSort("company")}
                      className="cursor-pointer hover:bg-muted/50 w-1/5"
                    >
                      Contacts {getSortIcon("company")}
                    </TableHead>
                    <TableHead
                      onClick={() => handleSort("lastContact")}
                      className="cursor-pointer hover:bg-muted/50 whitespace-nowrap w-2/5 text-right"
                    >
                      Last Contact {getSortIcon("lastContact")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortCompanies(filteredCompanies).map((company) => (
                    <TableRow
                      key={company.name}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleCompanyClick(company)}
                    >
                      <TableCell className="font-medium truncate pr-4">
                        <span className="truncate">{company.name}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground truncate pr-4">
                        {company.contactCount} contact
                        {company.contactCount !== 1 ? "s" : ""}
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap text-right">
                        <span className="text-sm">
                          {formatRelativeDate(company.lastContact)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}
      </div>

      {/* Company Detail Sheet */}
      <Sheet open={isCompanySheetOpen} onOpenChange={setIsCompanySheetOpen}>
        <SheetContent className="w-[400px] sm:w-[500px] lg:w-[600px] max-w-[90vw] overflow-y-auto">
          {selectedCompany && (
            <>
              <SheetHeader className="space-y-3">
                <SheetTitle className="sr-only">Company Details</SheetTitle>

                {/* Save Status Indicator */}
                {(isSaving || lastSaveError) && (
                  <div className="flex items-center gap-2 text-sm">
                    {isSaving ? (
                      <div className="flex items-center gap-2 text-blue-600">
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                        <span>Saving...</span>
                      </div>
                    ) : lastSaveError ? (
                      <div className="flex items-center gap-2 text-red-600">
                        <span>⚠️ {lastSaveError}</span>
                      </div>
                    ) : null}
                  </div>
                )}

                <div className="space-y-1">
                  {editingCompanyName ? (
                    <Input
                      value={selectedCompany.name}
                      onChange={(e) =>
                        setSelectedCompany({
                          ...selectedCompany,
                          name: e.target.value,
                        })
                      }
                      onBlur={() => {
                        updateCompanyName(
                          originalCompanyName,
                          selectedCompany.name
                        );
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          updateCompanyName(
                            originalCompanyName,
                            selectedCompany.name
                          );
                        }
                      }}
                      className="text-lg font-semibold !border-0 !outline-0 border-none px-0 py-1 bg-transparent focus:ring-0 focus:border-none focus:outline-none focus:shadow-none focus:bg-transparent shadow-none h-auto min-h-0 rounded-none focus:ring-offset-0 focus:!border-0 focus:!outline-0"
                      placeholder="Company Name"
                      autoFocus
                    />
                  ) : (
                    <SheetTitle
                      className="text-lg font-semibold cursor-pointer"
                      onClick={() => {
                        setOriginalCompanyName(selectedCompany.name);
                        setEditingCompanyName(true);
                      }}
                    >
                      {selectedCompany.name}
                    </SheetTitle>
                  )}

                  {editingCompanyWebsite ? (
                    <Input
                      value={selectedCompany.website || ""}
                      onChange={(e) =>
                        setSelectedCompany({
                          ...selectedCompany,
                          website: e.target.value,
                        })
                      }
                      onBlur={() => {
                        updateCompanyWebsite(
                          selectedCompany.name,
                          selectedCompany.website || ""
                        );
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          updateCompanyWebsite(
                            selectedCompany.name,
                            selectedCompany.website || ""
                          );
                        }
                      }}
                      className="text-sm text-muted-foreground !border-0 !outline-0 border-none px-0 py-1 bg-transparent focus:ring-0 focus:border-none focus:outline-none focus:shadow-none focus:bg-transparent shadow-none h-auto min-h-0 rounded-none focus:ring-offset-0 focus:!border-0 focus:!outline-0"
                      placeholder="https://company.com"
                      autoFocus
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <div
                        className="text-sm text-muted-foreground cursor-pointer px-0 py-1 rounded flex-1"
                        onClick={() => setEditingCompanyWebsite(true)}
                      >
                        {selectedCompany.website || "https://company.com"}
                      </div>
                      {selectedCompany.website &&
                        selectedCompany.website !== "https://company.com" && (
                          <button
                            onClick={() =>
                              openWebsite(selectedCompany.website!)
                            }
                            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-muted"
                            title="Open website"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </button>
                        )}
                    </div>
                  )}
                </div>
              </SheetHeader>

              <div className="mt-6 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium text-muted-foreground">
                        Hide Company
                      </Label>
                    </div>
                    <Switch
                      checked={selectedCompany.hidden || false}
                      onCheckedChange={(checked) => {
                        updateCompanyHidden(selectedCompany.name, checked);
                      }}
                    />
                  </div>
                </div>

                <h3 className="font-medium text-sm text-muted-foreground">
                  Contacts
                </h3>
                <div className="space-y-2">
                  {selectedCompany.contacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => {
                        setSelectedCompany(null);
                        setIsCompanySheetOpen(false);
                        handleContactClick(contact);
                      }}
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {contact.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {contact.email}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatRelativeDate(contact.lastContact)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Contact Edit Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-[400px] sm:w-[500px] lg:w-[600px] max-w-[90vw] overflow-y-auto">
          {editedContact && (
            <>
              <SheetHeader className="space-y-3">
                <SheetTitle className="sr-only">Edit Contact</SheetTitle>

                <div className="space-y-1">
                  {editingName ? (
                    <Input
                      value={editedContact.name}
                      onChange={(e) => {
                        const updatedContact = {
                          ...editedContact,
                          name: e.target.value,
                        };
                        setEditedContact(updatedContact);
                      }}
                      onBlur={() => {
                        saveContactDebounced(editedContact);
                        setEditingName(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          saveContactDebounced(editedContact);
                          setEditingName(false);
                        }
                      }}
                      className="text-lg font-semibold !border-0 !outline-0 border-none px-0 py-1 bg-transparent focus:ring-0 focus:border-none focus:outline-none focus:shadow-none focus:bg-transparent shadow-none h-auto min-h-0 rounded-none focus:ring-offset-0 focus:!border-0 focus:!outline-0"
                      placeholder="Contact Name"
                      autoFocus
                    />
                  ) : (
                    <h1
                      className="text-lg font-semibold cursor-pointer px-0 py-1 rounded"
                      onClick={() => setEditingName(true)}
                    >
                      {editedContact.name || "Contact Name"}
                    </h1>
                  )}

                  {editingEmail ? (
                    <Input
                      value={editedContact.email}
                      onChange={(e) => {
                        const updatedContact = {
                          ...editedContact,
                          email: e.target.value,
                        };
                        setEditedContact(updatedContact);
                      }}
                      onBlur={() => {
                        saveContactDebounced(editedContact);
                        setEditingEmail(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          saveContactDebounced(editedContact);
                          setEditingEmail(false);
                        }
                      }}
                      className="text-sm text-muted-foreground !border-0 !outline-0 border-none px-0 py-1 bg-transparent focus:ring-0 focus:border-none focus:outline-none focus:shadow-none focus:bg-transparent shadow-none h-auto min-h-0 rounded-none focus:ring-offset-0 focus:!border-0 focus:!outline-0"
                      placeholder="email@example.com"
                      autoFocus
                    />
                  ) : (
                    <div
                      className="text-sm text-muted-foreground cursor-pointer px-0 py-1 rounded"
                      onClick={() => setEditingEmail(true)}
                    >
                      {editedContact.email || "email@example.com"}
                    </div>
                  )}
                </div>
              </SheetHeader>

              <div className="grid gap-6 py-6">
                <div className="space-y-2">
                  <Label htmlFor="company" className="text-sm font-medium">
                    Company
                  </Label>
                  <Input
                    id="company"
                    value={editedContact.company || ""}
                    onChange={(e) => {
                      const updatedContact = {
                        ...editedContact,
                        company: e.target.value,
                      };
                      setEditedContact(updatedContact);
                    }}
                    onBlur={() => {
                      saveContactDebounced(editedContact);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        saveContactDebounced(editedContact);
                      }
                    }}
                    placeholder="Company name"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">
                        Hide Contact
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Contact will not appear in the table
                      </p>
                    </div>
                    <Switch
                      checked={editedContact.hidden || false}
                      onCheckedChange={(checked) => {
                        const updatedContact = {
                          ...editedContact,
                          hidden: checked,
                        };
                        setEditedContact(updatedContact);
                        saveContactDebounced(updatedContact);
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Last Contact</Label>
                  <div className="space-y-2">
                    {(editedContact.lastEmailSubject ||
                      editedContact.lastMeetingName) && (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <div className="bg-muted/50 border border-input rounded-md px-3 py-2 text-sm space-y-2 overflow-hidden relative">
                            <div className="absolute top-2 right-2">
                              {editedContact.source === "Gmail" ? (
                                <button
                                  onClick={() => openGmail(editedContact)}
                                  className="hover:bg-muted/50 p-1 rounded transition-colors"
                                  title="Open in Gmail"
                                >
                                  <img
                                    src="/icons/gmail.png"
                                    alt="Gmail"
                                    className="h-4 w-4"
                                  />
                                </button>
                              ) : editedContact.source === "Calendar" ? (
                                <button
                                  onClick={() => openCalendar(editedContact)}
                                  className="hover:bg-muted/50 p-1 rounded transition-colors"
                                  title="Open in Google Calendar"
                                >
                                  <img
                                    src="/icons/calendar.png"
                                    alt="Calendar"
                                    className="h-4 w-4"
                                  />
                                </button>
                              ) : (
                                <div className="h-4 w-4 bg-muted-foreground rounded-full" />
                              )}
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {formatRegularDate(editedContact.lastContact)}
                            </div>
                            <div className="font-medium">
                              <RichText
                                content={
                                  editedContact.lastEmailSubject ||
                                  editedContact.lastMeetingName ||
                                  ""
                                }
                                className="prose-sm font-medium"
                              />
                            </div>
                            {editedContact.lastEmailPreview && (
                              <div className="text-foreground max-w-full overflow-hidden">
                                <EmailText
                                  content={editedContact.lastEmailPreview}
                                  className="max-w-none"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Save Status Indicator - Bottom of Sheet */}
              {(isSaving || lastSaveError) && (
                <div className="flex items-center justify-center gap-2 text-sm p-4 border-t bg-muted/20">
                  {isSaving ? (
                    <div className="flex items-center gap-2 text-blue-600">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                      <span>Saving...</span>
                    </div>
                  ) : lastSaveError ? (
                    <div className="flex items-center gap-2 text-red-600">
                      <span>⚠️ {lastSaveError}</span>
                    </div>
                  ) : null}
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
