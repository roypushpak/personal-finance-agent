import { mutation, query, internalMutation, action } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api, internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";

export const storeAccessToken = internalMutation({
  args: {
    userId: v.id("users"),
    accessToken: v.string(),
    itemId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("plaidTokens", {
      userId: args.userId,
      accessToken: args.accessToken,
      itemId: args.itemId,
    });
  },
});

export const updateSyncCursor = internalMutation({
  args: {
    itemId: v.string(),
    cursor: v.string(),
  },
  handler: async (ctx, args) => {
    const token = await ctx.db
      .query("plaidTokens")
      .withIndex("by_item", (q) => q.eq("itemId", args.itemId))
      .first();
    if (!token) throw new Error("Access token not found");

    return await ctx.db.patch(token._id, { syncCursor: args.cursor });
  },
});

export const getSyncCursor = internalMutation({
  args: {
    itemId: v.string(),
  },
  handler: async (ctx, args) => {
    const token = await ctx.db
      .query("plaidTokens")
      .withIndex("by_item", (q) => q.eq("itemId", args.itemId))
      .first();
    return token?.syncCursor;
  },
});

export const storeAccount = internalMutation({
  args: {
    userId: v.id("users"),
    accountId: v.string(),
    name: v.string(),
    type: v.string(),
    subtype: v.string(),
    balance: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("plaidAccounts")
      .withIndex("by_user_and_account", (q) => 
        q.eq("userId", args.userId).eq("accountId", args.accountId)
      )
      .first();

    if (existing) {
      return await ctx.db.patch(existing._id, {
        balance: args.balance,
      });
    }

    return await ctx.db.insert("plaidAccounts", args);
  },
});

export const storeTransaction = internalMutation({
  args: {
    userId: v.id("users"),
    transactionId: v.string(),
    accountId: v.string(),
    amount: v.number(),
    name: v.string(),
    description: v.optional(v.string()),
    paymentChannel: v.optional(v.string()),
    pending: v.optional(v.boolean()),
    date: v.string(),
    categoryId: v.id("categories"),
    type: v.union(v.literal("income"), v.literal("expense")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("plaidTransactions")
      .withIndex("by_user_and_transaction", (q) =>
        q.eq("userId", args.userId).eq("transactionId", args.transactionId)
      )
      .first();

    if (existing) {
      return await ctx.db.patch(existing._id, {
        amount: args.amount,
        name: args.name,
        description: args.description,
        paymentChannel: args.paymentChannel,
        pending: args.pending,
        date: args.date,
        categoryId: args.categoryId,
        type: args.type,
      });
    }

    return await ctx.db.insert("plaidTransactions", args);
  },
});

export const getAccounts = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }
    return await ctx.db
      .query("plaidAccounts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const getTransactions = query({
  args: { accountId: v.string() },
  handler: async (ctx, { accountId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    // Verify the account belongs to the user
    const account = await ctx.db
      .query("plaidAccounts")
      .withIndex("by_user_and_account", (q) =>
        q.eq("userId", userId).eq("accountId", accountId)
      )
      .first();
    if (!account) {
      throw new Error("Account not found or unauthorized");
    }

    return await ctx.db
      .query("plaidTransactions")
      .withIndex("by_account", (q) => q.eq("accountId", accountId))
      .order("desc")
      .take(100);
  },
});

export const getPlaidTransactions = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const transactions = await ctx.db
      .query("plaidTransactions")
      .withIndex("by_user_and_date", (q) => q.eq("userId", userId))
      .order("desc")
      .take(args.limit || 50);

    const transactionsWithCategories = await Promise.all(
      transactions.map(async (transaction) => {
        if (!transaction.categoryId) {
          return { ...transaction, category: null };
        }
        const category = await ctx.db.get(transaction.categoryId);
        return {
          ...transaction,
          category,
        };
      })
    );

    return transactionsWithCategories;
  },
});

export const migrateTransactionsToCategorized = action({
  args: {},
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const transactionsToMigrate = await ctx.runQuery(api.plaidData.getUnmigratedTransactions);

    const userCategories = await ctx.runQuery(api.categories.list);
    const categoryNames = userCategories.map((c: Doc<"categories">) => c.name);

    let migratedCount = 0;
    for (const transaction of transactionsToMigrate) {
        const { category: categoryName, type: transactionType } = 
            await ctx.runAction(internal.aiAssistant.categorizeTransaction, {
            description: transaction.name,
            userCategories: categoryNames,
        });

        const categoryId = await ctx.runMutation(internal.categories.getOrCreate, {
            name: categoryName,
            type: transactionType,
            userId: userId,
        });

        if (categoryId) {
            await ctx.runMutation(internal.plaidData.updatePlaidTransaction, {
                transactionId: transaction._id,
                updates: {
                    categoryId, 
                    type: transactionType,
                    amount: Math.abs(transaction.amount),
                }
            });
            migratedCount++;
        }
    }
    return { migratedCount };
  },
});

export const getUnmigratedTransactions = query({
    args: {},
    handler: async(ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");
        return await ctx.db
            .query("plaidTransactions")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .filter((q) => q.eq(q.field("type"), undefined))
            .collect();
    }
});

export const updatePlaidTransaction = internalMutation({
    args: {
        transactionId: v.id("plaidTransactions"),
        updates: v.object({
            categoryId: v.optional(v.id("categories")),
            type: v.optional(v.union(v.literal("income"), v.literal("expense"))),
            amount: v.optional(v.number()),
            name: v.optional(v.string()),
            description: v.optional(v.string()),
            paymentChannel: v.optional(v.string()),
            pending: v.optional(v.boolean()),
            date: v.optional(v.string()),
        })
    },
    handler: async(ctx, args) => {
        await ctx.db.patch(args.transactionId, args.updates);
    }
});
