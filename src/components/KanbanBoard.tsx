"use client";

import { KanbanBoardProps, Contact, Company } from "@/types";
import KanbanColumn from "./KanbanColumn";

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

export default KanbanBoard;
