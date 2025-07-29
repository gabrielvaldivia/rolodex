"use client";

import { KanbanColumnProps, Contact, Company } from "@/types";
import { getTagColor } from "@/lib/utils";
import KanbanCard from "./KanbanCard";

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

export default KanbanColumn;
