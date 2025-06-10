import { query, internalMutation, action, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { api } from "./_generated/api";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db
      .query("insights")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(10);
  },
});

export const generate = action({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // This is a placeholder for a real insight generation engine
    await ctx.runMutation(internal.insights.create, {
      title: "Goal Behind Schedule: Emergency Fund",
      description: "You are behind schedule on your emergency fund. Consider increasing your contributions.",
      type: "goal_progress",
      priority: "high",
      userId: userId,
    });
  },
});

export const create = internalMutation({
    args: {
        title: v.string(),
        description: v.string(),
        type: v.union(v.literal("spending_pattern"), v.literal("budget_alert"), v.literal("saving_opportunity"), v.literal("goal_progress")),
        priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert("insights", {
            ...args,
            isRead: false,
        });
    }
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
