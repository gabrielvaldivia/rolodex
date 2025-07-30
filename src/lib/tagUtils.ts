export const updateTagsForMove = (
  currentTags: string[],
  sourceTag: string,
  targetTag: string
): string[] => {
  if (sourceTag === targetTag) return currentTags;

  if (targetTag === "No Tags") {
    return [];
  } else if (sourceTag === "No Tags") {
    return [targetTag];
  } else {
    const newTags = currentTags.map((tag) => 
      tag === sourceTag ? targetTag : tag
    );
    if (!currentTags.includes(sourceTag)) {
      newTags.push(targetTag);
    }
    return newTags;
  }
};

export const getTagDisplayInfo = (
  tags: string[],
  maxDisplay: number = 3
) => {
  if (!tags || tags.length === 0) {
    return { displayTags: [], remainingCount: 0 };
  }

  const displayTags = tags.slice(0, maxDisplay);
  const remainingCount = Math.max(0, tags.length - maxDisplay);

  return { displayTags, remainingCount };
}; 