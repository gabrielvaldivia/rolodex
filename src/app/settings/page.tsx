"use client";

import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Settings() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [lastAutoSync, setLastAutoSync] = useState<string | null>(null);

  useEffect(() => {
    // Load auto-sync setting from localStorage
    const savedAutoSync = localStorage.getItem("rolodex-auto-sync");
    if (savedAutoSync !== null) {
      setAutoSyncEnabled(savedAutoSync === "true");
    }

    // Load last sync time from localStorage
    const savedLastSync = localStorage.getItem("rolodex-last-sync");
    if (savedLastSync) {
      setLastAutoSync(savedLastSync);
    }
  }, []);

  const handleAutoSyncToggle = (enabled: boolean) => {
    setAutoSyncEnabled(enabled);
    localStorage.setItem("rolodex-auto-sync", enabled.toString());
  };

  const handleManualSync = async () => {
    try {
      // Check if we have a valid session with access token
      const sessionWithToken = session as {
        accessToken?: string;
        error?: string;
      };
      if (!sessionWithToken?.accessToken) {
        console.error("No access token in session:", sessionWithToken);
        if (sessionWithToken?.error === "RefreshAccessTokenError") {
          console.error("Token refresh failed, signing out...");
          router.push("/");
          return;
        }
        throw new Error("Authentication required");
      }

      const response = await fetch("/api/contacts", {
        headers: {
          Authorization: `Bearer ${sessionWithToken.accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Update cache
        localStorage.setItem("rolodex-contacts", JSON.stringify(data));
        localStorage.setItem("rolodex-contacts-time", Date.now().toString());

        // Update last sync time
        const now = new Date().toLocaleTimeString();
        setLastAutoSync(now);
        localStorage.setItem("rolodex-last-sync", now);

        // Redirect back to contacts
        router.push("/");
      } else {
        console.error("Failed to sync contacts:", response.status);
      }
    } catch (error) {
      console.error("Error syncing contacts:", error);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-2xl mx-auto">Loading...</div>
      </div>
    );
  }

  if (!session) {
    router.push("/");
    return null;
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Contacts
          </Button>
          <h1 className="text-2xl font-medium">Settings</h1>
        </div>

        {/* Settings Cards */}
        <div className="space-y-6">
          {/* Auto Sync Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Auto Sync</CardTitle>
              <CardDescription>
                Automatically sync contacts from Google services every hour
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="auto-sync">Enable Auto Sync</Label>
                  <p className="text-sm text-muted-foreground">
                    Contacts will sync automatically when cache expires
                  </p>
                </div>
                <Switch
                  id="auto-sync"
                  checked={autoSyncEnabled}
                  onCheckedChange={handleAutoSyncToggle}
                />
              </div>
              {lastAutoSync && (
                <div className="text-sm text-muted-foreground">
                  Last auto-sync: {lastAutoSync}
                </div>
              )}
              <div className="pt-2">
                <Button onClick={handleManualSync} variant="outline" size="sm">
                  Sync Now
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Account Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>
                Manage your account and authentication
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Signed in as</Label>
                  <p className="text-sm text-muted-foreground">
                    {session.user?.email}
                  </p>
                </div>
                <Button onClick={() => signOut()} variant="destructive">
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Data Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Data</CardTitle>
              <CardDescription>
                Manage your contact data and cache
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Clear Cache</Label>
                  <p className="text-sm text-muted-foreground">
                    Remove cached contact data to force fresh sync
                  </p>
                </div>
                <Button
                  onClick={() => {
                    localStorage.removeItem("rolodex-contacts");
                    localStorage.removeItem("rolodex-contacts-time");
                    localStorage.removeItem("rolodex-last-sync");
                    router.push("/");
                  }}
                  variant="outline"
                >
                  Clear Cache
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
