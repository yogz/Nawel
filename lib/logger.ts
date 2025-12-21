import { headers } from "next/headers";
import { db } from "./db";
import { changeLogs } from "@/drizzle/schema";

type Action = "create" | "update" | "delete";
type TableName = "items" | "meals" | "people" | "days" | "events";

function getUserInfo() {
  try {
    const headersList = headers();
    const userAgent = headersList.get("user-agent") || null;
    const referer = headersList.get("referer") || null;
    
    // Récupérer l'IP (priorité aux headers de proxy)
    const forwardedFor = headersList.get("x-forwarded-for");
    const realIp = headersList.get("x-real-ip");
    const cfConnectingIp = headersList.get("cf-connecting-ip"); // Cloudflare
    const userIp = cfConnectingIp || realIp || (forwardedFor ? forwardedFor.split(",")[0].trim() : null) || null;
    
    return {
      userIp,
      userAgent,
      referer,
    };
  } catch (error) {
    // En cas d'erreur, retourner des valeurs null
    return {
      userIp: null,
      userAgent: null,
      referer: null,
    };
  }
}

export async function logChange(
  action: Action,
  tableName: TableName,
  recordId: number,
  oldData?: Record<string, any> | null,
  newData?: Record<string, any> | null
) {
  try {
    const userInfo = getUserInfo();
    await db.insert(changeLogs).values({
      action,
      tableName,
      recordId,
      oldData: oldData ? JSON.stringify(oldData) : null,
      newData: newData ? JSON.stringify(newData) : null,
      userIp: userInfo.userIp,
      userAgent: userInfo.userAgent,
      referer: userInfo.referer,
    });
  } catch (error) {
    // Ne pas faire échouer l'opération principale si le log échoue
    console.error("Erreur lors du logging:", error);
  }
}

