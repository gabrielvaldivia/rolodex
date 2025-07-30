"use client";

import { useState, useCallback, useEffect } from "react";
import { saveToLocalStorage, loadFromLocalStorage } from "@/lib/utils";

export const useLocalStorage = <T>(key: string, defaultValue: T) => {
  const [value, setValue] = useState<T>(() => 
    loadFromLocalStorage(key, defaultValue)
  );

  const updateValue = useCallback((newValue: T) => {
    setValue(newValue);
    saveToLocalStorage(key, newValue);
  }, [key]);

  // Sync with localStorage changes from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          const newValue = JSON.parse(e.newValue);
          setValue(newValue);
        } catch (error) {
          console.error(`Failed to parse localStorage value for key ${key}:`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [value, updateValue] as const;
}; 