import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }
    return await ctx.db
      .query("categories")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    type: v.union(v.literal("income"), v.literal("expense")),
    color: v.string(),
    icon: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("categories", {
      ...args,
      userId,
    });
  },
});

export const createDefaultCategories = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const defaultCategories = [
      // Expense categories
      { name: "Food & Dining", type: "expense" as const, color: "#ef4444", icon: "🍽️" },
      { name: "Transportation", type: "expense" as const, color: "#3b82f6", icon: "🚗" },
      { name: "Shopping", type: "expense" as const, color: "#8b5cf6", icon: "🛍️" },
      { name: "Entertainment", type: "expense" as const, color: "#f59e0b", icon: "🎬" },
      { name: "Bills & Utilities", type: "expense" as const, color: "#10b981", icon: "⚡" },
      { name: "Healthcare", type: "expense" as const, color: "#ec4899", icon: "🏥" },
      { name: "Education", type: "expense" as const, color: "#6366f1", icon: "📚" },
      { name: "Travel", type: "expense" as const, color: "#14b8a6", icon: "✈️" },
      // Income categories
      { name: "Salary", type: "income" as const, color: "#22c55e", icon: "💼" },
      { name: "Freelance", type: "income" as const, color: "#84cc16", icon: "💻" },
      { name: "Investment", type: "income" as const, color: "#06b6d4", icon: "📈" },
      { name: "Other Income", type: "income" as const, color: "#a855f7", icon: "💰" },
    ];

    const categoryIds = [];
    for (const category of defaultCategories) {
      const id = await ctx.db.insert("categories", {
        ...category,
        userId,
        isDefault: true,
      });
      categoryIds.push(id);
    }

    return categoryIds;
  },
});

export const getOrCreate = internalMutation({
  args: {
    name: v.string(),
    type: v.union(v.literal("income"), v.literal("expense")),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("categories")
      .withIndex("by_user_and_name", (q) => 
        q.eq("userId", args.userId).eq("name", args.name)
      )
      .first();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("categories", {
      name: args.name,
      type: args.type,
      userId: args.userId,
      isDefault: false,
      color: "#888888", // Default color
      icon: "💰", // Default icon
    });
  },
});
