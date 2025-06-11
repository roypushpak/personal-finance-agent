"use node";

import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api, internal } from "./_generated/api";
import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from "plaid";

// Define a type for the categorized results
type CategorizedResult = {
  id: string;
  category: string;
  type: "income" | "expense";
};

const configuration = new Configuration({
  basePath: PlaidEnvironments.sandbox, // Use sandbox for development
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});

const plaidClient = new PlaidApi(configuration);

export const createLinkToken = action({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    try {
      const response = await plaidClient.linkTokenCreate({
        user: {
          client_user_id: userId,
        },
        client_name: "Personal Finance App",
        products: [Products.Transactions],
        country_codes: [CountryCode.Ca],
        language: 'en',
      });

      return { link_token: response.data.link_token };
    } catch (error) {
      console.error('Error creating link token:', error);
      throw new Error('Failed to create link token');
    }
  },
});

export const exchangePublicToken = action({
  args: {
    publicToken: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    try {
      const response = await plaidClient.itemPublicTokenExchange({
        public_token: args.publicToken,
      });

      const accessToken = response.data.access_token;
      const itemId = response.data.item_id;

      // Store the access token securely
      await ctx.runMutation(internal.plaidData.storeAccessToken, {
        userId,
        accessToken,
        itemId,
      });

      // Fetch accounts and store them
      const accountsResponse = await plaidClient.accountsGet({ access_token: accessToken });
      for (const account of accountsResponse.data.accounts) {
        await ctx.runMutation(internal.plaidData.storeAccount, {
          userId,
          accountId: account.account_id,
          name: account.name,
          type: account.type,
          subtype: account.subtype || "",
          balance: account.balances.current || 0,
        });
      }

      // Fetch and sync initial transactions
      await ctx.runAction(internal.plaid.syncTransactions, {
        userId,
        itemId,
      });

      return { success: true };
    } catch (error) {
      console.error('Error exchanging public token:', error);
      throw new Error('Failed to exchange public token');
    }
  },
});

export const syncTransactions = internalAction({
  args: {
    userId: v.id("users"),
    itemId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const token = await ctx.runQuery(api.users.getAccessToken, { itemId: args.itemId });
      if (!token) throw new Error("Access token not found");

      let cursor = await ctx.runMutation(internal.plaidData.getSyncCursor, { itemId: args.itemId });

      let added: any[] = [];
      let modified: any[] = [];
      let removed: any[] = [];
      let hasMore = true;

      while (hasMore) {
        const response = await plaidClient.transactionsSync({
          access_token: token.accessToken,
          cursor: cursor || undefined,
        });

        added = added.concat(response.data.added);
        modified = modified.concat(response.data.modified);
        removed = removed.concat(response.data.removed);
        hasMore = response.data.has_more;
        cursor = response.data.next_cursor;
      }

      const userCategories = await ctx.runQuery(api.categories.list);
      const categoryNames = userCategories.map(c => c.name);

      // Batch categorize transactions
      const transactionsToCategorize = [...added, ...modified].map(t => ({ id: t.transaction_id, description: t.name }));
      
      if (transactionsToCategorize.length > 0) {
        const categorizedResults: CategorizedResult[] = await ctx.runAction(internal.aiAssistant.batchCategorizeTransactions, {
          transactions: transactionsToCategorize,
          userCategories: categoryNames,
        });

        const categorizedMap = new Map(categorizedResults.map((r: CategorizedResult) => [r.id, r]));

        // Process added/modified transactions
        for (const transaction of [...added, ...modified]) {
          const categorizedResult = categorizedMap.get(transaction.transaction_id);
          if (!categorizedResult) continue; // Skip if no categorization result

          const { category: categoryName, type: transactionType } = categorizedResult;

          const categoryId = await ctx.runMutation(internal.categories.getOrCreate, {
            name: categoryName,
            type: transactionType,
            userId: args.userId,
          });

          if (categoryId) {
            await ctx.runMutation(internal.plaidData.storeTransaction, {
              userId: args.userId,
              transactionId: transaction.transaction_id,
              accountId: transaction.account_id,
              amount: Math.abs(transaction.amount),
              name: transaction.name,
              description: transaction.name,
              paymentChannel: transaction.payment_channel || "unknown",
              pending: transaction.pending,
              date: transaction.date,
              categoryId: categoryId,
              type: transactionType,
            });
          }
        }
      }

      // TODO: Handle removed transactions

      await ctx.runMutation(internal.plaidData.updateSyncCursor, {
        itemId: args.itemId,
        cursor: cursor!,
      });

      return { synced: added.length + modified.length };
    } catch (error) {
      console.error('Error syncing transactions:', error);
      throw new Error('Failed to sync transactions');
    }
  },
});
