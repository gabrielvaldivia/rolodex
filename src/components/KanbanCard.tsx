"use client";

import { Star } from "lucide-react";
import { KanbanCardProps, Contact, Company } from "@/types";
import { formatRelativeDate } from "@/lib/utils";

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

export default KanbanCard;
