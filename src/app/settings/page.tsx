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
import { ArrowLeft, RefreshCw } from "lucide-react";
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

  // Handle redirect when there's no session
  useEffect(() => {
    if (status !== "loading" && !session) {
      router.push("/");
    }
  }, [session, status, router]);

  const handleAutoSyncToggle = (enabled: boolean) => {
    setAutoSyncEnabled(enabled);
    localStorage.setItem("rolodex-auto-sync", enabled.toString());
  };

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncStatus("Syncing contacts...");

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
          setSyncStatus("Authentication failed - please sign in again");
          setIsSyncing(false);
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

        setSyncStatus(`✅ Successfully synced ${data.length} contacts`);

        // Clear status after 3 seconds
        setTimeout(() => setSyncStatus(null), 3000);
      } else {
        console.error("Failed to sync contacts:", response.status);
        setSyncStatus("❌ Sync failed - please try again");
        setTimeout(() => setSyncStatus(null), 3000);
      }
    } catch (error) {
      console.error("Error syncing contacts:", error);
      setSyncStatus("❌ Sync failed - please try again");
      setTimeout(() => setSyncStatus(null), 3000);
    } finally {
      setIsSyncing(false);
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
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-2xl mx-auto">Redirecting...</div>
      </div>
    );
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
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-medium">Settings</h1>
        </div>

        {/* Settings Cards */}
        <div className="space-y-6">
          {/* Auto Sync Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Auto Sync</CardTitle>
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
              <div className="pt-2 flex items-center gap-3">
                <Button
                  onClick={handleManualSync}
                  variant="outline"
                  size="sm"
                  disabled={isSyncing}
                  className="relative"
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      Syncing...
                    </>
                  ) : (
                    "Sync Now"
                  )}
                </Button>
                {lastAutoSync && (
                  <div className="text-xs text-muted-foreground">
                    Last sync: {lastAutoSync}
                  </div>
                )}
              </div>
              {syncStatus && (
                <div className="pt-2">
                  <div className="text-sm text-muted-foreground">
                    {syncStatus}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Account Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
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
