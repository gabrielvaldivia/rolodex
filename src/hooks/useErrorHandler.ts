"use client";

import { useCallback } from "react";

export const useErrorHandler = () => {
  const handleAsyncOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    errorMessage: string = "Operation failed"
  ): Promise<T | null> => {
    try {
      return await operation();
    } catch (error) {
      console.error(errorMessage, error);
      const message = error instanceof Error ? error.message : errorMessage;
      // You could add toast notification here
      return null;
    }
  }, []);

  const handleApiError = useCallback((response: Response, defaultMessage: string = "API request failed") => {
    if (!response.ok) {
      return response.json().then(errorData => {
        throw new Error(errorData.error || defaultMessage);
      }).catch(() => {
        throw new Error(defaultMessage);
      });
    }
    return response.json();
  }, []);

  return { handleAsyncOperation, handleApiError };
}; 