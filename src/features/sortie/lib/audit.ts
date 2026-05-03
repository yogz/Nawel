import { createHash } from "node:crypto";
import { getClientIp } from "./rate-limit";

/**
 * SHA-256 of the client IP + the BETTER_AUTH_SECRET pepper. The pepper makes
 * the hash unjoinable across deployments — a leaked audit-log dump on its
 * own can't be cross-referenced with another logger to identify a user. Used
 * by every audit insert; returns null when the IP is not resolvable so the
 * column stays nullable rather than logging a sentinel like "unknown".
 */
export async function hashIp(): Promise<string | null> {
  const ip = await getClientIp();
  if (!ip || ip === "unknown") {
    return null;
  }
  const pepper = process.env.BETTER_AUTH_SECRET ?? "";
  return createHash("sha256")
    .update(ip + pepper)
    .digest("hex");
}

export const TICKET_AUDIT_ACTION = {
  TICKET_UPLOADED: "TICKET_UPLOADED",
  TICKET_REVOKED: "TICKET_REVOKED",
  TICKET_DOWNLOADED: "TICKET_DOWNLOADED",
  TICKET_DOWNLOAD_DENIED: "TICKET_DOWNLOAD_DENIED",
} as const;
