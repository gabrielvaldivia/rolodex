"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export default function ForceSignOutPage() {
  const [isClearing, setIsClearing] = useState(false);

  const clearAllData = () => {
    setIsClearing(true);

    // Clear all localStorage data
    try {
      localStorage.clear();
      console.log("LocalStorage cleared");
    } catch (error) {
      console.error("Error clearing localStorage:", error);
    }

    // Clear all sessionStorage data
    try {
      sessionStorage.clear();
      console.log("SessionStorage cleared");
    } catch (error) {
      console.error("Error clearing sessionStorage:", error);
    }

    // Clear all cookies
    try {
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      console.log("Cookies cleared");
    } catch (error) {
      console.error("Error clearing cookies:", error);
    }

    // Force sign out
    signOut({ callbackUrl: "/" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-6 max-w-md">
        <h1 className="text-2xl font-bold">Force Sign Out</h1>
        <p className="text-muted-foreground">
          This will clear all authentication data and force you to sign in again
          with fresh permissions.
        </p>
        <div className="space-y-4">
          <Button
            onClick={clearAllData}
            disabled={isClearing}
            className="w-full"
          >
            {isClearing ? "Clearing..." : "Clear All Data & Sign Out"}
          </Button>
          <Button
            onClick={() => (window.location.href = "/")}
            variant="outline"
            className="w-full"
          >
            Cancel
          </Button>
        </div>
        <div className="text-xs text-muted-foreground">
          This is useful if you&apos;re experiencing authentication issues with
          Google APIs.
        </div>
      </div>
    </div>
  );
}
