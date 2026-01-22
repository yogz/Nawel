import { exec } from "child_process";
import { promisify } from "util";
import { type NextRequest, NextResponse } from "next/server";

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  // Get token from query params or header
  const urlToken = request.nextUrl.searchParams.get("token");
  const headerToken = request.headers.get("x-migration-token");
  const providedToken = urlToken || headerToken;

  // Check authentication
  const migrationToken = process.env.MIGRATION_TOKEN;

  if (migrationToken) {
    // If MIGRATION_TOKEN is set, require it
    if (!providedToken || providedToken !== migrationToken) {
      return NextResponse.json({ error: "Invalid or missing migration token" }, { status: 403 });
    }
  } else {
    // Fallback: only allow in development if no token is configured
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json(
        {
          error:
            "MIGRATION_TOKEN not configured. This endpoint is only available in development mode.",
        },
        { status: 403 }
      );
    }
  }

  try {
    const { stdout, stderr } = await execAsync("npm run db:push", {
      cwd: process.cwd(),
      env: process.env,
    });

    return NextResponse.json({
      success: true,
      stdout,
      stderr,
      message: "Database schema pushed successfully",
    });
  } catch (error: unknown) {
    const err = error as { stdout?: string; stderr?: string; message?: string };
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Unknown error",
        stdout: err.stdout || "",
        stderr: err.stderr || "",
      },
      { status: 500 }
    );
  }
}
