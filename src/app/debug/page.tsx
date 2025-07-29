"use client";

import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function DebugPage() {
  const { data: session, status } = useSession();
  const [testResult, setTestResult] = useState<string>("");

  const testAuth = async () => {
    if (!session) return;

    const sessionWithToken = session as {
      accessToken?: string;
      error?: string;
      refreshToken?: string;
    };

    setTestResult("Testing authentication...");

    try {
      const response = await fetch("/api/contacts/refresh", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionWithToken.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refreshToken: sessionWithToken.refreshToken,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setTestResult(`✅ Success! Found ${data.contactsCount} contacts`);
      } else {
        setTestResult(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      setTestResult(`❌ Network error: ${error}`);
    }
  };

  const testGmailAPI = async () => {
    if (!session) return;

    const sessionWithToken = session as {
      accessToken?: string;
      error?: string;
      refreshToken?: string;
    };

    setTestResult("Testing Gmail API directly...");

    try {
      const response = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/profile",
        {
          headers: {
            Authorization: `Bearer ${sessionWithToken.accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTestResult(`✅ Gmail API works! Email: ${data.emailAddress}`);
      } else {
        const errorData = await response.json();
        setTestResult(
          `❌ Gmail API error: ${
            errorData.error?.message || response.statusText
          }`
        );
      }
    } catch (error) {
      setTestResult(`❌ Network error: ${error}`);
    }
  };

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (!session) {
    return <div>Please sign in first</div>;
  }

  const sessionWithToken = session as {
    accessToken?: string;
    error?: string;
    refreshToken?: string;
  };

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Authentication Debug</h1>

      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Session Info</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(
              {
                hasAccessToken: !!sessionWithToken.accessToken,
                hasRefreshToken: !!sessionWithToken.refreshToken,
                hasError: !!sessionWithToken.error,
                accessTokenLength: sessionWithToken.accessToken?.length || 0,
                refreshTokenLength: sessionWithToken.refreshToken?.length || 0,
                error: sessionWithToken.error,
              },
              null,
              2
            )}
          </pre>
        </div>

        <div className="space-y-2">
          <Button onClick={testAuth}>Test Contacts API</Button>
          <Button onClick={testGmailAPI} variant="outline">
            Test Gmail API Directly
          </Button>
        </div>

        {testResult && (
          <div className="p-4 bg-gray-100 rounded">
            <h3 className="font-semibold">Test Result:</h3>
            <p className="text-sm">{testResult}</p>
          </div>
        )}
      </div>
    </div>
  );
}
