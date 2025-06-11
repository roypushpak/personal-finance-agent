"use node";

import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

export const exportTransactions = action({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const transactions = await ctx.runQuery(api.plaidData.getPlaidTransactions, { limit: 1000 });

    // CSV header
    let csv = 'Date,Description,Category,Amount,Type\n';

    // CSV rows
    for (const t of transactions) {
      const row = [
        t.date,
        `"${t.description || t.name}"`,
        t.category?.name || 'Uncategorized',
        t.amount,
        t.type,
      ].join(',');
      csv += row + '\n';
    }

    return csv;
  },
});
