"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ContactAvatar } from "@/components/ContactAvatar";
import TagDisplay from "@/components/TagDisplay";
import { Contact, Company, SortField } from "@/types";
import { formatRelativeDate } from "@/lib/utils";
import { TableColumn } from "@/lib/tableConfig";

interface DataTableProps {
  data: (Contact | Company)[];
  columns: TableColumn[];
  viewType: "contacts" | "companies";
  onItemClick: (item: Contact | Company) => void;
  onSort: (field: SortField) => void;
  getSortIcon: (field: SortField) => string;
  customTagColors: Record<string, { bg: string; text: string; border: string }>;
}

export default function DataTable({
  data,
  columns,
  viewType,
  onItemClick,
  onSort,
  getSortIcon,
  customTagColors,
}: DataTableProps) {
  const renderCell = (item: Contact | Company, column: TableColumn) => {
    switch (column.key) {
      case "avatar":
        if (viewType === "contacts") {
          const contact = item as Contact;
          return (
            <ContactAvatar contact={contact} size="sm" className="mx-auto" />
          );
        }
        return null;

      case "name":
        return (
          <span className="truncate">
            {viewType === "contacts"
              ? (item as Contact).name
              : (item as Company).name}
          </span>
        );

      case "email":
        if (viewType === "contacts") {
          return (item as Contact).email;
        }
        return null;

      case "company":
        if (viewType === "contacts") {
          return (item as Contact).company || "—";
        }
        // For companies view, show contact info
        const company = item as Company;
        const sortedContacts = [...company.contacts].sort((a, b) => {
          if (a.lastContact === "Unknown" && b.lastContact === "Unknown")
            return 0;
          if (a.lastContact === "Unknown") return 1;
          if (b.lastContact === "Unknown") return -1;
          return (
            new Date(b.lastContact).getTime() -
            new Date(a.lastContact).getTime()
          );
        });

        const mostRecentContact = sortedContacts[0];
        const remainingCount = company.contactCount - 1;

        if (company.contactCount === 1) {
          return mostRecentContact.name;
        } else {
          return `${mostRecentContact.name} + ${remainingCount} other${
            remainingCount === 1 ? "" : "s"
          }`;
        }

      case "tags":
        const tags =
          viewType === "contacts"
            ? (item as Contact).tags || []
            : (item as Company).tags || [];
        return (
          <TagDisplay
            tags={tags}
            maxDisplay={viewType === "contacts" ? 2 : 3}
            customColors={customTagColors}
          />
        );

      case "source":
        if (viewType === "contacts") {
          const contact = item as Contact;
          return (
            <div className="flex justify-center">
              {contact.source === "Gmail" ? (
                <img src="/icons/gmail.png" alt="Gmail" className="h-4 w-4" />
              ) : contact.source === "Calendar" ? (
                <img
                  src="/icons/calendar.png"
                  alt="Calendar"
                  className="h-4 w-4"
                />
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </div>
          );
        }
        return null;

      case "lastContact":
        const lastContact =
          viewType === "contacts"
            ? (item as Contact).lastContact
            : (item as Company).lastContact;
        return (
          <span className="text-sm">{formatRelativeDate(lastContact)}</span>
        );

      default:
        return null;
    }
  };

  return (
    <div className="overflow-x-auto px-8">
      <Table className="w-full">
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead
                key={column.key}
                onClick={() =>
                  column.sortable ? onSort(column.key as SortField) : undefined
                }
                className={`${
                  column.sortable ? "cursor-pointer hover:bg-muted/50" : ""
                } ${column.width} ${
                  column.align === "center" ? "text-center" : ""
                } ${column.align === "right" ? "text-right" : ""}`}
              >
                {column.label}{" "}
                {column.sortable && getSortIcon(column.key as SortField)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow
              key={
                viewType === "contacts"
                  ? (item as Contact).id
                  : (item as Company).name
              }
              className="cursor-pointer hover:bg-muted/50"
            >
              {columns.map((column) => (
                <TableCell
                  key={column.key}
                  onClick={() => onItemClick(item)}
                  className={`${
                    column.key === "avatar" || column.key === "source"
                      ? "text-center"
                      : column.key === "lastContact"
                      ? "text-right"
                      : ""
                  } ${
                    column.key === "name" ||
                    column.key === "email" ||
                    column.key === "company"
                      ? "truncate"
                      : ""
                  } ${column.width}`}
                >
                  {renderCell(item, column)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
