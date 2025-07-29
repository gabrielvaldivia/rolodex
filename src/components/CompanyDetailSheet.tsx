"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ContactAvatar } from "@/components/ContactAvatar";
import TagInput from "@/components/TagInput";
import { Contact, Company } from "@/types";
import { formatRelativeDate, formatRegularDate } from "@/lib/utils";

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
  if (!selectedCompany) return null;

  return (
    <Sheet open={isSheetOpen} onOpenChange={onSheetOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px]">
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
                    onCompanyUpdate({
                      ...selectedCompany,
                      tags: tags,
                    });
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
                    onCompanyUpdate({
                      ...selectedCompany,
                      hidden: checked,
                    });
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
                    onCompanyUpdate({
                      ...selectedCompany,
                      starred: checked,
                    });
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
