"use server";

import { z } from "zod";
import { assertSortieAdmin } from "@/features/sortie/lib/require-sortie-admin";
import {
  searchTicketmasterAdminFull,
  type TicketmasterAdminEvent,
} from "@/features/sortie/lib/ticketmaster-admin";

const schema = z.object({
  query: z.string().min(2).max(200),
});

export type SearchAdminResult =
  | { ok: true; results: TicketmasterAdminEvent[] }
  | { ok: false; message: string };

export async function searchTicketmasterAdminAction(input: unknown): Promise<SearchAdminResult> {
  await assertSortieAdmin();
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Requête invalide." };
  }
  const { results, error } = await searchTicketmasterAdminFull(parsed.data.query, 20);
  if (error) {
    return { ok: false, message: error };
  }
  return { ok: true, results };
}
