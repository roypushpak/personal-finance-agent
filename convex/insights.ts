import { action, query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api, internal } from "./_generated/api";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db
      .query("insights")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(20);
  },
});

export const generateInsights = action({
  args: {},
  handler: async (ctx): Promise<any[]> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get recent transactions for analysis
    const currentDate = new Date();
    const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const startDate = lastMonth.toISOString().split('T')[0];
    const endDate = currentDate.toISOString().split('T')[0];

    const transactions: any = await ctx.runQuery(api.transactions.list, {
      startDate,
      endDate,
    });

    const budgets: any = await ctx.runQuery(api.budgets.list);
    const goals: any = await ctx.runQuery(api.goals.list);

    const insights = [];

    // Budget alerts
    for (const budget of budgets) {
      if (budget.percentageUsed > 80) {
        insights.push({
          type: "budget_alert" as const,
          title: `Budget Alert: ${budget.category?.name}`,
          description: `You've used ${budget.percentageUsed.toFixed(1)}% of your ${budget.category?.name} budget`,
          priority: budget.percentageUsed > 100 ? "high" as const : "medium" as const,
        });
      }
    }

    // Spending patterns
    const categorySpending: Record<string, number> = transactions
      .filter((t: any) => t.type === "expense")
      .reduce((acc: Record<string, number>, t: any) => {
        const categoryName = t.category?.name || "Unknown";
        acc[categoryName] = (acc[categoryName] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

    const topCategory = Object.entries(categorySpending)
      .sort(([,a], [,b]) => (b as number) - (a as number))[0];

    if (topCategory) {
      insights.push({
        type: "spending_pattern" as const,
        title: "Top Spending Category",
        description: `Your highest spending this month is ${topCategory[0]} with $${topCategory[1].toFixed(2)}`,
        priority: "low" as const,
      });
    }

    // Goal progress
    for (const goal of goals) {
      if (goal.status === "active" && goal.daysRemaining < 30 && goal.progress < 50) {
        insights.push({
          type: "goal_progress" as const,
          title: `Goal Behind Schedule: ${goal.name}`,
          description: `Only ${goal.daysRemaining} days left and ${goal.progress.toFixed(1)}% complete`,
          priority: "high" as const,
        });
      }
    }

    // Save insights to database
    for (const insight of insights) {
      await ctx.runMutation(internal.insights.create, {
        userId,
        ...insight,
      });
    }

    return insights;
  },
});

export const create = internalMutation({
  args: {
    userId: v.id("users"),
    type: v.union(
      v.literal("spending_pattern"),
      v.literal("budget_alert"),
      v.literal("saving_opportunity"),
      v.literal("goal_progress")
    ),
    title: v.string(),
    description: v.string(),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("insights", {
      ...args,
      isRead: false,
    });
  },
});

export const markAsRead = mutation({
  args: { id: v.id("insights") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const insight = await ctx.db.get(args.id);
    if (!insight || insight.userId !== userId) {
      throw new Error("Insight not found or unauthorized");
    }

    return await ctx.db.patch(args.id, { isRead: true });
  },
});
