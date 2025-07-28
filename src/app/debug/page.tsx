"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

interface ExtendedSession {
  accessToken?: string;
  error?: string;
  user?: {
    email?: string;
    name?: string;
    image?: string;
  };
}

export default function DebugPage() {
  const { data: session, status } = useSession();
  const [envCheck, setEnvCheck] = useState<Record<string, boolean>>({});
  const [apiTest, setApiTest] = useState<string>("");
  const [cacheInfo, setCacheInfo] = useState<string>("");

  // Check cache status
  const checkCache = () => {
    try {
      const cached = localStorage.getItem("rolodex-contacts-cache");
      const timestamp = localStorage.getItem(
        "rolodex-contacts-cache-timestamp"
      );

      if (!cached || !timestamp) {
        setCacheInfo("No cached contacts found");
        return;
      }

      const contacts = JSON.parse(cached);
      const cacheAge = Date.now() - parseInt(timestamp);
      const ageHours = Math.round(cacheAge / (1000 * 60 * 60));

      setCacheInfo(
        `Cached ${contacts.length} contacts (${ageHours} hours old)`
      );
    } catch (error) {
      setCacheInfo(`Error reading cache: ${error}`);
    }
  };

  // Clear cache
  const clearCache = () => {
    try {
      localStorage.removeItem("rolodex-contacts-cache");
      localStorage.removeItem("rolodex-contacts-cache-timestamp");
      setCacheInfo("Cache cleared");
    } catch (error) {
      setCacheInfo(`Error clearing cache: ${error}`);
    }
  };

  useEffect(() => {
    // Check environment variables (client-side won't see server vars, but we can test endpoints)
    const checkEnv = {
      hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
      hasGoogleClientId: !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    };
    setEnvCheck(checkEnv);

    // Test API endpoint
    fetch("/api/test")
      .then((res) => (res.ok ? res.text() : Promise.reject(res.status)))
      .then((data) => setApiTest(`✅ API working: ${data}`))
      .catch((err) => setApiTest(`❌ API failed: ${err}`));

    // Check cache status on mount
    checkCache();
  }, []);

  return (
    <div className="min-h-screen p-8 space-y-6">
      <h1 className="text-2xl font-bold">Rolodex Debug Page</h1>

      <div className="space-y-4">
        <div className="border p-4 rounded">
          <h2 className="font-semibold mb-2">Authentication Status</h2>
          <p>
            <strong>Status:</strong> {status}
          </p>
          <p>
            <strong>Session:</strong>{" "}
            {session ? "✅ Authenticated" : "❌ Not authenticated"}
          </p>
          {session && (
            <div>
              <p>
                <strong>User:</strong> {session.user?.email}
              </p>
              <p>
                <strong>Access Token:</strong>{" "}
                {(session as ExtendedSession).accessToken
                  ? "✅ Present"
                  : "❌ Missing"}
              </p>
              <p>
                <strong>Error:</strong>{" "}
                {(session as ExtendedSession).error || "None"}
              </p>
            </div>
          )}
        </div>

        <div className="border p-4 rounded">
          <h2 className="font-semibold mb-2">Environment Check</h2>
          <p>
            <strong>NEXTAUTH_URL:</strong>{" "}
            {envCheck.hasNextAuthUrl ? "✅" : "❌"}
          </p>
          <p>
            <strong>GOOGLE_CLIENT_ID:</strong>{" "}
            {envCheck.hasGoogleClientId ? "✅" : "❌"}
          </p>
        </div>

        <div className="border p-4 rounded">
          <h2 className="font-semibold mb-2">API Test</h2>
          <p>{apiTest || "Testing..."}</p>
        </div>

        <div className="border p-4 rounded">
          <h2 className="font-semibold mb-2">Browser Info</h2>
          <p>
            <strong>User Agent:</strong>{" "}
            {typeof window !== "undefined"
              ? navigator.userAgent
              : "Server-side"}
          </p>
          <p>
            <strong>Cookies Enabled:</strong>{" "}
            {typeof window !== "undefined"
              ? navigator.cookieEnabled
                ? "✅"
                : "❌"
              : "Server-side"}
          </p>
          <p>
            <strong>Local Storage:</strong>{" "}
            {typeof Storage !== "undefined" ? "✅" : "❌"}
          </p>
        </div>

        <div className="border p-4 rounded">
          <h2 className="font-semibold mb-2">Console Errors</h2>
          <p>
            Check the browser console (F12 → Console tab) for any JavaScript
            errors.
          </p>
          <p>Common issues: CORS errors, 404s, authentication failures</p>
        </div>

        <div className="border p-4 rounded">
          <h2 className="font-semibold mb-2">Cache Management</h2>
          <p className="mb-2">
            {cacheInfo || "Click 'Check Cache' to see status"}
          </p>
          <div className="space-x-2">
            <button
              onClick={checkCache}
              className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
            >
              Check Cache
            </button>
            <button
              onClick={clearCache}
              className="bg-red-500 text-white px-3 py-1 rounded text-sm"
            >
              Clear Cache
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <button
          onClick={() => (window.location.href = "/")}
          className="bg-blue-500 text-white px-4 py-2 rounded mr-4"
        >
          Back to Main Page
        </button>
        <button
          onClick={() => window.location.reload()}
          className="bg-gray-500 text-white px-4 py-2 rounded"
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
}
