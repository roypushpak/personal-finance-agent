import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {
    limit: v.optional(v.number()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    let query = ctx.db
      .query("transactions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc");

    if (args.startDate && args.endDate) {
      query = ctx.db
        .query("transactions")
        .withIndex("by_user_and_date", (q) => 
          q.eq("userId", userId).gte("date", args.startDate!).lte("date", args.endDate!)
        )
        .order("desc");
    }

    const transactions = await query.take(args.limit || 50);

    // Get category details for each transaction
    const transactionsWithCategories = await Promise.all(
      transactions.map(async (transaction) => {
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

export const create = mutation({
  args: {
    amount: v.number(),
    description: v.string(),
    categoryId: v.id("categories"),
    date: v.string(),
    type: v.union(v.literal("income"), v.literal("expense")),
    tags: v.optional(v.array(v.string())),
    recurring: v.optional(v.boolean()),
    recurringFrequency: v.optional(v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("monthly"),
      v.literal("yearly")
    )),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("transactions", {
      ...args,
      userId,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("transactions"),
    amount: v.optional(v.number()),
    description: v.optional(v.string()),
    categoryId: v.optional(v.id("categories")),
    date: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const { id, ...updates } = args;
    const transaction = await ctx.db.get(id);
    
    if (!transaction || transaction.userId !== userId) {
      throw new Error("Transaction not found or unauthorized");
    }

    return await ctx.db.patch(id, updates);
  },
});

export const remove = mutation({
  args: { id: v.id("transactions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const transaction = await ctx.db.get(args.id);
    if (!transaction || transaction.userId !== userId) {
      throw new Error("Transaction not found or unauthorized");
    }

    return await ctx.db.delete(args.id);
  },
});

export const getMonthlyStats = query({
  args: {
    year: v.number(),
    month: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const startDate = new Date(args.year, args.month - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(args.year, args.month, 0).toISOString().split('T')[0];

    const manualTransactions = await ctx.db
      .query("transactions")
      .withIndex("by_user_and_date", (q) => 
        q.eq("userId", userId).gte("date", startDate).lte("date", endDate)
      )
      .collect();

    const plaidTransactions = await ctx.db
      .query("plaidTransactions")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", userId).gte("date", startDate).lte("date", endDate)
      )
      .collect();

    const allTransactions = [...manualTransactions, ...plaidTransactions];

    const totalIncome = allTransactions
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = allTransactions
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    const categoryBreakdown = allTransactions.reduce((acc, transaction) => {
      if (!transaction.categoryId) return acc;
      const categoryId = transaction.categoryId;
      if (!acc[categoryId]) {
        acc[categoryId] = { income: 0, expense: 0 };
      }
      if (transaction.type) {
          acc[categoryId][transaction.type] += transaction.amount;
      }
      return acc;
    }, {} as Record<string, { income: number; expense: number }>);
    
    return {
      totalIncome,
      totalExpenses,
      netIncome: totalIncome - totalExpenses,
      transactionCount: allTransactions.length,
      categoryBreakdown,
    };
  },
});
