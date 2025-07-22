"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import CryptoJS from "crypto-js";

interface ContactAvatarProps {
  contact: {
    name: string;
    email: string;
    photoUrl?: string;
  };
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

function getInitials(name: string): string {
  // Handle edge cases
  if (!name || name.trim() === "") {
    return "?";
  }

  // Get first letter of first word only (like Gmail)
  const firstWord = name.trim().split(/\s+/)[0];
  return firstWord.charAt(0).toUpperCase();
}

function generateGravatarUrl(email: string, size: number = 150): string {
  // Create proper MD5 hash of email for Gravatar (like Gmail does)
  const emailLower = email.toLowerCase().trim();
  const hash = CryptoJS.MD5(emailLower).toString();

  // Return Gravatar URL with fallback to 404 (so we can detect if no Gravatar exists)
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=404`;
}

function generateFallbackColor(email: string): string {
  // Generate a consistent color based on email hash
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }

  const colors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-amber-500",
    "bg-yellow-500",
    "bg-lime-500",
    "bg-green-500",
    "bg-emerald-500",
    "bg-teal-500",
    "bg-cyan-500",
    "bg-sky-500",
    "bg-blue-500",
    "bg-indigo-500",
    "bg-violet-500",
    "bg-purple-500",
    "bg-fuchsia-500",
    "bg-pink-500",
    "bg-rose-500",
  ];

  return colors[Math.abs(hash) % colors.length];
}

function getSizeClasses(size: ContactAvatarProps["size"]): string {
  switch (size) {
    case "sm":
      return "h-6 w-6 text-xs";
    case "md":
      return "h-10 w-10 text-sm";
    case "lg":
      return "h-16 w-16 text-lg";
    case "xl":
      return "h-20 w-20 text-xl";
    default:
      return "h-10 w-10 text-sm";
  }
}

export function ContactAvatar({
  contact,
  size = "md",
  className,
}: ContactAvatarProps) {
  const initials = getInitials(contact.name);
  const fallbackColor = generateFallbackColor(contact.email);
  const sizeClasses = getSizeClasses(size);
  const sizePixels =
    size === "sm" ? 24 : size === "md" ? 40 : size === "lg" ? 64 : 80;
  const gravatarUrl = generateGravatarUrl(contact.email, sizePixels * 2); // 2x for retina

  // Debug logging
  if (contact.photoUrl) {
    console.log(
      `ContactAvatar: ${contact.email} has photoUrl:`,
      contact.photoUrl
    );
  }

  return (
    <Avatar className={`${sizeClasses} relative ${className || ""}`}>
      {/* Try Google profile photo first */}
      {contact.photoUrl && (
        <AvatarImage
          src={contact.photoUrl}
          alt={`${contact.name} avatar`}
          onLoad={() => {
            console.log(
              `Google photo loaded successfully for ${contact.email}`
            );
          }}
          onError={(e) => {
            console.log(
              `Google photo failed for ${contact.email}, trying Gravatar...`
            );
            // Try Gravatar as fallback
            const target = e.target as HTMLImageElement;
            target.src = gravatarUrl;
            target.onerror = () => {
              console.log(
                `Gravatar also failed for ${contact.email}, showing initials`
              );
              target.style.display = "none";
            };
            target.onload = () => {
              console.log(`Gravatar loaded successfully for ${contact.email}`);
            };
          }}
        />
      )}

      {/* Try Gravatar if no Google photo */}
      {!contact.photoUrl && (
        <AvatarImage
          src={gravatarUrl}
          alt={`${contact.name} avatar`}
          onLoad={() => {
            console.log(
              `Gravatar loaded successfully for ${contact.email} (no Google photo)`
            );
          }}
          onError={(e) => {
            console.log(
              `Gravatar failed for ${contact.email}, showing initials`
            );
            const target = e.target as HTMLImageElement;
            target.style.display = "none";
          }}
        />
      )}

      <AvatarFallback
        className={`${fallbackColor} text-white font-semibold border-0`}
      >
        {initials}
      </AvatarFallback>

      {/* Inner border overlay */}
      <div className="absolute inset-0 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)] pointer-events-none z-10"></div>
    </Avatar>
  );
}
