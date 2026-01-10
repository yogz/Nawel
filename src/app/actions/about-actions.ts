"use server";

import { db } from "@/lib/db";
import { costs } from "@drizzle/schema";
import { withErrorThrower } from "@/lib/action-utils";

export const getPublicCostsAction = withErrorThrower(async () => {
  const allCosts = await db.query.costs.findMany({
    orderBy: (costs, { desc }) => [desc(costs.date)],
  });

  return allCosts;
});
