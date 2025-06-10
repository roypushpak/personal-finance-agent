"use node";

import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api, internal } from "./_generated/api";
import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from "plaid";

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
        country_codes: [CountryCode.Us],
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

      // Fetch and sync initial transactions
      await ctx.runAction(internal.plaid.syncTransactions, {
        userId,
        accessToken,
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
    accessToken: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30); // Last 30 days
      const endDate = new Date();

      const response = await plaidClient.transactionsGet({
        access_token: args.accessToken,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
      });

      const accounts = response.data.accounts;
      const transactions = response.data.transactions;

      // Store accounts
      for (const account of accounts) {
        await ctx.runMutation(internal.plaidData.storeAccount, {
          userId: args.userId,
          accountId: account.account_id,
          name: account.name,
          type: account.type,
          subtype: account.subtype || "",
          balance: account.balances.current || 0,
        });
      }

      // Store transactions
      for (const transaction of transactions) {
        await ctx.runMutation(internal.plaidData.storeTransaction, {
          userId: args.userId,
          transactionId: transaction.transaction_id,
          accountId: transaction.account_id,
          amount: transaction.amount,
          description: transaction.name,
          date: transaction.date,
          category: transaction.category?.[0] || "Other",
        });
      }

      return { synced: transactions.length };
    } catch (error) {
      console.error('Error syncing transactions:', error);
      throw new Error('Failed to sync transactions');
    }
  },
});
