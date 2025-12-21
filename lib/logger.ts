import { db } from "./db";
import { changeLogs } from "@/drizzle/schema";

type Action = "create" | "update" | "delete";
type TableName = "items" | "meals" | "people" | "days";

export async function logChange(
  action: Action,
  tableName: TableName,
  recordId: number,
  oldData?: Record<string, any> | null,
  newData?: Record<string, any> | null
) {
  try {
    await db.insert(changeLogs).values({
      action,
      tableName,
      recordId,
      oldData: oldData ? JSON.stringify(oldData) : null,
      newData: newData ? JSON.stringify(newData) : null,
    });
  } catch (error) {
    // Ne pas faire échouer l'opération principale si le log échoue
    console.error("Erreur lors du logging:", error);
  }
}

