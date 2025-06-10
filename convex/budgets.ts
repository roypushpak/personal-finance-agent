import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "./_generated/api";

export const list = query({
  args: {
    year: v.optional(v.number()),
    month: v.optional(v.number()), // 1-12
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    let budgetQuery = ctx.db
      .query("budgets")
      .withIndex("by_user", (q) => q.eq("userId", userId));

    if (args.year && args.month) {
      const startOfMonth = new Date(args.year, args.month - 1, 1).toISOString().split("T")[0];
      const endOfMonth = new Date(args.year, args.month, 0).toISOString().split("T")[0];
      budgetQuery = budgetQuery.filter((q) =>
        q.and(
          q.lte(q.field("startDate"), endOfMonth),
          q.gte(q.field("endDate"), startOfMonth)
        )
      );
    }

    const budgets = await budgetQuery.collect();

    const budgetsWithDetails = await Promise.all(
      budgets.map(async (budget) => {
        const category = await ctx.db.get(budget.categoryId);
        
        const manualTransactions = await ctx.db
          .query("transactions")
          .withIndex("by_user_and_date", (q) =>
            q.eq("userId", userId).gte("date", budget.startDate).lte("date", budget.endDate)
          )
          .filter((q) => q.eq(q.field("categoryId"), budget.categoryId))
          .collect();

        const plaidTransactions = await ctx.db
          .query("plaidTransactions")
          .withIndex("by_user_and_date", (q) =>
            q.eq("userId", userId).gte("date", budget.startDate).lte("date", budget.endDate)
          )
          .filter((q) => q.eq(q.field("categoryId"), budget.categoryId))
          .collect();
        
        const spent = [...manualTransactions, ...plaidTransactions]
          .filter(t => t.type === "expense")
          .reduce((sum, t) => sum + t.amount, 0);

        const remaining = budget.amount - spent;
        const percentageUsed = (spent / budget.amount) * 100;
        const isOverBudget = spent > budget.amount;

        return {
          ...budget,
          category,
          spent,
          remaining,
          percentageUsed,
          isOverBudget,
        };
      })
    );
    
    return budgetsWithDetails;
  },
});

export const create = mutation({
  args: {
    categoryId: v.id("categories"),
    amount: v.number(),
    period: v.union(v.literal("monthly"), v.literal("yearly")),
    startDate: v.string(),
    endDate: v.string(),
    alertThreshold: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("budgets", {
      ...args,
      userId,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("budgets"),
    amount: v.optional(v.number()),
    alertThreshold: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const { id, ...updates } = args;
    const budget = await ctx.db.get(id);
    
    if (!budget || budget.userId !== userId) {
      throw new Error("Budget not found or unauthorized");
    }

    return await ctx.db.patch(id, updates);
  },
});

export const remove = mutation({
  args: { id: v.id("budgets") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const budget = await ctx.db.get(args.id);
    if (!budget || budget.userId !== userId) {
      throw new Error("Budget not found or unauthorized");
    }

    return await ctx.db.delete(args.id);
  },
});
