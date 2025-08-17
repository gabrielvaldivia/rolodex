"use client";

import { useState, useCallback } from "react";

export const useLoadingState = () => {
  const [loadingStates, setLoadingStates] = useState({
    initial: false,
    background: false,
    saving: false,
  });

  const setLoading = useCallback((key: keyof typeof loadingStates, value: boolean) => {
    setLoadingStates(prev => ({ ...prev, [key]: value }));
  }, []);

  const isLoading = useCallback(() => 
    Object.values(loadingStates).some(Boolean), [loadingStates]
  );

  const getLoadingMessage = useCallback(() => {
    if (loadingStates.background) return "Syncing contacts from Google...";
    if (loadingStates.initial) return "Processing emails...";
    if (loadingStates.saving) return "Saving...";
    return "";
  }, [loadingStates]);

  return { 
    loadingStates, 
    setLoading, 
    isLoading,
    getLoadingMessage,
    // Convenience getters
    initialLoading: loadingStates.initial,
    backgroundLoading: loadingStates.background,
    savingLoading: loadingStates.saving,
  };
}; 