"use client";

import { useState, useCallback } from "react";

export const useSheetState = <T>() => {
  const [selectedItem, setSelectedItem] = useState<T | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [editedItem, setEditedItem] = useState<T | null>(null);

  const openSheet = useCallback((item: T) => {
    setSelectedItem(item);
    setEditedItem({ ...item });
    setIsOpen(true);
  }, []);

  const closeSheet = useCallback(() => {
    setIsOpen(false);
    setSelectedItem(null);
    setEditedItem(null);
  }, []);

  return {
    selectedItem,
    editedItem,
    setEditedItem,
    isOpen,
    setIsOpen,
    openSheet,
    closeSheet,
  };
}; 