"use client";

import { signIn, signOut, getSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function ManualSync() {
  const [status, setStatus] = useState<string>("");
  const [contacts, setContacts] = useState<any[]>([]);

  const handleFreshSignIn = async () => {
    setStatus("Signing in with fresh session...");

    // Force a fresh sign in
    const result = await signIn("google", {
      redirect: false,
      callbackUrl: "/manual-sync",
    });

    if (result?.ok) {
      setStatus("Signed in! Getting fresh session...");

      // Wait a moment for session to be established
      setTimeout(async () => {
        const session = await getSession();
        console.log("Fresh session:", session);

        if (session && (session as any).accessToken) {
          setStatus(
            `✅ Got access token: ${(
              (session as any).accessToken as string
            ).substring(0, 20)}...`
          );
          await testContactsAPI((session as any).accessToken);
        } else {
          setStatus("❌ Still no access token in session");
        }
      }, 2000);
    } else {
      setStatus("❌ Sign in failed");
    }
  };

  const testContactsAPI = async (accessToken: string) => {
    setStatus("Testing contacts API...");

    try {
      const response = await fetch("/api/contacts", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        setStatus(`❌ API Error: ${errorData.error}`);
        return;
      }

      const data = await response.json();
      setContacts(data);
      setStatus(`✅ Success! Found ${data.length} contacts`);
    } catch (error) {
      setStatus(`❌ Request failed: ${error}`);
    }
  };

  return (
    <div className="min-h-screen p-8 space-y-6">
      <h1 className="text-2xl font-bold">Manual Sync Test</h1>

      <div className="space-y-4">
        <Button onClick={handleFreshSignIn} className="w-full">
          Fresh Sign In & Test API
        </Button>

        <Button
          onClick={() => signOut({ callbackUrl: "/" })}
          variant="outline"
          className="w-full"
        >
          Sign Out
        </Button>
      </div>

      {status && (
        <div className="p-4 bg-gray-100 rounded">
          <h3 className="font-semibold">Status:</h3>
          <p>{status}</p>
        </div>
      )}

      {contacts.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold">Contacts Found:</h3>
          <div className="max-h-60 overflow-y-auto space-y-1">
            {contacts.slice(0, 10).map((contact, i) => (
              <div key={i} className="text-sm bg-white p-2 rounded border">
                <strong>{contact.name}</strong> - {contact.email}
              </div>
            ))}
            {contacts.length > 10 && (
              <p className="text-sm text-gray-500">
                ...and {contacts.length - 10} more
              </p>
            )}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Button onClick={() => (window.location.href = "/")} variant="outline">
          Back to Main App
        </Button>
      </div>
    </div>
  );
}
