"use client";

import { TagDisplayProps } from "@/types";
import { getTagColor } from "@/lib/utils";
import { cn } from "@/lib/cn";

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
            className={cn(
              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded",
              colors.bg,
              colors.text,
              size === "sm" ? "text-xs" : "text-sm"
            )}
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

export default TagDisplay;
