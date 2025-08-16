"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Settings,
  RefreshCw,
  X,
  SlidersHorizontal,
  Check,
  Star,
  Tag,
  TableProperties,
  LayoutGrid,
  Eye,
  EyeOff,
} from "lucide-react";
import { Contact, Company } from "@/types";
import { getTagColor } from "@/lib/utils";

interface HeaderControlsProps {
  currentView: "contacts" | "companies";
  viewType: "table" | "kanban";
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  saveCurrentView: (view: "contacts" | "companies") => void;
  saveViewType: (type: "table" | "kanban") => void;
  showGmail: boolean;
  setShowGmail: (show: boolean) => void;
  showCalendar: boolean;
  setShowCalendar: (show: boolean) => void;
  showStarred: boolean;
  setShowStarred: (show: boolean) => void;
  showHidden: boolean;
  setShowHidden: (show: boolean) => void;
  selectedTags: string[];
  setSelectedTags: (tags: string[]) => void;
  allTags: string[];
  customTagColors: Record<string, { bg: string; text: string; border: string }>;
  filteredContacts: Contact[];
  filteredCompanies: Company[];
  loading: boolean;
  backgroundSyncing: boolean;
  fetchContacts: (background: boolean) => void;
  forceRefreshCache?: () => void;
  isCacheStale?: () => boolean;
  onSettingsClick: () => void;
}

export default function HeaderControls({
  currentView,
  viewType,
  searchTerm,
  setSearchTerm,
  saveCurrentView,
  saveViewType,
  showGmail,
  setShowGmail,
  showCalendar,
  setShowCalendar,
  showStarred,
  setShowStarred,
  showHidden,
  setShowHidden,
  selectedTags,
  setSelectedTags,
  allTags,
  customTagColors,
  filteredContacts,
  filteredCompanies,
  loading,
  backgroundSyncing,
  fetchContacts,
  forceRefreshCache,
  isCacheStale,
  onSettingsClick,
}: HeaderControlsProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 px-8">
      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-auto p-0 text-2xl font-medium hover:bg-transparent"
            >
              {currentView === "contacts"
                ? `${filteredContacts.length} Contacts`
                : `${filteredCompanies.length} Companies`}
              <svg
                className="ml-1 h-5 w-5 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem
              onClick={() => saveCurrentView("contacts")}
              className={`cursor-pointer ${
                currentView === "contacts" ? "bg-muted" : ""
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span>Contacts</span>
                {currentView === "contacts" && <Check className="h-4 w-4" />}
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => saveCurrentView("companies")}
              className={`cursor-pointer ${
                currentView === "companies" ? "bg-muted" : ""
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span>Companies</span>
                {currentView === "companies" && <Check className="h-4 w-4" />}
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-0">
          <Input
            placeholder={currentView === "contacts" ? "Search" : "Search"}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 pr-8 text-sm md:text-sm"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-8 w-8 p-0 hover:bg-transparent"
              onClick={() => setSearchTerm("")}
            >
              <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
            </Button>
          )}
        </div>
        {/* View Type Toggle */}
        <div className="flex items-center gap-0.5 bg-muted p-0.5 rounded-lg h-8">
          <button
            onClick={() => saveViewType("table")}
            className={`px-2 py-1 transition-colors h-7 flex items-center ${
              viewType === "table"
                ? "bg-background text-foreground shadow-sm rounded-md"
                : "text-muted-foreground hover:text-foreground rounded"
            }`}
            title="Table view"
          >
            <TableProperties className="h-3 w-3" />
          </button>
          <button
            onClick={() => saveViewType("kanban")}
            className={`px-2 py-1 transition-colors h-7 flex items-center ${
              viewType === "kanban"
                ? "bg-background text-foreground shadow-sm rounded-md"
                : "text-muted-foreground hover:text-foreground rounded"
            }`}
            title="Kanban view"
          >
            <LayoutGrid className="h-3 w-3" />
          </button>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={`relative ${
                !showGmail ||
                !showCalendar ||
                showHidden ||
                showStarred ||
                selectedTags.length > 0
                  ? "border-blue-500 bg-blue-50 hover:bg-blue-100"
                  : ""
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              {(!showGmail ||
                !showCalendar ||
                showHidden ||
                showStarred ||
                selectedTags.length > 0) && (
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-blue-500 rounded-full"></span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            {/* Tag filter section */}
            {allTags.length > 0 && (
              <>
                <DropdownMenuLabel className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Filter by tags
                  {selectedTags.length > 0 && (
                    <button
                      onClick={() => setSelectedTags([])}
                      className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                    >
                      Clear all
                    </button>
                  )}
                </DropdownMenuLabel>
                <div className="py-1 max-h-32 overflow-y-auto">
                  <div className="space-y-1">
                    {allTags.slice(0, 8).map((tag) => {
                      const colors = getTagColor(tag, customTagColors);
                      return (
                        <DropdownMenuItem
                          key={tag}
                          onSelect={(e) => e.preventDefault()}
                          onClick={() => {
                            if (selectedTags.includes(tag)) {
                              setSelectedTags(
                                selectedTags.filter((t) => t !== tag)
                              );
                            } else {
                              setSelectedTags([...selectedTags, tag]);
                            }
                          }}
                          className="flex items-center gap-2 cursor-pointer text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`flex items-center justify-center w-4 h-4 rounded-sm border-2 ${
                                selectedTags.includes(tag)
                                  ? "bg-primary border-primary"
                                  : "border-muted-foreground/30"
                              }`}
                            >
                              {selectedTags.includes(tag) && (
                                <Check className="h-3 w-3 text-primary-foreground" />
                              )}
                            </div>
                            <span
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded ${colors.bg} ${colors.text}`}
                            >
                              <span className="truncate">{tag}</span>
                            </span>
                          </div>
                        </DropdownMenuItem>
                      );
                    })}

                    {/* No Tags option */}
                    <DropdownMenuItem
                      onSelect={(e) => e.preventDefault()}
                      onClick={() => {
                        const noTagsFilter = "No Tags";
                        if (selectedTags.includes(noTagsFilter)) {
                          setSelectedTags(
                            selectedTags.filter((t) => t !== noTagsFilter)
                          );
                        } else {
                          setSelectedTags([...selectedTags, noTagsFilter]);
                        }
                      }}
                      className="flex items-center gap-2 cursor-pointer text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`flex items-center justify-center w-4 h-4 rounded-sm border-2 ${
                            selectedTags.includes("No Tags")
                              ? "bg-primary border-primary"
                              : "border-muted-foreground/30"
                          }`}
                        >
                          {selectedTags.includes("No Tags") && (
                            <Check className="h-3 w-3 text-primary-foreground" />
                          )}
                        </div>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded bg-gray-100 text-gray-800">
                          <span className="truncate">No Tags</span>
                        </span>
                      </div>
                    </DropdownMenuItem>
                    {allTags.length > 8 && (
                      <div className="text-xs text-muted-foreground px-2 py-1">
                        +{allTags.length - 8} more tags available
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(e) => e.preventDefault()}
              onClick={() => setShowGmail(!showGmail)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <img src="/icons/gmail.png" alt="Gmail" className="h-4 w-4" />
              <span>Gmail</span>
              {showGmail && <Check className="h-4 w-4 ml-auto" />}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(e) => e.preventDefault()}
              onClick={() => setShowCalendar(!showCalendar)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <img
                src="/icons/calendar.png"
                alt="Calendar"
                className="h-4 w-4"
              />
              <span>Calendar</span>
              {showCalendar && <Check className="h-4 w-4 ml-auto" />}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(e) => e.preventDefault()}
              onClick={() => setShowStarred(!showStarred)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Star className="h-4 w-4" />
              <span>Starred</span>
              {showStarred && <Check className="h-4 w-4 ml-auto" />}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(e) => e.preventDefault()}
              onClick={() => setShowHidden(!showHidden)}
              className="flex items-center gap-2 cursor-pointer"
            >
              {showHidden ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              <span>Hidden</span>
              {showHidden && <Check className="h-4 w-4 ml-auto" />}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (forceRefreshCache) {
              forceRefreshCache();
            } else {
              fetchContacts(true);
            }
          }}
          variant={isCacheStale?.() ? "destructive" : "outline"}
          size="sm"
          disabled={loading || backgroundSyncing}
          type="button"
          title={
            isCacheStale?.()
              ? "Cache is stale - click to refresh"
              : "Refresh contacts"
          }
        >
          <RefreshCw
            className={`h-4 w-4 ${backgroundSyncing ? "animate-spin" : ""}`}
          />
        </Button>
        <Button onClick={onSettingsClick} variant="outline" size="sm">
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
