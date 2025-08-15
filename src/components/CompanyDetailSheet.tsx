"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Star, Eye, X } from "lucide-react";
import { ContactAvatar } from "@/components/ContactAvatar";
import TagInput from "@/components/TagInput";
import { Contact, Company } from "@/types";
import {
  formatRelativeDate,
  formatRegularDate,
  openGmail,
  openCalendar,
} from "@/lib/utils";

interface CompanyDetailSheetProps {
  selectedCompany: Company | null;
  isSheetOpen: boolean;
  onSheetOpenChange: (open: boolean) => void;
  onCompanyUpdate: (company: Company, originalCompanyName?: string) => void;
  onContactClick: (contact: Contact) => void;
  allTags: string[];
  customTagColors: Record<string, { bg: string; text: string; border: string }>;
}

export default function CompanyDetailSheet({
  selectedCompany,
  isSheetOpen,
  onSheetOpenChange,
  onCompanyUpdate,
  onContactClick,
  allTags,
  customTagColors,
}: CompanyDetailSheetProps) {
  const [editingName, setEditingName] = useState(false);
  const [editedCompany, setEditedCompany] = useState<Company | null>(null);

  // Update editedCompany when selectedCompany changes
  React.useEffect(() => {
    if (selectedCompany) {
      setEditedCompany(selectedCompany);
      setEditingName(false); // Reset editing state when company changes
    }
  }, [selectedCompany]);

  if (!selectedCompany || !editedCompany) return null;

  const saveCompanyDebounced = async (company: Company) => {
    setEditedCompany(company);
    // If the company name changed, pass the original name
    const originalName = selectedCompany?.name;
    onCompanyUpdate(company, originalName);
  };

  return (
    <Sheet open={isSheetOpen} onOpenChange={onSheetOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <div className="space-y-6">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-3">
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                <span className="text-lg font-semibold text-muted-foreground">
                  {editedCompany.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                {editingName ? (
                  <Input
                    value={editedCompany.name}
                    onChange={(e) => {
                      setEditedCompany({
                        ...editedCompany,
                        name: e.target.value,
                      });
                    }}
                    onBlur={() => {
                      setEditingName(false);
                      // Save the changes when editing is done
                      if (editedCompany.name.trim()) {
                        saveCompanyDebounced(editedCompany);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setEditingName(false);
                        if (editedCompany.name.trim()) {
                          saveCompanyDebounced(editedCompany);
                        }
                      } else if (e.key === "Escape") {
                        setEditingName(false);
                        // Reset to original name
                        setEditedCompany(selectedCompany);
                      }
                    }}
                    className="text-lg font-semibold"
                  />
                ) : (
                  <button
                    onClick={() => setEditingName(true)}
                    className="text-lg font-semibold px-2 py-1 rounded -ml-2 text-left w-full hover:bg-muted/50"
                  >
                    {editedCompany.name}
                  </button>
                )}
              </div>
            </SheetTitle>
          </SheetHeader>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                saveCompanyDebounced({
                  ...editedCompany,
                  starred: !editedCompany.starred,
                });
              }}
              className="flex-1"
            >
              <Star className="h-4 w-4 mr-2" />
              {editedCompany.starred ? "Unstar" : "Star"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                saveCompanyDebounced({
                  ...editedCompany,
                  hidden: !editedCompany.hidden,
                });
              }}
              className="flex-1"
            >
              <Eye className="h-4 w-4 mr-2" />
              {editedCompany.hidden ? "Show" : "Hide"}
            </Button>
          </div>

          {/* Company Details */}
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Tags</Label>
              <div className="mt-2">
                <TagInput
                  tags={editedCompany.tags || []}
                  onTagsChange={(tags) => {
                    saveCompanyDebounced({
                      ...editedCompany,
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
                    {formatRegularDate(editedCompany.lastContact)}
                  </span>
                  <div className="flex items-center gap-2">
                    {(() => {
                      // Find the most recent contact with email information
                      const mostRecentContact = editedCompany.contacts
                        .filter(
                          (contact) =>
                            contact.lastEmailSubject || contact.lastMeetingName
                        )
                        .sort(
                          (a, b) =>
                            new Date(b.lastContact).getTime() -
                            new Date(a.lastContact).getTime()
                        )[0];

                      return (
                        mostRecentContact && (
                          <>
                            {mostRecentContact.lastEmailSubject && (
                              <button
                                onClick={() => openGmail(mostRecentContact)}
                                className="hover:opacity-70"
                              >
                                <img
                                  src="/icons/gmail.png"
                                  alt="Gmail"
                                  className="h-4 w-4"
                                />
                              </button>
                            )}
                            {mostRecentContact.lastMeetingName && (
                              <button
                                onClick={() => openCalendar(mostRecentContact)}
                                className="hover:opacity-70"
                              >
                                <img
                                  src="/icons/calendar.png"
                                  alt="Calendar"
                                  className="h-4 w-4"
                                />
                              </button>
                            )}
                          </>
                        )
                      );
                    })()}
                  </div>
                </div>
                {(() => {
                  // Find the most recent contact with email information
                  const mostRecentContact = editedCompany.contacts
                    .filter(
                      (contact) =>
                        contact.lastEmailSubject || contact.lastMeetingName
                    )
                    .sort(
                      (a, b) =>
                        new Date(b.lastContact).getTime() -
                        new Date(a.lastContact).getTime()
                    )[0];

                  return (
                    mostRecentContact && (
                      <>
                        {mostRecentContact.lastEmailSubject && (
                          <div className="text-sm font-medium mt-2">
                            {mostRecentContact.lastEmailSubject}
                          </div>
                        )}
                        {mostRecentContact.lastEmailPreview && (
                          <div className="text-sm text-foreground mt-3">
                            {(() => {
                              const preview =
                                mostRecentContact.lastEmailPreview;
                              // Find the position of the first "On" pattern that indicates a previous email
                              const onPattern =
                                /On\s+\w+,\s+\w+\s+\d{1,2},\s+\d{4}\s+at\s+\d{1,2}:\d{2}\s*(AM|PM)?\s+.+?\s+wrote:/i;
                              const match = preview.match(onPattern);

                              let latestEmail;
                              if (match && match.index !== undefined) {
                                console.log(
                                  "📧 Found email chain at position:",
                                  match.index
                                );
                                latestEmail = preview
                                  .substring(0, match.index)
                                  .trim();
                                console.log("📧 Latest email:", latestEmail);
                              } else {
                                // Fallback: if no "On" pattern found, return the full preview
                                console.log(
                                  "📧 No email chain pattern found, returning full preview"
                                );
                                latestEmail = preview;
                              }

                              // Render as HTML to preserve links
                              return (
                                <div
                                  dangerouslySetInnerHTML={{
                                    __html: latestEmail,
                                  }}
                                  className="whitespace-pre-wrap"
                                />
                              );
                            })()}
                          </div>
                        )}
                      </>
                    )
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Company Contacts */}
          <div>
            <Label className="text-sm font-medium">Contacts</Label>
            <div className="mt-2 space-y-2">
              {editedCompany.contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center gap-3 p-2 rounded-md border cursor-pointer hover:bg-muted/50"
                  onClick={() => onContactClick(contact)}
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
      </SheetContent>
    </Sheet>
  );
}
