export interface Contact {
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

export interface ContactEdit {
  id: string;
  name: string;
  email: string;
  company: string;
  updatedAt: string;
  hidden?: boolean;
  starred?: boolean;
  tags?: string[];
}

export interface Company {
  name: string;
  contactCount: number;
  lastContact: string;
  contacts: Contact[];
  hidden?: boolean;
  website?: string;
  starred?: boolean;
  tags?: string[];
}

export type SortField = "name" | "email" | "company" | "lastContact" | "tags";
export type SortDirection = "asc" | "desc";
export type View = "contacts" | "companies";
export type ViewType = "table" | "kanban";

export interface TagColor {
  bg: string;
  text: string;
  border: string;
}

export interface TagInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  disabled?: boolean;
  customColors?: Record<string, TagColor>;
}

export interface TagDisplayProps {
  tags: string[];
  maxDisplay?: number;
  size?: "sm" | "md";
  customColors?: Record<string, TagColor>;
}

export interface KanbanCardProps {
  item: Contact | Company;
  type: "contact" | "company";
  customColors: Record<string, TagColor>;
  columnTag: string;
  onClick: () => void;
  onDragStart?: (item: Contact | Company, sourceTag: string) => void;
}

export interface KanbanColumnProps {
  tag: string;
  items: (Contact | Company)[];
  type: "contact" | "company";
  customColors: Record<string, TagColor>;
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

export interface KanbanBoardProps {
  items: (Contact | Company)[];
  type: "contact" | "company";
  customColors: Record<string, TagColor>;
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