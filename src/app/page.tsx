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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ExternalLink, Plus, Edit, Palette, Pencil } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RichText } from "@/components/RichText";
import { EmailText } from "@/components/EmailText";
import { ContactAvatar } from "@/components/ContactAvatar";

// Import our new components and hooks
import TagInput from "@/components/TagInput";
import TagDisplay from "@/components/TagDisplay";
import KanbanBoard from "@/components/KanbanBoard";
import ContactDetailSheet from "@/components/ContactDetailSheet";
import CompanyDetailSheet from "@/components/CompanyDetailSheet";
import HeaderControls from "@/components/HeaderControls";
import { useContacts } from "@/hooks/useContacts";
import { useFilters } from "@/hooks/useFilters";
import { groupContactsByCompany } from "@/lib/contacts";
import {
  formatRelativeDate,
  formatRegularDate,
  openWebsite,
  openGmail,
  openCalendar,
  getTagColor,
  TAG_COLORS,
} from "@/lib/utils";
import {
  Contact,
  Company,
  SortField,
  SortDirection,
  View,
  ViewType,
} from "@/types";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Use our custom hooks
  const {
    contacts,
    setContacts,
    loading,
    backgroundSyncing,
    freshDataLoaded,
    fetchContacts,
    loadContacts,
    clearContactsCache,
  } = useContacts();

  const {
    searchTerm,
    setSearchTerm,
    sortField,
    sortDirection,
    currentView,
    viewType,
    showHidden,
    setShowHidden,
    showStarred,
    setShowStarred,
    showGmail,
    setShowGmail,
    showCalendar,
    setShowCalendar,
    selectedTags,
    setSelectedTags,
    allTags,
    customTagColors,
    columnOrder,
    handleSort,
    getSortIcon,
    sortContacts,
    sortCompanies,
    filterContacts,
    filterCompanies,
    updateAllTags,
    saveCustomTagColors,
    saveViewType,
    saveCurrentView,
    saveColumnOrder,
  } = useFilters();

  // Contact sheet state
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editedContact, setEditedContact] = useState<Contact | null>(null);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaveError, setLastSaveError] = useState<string | null>(null);

  // Company sheet state
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isCompanySheetOpen, setIsCompanySheetOpen] = useState(false);
  const [editingCompanyName, setEditingCompanyName] = useState(false);
  const [editingCompanyWebsite, setEditingCompanyWebsite] = useState(false);
  const [originalCompanyName, setOriginalCompanyName] = useState("");

  // Tag management state
  const [editingTag, setEditingTag] = useState<{
    oldName: string;
    newName: string;
    color?: { bg: string; text: string; border: string };
  } | null>(null);
  const [showTagManager, setShowTagManager] = useState(false);

  // Update all tags when contacts change
  useEffect(() => {
    if (contacts.length > 0) {
      updateAllTags(contacts);
    }
  }, [contacts, updateAllTags]);

  // Contact handlers
  const handleContactClick = (contact: Contact) => {
    setSelectedContact(contact);
    setEditedContact({ ...contact });
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
        const response = await fetch(`/api/contacts/${contact.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: contact.name,
            email: contact.email,
            company: contact.company || "",
            hidden: contact.hidden || false,
            starred: contact.starred || false,
            tags: contact.tags || [],
            photoUrl: contact.photoUrl,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to save contact");
        }

        // Update the contact in the contacts array
        const updatedContacts = contacts.map((c) =>
          c.id === contact.id
            ? {
                ...contact,
                lastContact: c.lastContact,
                source: c.source,
                lastEmailSubject: c.lastEmailSubject,
                lastEmailPreview: c.lastEmailPreview,
                lastMeetingName: c.lastMeetingName,
                photoUrl: contact.photoUrl,
              }
            : c
        );
        setContacts(updatedContacts);
      } catch (error) {
        console.error("Error saving contact:", error);
        setLastSaveError(
          error instanceof Error ? error.message : "Failed to save contact"
        );
      } finally {
        setIsSaving(false);
      }
    }, 300);

    setSaveTimeout(timeout);
  };

  const handleCloseSheet = () => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    setIsSheetOpen(false);
    setSelectedContact(null);
    setEditedContact(null);
    setSaveTimeout(null);
    setLastSaveError(null);
    setIsSaving(false);
  };

  // Company handlers
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

  // Card move handler
  const handleCardMove = async (
    item: Contact | Company,
    sourceTag: string,
    targetTag: string,
    itemType: "contact" | "company"
  ) => {
    if (sourceTag === targetTag) return;

    setLastSaveError(null);
    setIsSaving(true);

    try {
      if (itemType === "contact") {
        const contact = item as Contact;
        let newTags = contact.tags || [];

        if (targetTag === "No Tags") {
          newTags = [];
        } else if (sourceTag === "No Tags") {
          newTags = [targetTag];
        } else {
          newTags = newTags.map((tag) => (tag === sourceTag ? targetTag : tag));
          if (!contact.tags?.includes(sourceTag)) {
            newTags = [...newTags, targetTag];
          }
        }

        const updatedContact = { ...contact, tags: newTags };
        const updatedContacts = contacts.map((c) =>
          c.id === contact.id ? updatedContact : c
        );
        setContacts(updatedContacts);

        const response = await fetch(`/api/contacts/${contact.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: contact.name,
            email: contact.email,
            company: contact.company,
            hidden: contact.hidden,
            starred: contact.starred,
            tags: newTags,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update contact");
        }
      } else {
        // Handle company moves
        const company = item as Company;
        const companyContacts = contacts.filter(
          (c) => c.company === company.name
        );

        for (const contact of companyContacts) {
          let newTags = contact.tags || [];

          if (targetTag === "No Tags") {
            newTags = [];
          } else if (sourceTag === "No Tags") {
            newTags = [targetTag];
          } else {
            newTags = newTags.map((tag) =>
              tag === sourceTag ? targetTag : tag
            );
            if (!contact.tags?.includes(sourceTag)) {
              newTags = [...newTags, targetTag];
            }
          }

          const response = await fetch(`/api/contacts/${contact.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: contact.name,
              email: contact.email,
              company: contact.company,
              hidden: contact.hidden,
              starred: contact.starred,
              tags: newTags,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to update contact");
          }
        }

        // Update local state for all company contacts
        const updatedContacts = contacts.map((contact) => {
          if (contact.company === company.name) {
            let newTags = contact.tags || [];

            if (targetTag === "No Tags") {
              newTags = [];
            } else if (sourceTag === "No Tags") {
              newTags = [targetTag];
            } else {
              newTags = newTags.map((tag) =>
                tag === sourceTag ? targetTag : tag
              );
              if (!contact.tags?.includes(sourceTag)) {
                newTags = [...newTags, targetTag];
              }
            }

            return { ...contact, tags: newTags };
          }
          return contact;
        });
        setContacts(updatedContacts);
      }
    } catch (error) {
      console.error("Error moving card:", error);
      setLastSaveError(
        error instanceof Error ? error.message : "Failed to move card"
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Filter and sort data
  const filteredContacts = filterContacts(contacts);
  const filteredCompanies = filterCompanies(
    groupContactsByCompany(filteredContacts)
  );
  const sortedContacts = sortContacts(filteredContacts);
  const sortedCompanies = sortCompanies(filteredCompanies);

  // Loading states
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

  if (session && contacts.length === 0 && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <div className="text-sm text-muted-foreground">
            {backgroundSyncing
              ? "Syncing contacts from Google..."
              : "Loading contacts..."}
          </div>
          <div className="text-xs text-gray-400 mt-2">
            {backgroundSyncing
              ? "This may take a couple minutes"
              : "If this takes too long, try refreshing the page"}
          </div>
          <button
            onClick={() => {
              clearContactsCache();
              window.location.reload();
            }}
            className="text-xs text-blue-500 hover:text-blue-700 underline"
          >
            Clear cache and retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="">
        <HeaderControls
          currentView={currentView}
          viewType={viewType}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          saveCurrentView={saveCurrentView}
          saveViewType={saveViewType}
          showGmail={showGmail}
          setShowGmail={setShowGmail}
          showCalendar={showCalendar}
          setShowCalendar={setShowCalendar}
          showStarred={showStarred}
          setShowStarred={setShowStarred}
          showHidden={showHidden}
          setShowHidden={setShowHidden}
          selectedTags={selectedTags}
          setSelectedTags={setSelectedTags}
          allTags={allTags}
          customTagColors={customTagColors}
          filteredContacts={filteredContacts}
          filteredCompanies={filteredCompanies}
          loading={loading}
          backgroundSyncing={backgroundSyncing}
          fetchContacts={fetchContacts}
          onSettingsClick={() => router.push("/settings")}
        />

        {loading ? (
          <div className="text-center py-8 px-8">
            <div className="text-sm text-muted-foreground">
              Loading contacts...
            </div>
            <div className="text-xs text-gray-400 mt-2">
              {backgroundSyncing
                ? "Syncing from Google (this may take a couple minutes)"
                : "This may take a couple minutes"}
            </div>
          </div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-8 px-8">
            <div className="text-sm text-muted-foreground">
              No contacts found
            </div>
            <div className="text-xs text-gray-400 mt-2">
              {backgroundSyncing
                ? "Syncing from Google..."
                : "Click the refresh button to sync contacts from Gmail and Calendar"}
            </div>
            <div className="mt-4 space-y-2">
              <button
                onClick={() => fetchContacts(false)}
                className="bg-blue-500 text-white px-4 py-2 rounded text-sm"
                disabled={loading || backgroundSyncing}
              >
                {loading ? "Loading..." : "Try Again"}
              </button>
              <button
                onClick={() => {
                  clearContactsCache();
                  window.location.reload();
                }}
                className="block mx-auto text-xs text-gray-500 hover:text-gray-700 underline"
              >
                Clear cache and retry
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full">
            {viewType === "kanban" ? (
              <div className="overflow-x-auto pl-8">
                {currentView === "contacts" ? (
                  <KanbanBoard
                    items={sortedContacts}
                    type="contact"
                    customColors={customTagColors}
                    allTags={allTags}
                    columnOrder={columnOrder}
                    selectedTags={selectedTags}
                    onContactClick={handleContactClick}
                    onCompanyClick={handleCompanyClick}
                    onColumnReorder={saveColumnOrder}
                    onCardMove={handleCardMove}
                  />
                ) : (
                  <KanbanBoard
                    items={sortedCompanies}
                    type="company"
                    customColors={customTagColors}
                    allTags={allTags}
                    columnOrder={columnOrder}
                    selectedTags={selectedTags}
                    onContactClick={handleContactClick}
                    onCompanyClick={handleCompanyClick}
                    onColumnReorder={saveColumnOrder}
                    onCardMove={handleCardMove}
                  />
                )}
              </div>
            ) : currentView === "contacts" ? (
              <div className="overflow-x-auto px-8">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center"></TableHead>
                      <TableHead
                        onClick={() => handleSort("name")}
                        className="cursor-pointer hover:bg-muted/50 max-w-32"
                      >
                        Name {getSortIcon("name")}
                      </TableHead>
                      <TableHead
                        onClick={() => handleSort("email")}
                        className="cursor-pointer hover:bg-muted/50 max-w-48"
                      >
                        Email {getSortIcon("email")}
                      </TableHead>
                      <TableHead
                        onClick={() => handleSort("company")}
                        className="cursor-pointer hover:bg-muted/50 min-w-8"
                      >
                        Company {getSortIcon("company")}
                      </TableHead>
                      <TableHead
                        onClick={() => handleSort("tags")}
                        className="cursor-pointer hover:bg-muted/50 min-w-8"
                      >
                        Tags {getSortIcon("tags")}
                      </TableHead>
                      <TableHead className="w-12 text-center">Source</TableHead>
                      <TableHead
                        onClick={() => handleSort("lastContact")}
                        className="cursor-pointer hover:bg-muted/50 whitespace-nowrap min-w-8 text-right"
                      >
                        Last Contact {getSortIcon("lastContact")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedContacts.map((contact) => (
                      <TableRow
                        key={contact.id}
                        className="cursor-pointer hover:bg-muted/50"
                      >
                        <TableCell className="text-center">
                          <ContactAvatar
                            contact={contact}
                            size="sm"
                            className="mx-auto"
                          />
                        </TableCell>
                        <TableCell
                          className="font-medium truncate max-w-32"
                          onClick={() => handleContactClick(contact)}
                        >
                          <span className="truncate">{contact.name}</span>
                        </TableCell>
                        <TableCell
                          className="text-muted-foreground truncate max-w-48"
                          onClick={() => handleContactClick(contact)}
                        >
                          {contact.email}
                        </TableCell>
                        <TableCell
                          className="text-muted-foreground truncate max-w-32"
                          onClick={() => handleContactClick(contact)}
                        >
                          <span className="truncate">
                            {contact.company || "—"}
                          </span>
                        </TableCell>
                        <TableCell
                          className="max-w-32"
                          onClick={() => handleContactClick(contact)}
                        >
                          <TagDisplay
                            tags={contact.tags || []}
                            maxDisplay={2}
                            customColors={customTagColors}
                          />
                        </TableCell>
                        <TableCell
                          className="text-center"
                          onClick={() => handleContactClick(contact)}
                        >
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
                        <TableCell
                          className="text-muted-foreground whitespace-nowrap text-right"
                          onClick={() => handleContactClick(contact)}
                        >
                          <span className="text-sm">
                            {formatRelativeDate(contact.lastContact)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="overflow-x-auto px-8">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        onClick={() => handleSort("name")}
                        className="cursor-pointer hover:bg-muted/50 min-w-48"
                      >
                        Company {getSortIcon("name")}
                      </TableHead>
                      <TableHead
                        onClick={() => handleSort("company")}
                        className="cursor-pointer hover:bg-muted/50 min-w-24"
                      >
                        Contact {getSortIcon("company")}
                      </TableHead>
                      <TableHead
                        onClick={() => handleSort("tags")}
                        className="cursor-pointer hover:bg-muted/50 min-w-40"
                      >
                        Tags {getSortIcon("tags")}
                      </TableHead>
                      <TableHead
                        onClick={() => handleSort("lastContact")}
                        className="cursor-pointer hover:bg-muted/50 whitespace-nowrap min-w-32 text-right"
                      >
                        Last Contact {getSortIcon("lastContact")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedCompanies.map((company) => (
                      <TableRow
                        key={company.name}
                        className="cursor-pointer hover:bg-muted/50"
                      >
                        <TableCell
                          className="font-medium truncate pr-4"
                          onClick={() => handleCompanyClick(company)}
                        >
                          <span className="truncate">{company.name}</span>
                        </TableCell>
                        <TableCell
                          className="text-muted-foreground truncate pr-4"
                          onClick={() => handleCompanyClick(company)}
                        >
                          {(() => {
                            // Sort contacts by most recent contact date
                            const sortedContacts = [...company.contacts].sort(
                              (a, b) => {
                                if (
                                  a.lastContact === "Unknown" &&
                                  b.lastContact === "Unknown"
                                )
                                  return 0;
                                if (a.lastContact === "Unknown") return 1;
                                if (b.lastContact === "Unknown") return -1;
                                return (
                                  new Date(b.lastContact).getTime() -
                                  new Date(a.lastContact).getTime()
                                );
                              }
                            );

                            const mostRecentContact = sortedContacts[0];
                            const remainingCount = company.contactCount - 1;

                            if (company.contactCount === 1) {
                              return mostRecentContact.name;
                            } else {
                              return `${
                                mostRecentContact.name
                              } + ${remainingCount} other${
                                remainingCount === 1 ? "" : "s"
                              }`;
                            }
                          })()}
                        </TableCell>
                        <TableCell
                          className="pr-4"
                          onClick={() => handleCompanyClick(company)}
                        >
                          <TagDisplay
                            tags={company.tags || []}
                            maxDisplay={3}
                            customColors={customTagColors}
                          />
                        </TableCell>
                        <TableCell
                          className="text-muted-foreground whitespace-nowrap text-right"
                          onClick={() => handleCompanyClick(company)}
                        >
                          <span className="text-sm">
                            {formatRelativeDate(company.lastContact)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Contact Detail Sheet */}
      <ContactDetailSheet
        selectedContact={selectedContact}
        editedContact={editedContact}
        isSheetOpen={isSheetOpen}
        onSheetOpenChange={setIsSheetOpen}
        onContactUpdate={saveContactDebounced}
        allTags={allTags}
        customTagColors={customTagColors}
        isSaving={isSaving}
        lastSaveError={lastSaveError}
      />

      {/* Company Detail Sheet */}
      <CompanyDetailSheet
        selectedCompany={selectedCompany}
        isSheetOpen={isCompanySheetOpen}
        onSheetOpenChange={setIsCompanySheetOpen}
        onCompanyUpdate={(updatedCompany) => {
          // Update all contacts in the company
          const updatedContacts = contacts.map((contact) =>
            contact.company === updatedCompany.name
              ? {
                  ...contact,
                  tags: updatedCompany.tags,
                  hidden: updatedCompany.hidden,
                  starred: updatedCompany.starred,
                }
              : contact
          );
          setContacts(updatedContacts);
        }}
        onContactClick={handleContactClick}
        allTags={allTags}
        customTagColors={customTagColors}
      />
    </div>
  );
}
