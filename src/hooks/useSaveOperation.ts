"use client";

import { useState, useCallback } from "react";

export const useSaveOperation = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  const saveWithDebounce = useCallback(async (
    saveFunction: () => Promise<void>,
    delay: number = 300
  ) => {
    if (saveTimeout) clearTimeout(saveTimeout);
    setLastError(null);
    setIsSaving(true);

    const timeout = setTimeout(async () => {
      try {
        await saveFunction();
      } catch (error) {
        setLastError(error instanceof Error ? error.message : "Save failed");
      } finally {
        setIsSaving(false);
      }
    }, delay);

    setSaveTimeout(timeout);
  }, [saveTimeout]);

  const clearSaveState = useCallback(() => {
    if (saveTimeout) clearTimeout(saveTimeout);
    setIsSaving(false);
    setLastError(null);
    setSaveTimeout(null);
  }, [saveTimeout]);

  return { isSaving, lastError, saveWithDebounce, clearSaveState };
}; 