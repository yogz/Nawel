"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Database, Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function DatabasePage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message?: string;
    stdout?: string;
    stderr?: string;
    error?: string;
  } | null>(null);

  const handlePush = async () => {
    setLoading(true);
    setResult(null);

    try {
      const url = token ? `/api/db/push?token=${encodeURIComponent(token)}` : "/api/db/push";
      const response = await fetch(url, {
        method: "POST",
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl p-8">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Database Management</h1>
          <p className="text-muted-foreground">Push your Drizzle schema changes to the database</p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Push Schema to Database</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              This will synchronize your database schema with the latest Drizzle schema definitions.
              This is equivalent to running{" "}
              <code className="rounded bg-muted px-1 py-0.5">npm run db:push</code>
            </p>

            <Button onClick={handlePush} disabled={loading} className="w-full sm:w-auto" size="lg">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Pushing schema...
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  Push Schema
                </>
              )}
            </Button>
          </div>
        </div>

        {result && (
          <div
            className={`rounded-lg border p-6 ${
              result.success
                ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950"
                : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950"
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {result.success ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <h3 className="font-semibold text-green-900 dark:text-green-100">Success</h3>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    <h3 className="font-semibold text-red-900 dark:text-red-100">Error</h3>
                  </>
                )}
              </div>

              {result.message && (
                <p className="text-sm text-green-800 dark:text-green-200">{result.message}</p>
              )}

              {result.error && (
                <p className="text-sm text-red-800 dark:text-red-200">{result.error}</p>
              )}

              {result.stdout && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Output:
                  </p>
                  <pre className="overflow-x-auto rounded bg-muted p-3 text-xs">
                    {result.stdout}
                  </pre>
                </div>
              )}

              {result.stderr && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Errors:
                  </p>
                  <pre className="overflow-x-auto rounded bg-muted p-3 text-xs text-red-600 dark:text-red-400">
                    {result.stderr}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
          <div className="flex gap-3">
            <div className="text-amber-600 dark:text-amber-400">⚠️</div>
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-amber-900 dark:text-amber-100">Security Notice</p>
              {token ? (
                <p className="text-amber-800 dark:text-amber-200">
                  Using migration token from URL. Make sure to keep this token secret and do not
                  share this link publicly.
                </p>
              ) : (
                <div className="space-y-2 text-amber-800 dark:text-amber-200">
                  <p>
                    To use this page in production or preview environments, set the{" "}
                    <code className="rounded bg-amber-100 px-1 py-0.5 dark:bg-amber-900">
                      MIGRATION_TOKEN
                    </code>{" "}
                    environment variable and add{" "}
                    <code className="rounded bg-amber-100 px-1 py-0.5 dark:bg-amber-900">
                      ?token=your-secret
                    </code>{" "}
                    to the URL.
                  </p>
                  <p className="text-xs">
                    Example:{" "}
                    <code className="rounded bg-amber-100 px-1 py-0.5 dark:bg-amber-900">
                      /db?token=my-secret-token
                    </code>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
