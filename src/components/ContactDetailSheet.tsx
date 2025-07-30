"use client";

import { useState, useRef, useEffect } from "react";
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
import { EmailText } from "@/components/EmailText";
import TagInput from "@/components/TagInput";
import { Contact } from "@/types";
import { formatRegularDate, openGmail, openCalendar } from "@/lib/utils";

interface ContactDetailSheetProps {
  selectedContact: Contact | null;
  editedContact: Contact | null;
  isSheetOpen: boolean;
  onSheetOpenChange: (open: boolean) => void;
  onContactUpdate: (contact: Contact) => void;
  allTags: string[];
  customTagColors: Record<string, { bg: string; text: string; border: string }>;
  isSaving: boolean;
  lastSaveError: string | null;
}

export default function ContactDetailSheet({
  selectedContact,
  editedContact,
  isSheetOpen,
  onSheetOpenChange,
  onContactUpdate,
  allTags,
  customTagColors,
  isSaving,
  lastSaveError,
}: ContactDetailSheetProps) {
  const [editingName, setEditingName] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Reset editing state when sheet opens/closes
  useEffect(() => {
    if (!isSheetOpen) {
      setEditingName(false);
      setEditingEmail(false);
    }
  }, [isSheetOpen]);

  if (!selectedContact || !editedContact) return null;

  const saveContactDebounced = async (contact: Contact) => {
    onContactUpdate(contact);
  };

  return (
    <Sheet open={isSheetOpen} onOpenChange={onSheetOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <div className="space-y-6">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-3">
              <ContactAvatar contact={selectedContact} size="lg" />
              <div className="flex-1 min-w-0">
                {editingName ? (
                  <Input
                    ref={nameInputRef}
                    value={editedContact.name}
                    onChange={(e) => {
                      saveContactDebounced({
                        ...editedContact,
                        name: e.target.value,
                      });
                    }}
                    onBlur={() => setEditingName(false)}
                    className="text-lg font-semibold"
                  />
                ) : (
                  <button
                    onClick={() => {
                      setEditingName(true);
                      // Focus the input after a brief delay to ensure it's rendered
                      setTimeout(() => nameInputRef.current?.focus(), 0);
                    }}
                    className="text-lg font-semibold px-2 py-1 rounded -ml-2 text-left w-full"
                  >
                    {editedContact.name}
                  </button>
                )}
                <div>
                  {editingEmail ? (
                    <Input
                      ref={emailInputRef}
                      value={editedContact.email}
                      onChange={(e) => {
                        saveContactDebounced({
                          ...editedContact,
                          email: e.target.value,
                        });
                      }}
                      onBlur={() => setEditingEmail(false)}
                      className="text-sm"
                    />
                  ) : (
                    <button
                      onClick={() => {
                        setEditingEmail(true);
                        // Focus the input after a brief delay to ensure it's rendered
                        setTimeout(() => emailInputRef.current?.focus(), 0);
                      }}
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
                  <div className="text-sm text-foreground mt-3">
                    {(() => {
                      const preview = selectedContact.lastEmailPreview;
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
                        latestEmail = preview.substring(0, match.index).trim();
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
                          dangerouslySetInnerHTML={{ __html: latestEmail }}
                          className="whitespace-pre-wrap"
                        />
                      );
                    })()}
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
            <div className="text-sm text-red-600">Error: {lastSaveError}</div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
