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
import {
  Settings,
  RefreshCw,
  ExternalLink,
  Eye,
  EyeOff,
  X,
  SlidersHorizontal,
  Check,
  Star,
  Tag,
  Plus,
  Edit,
  Palette,
  Pencil,
  TableProperties,
  LayoutGrid,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RichText } from "@/components/RichText";
import { EmailText } from "@/components/EmailText";
import { ContactAvatar } from "@/components/ContactAvatar";

// Import our new components and hooks
import TagInput from "@/components/TagInput";
import TagDisplay from "@/components/TagDisplay";
import KanbanBoard from "@/components/KanbanBoard";
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
  const [editingName, setEditingName] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [editingCompany, setEditingCompany] = useState(false);
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
    setEditingName(false);
    setEditingEmail(false);
    setEditingCompany(false);
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

  if (session && contacts.length === 0) {
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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 px-8">
          <div className="flex items-center gap-4">
            {/* Fresh data indicator */}
            {freshDataLoaded && (
              <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-md border border-green-200">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                Fresh data loaded
              </div>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-auto p-0 text-2xl font-medium hover:bg-transparent"
                >
                  {currentView === "contacts"
                    ? `${filteredContacts.length} Contacts`
                    : `${filteredCompanies.length} Companies`}
                  <svg
                    className="ml-1 h-5 w-5 text-muted-foreground"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem
                  onClick={() => saveCurrentView("contacts")}
                  className={`cursor-pointer ${
                    currentView === "contacts" ? "bg-muted" : ""
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span>Contacts</span>
                    {currentView === "contacts" && (
                      <Check className="h-4 w-4" />
                    )}
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => saveCurrentView("companies")}
                  className={`cursor-pointer ${
                    currentView === "companies" ? "bg-muted" : ""
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span>Companies</span>
                    {currentView === "companies" && (
                      <Check className="h-4 w-4" />
                    )}
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-0">
              <Input
                placeholder={currentView === "contacts" ? "Search" : "Search"}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 pr-8 text-sm md:text-sm"
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
            {/* View Type Toggle */}
            <div className="flex items-center gap-0.5 bg-muted p-0.5 rounded-lg h-8">
              <button
                onClick={() => saveViewType("table")}
                className={`px-2 py-1 transition-colors h-7 flex items-center ${
                  viewType === "table"
                    ? "bg-background text-foreground shadow-sm rounded-md"
                    : "text-muted-foreground hover:text-foreground rounded"
                }`}
                title="Table view"
              >
                <TableProperties className="h-3 w-3" />
              </button>
              <button
                onClick={() => saveViewType("kanban")}
                className={`px-2 py-1 transition-colors h-7 flex items-center ${
                  viewType === "kanban"
                    ? "bg-background text-foreground shadow-sm rounded-md"
                    : "text-muted-foreground hover:text-foreground rounded"
                }`}
                title="Kanban view"
              >
                <LayoutGrid className="h-3 w-3" />
              </button>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={`relative ${
                    !showGmail ||
                    !showCalendar ||
                    showHidden ||
                    showStarred ||
                    selectedTags.length > 0
                      ? "border-blue-500 bg-blue-50 hover:bg-blue-100"
                      : ""
                  }`}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  {(!showGmail ||
                    !showCalendar ||
                    showHidden ||
                    showStarred ||
                    selectedTags.length > 0) && (
                    <span className="absolute -top-1 -right-1 h-2 w-2 bg-blue-500 rounded-full"></span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                {/* Tag filter section */}
                {allTags.length > 0 && (
                  <>
                    <DropdownMenuLabel className="flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      Filter by tags
                      {selectedTags.length > 0 && (
                        <button
                          onClick={() => setSelectedTags([])}
                          className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                        >
                          Clear all
                        </button>
                      )}
                    </DropdownMenuLabel>
                    <div className="py-1 max-h-32 overflow-y-auto">
                      <div className="space-y-1">
                        {allTags.slice(0, 8).map((tag) => {
                          const colors = getTagColor(tag, customTagColors);
                          return (
                            <DropdownMenuItem
                              key={tag}
                              onSelect={(e) => e.preventDefault()}
                              onClick={() => {
                                if (selectedTags.includes(tag)) {
                                  setSelectedTags(
                                    selectedTags.filter((t) => t !== tag)
                                  );
                                } else {
                                  setSelectedTags([...selectedTags, tag]);
                                }
                              }}
                              className="flex items-center gap-2 cursor-pointer text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className={`flex items-center justify-center w-4 h-4 rounded-sm border-2 ${
                                    selectedTags.includes(tag)
                                      ? "bg-primary border-primary"
                                      : "border-muted-foreground/30"
                                  }`}
                                >
                                  {selectedTags.includes(tag) && (
                                    <Check className="h-3 w-3 text-primary-foreground" />
                                  )}
                                </div>
                                <span
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded ${colors.bg} ${colors.text}`}
                                >
                                  <span className="truncate">{tag}</span>
                                </span>
                              </div>
                            </DropdownMenuItem>
                          );
                        })}

                        {/* No Tags option */}
                        <DropdownMenuItem
                          onSelect={(e) => e.preventDefault()}
                          onClick={() => {
                            const noTagsFilter = "No Tags";
                            if (selectedTags.includes(noTagsFilter)) {
                              setSelectedTags(
                                selectedTags.filter((t) => t !== noTagsFilter)
                              );
                            } else {
                              setSelectedTags([...selectedTags, noTagsFilter]);
                            }
                          }}
                          className="flex items-center gap-2 cursor-pointer text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`flex items-center justify-center w-4 h-4 rounded-sm border-2 ${
                                selectedTags.includes("No Tags")
                                  ? "bg-primary border-primary"
                                  : "border-muted-foreground/30"
                              }`}
                            >
                              {selectedTags.includes("No Tags") && (
                                <Check className="h-3 w-3 text-primary-foreground" />
                              )}
                            </div>
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded bg-gray-100 text-gray-800">
                              <span className="truncate">No Tags</span>
                            </span>
                          </div>
                        </DropdownMenuItem>
                        {allTags.length > 8 && (
                          <div className="text-xs text-muted-foreground px-2 py-1">
                            +{allTags.length - 8} more tags available
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  onClick={() => setShowGmail(!showGmail)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <img src="/icons/gmail.png" alt="Gmail" className="h-4 w-4" />
                  <span>Gmail</span>
                  {showGmail && <Check className="h-4 w-4 ml-auto" />}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  onClick={() => setShowCalendar(!showCalendar)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <img
                    src="/icons/calendar.png"
                    alt="Calendar"
                    className="h-4 w-4"
                  />
                  <span>Calendar</span>
                  {showCalendar && <Check className="h-4 w-4 ml-auto" />}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  onClick={() => setShowStarred(!showStarred)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Star className="h-4 w-4" />
                  <span>Starred</span>
                  {showStarred && <Check className="h-4 w-4 ml-auto" />}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  onClick={() => setShowHidden(!showHidden)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  {showHidden ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  <span>Hidden</span>
                  {showHidden && <Check className="h-4 w-4 ml-auto" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                fetchContacts(true);
              }}
              variant="outline"
              size="sm"
              disabled={loading || backgroundSyncing}
              type="button"
            >
              <RefreshCw
                className={`h-4 w-4 ${backgroundSyncing ? "animate-spin" : ""}`}
              />
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
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          {selectedContact && editedContact && (
            <div className="space-y-6">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-3">
                  <ContactAvatar contact={selectedContact} size="lg" />
                  <div className="flex-1 min-w-0">
                    {editingName ? (
                      <Input
                        value={editedContact.name}
                        onChange={(e) => {
                          setEditedContact({
                            ...editedContact,
                            name: e.target.value,
                          });
                          saveContactDebounced({
                            ...editedContact,
                            name: e.target.value,
                          });
                        }}
                        onBlur={() => setEditingName(false)}
                        className="text-lg font-semibold"
                        autoFocus
                      />
                    ) : (
                      <button
                        onClick={() => setEditingName(true)}
                        className="text-lg font-semibold px-2 py-1 rounded -ml-2 text-left w-full"
                      >
                        {editedContact.name}
                      </button>
                    )}
                    <div>
                      {editingEmail ? (
                        <Input
                          value={editedContact.email}
                          onChange={(e) => {
                            setEditedContact({
                              ...editedContact,
                              email: e.target.value,
                            });
                            saveContactDebounced({
                              ...editedContact,
                              email: e.target.value,
                            });
                          }}
                          onBlur={() => setEditingEmail(false)}
                          className="text-sm"
                          autoFocus
                        />
                      ) : (
                        <button
                          onClick={() => setEditingEmail(true)}
                          className="text-sm text-muted-foreground font-normal px-2 py-1 rounded -ml-2"
                        >
                          {editedContact.email}
                        </button>
                      )}
                    </div>
                  </div>
                </SheetTitle>
              </SheetHeader>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditedContact({
                      ...editedContact,
                      starred: !editedContact.starred,
                    });
                    saveContactDebounced({
                      ...editedContact,
                      starred: !editedContact.starred,
                    });
                  }}
                  className="flex-1"
                >
                  <Star className="h-4 w-4 mr-2" />
                  {editedContact.starred ? "Unstar" : "Star"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditedContact({
                      ...editedContact,
                      hidden: !editedContact.hidden,
                    });
                    saveContactDebounced({
                      ...editedContact,
                      hidden: !editedContact.hidden,
                    });
                  }}
                  className="flex-1"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {editedContact.hidden ? "Show" : "Hide"}
                </Button>
              </div>

              {/* Contact Details */}
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Company</Label>
                  <div className="mt-2 relative">
                    <Input
                      value={editedContact.company || ""}
                      onChange={(e) => {
                        setEditedContact({
                          ...editedContact,
                          company: e.target.value,
                        });
                        saveContactDebounced({
                          ...editedContact,
                          company: e.target.value,
                        });
                      }}
                      placeholder="Enter company name..."
                      className="text-sm pr-8"
                    />
                    {editedContact.company && (
                      <button
                        onClick={() => {
                          setEditedContact({
                            ...editedContact,
                            company: "",
                          });
                          saveContactDebounced({
                            ...editedContact,
                            company: "",
                          });
                        }}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Tags</Label>
                  <div className="mt-2">
                    <TagInput
                      tags={editedContact.tags || []}
                      onTagsChange={(tags) => {
                        setEditedContact({
                          ...editedContact,
                          tags: tags,
                        });
                        saveContactDebounced({
                          ...editedContact,
                          tags: tags,
                        });
                      }}
                      suggestions={allTags}
                      customColors={customTagColors}
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Last Contact</Label>
                  <div className="mt-2 p-3 bg-muted/50 rounded-md border">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {formatRegularDate(selectedContact.lastContact)}
                      </span>
                      <div className="flex items-center gap-2">
                        {selectedContact.lastEmailSubject && (
                          <button
                            onClick={() => openGmail(selectedContact)}
                            className="hover:opacity-70"
                          >
                            <img
                              src="/icons/gmail.png"
                              alt="Gmail"
                              className="h-4 w-4"
                            />
                          </button>
                        )}
                        {selectedContact.lastMeetingName && (
                          <button
                            onClick={() => openCalendar(selectedContact)}
                            className="hover:opacity-70"
                          >
                            <img
                              src="/icons/calendar.png"
                              alt="Calendar"
                              className="h-4 w-4"
                            />
                          </button>
                        )}
                      </div>
                    </div>
                    {selectedContact.lastEmailSubject && (
                      <div className="text-sm font-medium mt-2">
                        {selectedContact.lastEmailSubject}
                      </div>
                    )}
                    {selectedContact.lastEmailPreview && (
                      <div className="text-sm text-muted-foreground mt-3">
                        <EmailText content={selectedContact.lastEmailPreview} />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Save Status */}
              {isSaving && (
                <div className="text-sm text-blue-600">Saving changes...</div>
              )}
              {lastSaveError && (
                <div className="text-sm text-red-600">
                  Error: {lastSaveError}
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Company Detail Sheet */}
      <Sheet open={isCompanySheetOpen} onOpenChange={setIsCompanySheetOpen}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          {selectedCompany && (
            <div className="space-y-6">
              <SheetHeader>
                <SheetTitle className="text-lg font-semibold">
                  {selectedCompany.name}
                </SheetTitle>
                <SheetDescription>
                  {selectedCompany.contactCount} contact
                  {selectedCompany.contactCount !== 1 ? "s" : ""}
                </SheetDescription>
              </SheetHeader>

              {/* Company Details */}
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Last Contact</Label>
                  <div className="text-sm text-muted-foreground mt-1">
                    {formatRegularDate(selectedCompany.lastContact)}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Tags</Label>
                  <div className="mt-2">
                    <TagInput
                      tags={selectedCompany.tags || []}
                      onTagsChange={(tags) => {
                        // Update all contacts in the company
                        const updatedContacts = contacts.map((contact) =>
                          contact.company === selectedCompany.name
                            ? { ...contact, tags: tags }
                            : contact
                        );
                        setContacts(updatedContacts);
                      }}
                      suggestions={allTags}
                      customColors={customTagColors}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="company-hidden"
                      checked={selectedCompany.hidden || false}
                      onCheckedChange={(checked) => {
                        // Update all contacts in the company
                        const updatedContacts = contacts.map((contact) =>
                          contact.company === selectedCompany.name
                            ? { ...contact, hidden: checked }
                            : contact
                        );
                        setContacts(updatedContacts);
                      }}
                    />
                    <Label htmlFor="company-hidden" className="text-sm">
                      Hidden
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="company-starred"
                      checked={selectedCompany.starred || false}
                      onCheckedChange={(checked) => {
                        // Update all contacts in the company
                        const updatedContacts = contacts.map((contact) =>
                          contact.company === selectedCompany.name
                            ? { ...contact, starred: checked }
                            : contact
                        );
                        setContacts(updatedContacts);
                      }}
                    />
                    <Label htmlFor="company-starred" className="text-sm">
                      Starred
                    </Label>
                  </div>
                </div>
              </div>

              {/* Company Contacts */}
              <div>
                <Label className="text-sm font-medium">Contacts</Label>
                <div className="mt-2 space-y-2">
                  {selectedCompany.contacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-center gap-3 p-2 rounded-md border cursor-pointer hover:bg-muted/50"
                      onClick={() => handleContactClick(contact)}
                    >
                      <ContactAvatar contact={contact} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {contact.name}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
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
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
