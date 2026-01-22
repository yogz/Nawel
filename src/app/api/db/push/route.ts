import { exec } from "child_process";
import { promisify } from "util";
import { NextResponse } from "next/server";

const execAsync = promisify(exec);

export async function POST() {
  // Security: Only allow in development
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Only available in development mode" }, { status: 403 });
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
