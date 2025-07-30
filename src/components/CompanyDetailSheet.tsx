"use client";

import { useState } from "react";
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
  onCompanyUpdate: (company: Company) => void;
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
  if (selectedCompany && !editedCompany) {
    setEditedCompany(selectedCompany);
  }

  if (!selectedCompany || !editedCompany) return null;

  const saveCompanyDebounced = async (company: Company) => {
    setEditedCompany(company);
    onCompanyUpdate(company);
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
                      saveCompanyDebounced({
                        ...editedCompany,
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
                    {editedCompany.name}
                  </button>
                )}
                <div className="text-sm text-muted-foreground">
                  {editedCompany.contactCount} contact
                  {editedCompany.contactCount !== 1 ? "s" : ""}
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
                          <div className="text-sm text-muted-foreground mt-3">
                            {(() => {
                              const preview =
                                mostRecentContact.lastEmailPreview;
                              // Find the first line that starts with "On" (indicating a previous email)
                              const lines = preview.split("\n");
                              const lastEmailLines = [];

                              for (const line of lines) {
                                // Stop at the first line that starts with "On" (case insensitive)
                                if (
                                  line.trim().toLowerCase().startsWith("on ")
                                ) {
                                  break;
                                }
                                lastEmailLines.push(line);
                              }

                              return lastEmailLines.join("\n").trim();
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
