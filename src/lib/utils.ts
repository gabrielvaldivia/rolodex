import { TagColor, Contact } from "@/types";

// Tag color system
export const TAG_COLORS: TagColor[] = [
  { bg: "bg-red-100", text: "text-red-800", border: "border-red-200" },
  { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-200" },
  { bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-200" },
  { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-200" },
  { bg: "bg-lime-100", text: "text-lime-800", border: "border-lime-200" },
  { bg: "bg-green-100", text: "text-green-800", border: "border-green-200" },
  {
    bg: "bg-emerald-100",
    text: "text-emerald-800",
    border: "border-emerald-200",
  },
  { bg: "bg-teal-100", text: "text-teal-800", border: "border-teal-200" },
  { bg: "bg-cyan-100", text: "text-cyan-800", border: "border-cyan-200" },
  { bg: "bg-sky-100", text: "text-sky-800", border: "border-sky-200" },
  { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-200" },
  { bg: "bg-indigo-100", text: "text-indigo-800", border: "border-indigo-200" },
  { bg: "bg-violet-100", text: "text-violet-800", border: "border-violet-200" },
  { bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-200" },
  {
    bg: "bg-fuchsia-100",
    text: "text-fuchsia-800",
    border: "border-fuchsia-200",
  },
  { bg: "bg-pink-100", text: "text-pink-800", border: "border-pink-200" },
  { bg: "bg-rose-100", text: "text-rose-800", border: "border-rose-200" },
  { bg: "bg-gray-100", text: "text-gray-800", border: "border-gray-200" },
  { bg: "bg-slate-100", text: "text-slate-800", border: "border-slate-200" },
  { bg: "bg-zinc-100", text: "text-zinc-800", border: "border-zinc-200" },
];

// Generate consistent color for a tag based on its name
export const getTagColor = (
  tagName: string,
  customColors: Record<string, TagColor> = {}
): TagColor => {
  // Check for custom color first
  if (customColors[tagName]) {
    return customColors[tagName];
  }

  // Simple hash function for consistent color assignment
  let hash = 0;
  for (let i = 0; i < tagName.length; i++) {
    const char = tagName.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  const colorIndex = Math.abs(hash) % TAG_COLORS.length;
  return TAG_COLORS[colorIndex];
};

// Add relative date formatting function
export const formatRelativeDate = (dateString: string): string => {
  if (dateString === "Unknown" || dateString === "Never") return "Unknown";

  const date = new Date(dateString);
  const now = new Date();

  // Handle invalid dates
  if (isNaN(date.getTime())) return "Unknown";

  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  // Handle future dates (shouldn't happen but good to handle)
  if (diffInMs < 0) {
    console.log(
      `Future date detected: ${dateString}, parsed as: ${date.toISOString()}, now: ${now.toISOString()}`
    );
    return "Just now";
  }

  // Handle very recent dates - show minutes and hours
  if (diffInDays === 0) {
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60)
      return `${diffInMinutes} minute${diffInMinutes === 1 ? "" : "s"}`;
    if (diffInHours < 24)
      return `${diffInHours} hour${diffInHours === 1 ? "" : "s"}`;
    return "Today";
  }

  if (diffInDays === 1) return "Yesterday";
  if (diffInDays < 7) return `${diffInDays} days`;
  if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7);
    return weeks === 1 ? "1 week" : `${weeks} weeks`;
  }
  if (diffInDays < 365) {
    const months = Math.floor(diffInDays / 30);
    return months === 1 ? "1 month" : `${months} months`;
  }

  // For contacts more than a year ago, use shortened format
  const years = Math.floor(diffInDays / 365);
  const remainingDays = diffInDays % 365;
  const months = Math.floor(remainingDays / 30);

  if (months === 0) return `${years}y`;
  return `${years}y ${months}m`;
};

// Add regular date formatting function for contact sheet
export const formatRegularDate = (dateString: string): string => {
  if (dateString === "Unknown" || dateString === "Never") return "Unknown";

  const date = new Date(dateString);

  // Handle invalid dates
  if (isNaN(date.getTime())) return "Unknown";

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const month = monthNames[date.getMonth()];
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();

  // Convert to 12-hour format
  const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const ampm = hours >= 12 ? "pm" : "am";
  const minutesStr = minutes.toString().padStart(2, "0");

  return `${month} ${day} at ${hour12}:${minutesStr}${ampm}`;
};

// Generate website URL from company name
export const generateCompanyWebsite = (companyName: string): string => {
  if (!companyName) return "";

  // Clean up the company name
  const cleanName = companyName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "") // Remove special characters
    .replace(/\s+/g, "") // Remove spaces
    .replace(/^(the|a|an)\s+/i, "") // Remove articles
    .replace(/(inc|llc|corp|ltd|company|co)$/i, ""); // Remove company suffixes

  if (!cleanName) return "";

  return `https://${cleanName}.com`;
};

// Local storage utilities
export const saveToLocalStorage = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to save to localStorage (${key}):`, error);
  }
};

export const loadFromLocalStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;
    try {
      return JSON.parse(item);
    } catch (jsonError) {
      // If it's a plain string and the default is a string, return it
      if (typeof defaultValue === "string") return item as unknown as T;
      // Otherwise, fallback to default
      return defaultValue;
    }
  } catch (error) {
    console.error(`Failed to load from localStorage (${key}):`, error);
    return defaultValue;
  }
};

export const removeFromLocalStorage = (key: string) => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Failed to remove from localStorage (${key}):`, error);
  }
};

// External link functions
export const openWebsite = (website: string) => {
  if (website && website !== "https://company.com") {
    // Add https:// if not present
    const url = website.startsWith("http") ? website : `https://${website}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }
};

export const openGmail = (contact: Contact) => {
  // Create Gmail search URL to find emails from this contact
  const searchQuery = `from:${contact.email}`;
  const gmailUrl = `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(
    searchQuery
  )}`;
  window.open(gmailUrl, "_blank", "noopener,noreferrer");
};

export const openCalendar = (contact: Contact) => {
  // Create Google Calendar search URL to find meetings with this contact
  const searchQuery = contact.email;
  const calendarUrl = `https://calendar.google.com/calendar/u/0/r/search?q=${encodeURIComponent(
    searchQuery
  )}`;
  window.open(calendarUrl, "_blank", "noopener,noreferrer");
}; 