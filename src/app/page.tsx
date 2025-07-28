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
  starred?: boolean;
  tags?: string[];
}

interface ContactEdit {
  id: string;
  name: string;
  email: string;
  company: string;
  updatedAt: string;
  hidden?: boolean;
  starred?: boolean;
  tags?: string[];
}

type SortField = "name" | "email" | "company" | "lastContact" | "tags";
type SortDirection = "asc" | "desc";
type View = "contacts" | "companies";
type ViewType = "table" | "kanban";

interface Company {
  name: string;
  contactCount: number;
  lastContact: string;
  contacts: Contact[];
  hidden?: boolean;
  website?: string;
  starred?: boolean;
  tags?: string[];
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

// Tag color system
const TAG_COLORS = [
  { bg: "bg-red-100", text: "text-red-800", border: "border-red-200" },
  { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-200" },
  { bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-200" },
  { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-200" },
  { bg: "bg-lime-100", text: "text-lime-800", border: "border-lime-200" },
  { bg: "bg-green-100", text: "text-green-800", border: "border-green-200" },
  {
    bg: "bg-emerald-100",
    text: "text-emerald-800",
    border: "border-emerald-200",
  },
  { bg: "bg-teal-100", text: "text-teal-800", border: "border-teal-200" },
  { bg: "bg-cyan-100", text: "text-cyan-800", border: "border-cyan-200" },
  { bg: "bg-sky-100", text: "text-sky-800", border: "border-sky-200" },
  { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-200" },
  { bg: "bg-indigo-100", text: "text-indigo-800", border: "border-indigo-200" },
  { bg: "bg-violet-100", text: "text-violet-800", border: "border-violet-200" },
  { bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-200" },
  {
    bg: "bg-fuchsia-100",
    text: "text-fuchsia-800",
    border: "border-fuchsia-200",
  },
  { bg: "bg-pink-100", text: "text-pink-800", border: "border-pink-200" },
  { bg: "bg-rose-100", text: "text-rose-800", border: "border-rose-200" },
  { bg: "bg-gray-100", text: "text-gray-800", border: "border-gray-200" },
  { bg: "bg-slate-100", text: "text-slate-800", border: "border-slate-200" },
  { bg: "bg-zinc-100", text: "text-zinc-800", border: "border-zinc-200" },
];

// Generate consistent color for a tag based on its name
const getTagColor = (
  tagName: string,
  customColors: Record<
    string,
    { bg: string; text: string; border: string }
  > = {}
) => {
  // Check for custom color first
  if (customColors[tagName]) {
    return customColors[tagName];
  }

  // Simple hash function for consistent color assignment
  let hash = 0;
  for (let i = 0; i < tagName.length; i++) {
    const char = tagName.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  const colorIndex = Math.abs(hash) % TAG_COLORS.length;
  return TAG_COLORS[colorIndex];
};

// Tag Input Component
interface TagInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  disabled?: boolean;
  customColors?: Record<string, { bg: string; text: string; border: string }>;
}

const TagInput: React.FC<TagInputProps> = ({
  tags,
  onTagsChange,
  suggestions = [],
  placeholder = "Add tag...",
  disabled = false,
  customColors = {},
}) => {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredSuggestions = suggestions.filter(
    (suggestion) =>
      suggestion.toLowerCase().includes(inputValue.toLowerCase()) &&
      !tags.includes(suggestion)
  );

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      onTagsChange([...tags, trimmedTag]);
    }
    setInputValue("");
    setShowSuggestions(false);
  };

  const removeTag = (tagToRemove: string) => {
    onTagsChange(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-1 min-h-[32px] p-2 border rounded-md bg-background">
        {tags.map((tag) => {
          const colors = getTagColor(tag, customColors);
          return (
            <span
              key={tag}
              className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md ${colors.bg} ${colors.text}`}
            >
              {tag}
              {!disabled && (
                <button
                  onClick={() => removeTag(tag)}
                  className="hover:opacity-70 ml-1"
                  type="button"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          );
        })}
        {!disabled && (
          <Input
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setShowSuggestions(e.target.value.length > 0);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(inputValue.length > 0)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder={tags.length === 0 ? placeholder : ""}
            className="border-0 shadow-none focus:ring-0 px-0 py-0 h-6 text-sm min-w-[120px] flex-1"
          />
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border rounded-md shadow-lg max-h-40 overflow-y-auto">
          {filteredSuggestions.slice(0, 5).map((suggestion) => {
            const colors = getTagColor(suggestion, customColors);
            return (
              <button
                key={suggestion}
                onClick={() => addTag(suggestion)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
                type="button"
              >
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded ${colors.bg} ${colors.text}`}
                >
                  {suggestion}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Tag Display Component (read-only)
interface TagDisplayProps {
  tags: string[];
  maxDisplay?: number;
  size?: "sm" | "md";
  customColors?: Record<string, { bg: string; text: string; border: string }>;
}

const TagDisplay: React.FC<TagDisplayProps> = ({
  tags,
  maxDisplay = 3,
  size = "sm",
  customColors = {},
}) => {
  if (!tags || tags.length === 0) return null;

  const displayTags = tags.slice(0, maxDisplay);
  const remainingCount = tags.length - maxDisplay;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {displayTags.map((tag) => {
        const colors = getTagColor(tag, customColors);
        return (
          <span
            key={tag}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${
              colors.bg
            } ${colors.text} ${size === "sm" ? "text-xs" : "text-sm"}`}
            title={tag}
          >
            <span className="max-w-16 truncate">{tag}</span>
          </span>
        );
      })}
      {remainingCount > 0 && (
        <span className="text-xs text-muted-foreground">+{remainingCount}</span>
      )}
    </div>
  );
};

// Kanban Card Component
interface KanbanCardProps {
  item: Contact | Company;
  type: "contact" | "company";
  customColors: Record<string, { bg: string; text: string; border: string }>;
  columnTag: string;
  onClick: () => void;
  onDragStart?: (item: Contact | Company, sourceTag: string) => void;
}

const KanbanCard: React.FC<KanbanCardProps> = ({
  item,
  type,
  customColors,
  columnTag,
  onClick,
  onDragStart,
}) => {
  const name =
    type === "contact" ? (item as Contact).name : (item as Company).name;
  const lastContact = item.lastContact;
  const tags = item.tags || [];

  return (
    <div
      onClick={onClick}
      draggable
      onDragStart={(e) => {
        e.stopPropagation(); // Prevent column drag when dragging card
        const itemId =
          type === "contact" ? (item as Contact).id : (item as Company).name;
        e.dataTransfer.setData(
          "application/json",
          JSON.stringify({
            type: "card",
            itemType: type,
            itemId,
            sourceTag: columnTag,
          })
        );
        onDragStart?.(item, columnTag);
      }}
      className="bg-white border rounded-lg p-3 mb-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-sm truncate flex-1">{name}</h4>
        {item.starred && (
          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 flex-shrink-0 ml-1" />
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        {formatRelativeDate(lastContact)}
      </div>
    </div>
  );
};

// Kanban Column Component
interface KanbanColumnProps {
  tag: string;
  items: (Contact | Company)[];
  type: "contact" | "company";
  customColors: Record<string, { bg: string; text: string; border: string }>;
  onContactClick: (contact: Contact) => void;
  onCompanyClick: (company: Company) => void;
  onDragStart?: (tag: string) => void;
  onColumnDrop?: (draggedTag: string, targetTag: string) => void;
  onCardDrop?: (
    draggedItem: Contact | Company,
    sourceTag: string,
    targetTag: string,
    itemType: "contact" | "company"
  ) => void;
  onDragOver?: (e: React.DragEvent) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  tag,
  items,
  type,
  customColors,
  onContactClick,
  onCompanyClick,
  onDragStart,
  onColumnDrop,
  onCardDrop,
  onDragOver,
}) => {
  const colors =
    tag !== "No Tags"
      ? getTagColor(tag, customColors)
      : { bg: "bg-gray-100", text: "text-gray-800", border: "border-gray-200" };

  return (
    <div
      className="flex flex-col min-w-72 max-w-72 bg-gray-50 rounded-lg p-4 cursor-move"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", tag);
        onDragStart?.(tag);
      }}
      onDrop={(e) => {
        e.preventDefault();

        // Try to parse as card data first
        try {
          const cardData = JSON.parse(
            e.dataTransfer.getData("application/json")
          );
          if (cardData.type === "card") {
            // This is a card being dropped
            const draggedItem = items.find((item) => {
              const itemId =
                cardData.itemType === "contact"
                  ? (item as Contact).id
                  : (item as Company).name;
              return itemId === cardData.itemId;
            });

            if (draggedItem) {
              onCardDrop?.(
                draggedItem,
                cardData.sourceTag,
                tag,
                cardData.itemType
              );
            }
            return;
          }
        } catch {
          // Not card data, try column data
        }

        // Handle column drop
        const draggedTag = e.dataTransfer.getData("text/plain");
        if (draggedTag) {
          onColumnDrop?.(draggedTag, tag);
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver?.(e);
      }}
      onDragEnter={(e) => e.preventDefault()}
    >
      <div className="flex items-center justify-between mb-4">
        {tag === "No Tags" ? (
          <h3 className="font-medium text-sm text-gray-600">No Tags</h3>
        ) : (
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 text-sm rounded ${colors.bg} ${colors.text} font-medium`}
          >
            {tag}
          </span>
        )}
        <span className="text-xs text-muted-foreground bg-white px-2 py-1 rounded">
          {items.length}
        </span>
      </div>

      <div className="flex-1 min-h-32">
        {items.map((item) => (
          <KanbanCard
            key={
              type === "contact" ? (item as Contact).id : (item as Company).name
            }
            item={item}
            type={type}
            customColors={customColors}
            columnTag={tag}
            onClick={() => {
              if (type === "contact") {
                onContactClick(item as Contact);
              } else {
                onCompanyClick(item as Company);
              }
            }}
            onDragStart={(draggedItem, sourceTag) => {
              // Card drag start handled by parent
            }}
          />
        ))}
      </div>
    </div>
  );
};

// Kanban Board Component
interface KanbanBoardProps {
  items: (Contact | Company)[];
  type: "contact" | "company";
  customColors: Record<string, { bg: string; text: string; border: string }>;
  allTags: string[];
  columnOrder: string[];
  selectedTags: string[];
  onContactClick: (contact: Contact) => void;
  onCompanyClick: (company: Company) => void;
  onColumnReorder: (newOrder: string[]) => void;
  onCardMove: (
    item: Contact | Company,
    sourceTag: string,
    targetTag: string,
    itemType: "contact" | "company"
  ) => void;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({
  items,
  type,
  customColors,
  allTags,
  columnOrder,
  selectedTags,
  onContactClick,
  onCompanyClick,
  onColumnReorder,
  onCardMove,
}) => {
  // Group items by tags
  const tagGroups: Record<string, (Contact | Company)[]> = {};

  // Initialize tag groups
  allTags.forEach((tag) => {
    tagGroups[tag] = [];
  });

  // Add "No Tags" group
  tagGroups["No Tags"] = [];

  // Sort items into tag groups
  items.forEach((item) => {
    const itemTags = item.tags || [];

    if (itemTags.length === 0) {
      tagGroups["No Tags"].push(item);
    } else {
      // Add item to each tag column it belongs to
      itemTags.forEach((tag) => {
        if (tagGroups[tag]) {
          tagGroups[tag].push(item);
        }
      });
    }
  });

  // Filter out empty tag groups and respect selectedTags filter
  const activeTagGroups = Object.entries(tagGroups).filter(([tag, items]) => {
    // If no tags are selected, show all non-empty groups
    if (selectedTags.length === 0) {
      return items.length > 0;
    }
    // If tags are selected, only show selected tags that have items
    return selectedTags.includes(tag) && items.length > 0;
  });

  // Apply custom column order if available
  if (columnOrder.length > 0) {
    activeTagGroups.sort(([tagA], [tagB]) => {
      const indexA = columnOrder.indexOf(tagA);
      const indexB = columnOrder.indexOf(tagB);

      // If both tags are in the custom order, sort by their position
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }

      // If only one tag is in the custom order, prioritize it
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;

      // If neither tag is in the custom order, use default sorting
      if (tagA === "No Tags") return 1;
      if (tagB === "No Tags") return -1;
      return tagA.localeCompare(tagB);
    });
  } else {
    // Default sorting: put "No Tags" at the end, then alphabetically
    activeTagGroups.sort(([tagA], [tagB]) => {
      if (tagA === "No Tags") return 1;
      if (tagB === "No Tags") return -1;
      return tagA.localeCompare(tagB);
    });
  }

  const handleColumnDrop = (draggedTag: string, targetTag: string) => {
    if (draggedTag === targetTag) return;

    const currentTags = activeTagGroups.map(([tag]) => tag);
    const draggedIndex = currentTags.indexOf(draggedTag);
    const targetIndex = currentTags.indexOf(targetTag);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newOrder = [...currentTags];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedTag);

    onColumnReorder(newOrder);
  };

  const handleCardDrop = (
    draggedItem: Contact | Company,
    sourceTag: string,
    targetTag: string,
    itemType: "contact" | "company"
  ) => {
    if (sourceTag === targetTag) return;

    onCardMove(draggedItem, sourceTag, targetTag, itemType);
  };

  return (
    <div className="flex gap-4 pb-4">
      {activeTagGroups.map(([tag, tagItems]) => (
        <KanbanColumn
          key={tag}
          tag={tag}
          items={tagItems}
          type={type}
          customColors={customColors}
          onContactClick={onContactClick}
          onCompanyClick={onCompanyClick}
          onColumnDrop={handleColumnDrop}
          onCardDrop={handleCardDrop}
          onDragOver={(e) => e.preventDefault()}
        />
      ))}
    </div>
  );
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
  const [viewType, setViewType] = useState<ViewType>("table");
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isCompanySheetOpen, setIsCompanySheetOpen] = useState(false);
  const [editingCompanyName, setEditingCompanyName] = useState(false);
  const [editingCompanyWebsite, setEditingCompanyWebsite] = useState(false);
  const [originalCompanyName, setOriginalCompanyName] = useState("");
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [showStarred, setShowStarred] = useState(false);
  const [showGmail, setShowGmail] = useState(true);
  const [showCalendar, setShowCalendar] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaveError, setLastSaveError] = useState<string | null>(null);
  const [backgroundSyncing, setBackgroundSyncing] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [customTagColors, setCustomTagColors] = useState<
    Record<string, { bg: string; text: string; border: string }>
  >({});
  const [editingTag, setEditingTag] = useState<{
    oldName: string;
    newName: string;
    color?: { bg: string; text: string; border: string };
  } | null>(null);
  const [showTagManager, setShowTagManager] = useState(false);
  const [columnOrder, setColumnOrder] = useState<string[]>([]);

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
            name: edit.name || contact.name,
            email: edit.email || contact.email,
            company: edit.company || contact.company,
            hidden: edit.hidden || contact.hidden,
            starred: edit.starred || contact.starred,
            tags: edit.tags || contact.tags,
            photoUrl: edit.photoUrl || contact.photoUrl,
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
              starred: contact.starred,
              tags: contact.tags || [],
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
              starred: contact.starred,
              tags: contact.tags || [],
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

  const updateContactStarred = async (contactId: string, starred: boolean) => {
    setLastSaveError(null);
    setIsSaving(true);

    try {
      // Update the contact in the contacts array
      const updatedContacts = contacts.map((contact) =>
        contact.id === contactId ? { ...contact, starred: starred } : contact
      );
      setContacts(updatedContacts);

      // Update the selected contact if it's the same
      if (selectedContact && selectedContact.id === contactId) {
        setSelectedContact({ ...selectedContact, starred: starred });
      }
      if (editedContact && editedContact.id === contactId) {
        setEditedContact({ ...editedContact, starred: starred });
      }

      // Save changes to the server
      const contact = contacts.find((c) => c.id === contactId);
      if (!contact) return;

      const response = await fetch(`/api/contacts/${contactId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: contact.name,
          email: contact.email,
          company: contact.company,
          hidden: contact.hidden,
          starred: starred,
          tags: contact.tags || [],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to star contact");
      }

      console.log(`Contact ${starred ? "starred" : "unstarred"} successfully`);
    } catch (error) {
      console.error("Error updating contact starred state:", error);
      setLastSaveError(
        error instanceof Error ? error.message : "Failed to update contact star"
      );

      // Revert changes on error
      setContacts(contacts);
    } finally {
      setIsSaving(false);
    }
  };

  const updateCompanyStarred = async (
    companyName: string,
    starred: boolean
  ) => {
    setLastSaveError(null);
    setIsSaving(true);

    try {
      // Update all contacts that belong to this company
      const updatedContacts = contacts.map((contact) =>
        contact.company === companyName
          ? { ...contact, starred: starred }
          : contact
      );

      setContacts(updatedContacts);

      // Update the selected company
      if (selectedCompany && selectedCompany.name === companyName) {
        setSelectedCompany({
          ...selectedCompany,
          starred: starred,
          contacts: selectedCompany.contacts.map((contact) => ({
            ...contact,
            starred: starred,
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
              hidden: contact.hidden,
              starred: starred,
              tags: contact.tags || [],
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
        `Company ${starred ? "starred" : "unstarred"} successfully for ${
          contactsToUpdate.length
        } contacts`
      );
    } catch (error) {
      console.error("Error updating company starred state:", error);
      setLastSaveError(
        error instanceof Error ? error.message : "Failed to update company star"
      );

      // Revert changes on error
      setContacts(contacts);
    } finally {
      setIsSaving(false);
    }
  };

  const updateCompanyTags = async (companyName: string, tags: string[]) => {
    setLastSaveError(null);
    setIsSaving(true);

    try {
      // Update all contacts that belong to this company
      const updatedContacts = contacts.map((contact) =>
        contact.company === companyName ? { ...contact, tags: tags } : contact
      );

      setContacts(updatedContacts);

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
              hidden: contact.hidden,
              starred: contact.starred,
              tags: tags,
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
        `Company tags updated successfully for ${contactsToUpdate.length} contacts`
      );
    } catch (error) {
      console.error("Error updating company tags:", error);
      setLastSaveError(
        error instanceof Error ? error.message : "Failed to update company tags"
      );

      // Revert changes on error
      setContacts(contacts);
    } finally {
      setIsSaving(false);
    }
  };

  const renameTag = async (oldName: string, newName: string) => {
    if (oldName === newName || !newName.trim()) return;

    setLastSaveError(null);
    setIsSaving(true);

    try {
      // Update all contacts that have this tag
      const updatedContacts = contacts.map((contact) => {
        if (contact.tags && contact.tags.includes(oldName)) {
          const newTags = contact.tags.map((tag) =>
            tag === oldName ? newName.trim() : tag
          );
          return { ...contact, tags: newTags };
        }
        return contact;
      });

      setContacts(updatedContacts);

      // Update custom colors if the old tag had one
      if (customTagColors[oldName]) {
        const newCustomColors = { ...customTagColors };
        newCustomColors[newName.trim()] = newCustomColors[oldName];
        delete newCustomColors[oldName];
        saveCustomTagColors(newCustomColors);
      }

      // Save changes to the server for each affected contact
      const contactsToUpdate = contacts.filter(
        (contact) => contact.tags && contact.tags.includes(oldName)
      );

      const responses = await Promise.all(
        contactsToUpdate.map((contact) => {
          const newTags = contact.tags!.map((tag) =>
            tag === oldName ? newName.trim() : tag
          );
          return fetch(`/api/contacts/${contact.id}`, {
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
        })
      );

      // Check if all requests were successful
      const failedRequests = responses.filter((response) => !response.ok);
      if (failedRequests.length > 0) {
        throw new Error(`Failed to update ${failedRequests.length} contact(s)`);
      }

      console.log(
        `Tag renamed from "${oldName}" to "${newName}" for ${contactsToUpdate.length} contacts`
      );
    } catch (error) {
      console.error("Error renaming tag:", error);
      setLastSaveError(
        error instanceof Error ? error.message : "Failed to rename tag"
      );

      // Revert changes on error
      setContacts(contacts);
    } finally {
      setIsSaving(false);
    }
  };

  const updateTagColor = (
    tagName: string,
    color: { bg: string; text: string; border: string }
  ) => {
    const newCustomColors = { ...customTagColors };
    newCustomColors[tagName] = color;
    saveCustomTagColors(newCustomColors);
  };

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

        // Update contact tags
        let newTags = contact.tags || [];

        if (targetTag === "No Tags") {
          // Moving to "No Tags" column - remove all tags
          newTags = [];
        } else if (sourceTag === "No Tags") {
          // Moving from "No Tags" - just add the target tag
          newTags = [targetTag];
        } else {
          // Replace source tag with target tag
          newTags = newTags.map((tag) => (tag === sourceTag ? targetTag : tag));

          // If the contact didn't have the source tag, add the target tag
          if (!contact.tags?.includes(sourceTag)) {
            newTags = [...newTags, targetTag];
          }
        }

        const updatedContact = { ...contact, tags: newTags };

        // Update local state
        const updatedContacts = contacts.map((c) =>
          c.id === contact.id ? updatedContact : c
        );
        setContacts(updatedContacts);

        // Save to server
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

        console.log(`Contact moved from "${sourceTag}" to "${targetTag}"`);
      } else {
        // Handle company moves - update all contacts in the company
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

        console.log(
          `Company "${company.name}" moved from "${sourceTag}" to "${targetTag}"`
        );
      }
    } catch (error) {
      console.error("Error moving card:", error);
      setLastSaveError(
        error instanceof Error ? error.message : "Failed to move card"
      );

      // Revert changes on error - reload contacts
      loadContacts();
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

    // Calculate company hidden, starred states, and aggregate tags
    const companies = Array.from(companiesMap.values());
    companies.forEach((company) => {
      company.hidden = company.contacts.every((contact) => contact.hidden);
      company.starred = company.contacts.some((contact) => contact.starred);

      // Aggregate unique tags from all contacts in the company
      const allTags = new Set<string>();
      company.contacts.forEach((contact) => {
        if (contact.tags) {
          contact.tags.forEach((tag) => allTags.add(tag));
        }
      });
      company.tags = Array.from(allTags).sort();
    });

    return companies;
  };

  const sortCompanies = (companies: Company[]) => {
    return [...companies].sort((a, b) => {
      // Always prioritize starred companies first
      if (a.starred && !b.starred) return -1;
      if (!a.starred && b.starred) return 1;

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
        case "tags":
          // Sort by first tag alphabetically, empty tags go to end
          const aFirstTag =
            a.tags && a.tags.length > 0
              ? a.tags.sort()[0].toLowerCase()
              : "zzz_no_tags";
          const bFirstTag =
            b.tags && b.tags.length > 0
              ? b.tags.sort()[0].toLowerCase()
              : "zzz_no_tags";
          aVal = aFirstTag;
          bVal = bFirstTag;
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
      // Always prioritize starred contacts first
      if (a.starred && !b.starred) return -1;
      if (!a.starred && b.starred) return 1;

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
        case "tags":
          // Sort by first tag alphabetically, empty tags go to end
          const aFirstTag =
            a.tags && a.tags.length > 0
              ? a.tags.sort()[0].toLowerCase()
              : "zzz_no_tags";
          const bFirstTag =
            b.tags && b.tags.length > 0
              ? b.tags.sort()[0].toLowerCase()
              : "zzz_no_tags";
          aVal = aFirstTag;
          bVal = bFirstTag;
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

  // Extract all unique tags from contacts for autocomplete
  useEffect(() => {
    const allTagsSet = new Set<string>();
    contacts.forEach((contact) => {
      if (contact.tags) {
        contact.tags.forEach((tag) => allTagsSet.add(tag));
      }
    });
    setAllTags(Array.from(allTagsSet).sort());
  }, [contacts]);

  // Load custom tag colors from localStorage
  useEffect(() => {
    const savedColors = localStorage.getItem("rolodex-custom-tag-colors");
    if (savedColors) {
      setCustomTagColors(JSON.parse(savedColors));
    }
  }, []);

  // Load view type from localStorage
  useEffect(() => {
    const savedViewType = localStorage.getItem("rolodex-view-type");
    if (
      savedViewType &&
      (savedViewType === "table" || savedViewType === "kanban")
    ) {
      setViewType(savedViewType as ViewType);
    }
  }, []);

  // Load current view from localStorage
  useEffect(() => {
    const savedCurrentView = localStorage.getItem("rolodex-current-view");
    if (
      savedCurrentView &&
      (savedCurrentView === "contacts" || savedCurrentView === "companies")
    ) {
      setCurrentView(savedCurrentView as View);
    }
  }, []);

  // Save custom tag colors to localStorage
  const saveCustomTagColors = (
    colors: Record<string, { bg: string; text: string; border: string }>
  ) => {
    setCustomTagColors(colors);
    localStorage.setItem("rolodex-custom-tag-colors", JSON.stringify(colors));
  };

  // Save view type to localStorage
  const saveViewType = (newViewType: ViewType) => {
    setViewType(newViewType);
    localStorage.setItem("rolodex-view-type", newViewType);
  };

  // Save current view to localStorage
  const saveCurrentView = (newView: View) => {
    setCurrentView(newView);
    localStorage.setItem("rolodex-current-view", newView);
  };

  // Load column order from localStorage
  useEffect(() => {
    const savedColumnOrder = localStorage.getItem("rolodex-column-order");
    if (savedColumnOrder) {
      setColumnOrder(JSON.parse(savedColumnOrder));
    }
  }, []);

  // Save column order to localStorage
  const saveColumnOrder = (newOrder: string[]) => {
    setColumnOrder(newOrder);
    localStorage.setItem("rolodex-column-order", JSON.stringify(newOrder));
  };

  // Auto-sync functionality moved to settings page
  // Backend caching now handles this automatically

  const loadContacts = async () => {
    // Backend caching is now handled automatically by the API
    // The API will return cached data immediately if available
    console.log("🔄 Loading contacts from backend (with automatic caching)");
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

      const response = await fetch(endpoint, {
        method,
        headers: {
          Authorization: `Bearer ${sessionWithToken.accessToken}`,
        },
      });

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

      setContacts(contactsWithEdits);

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
        alert(
          "Your Google account needs to be re-authenticated to access Gmail and Calendar data. Please sign out and sign in again."
        );
      }
    } finally {
      if (background) {
        setBackgroundSyncing(false);
      } else {
        setLoading(false);
      }
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
          starred: contact.starred,
          tags: contact.tags || [],
          photoUrl: contact.photoUrl,
        });

        console.log("Contact tags before save:", contact.tags);

        // Create request body, only include photoUrl if it has a value
        const requestBody: {
          name: string;
          email: string;
          company: string;
          hidden: boolean;
          starred: boolean;
          tags: string[];
          photoUrl?: string;
        } = {
          name: contact.name,
          email: contact.email,
          company: contact.company || "",
          hidden: contact.hidden || false,
          starred: contact.starred || false,
          tags: contact.tags || [],
        };

        // Only add photoUrl if it exists to avoid Firebase undefined errors
        if (contact.photoUrl) {
          requestBody.photoUrl = contact.photoUrl;
        }

        const response = await fetch(`/api/contacts/${contact.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
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

        // Update the contact in the contacts array, preserving the original lastContact
        const updatedContacts = contacts.map((c) =>
          c.id === contact.id
            ? {
                ...contact,
                lastContact: c.lastContact, // Preserve original lastContact timestamp
                source: c.source, // Preserve original source
                lastEmailSubject: c.lastEmailSubject, // Preserve original email data
                lastEmailPreview: c.lastEmailPreview,
                lastMeetingName: c.lastMeetingName,
                photoUrl: contact.photoUrl, // Update photo URL
              }
            : c
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
      (contact.company || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (contact.tags || []).some((tag) =>
        tag.toLowerCase().includes(searchTerm.toLowerCase())
      );

    const isVisible = showHidden || !contact.hidden;
    const matchesStarred = !showStarred || contact.starred;
    const matchesTags =
      selectedTags.length === 0 ||
      selectedTags.some((selectedTag) => {
        if (selectedTag === "No Tags") {
          return !contact.tags || contact.tags.length === 0;
        }
        return (contact.tags || []).includes(selectedTag);
      });

    const matchesSource =
      (contact.source === "Gmail" && showGmail) ||
      (contact.source === "Calendar" && showCalendar);

    return (
      matchesSearch &&
      isVisible &&
      matchesStarred &&
      matchesTags &&
      matchesSource
    );
  });

  const filteredCompanies = groupContactsByCompany(filteredContacts).filter(
    (company) => {
      const matchesSearch =
        company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (company.tags || []).some((tag) =>
          tag.toLowerCase().includes(searchTerm.toLowerCase())
        );
      const isVisible = showHidden || !company.hidden;
      const matchesStarred = !showStarred || company.starred;
      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.some((selectedTag) => {
          if (selectedTag === "No Tags") {
            return !company.tags || company.tags.length === 0;
          }
          return (company.tags || []).includes(selectedTag);
        });

      return matchesSearch && isVisible && matchesStarred && matchesTags;
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
    <div className="min-h-screen py-8">
      <div className="">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 px-8">
          <div className="flex items-center gap-4">
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
                              <div className="flex items-center ml-auto">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingTag({
                                      oldName: tag,
                                      newName: tag,
                                    });
                                    setShowTagManager(true);
                                  }}
                                  className="hover:bg-muted/50 p-1 rounded opacity-60 hover:opacity-100"
                                  title="Edit tag"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
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
          </div>
        ) : (
          <div className="w-full">
            {viewType === "kanban" ? (
              <div className="overflow-x-auto pl-8">
                {currentView === "contacts" ? (
                  <KanbanBoard
                    items={sortContacts(filteredContacts)}
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
                    items={sortCompanies(filteredCompanies)}
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
                    {sortContacts(filteredContacts).map((contact) => (
                      <TableRow
                        key={contact.id}
                        className="cursor-pointer hover:bg-muted/50"
                      >
                        <TableCell className="text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateContactStarred(
                                contact.id,
                                !contact.starred
                              );
                            }}
                            className="hover:bg-muted/50 p-1 rounded transition-colors"
                            title={
                              contact.starred
                                ? "Unstar contact"
                                : "Star contact"
                            }
                          >
                            <Star
                              className={`h-4 w-4 ${
                                contact.starred
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-gray-400 hover:text-yellow-400"
                              }`}
                            />
                          </button>
                        </TableCell>
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
                      <TableHead className="w-12 text-center"></TableHead>
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
                    {sortCompanies(filteredCompanies).map((company) => (
                      <TableRow
                        key={company.name}
                        className="cursor-pointer hover:bg-muted/50"
                      >
                        <TableCell className="text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateCompanyStarred(
                                company.name,
                                !company.starred
                              );
                            }}
                            className="hover:bg-muted/50 p-1 rounded transition-colors"
                            title={
                              company.starred
                                ? "Unstar company"
                                : "Star company"
                            }
                          >
                            <Star
                              className={`h-4 w-4 ${
                                company.starred
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-gray-400 hover:text-yellow-400"
                              }`}
                            />
                          </button>
                        </TableCell>
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

      {/* Company Detail Sheet */}
      <Sheet open={isCompanySheetOpen} onOpenChange={setIsCompanySheetOpen}>
        <SheetContent className="w-[400px] sm:w-[500px] lg:w-[600px] max-w-[90vw] overflow-y-auto">
          {selectedCompany && (
            <>
              <SheetHeader className="space-y-3">
                <SheetTitle className="sr-only">Company Details</SheetTitle>

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
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Button
                      variant={selectedCompany.starred ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        updateCompanyStarred(
                          selectedCompany.name,
                          !selectedCompany.starred
                        );
                      }}
                      className="flex-1 flex items-center gap-2"
                    >
                      <Star
                        className={`h-4 w-4 ${
                          selectedCompany.starred ? "fill-current" : ""
                        }`}
                      />
                      {selectedCompany.starred ? "Starred" : "Star"}
                    </Button>
                    <Button
                      variant={selectedCompany.hidden ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        updateCompanyHidden(
                          selectedCompany.name,
                          !selectedCompany.hidden
                        );
                      }}
                      className="flex-1 flex items-center gap-2"
                    >
                      {selectedCompany.hidden ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                      {selectedCompany.hidden ? "Hidden" : "Hide"}
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">
                      Tags
                    </Label>
                    <TagInput
                      tags={selectedCompany.tags || []}
                      onTagsChange={(newTags) => {
                        // Update all contacts in this company with the new tags
                        const updatedCompany = {
                          ...selectedCompany,
                          tags: newTags,
                        };
                        setSelectedCompany(updatedCompany);

                        // Apply tags to all contacts in the company
                        updateCompanyTags(selectedCompany.name, newTags);
                      }}
                      suggestions={allTags}
                      placeholder="Add tags to all contacts in this company..."
                      customColors={customTagColors}
                    />
                  </div>
                </div>

                {/* Last Contact Section - Same as Contact Sheet */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Last Contact</Label>
                  <div className="space-y-2">
                    {(() => {
                      // Find the most recent contact with email/meeting data
                      const contactsWithData = selectedCompany.contacts
                        .filter(
                          (contact) =>
                            contact.lastEmailSubject || contact.lastMeetingName
                        )
                        .sort((a, b) => {
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
                        });

                      const mostRecentContact = contactsWithData[0];

                      // If the most recent is a meeting, also find the most recent email
                      let mostRecentEmail = null;
                      if (
                        mostRecentContact &&
                        mostRecentContact.source === "Calendar"
                      ) {
                        const emailContacts = selectedCompany.contacts
                          .filter((contact) => contact.lastEmailSubject)
                          .sort((a, b) => {
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
                          });
                        mostRecentEmail = emailContacts[0];
                      }

                      return mostRecentContact &&
                        (mostRecentContact.lastEmailSubject ||
                          mostRecentContact.lastMeetingName) ? (
                        <div className="space-y-3">
                          {/* Most recent interaction (meeting or email) */}
                          <div className="space-y-1">
                            <div className="bg-muted/50 border border-input rounded-md px-3 py-2 text-sm space-y-2 overflow-hidden relative">
                              <div className="absolute top-2 right-2">
                                {mostRecentContact.source === "Gmail" ? (
                                  <button
                                    onClick={() => openGmail(mostRecentContact)}
                                    className="hover:bg-muted/50 p-1 rounded transition-colors"
                                    title="Open in Gmail"
                                  >
                                    <img
                                      src="/icons/gmail.png"
                                      alt="Gmail"
                                      className="h-4 w-4"
                                    />
                                  </button>
                                ) : mostRecentContact.source === "Calendar" ? (
                                  <button
                                    onClick={() =>
                                      openCalendar(mostRecentContact)
                                    }
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
                                {formatRegularDate(
                                  mostRecentContact.lastContact
                                )}
                              </div>
                              <div className="font-medium">
                                <RichText
                                  content={
                                    mostRecentContact.lastEmailSubject ||
                                    mostRecentContact.lastMeetingName ||
                                    ""
                                  }
                                  className="prose-sm font-medium"
                                />
                              </div>
                              {mostRecentContact.lastEmailPreview && (
                                <div className="text-foreground max-w-full overflow-hidden">
                                  <EmailText
                                    content={mostRecentContact.lastEmailPreview}
                                    className="break-words"
                                  />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* If most recent was a meeting, also show most recent email */}
                          {mostRecentEmail &&
                            mostRecentContact.source === "Calendar" && (
                              <div className="space-y-1">
                                <div className="text-xs text-muted-foreground font-medium">
                                  Last Email
                                </div>
                                <div className="bg-muted/50 border border-input rounded-md px-3 py-2 text-sm space-y-2 overflow-hidden relative">
                                  <div className="absolute top-2 right-2">
                                    <button
                                      onClick={() => openGmail(mostRecentEmail)}
                                      className="hover:bg-muted/50 p-1 rounded transition-colors"
                                      title="Open in Gmail"
                                    >
                                      <img
                                        src="/icons/gmail.png"
                                        alt="Gmail"
                                        className="h-4 w-4"
                                      />
                                    </button>
                                  </div>
                                  <div className="text-muted-foreground text-xs">
                                    {formatRegularDate(
                                      mostRecentEmail.lastContact
                                    )}
                                  </div>
                                  <div className="font-medium">
                                    <RichText
                                      content={
                                        mostRecentEmail.lastEmailSubject || ""
                                      }
                                      className="prose-sm font-medium"
                                    />
                                  </div>
                                  {mostRecentEmail.lastEmailPreview && (
                                    <div className="text-foreground max-w-full overflow-hidden">
                                      <EmailText
                                        content={
                                          mostRecentEmail.lastEmailPreview
                                        }
                                        className="break-words"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>

                <h3 className="font-medium text-sm text-muted-foreground">
                  Contacts
                </h3>
                <div className="space-y-2">
                  {selectedCompany.contacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => {
                        setSelectedCompany(null);
                        setIsCompanySheetOpen(false);
                        handleContactClick(contact);
                      }}
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <ContactAvatar contact={contact} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div
                            className="font-medium text-sm truncate"
                            title={contact.name}
                          >
                            {contact.name}
                          </div>
                          <div
                            className="text-xs text-muted-foreground truncate"
                            title={contact.email}
                          >
                            {contact.email}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatRelativeDate(contact.lastContact)}
                      </div>
                    </div>
                  ))}
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

      {/* Contact Edit Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-[400px] sm:w-[500px] lg:w-[600px] max-w-[90vw] overflow-y-auto">
          {editedContact && (
            <>
              <SheetHeader className="space-y-3">
                <SheetTitle className="sr-only">Edit Contact</SheetTitle>

                <div className="flex items-center space-x-4">
                  <ContactAvatar contact={editedContact} size="lg" />
                  <div className="flex-1 min-w-0 space-y-0">
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
                        className="text-lg font-semibold cursor-pointer px-0 py-1 rounded truncate"
                        onClick={() => setEditingName(true)}
                        title={editedContact.name || "Contact Name"}
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
                        className="text-sm text-muted-foreground cursor-pointer px-0 py-1 rounded truncate"
                        onClick={() => setEditingEmail(true)}
                      >
                        {editedContact.email || "email@example.com"}
                      </div>
                    )}
                  </div>
                </div>
              </SheetHeader>

              <div className="grid gap-6 py-6">
                <div className="flex gap-2">
                  <Button
                    variant={editedContact.starred ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      const updatedContact = {
                        ...editedContact,
                        starred: !editedContact.starred,
                      };
                      setEditedContact(updatedContact);
                      saveContactDebounced(updatedContact);
                    }}
                    className="flex-1 flex items-center gap-2"
                  >
                    <Star
                      className={`h-4 w-4 ${
                        editedContact.starred ? "fill-current" : ""
                      }`}
                    />
                    {editedContact.starred ? "Starred" : "Star"}
                  </Button>
                  <Button
                    variant={editedContact.hidden ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      const updatedContact = {
                        ...editedContact,
                        hidden: !editedContact.hidden,
                      };
                      setEditedContact(updatedContact);
                      saveContactDebounced(updatedContact);
                    }}
                    className="flex-1 flex items-center gap-2"
                  >
                    {editedContact.hidden ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                    {editedContact.hidden ? "Hidden" : "Hide"}
                  </Button>
                </div>

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
                  <Label className="text-sm font-medium">Tags</Label>
                  <TagInput
                    tags={editedContact.tags || []}
                    onTagsChange={(newTags) => {
                      const updatedContact = {
                        ...editedContact,
                        tags: newTags,
                      };
                      setEditedContact(updatedContact);
                      saveContactDebounced(updatedContact);
                    }}
                    suggestions={allTags}
                    placeholder="Add tags..."
                    customColors={customTagColors}
                  />
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
                                  className="break-words"
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

      {/* Tag Management Sheet */}
      <Sheet open={showTagManager} onOpenChange={setShowTagManager}>
        <SheetContent className="w-[400px] sm:w-[500px] lg:w-[600px] max-w-[90vw] overflow-y-auto">
          {editingTag && (
            <>
              <SheetHeader className="space-y-3">
                <SheetTitle className="flex items-center gap-2">
                  <Pencil className="h-4 w-4" />
                  Edit Tag
                </SheetTitle>
                <SheetDescription>
                  Edit the tag name and color. Changes will apply to all
                  contacts and companies using this tag.
                </SheetDescription>
              </SheetHeader>

              <div className="grid gap-6 py-6">
                <div className="space-y-2">
                  <Label htmlFor="tagName" className="text-sm font-medium">
                    Tag Name
                  </Label>
                  <Input
                    id="tagName"
                    value={editingTag.newName}
                    onChange={(e) => {
                      setEditingTag({
                        ...editingTag,
                        newName: e.target.value,
                      });
                    }}
                    placeholder="Tag name"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Color</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {TAG_COLORS.map((color, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setEditingTag({
                            ...editingTag,
                            color: color,
                          });
                        }}
                        className={`h-8 w-full rounded-md border-2 ${
                          color.bg
                        } ${color.text} ${
                          editingTag.color === color ||
                          (!editingTag.color &&
                            getTagColor(editingTag.oldName, customTagColors) ===
                              color)
                            ? "border-gray-900"
                            : "border-gray-200 hover:border-gray-400"
                        } flex items-center justify-center text-xs font-medium`}
                      >
                        Aa
                      </button>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Current:{" "}
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded ${
                        editingTag.color
                          ? `${editingTag.color.bg} ${editingTag.color.text}`
                          : `${
                              getTagColor(editingTag.oldName, customTagColors)
                                .bg
                            } ${
                              getTagColor(editingTag.oldName, customTagColors)
                                .text
                            }`
                      }`}
                    >
                      {editingTag.newName}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={async () => {
                      if (editingTag.color) {
                        updateTagColor(editingTag.newName, editingTag.color);
                      }
                      if (editingTag.oldName !== editingTag.newName) {
                        await renameTag(editingTag.oldName, editingTag.newName);
                      }
                      setShowTagManager(false);
                      setEditingTag(null);
                    }}
                    disabled={!editingTag.newName.trim()}
                    className="flex-1"
                  >
                    Save Changes
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowTagManager(false);
                      setEditingTag(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
