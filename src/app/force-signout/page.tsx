"use client";

import { signOut } from "next-auth/react";
import { useEffect } from "react";

export default function ForceSignOut() {
  useEffect(() => {
    // Clear any cached session data
    localStorage.clear();
    sessionStorage.clear();

    // Force sign out
    signOut({
      redirect: false,
      callbackUrl: "/",
    }).then(() => {
      // Redirect to home after sign out
      window.location.href = "/";
    });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-medium">Clearing Session...</h1>
        <p className="text-sm text-muted-foreground">
          Signing out and clearing cached data
        </p>
      </div>
    </div>
  );
}
