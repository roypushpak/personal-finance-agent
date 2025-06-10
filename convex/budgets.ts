import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const budgets = await ctx.db
      .query("budgets")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Get category details and spending for each budget
    const budgetsWithDetails = await Promise.all(
      budgets.map(async (budget) => {
        const category = await ctx.db.get(budget.categoryId);
        
        // Calculate current spending for this budget period
        const transactions = await ctx.db
          .query("transactions")
          .withIndex("by_category", (q) => q.eq("categoryId", budget.categoryId))
          .filter((q) => 
            q.and(
              q.eq(q.field("userId"), userId),
              q.gte(q.field("date"), budget.startDate),
              q.lte(q.field("date"), budget.endDate),
              q.eq(q.field("type"), "expense")
            )
          )
          .collect();

        const spent = transactions.reduce((sum, t) => sum + t.amount, 0);
        const remaining = budget.amount - spent;
        const percentageUsed = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;

        return {
          ...budget,
          category,
          spent,
          remaining,
          percentageUsed,
          isOverBudget: spent > budget.amount,
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
