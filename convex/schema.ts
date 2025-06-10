import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  categories: defineTable({
    name: v.string(),
    type: v.union(v.literal("income"), v.literal("expense")),
    color: v.string(),
    icon: v.string(),
    userId: v.id("users"),
    isDefault: v.optional(v.boolean()),
  }).index("by_user", ["userId"]).index("by_user_and_name", ["userId", "name"]),

  transactions: defineTable({
    amount: v.number(),
    description: v.string(),
    categoryId: v.id("categories"),
    date: v.string(), // ISO date string
    type: v.union(v.literal("income"), v.literal("expense")),
    userId: v.id("users"),
    tags: v.optional(v.array(v.string())),
    recurring: v.optional(v.boolean()),
    recurringFrequency: v.optional(v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("monthly"),
      v.literal("yearly")
    )),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_date", ["userId", "date"])
    .index("by_category", ["categoryId"]),

  budgets: defineTable({
    categoryId: v.id("categories"),
    amount: v.number(),
    period: v.union(v.literal("monthly"), v.literal("yearly")),
    userId: v.id("users"),
    startDate: v.string(),
    endDate: v.string(),
    alertThreshold: v.optional(v.number()), // percentage (0-100)
  })
    .index("by_user", ["userId"])
    .index("by_category", ["categoryId"]),

  goals: defineTable({
    name: v.string(),
    targetAmount: v.number(),
    currentAmount: v.optional(v.number()),
    targetDate: v.string(),
    description: v.optional(v.string()),
    userId: v.id("users"),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    status: v.union(v.literal("active"), v.literal("completed"), v.literal("paused")),
  }).index("by_user", ["userId"]),

  insights: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("spending_pattern"),
      v.literal("budget_alert"),
      v.literal("saving_opportunity"),
      v.literal("goal_progress")
    ),
    title: v.string(),
    description: v.string(),
    data: v.optional(v.any()),
    isRead: v.optional(v.boolean()),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
  }).index("by_user", ["userId"]),

  plaidTokens: defineTable({
    userId: v.id("users"),
    accessToken: v.string(),
    itemId: v.string(),
    syncCursor: v.optional(v.string()),
  }).index("by_user", ["userId"]).index("by_item", ["itemId"]),

  plaidAccounts: defineTable({
    userId: v.id("users"),
    accountId: v.string(),
    name: v.string(),
    type: v.string(),
    subtype: v.string(),
    balance: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_account", ["userId", "accountId"]),

  plaidTransactions: defineTable({
    userId: v.id("users"),
    accountId: v.string(),
    transactionId: v.string(),
    amount: v.number(),
    date: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    paymentChannel: v.optional(v.string()),
    pending: v.optional(v.boolean()),
    type: v.union(v.literal("income"), v.literal("expense")),
    categoryId: v.optional(v.id("categories")),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_date", ["userId", "date"])
    .index("by_user_and_transaction", ["userId", "transactionId"])
    .index("by_account", ["accountId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
