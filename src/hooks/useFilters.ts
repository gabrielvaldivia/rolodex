"use client";

import { useState, useCallback, useEffect } from "react";
import { Contact, Company, SortField, SortDirection, View, ViewType } from "@/types";
import { useLocalStorage } from "./useLocalStorage";

export const useFilters = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("lastContact");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentView, setCurrentView] = useLocalStorage<View>("rolodex-current-view", "contacts");
  const [viewType, setViewType] = useLocalStorage<ViewType>("rolodex-view-type", "table");
  const [showHidden, setShowHidden] = useState(false);
  const [showStarred, setShowStarred] = useState(false);
  const [showGmail, setShowGmail] = useState(true);
  const [showCalendar, setShowCalendar] = useState(true);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [customTagColors, setCustomTagColors] = useLocalStorage<
    Record<string, { bg: string; text: string; border: string }>
  >("rolodex-custom-tag-colors", {});
  const [columnOrder, setColumnOrder] = useLocalStorage<string[]>("rolodex-column-order", []);

  // Load tags from localStorage on mount
  useEffect(() => {
    try {
      const savedTags = localStorage.getItem("rolodex-all-tags");
      if (savedTags) {
        const parsedTags = JSON.parse(savedTags);
        if (Array.isArray(parsedTags)) {
          setAllTags(parsedTags);
        }
      }
    } catch (error) {
      console.error("Failed to load tags from localStorage:", error);
    }
  }, []);

  // Extract all unique tags from contacts for autocomplete
  const updateAllTags = useCallback((contacts: Contact[]) => {
    const allTagsSet = new Set<string>();
    contacts.forEach((contact) => {
      if (contact.tags) {
        contact.tags.forEach((tag) => allTagsSet.add(tag));
      }
    });
    const newAllTags = Array.from(allTagsSet).sort();
    setAllTags(newAllTags);
    
    // Persist tags to localStorage for future sessions
    try {
      localStorage.setItem("rolodex-all-tags", JSON.stringify(newAllTags));
    } catch (error) {
      console.error("Failed to save tags to localStorage:", error);
    }
  }, []);

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new field with ascending direction
      setSortField(field);
      setSortDirection("asc");
    }
  }, [sortField, sortDirection]);

  const getSortIcon = useCallback((field: SortField) => {
    if (sortField !== field) {
      return "⇅";
    }
    return sortDirection === "asc" ? "↑" : "↓";
  }, [sortField, sortDirection]);

  const sortContacts = useCallback((contacts: Contact[]) => {
    return [...contacts].sort((a, b) => {
      // Always prioritize starred contacts first
      if (a.starred && !b.starred) return -1;
      if (!a.starred && b.starred) return 1;

      let aVal: string | number;
      let bVal: string | number;

      switch (sortField) {
        case "name":
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case "email":
          aVal = a.email.toLowerCase();
          bVal = b.email.toLowerCase();
          break;
        case "company":
          aVal = (a.company || "").toLowerCase();
          bVal = (b.company || "").toLowerCase();
          break;
        case "lastContact":
          // Handle special case for "Unknown"
          if (a.lastContact === "Unknown") {
            aVal = new Date(0).getTime(); // Very old date
          } else {
            aVal = new Date(a.lastContact).getTime();
          }
          if (b.lastContact === "Unknown") {
            bVal = new Date(0).getTime();
          } else {
            bVal = new Date(b.lastContact).getTime();
          }
          break;
        case "tags":
          // Sort by first tag alphabetically, empty tags go to end
          const aFirstTag =
            a.tags && a.tags.length > 0
              ? a.tags.sort()[0].toLowerCase()
              : "zzz_no_tags";
          const bFirstTag =
            b.tags && b.tags.length > 0
              ? b.tags.sort()[0].toLowerCase()
              : "zzz_no_tags";
          aVal = aFirstTag;
          bVal = bFirstTag;
          break;
        default:
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
      }

      if (sortDirection === "asc") {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });
  }, [sortField, sortDirection]);

  const sortCompanies = useCallback((companies: Company[]) => {
    return [...companies].sort((a, b) => {
      // Always prioritize starred companies first
      if (a.starred && !b.starred) return -1;
      if (!a.starred && b.starred) return 1;

      let aVal: string | number;
      let bVal: string | number;

      switch (sortField) {
        case "name":
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case "company":
          aVal = a.contactCount;
          bVal = b.contactCount;
          break;
        case "lastContact":
          // Handle special case for "Unknown"
          if (a.lastContact === "Unknown") {
            aVal = new Date(0).getTime(); // Very old date
          } else {
            aVal = new Date(a.lastContact).getTime();
          }
          if (b.lastContact === "Unknown") {
            bVal = new Date(0).getTime();
          } else {
            bVal = new Date(b.lastContact).getTime();
          }
          break;
        case "tags":
          // Sort by first tag alphabetically, empty tags go to end
          const aFirstTag =
            a.tags && a.tags.length > 0
              ? a.tags.sort()[0].toLowerCase()
              : "zzz_no_tags";
          const bFirstTag =
            b.tags && b.tags.length > 0
              ? b.tags.sort()[0].toLowerCase()
              : "zzz_no_tags";
          aVal = aFirstTag;
          bVal = bFirstTag;
          break;
        default:
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
      }

      if (sortDirection === "asc") {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });
  }, [sortField, sortDirection]);

  const filterContacts = useCallback((contacts: Contact[]) => {
    return contacts.filter((contact) => {
      const matchesSearch =
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (contact.company || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (contact.tags || []).some((tag) =>
          tag.toLowerCase().includes(searchTerm.toLowerCase())
        );

      const isVisible = showHidden || !contact.hidden;
      const matchesStarred = !showStarred || contact.starred;
      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.some((selectedTag) => {
          if (selectedTag === "No Tags") {
            return !contact.tags || contact.tags.length === 0;
          }
          return (contact.tags || []).includes(selectedTag);
        });

      const matchesSource =
        (contact.source === "Gmail" && showGmail) ||
        (contact.source === "Calendar" && showCalendar);

      return (
        matchesSearch &&
        isVisible &&
        matchesStarred &&
        matchesTags &&
        matchesSource
      );
    });
  }, [searchTerm, showHidden, showStarred, selectedTags, showGmail, showCalendar]);

  const filterCompanies = useCallback((companies: Company[]) => {
    return companies.filter((company) => {
      const matchesSearch =
        company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (company.tags || []).some((tag) =>
          tag.toLowerCase().includes(searchTerm.toLowerCase())
        );
      const isVisible = showHidden || !company.hidden;
      const matchesStarred = !showStarred || company.starred;
      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.some((selectedTag) => {
          if (selectedTag === "No Tags") {
            return !company.tags || company.tags.length === 0;
          }
          return (company.tags || []).includes(selectedTag);
        });

      return matchesSearch && isVisible && matchesStarred && matchesTags;
    });
  }, [searchTerm, showHidden, showStarred, selectedTags]);

  return {
    // State
    searchTerm,
    setSearchTerm,
    sortField,
    sortDirection,
    currentView,
    viewType,
    showHidden,
    setShowHidden,
    showStarred,
    setShowStarred,
    showGmail,
    setShowGmail,
    showCalendar,
    setShowCalendar,
    selectedTags,
    setSelectedTags,
    allTags,
    customTagColors,
    columnOrder,
    
    // Actions
    handleSort,
    getSortIcon,
    sortContacts,
    sortCompanies,
    filterContacts,
    filterCompanies,
    updateAllTags,
    saveCustomTagColors: setCustomTagColors,
    saveViewType: setViewType,
    saveCurrentView: setCurrentView,
    saveColumnOrder: setColumnOrder,
  };
}; 