"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// Import our new components and hooks
import KanbanBoard from "@/components/KanbanBoard";
import ContactDetailSheet from "@/components/ContactDetailSheet";
import CompanyDetailSheet from "@/components/CompanyDetailSheet";
import HeaderControls from "@/components/HeaderControls";
import DataTable from "@/components/DataTable";
import { useContacts } from "@/hooks/useContacts";
import { useFilters } from "@/hooks/useFilters";
import { useSaveOperation } from "@/hooks/useSaveOperation";
import { useContactService } from "@/hooks/useContactService";
import { useSheetState } from "@/hooks/useSheetState";
import { useLoadingState } from "@/hooks/useLoadingState";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { groupContactsByCompany } from "@/lib/contacts";
import { getTableConfig } from "@/lib/tableConfig";
import { updateTagsForMove } from "@/lib/tagUtils";
import { Contact, Company, SortField } from "@/types";

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
    progress,
    fetchContacts,
    clearContactsCache,
    cachedContacts,
    forceRefreshCache,
    isCacheStale,
    createTestCache,
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

  // Use new unified hooks
  const { isSaving, lastError, saveWithDebounce, clearSaveState } =
    useSaveOperation();
  const { saveContact, updateContactTags, updateCompanyContacts } =
    useContactService();
  const { handleAsyncOperation } = useErrorHandler();

  // Contact sheet state
  const {
    selectedItem: selectedContact,
    editedItem: editedContact,
    setEditedItem: setEditedContact,
    isOpen: isSheetOpen,
    setIsOpen: setIsSheetOpen,
    openSheet: openContactSheet,
    closeSheet: closeContactSheet,
  } = useSheetState<Contact>();

  // Company sheet state
  const {
    selectedItem: selectedCompany,
    isOpen: isCompanySheetOpen,
    setIsOpen: setIsCompanySheetOpen,
    openSheet: openCompanySheet,
    closeSheet: closeCompanySheet,
  } = useSheetState<Company>();

  // Company editing state
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

  // Debug company groupings when contacts change
  useEffect(() => {
    if (contacts.length > 0) {
      const companies = groupContactsByCompany(contacts);
      console.log(
        "🏢 Company groupings updated:",
        companies.map((c) => ({
          name: c.name,
          contactCount: c.contactCount,
          contacts: c.contacts.map((contact) => ({
            name: contact.name,
            company: contact.company,
          })),
        }))
      );
    }
  }, [contacts]);

  // Contact handlers
  const handleContactClick = (contact: Contact) => {
    openContactSheet(contact);
  };

  const saveContactDebounced = async (contact: Contact) => {
    await saveWithDebounce(async () => {
      // Check if company name changed
      const originalContact = contacts.find((c) => c.id === contact.id);
      const companyChanged =
        originalContact && originalContact.company !== contact.company;

      if (companyChanged) {
        console.log(
          `🏢 Company changed for contact ${contact.name}: "${originalContact.company}" → "${contact.company}"`
        );
      }

      await saveContact(contact);

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

      // If company changed, we need to handle company regrouping
      if (companyChanged && originalContact) {
        console.log(
          `🔄 Handling company regrouping for contact ${contact.name}`
        );

        // Update the selected contact in the sheet state so it updates immediately
        if (selectedContact && selectedContact.id === contact.id) {
          const updatedSelectedContact = {
            ...contact,
            lastContact: selectedContact.lastContact,
            source: selectedContact.source,
            lastEmailSubject: selectedContact.lastEmailSubject,
            lastEmailPreview: selectedContact.lastEmailPreview,
            lastMeetingName: selectedContact.lastMeetingName,
            photoUrl: contact.photoUrl,
          };
          setEditedContact(updatedSelectedContact);
        }

        // Force a re-render by updating the contacts state
        // This will trigger the useEffect that recalculates company groupings
        setContacts([...updatedContacts]);
      } else {
        // Also update the selected contact in the sheet state so it updates immediately
        if (selectedContact && selectedContact.id === contact.id) {
          const updatedSelectedContact = {
            ...contact,
            lastContact: selectedContact.lastContact,
            source: selectedContact.source,
            lastEmailSubject: selectedContact.lastEmailSubject,
            lastEmailPreview: selectedContact.lastEmailPreview,
            lastMeetingName: selectedContact.lastMeetingName,
            photoUrl: contact.photoUrl,
          };
          setEditedContact(updatedSelectedContact);
        }
      }
    });
  };

  // Company handlers
  const handleCompanyClick = (company: Company) => {
    openCompanySheet(company);
  };

  // Card move handler
  const handleCardMove = async (
    item: Contact | Company,
    sourceTag: string,
    targetTag: string,
    itemType: "contact" | "company"
  ) => {
    if (sourceTag === targetTag) return;

    await handleAsyncOperation(async () => {
      if (itemType === "contact") {
        const contact = item as Contact;
        const newTags = updateTagsForMove(
          contact.tags || [],
          sourceTag,
          targetTag
        );
        const updatedContact = { ...contact, tags: newTags };

        await updateContactTags(contact, newTags);

        const updatedContacts = contacts.map((c) =>
          c.id === contact.id ? updatedContact : c
        );
        setContacts(updatedContacts);
      } else {
        // Handle company moves
        const company = item as Company;
        const companyContacts = contacts.filter(
          (c) => c.company === company.name
        );

        // Update all contacts in the company
        const updatedContacts = contacts.map((contact) => {
          if (contact.company === company.name) {
            const newTags = updateTagsForMove(
              contact.tags || [],
              sourceTag,
              targetTag
            );
            return { ...contact, tags: newTags };
          }
          return contact;
        });

        setContacts(updatedContacts);

        // Save all company contacts
        await updateCompanyContacts(company.name, updatedContacts);
      }
    }, "Failed to move card");
  };

  // Filter and sort data
  const filteredContacts = filterContacts(contacts);
  const allCompanies = groupContactsByCompany(filteredContacts);
  const filteredCompanies = filterCompanies(allCompanies);

  // Debug: check if Sunny Health company has the correct tags
  const sunnyHealthCompany = allCompanies.find(
    (c) => c.name === "Sunny Health"
  );
  if (sunnyHealthCompany) {
    console.log("🏢 Sunny Health company tags:", sunnyHealthCompany.tags);
    console.log(
      "🏢 Sunny Health company contacts:",
      sunnyHealthCompany.contacts.map((c) => ({ name: c.name, tags: c.tags }))
    );
  }
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
          forceRefreshCache={forceRefreshCache}
          isCacheStale={isCacheStale}
          onSettingsClick={() => router.push("/settings")}
        />

        {loading && contacts.length === 0 && !cachedContacts?.length ? (
          <div className="text-center py-8 px-8">
            <div className="text-sm text-muted-foreground">
              Processing emails...
            </div>
            <div className="text-xs text-gray-400 mt-2">
              {backgroundSyncing
                ? "Syncing from Google (this may take a couple minutes)"
                : "This may take a couple minutes"}
            </div>
            <div className="mt-4 max-w-md mx-auto">
              <Progress value={progress} max={100} showLabel={true} />
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
                {loading ? "Processing..." : "Try Again"}
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
              <button
                onClick={createTestCache}
                className="block mx-auto text-xs text-green-500 hover:text-green-700 underline mt-2"
              >
                Create Test Cache
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full">
            {/* Background sync indicator */}
            {backgroundSyncing && (
              <div className="text-center py-2 px-8 mb-4">
                <div className="text-xs text-blue-600 bg-blue-50 px-3 py-1 rounded-full inline-flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                  <span>Syncing contacts in background...</span>
                </div>
              </div>
            )}
            {/* Progress indicator for initial load */}
            {loading &&
              !backgroundSyncing &&
              progress > 0 &&
              progress < 100 && (
                <div className="text-center py-2 px-8 mb-4">
                  <div className="text-xs text-green-600 bg-green-50 px-3 py-1 rounded-full inline-flex items-center space-x-2">
                    <span>Processing emails... {Math.round(progress)}%</span>
                  </div>
                </div>
              )}
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
            ) : (
              <DataTable
                data={
                  currentView === "contacts" ? sortedContacts : sortedCompanies
                }
                columns={getTableConfig(currentView)}
                viewType={currentView}
                onItemClick={(item) => {
                  if (currentView === "contacts") {
                    handleContactClick(item as Contact);
                  } else {
                    handleCompanyClick(item as Company);
                  }
                }}
                onSort={handleSort}
                getSortIcon={getSortIcon}
                customTagColors={customTagColors}
              />
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
        lastSaveError={lastError}
      />

      {/* Company Detail Sheet */}
      <CompanyDetailSheet
        selectedCompany={selectedCompany}
        isSheetOpen={isCompanySheetOpen}
        onSheetOpenChange={setIsCompanySheetOpen}
        onCompanyUpdate={async (
          updatedCompany: Company,
          originalCompanyName?: string
        ) => {
          await handleAsyncOperation(async () => {
            // Update all contacts in the company
            const updatedContacts = contacts.map((contact) => {
              // If this contact belongs to the original company name (for name changes)
              // or to the current company name (for other updates)
              const targetCompanyName =
                originalCompanyName || updatedCompany.name;
              if (contact.company === targetCompanyName) {
                return {
                  ...contact,
                  company: updatedCompany.name, // Update the company name
                  tags: updatedCompany.tags,
                  hidden: updatedCompany.hidden,
                  starred: updatedCompany.starred,
                };
              }
              return contact;
            });
            setContacts(updatedContacts);

            // Save all contacts in the company
            await updateCompanyContacts(updatedCompany.name, updatedContacts);
          }, "Failed to update company");
        }}
        onContactClick={handleContactClick}
        allTags={allTags}
        customTagColors={customTagColors}
      />
    </div>
  );
}
