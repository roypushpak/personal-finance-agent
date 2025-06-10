import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

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
    description: v.string(),
    date: v.string(),
    category: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("plaidTransactions")
      .withIndex("by_user_and_transaction", (q) => 
        q.eq("userId", args.userId).eq("transactionId", args.transactionId)
      )
      .first();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("plaidTransactions", args);
  },
});

export const getAccounts = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db
      .query("plaidAccounts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const getPlaidTransactions = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db
      .query("plaidTransactions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(args.limit || 50);
  },
});
