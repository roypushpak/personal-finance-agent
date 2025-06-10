"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "./_generated/api";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

const llm = new ChatOpenAI({
  modelName: "deepseek/deepseek-chat-v3-0324:free",
  openAIApiKey: process.env.OPENROUTER_API_KEY,
  configuration: {
    baseURL: "https://openrouter.ai/api/v1",
  },
  temperature: 0.1,
});

export const askFinancialQuestion = action({
  args: {
    question: v.string(),
  },
  handler: async (ctx, args): Promise<string> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    try {
      // Gather user's financial data
      const currentDate = new Date();
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0];
      const endDate = currentDate.toISOString().split('T')[0];

      const [transactions, budgets, goals, monthlyStats, plaidTransactions] = await Promise.all([
        ctx.runQuery(api.transactions.list, { startDate, endDate, limit: 100 }),
        ctx.runQuery(api.budgets.list),
        ctx.runQuery(api.goals.list),
        ctx.runQuery(api.transactions.getMonthlyStats, {
          year: currentDate.getFullYear(),
          month: currentDate.getMonth() + 1,
        }),
        ctx.runQuery(api.plaidData.getPlaidTransactions, { limit: 50 }),
      ]);

      // Create context for the AI
      const financialContext = {
        monthlyStats,
        transactions: transactions.slice(0, 20), // Limit for token efficiency
        budgets,
        goals,
        plaidTransactions: plaidTransactions.slice(0, 20),
        currentDate: currentDate.toISOString().split('T')[0],
      };

      const systemPrompt = `You are a helpful financial advisor AI assistant. You have access to the user's financial data and can provide insights, answer questions, and give advice based on their spending patterns, budgets, and goals.

Current Financial Data:
- Monthly Stats: Total Income: $${monthlyStats.totalIncome}, Total Expenses: $${monthlyStats.totalExpenses}, Net Income: $${monthlyStats.netIncome}
- Number of Transactions: ${transactions.length}
- Number of Budgets: ${budgets.length}
- Number of Goals: ${goals.length}
- Bank Transactions (via Plaid): ${plaidTransactions.length}

Detailed Data:
${JSON.stringify(financialContext, null, 2)}

Please provide helpful, accurate, and actionable financial advice based on this data. Be conversational and friendly, but also professional. If you notice any concerning patterns or opportunities for improvement, mention them. Always format monetary amounts as currency (e.g., $1,234.56).`;

      const messages = [
        new SystemMessage(systemPrompt),
        new HumanMessage(args.question),
      ];

      const response = await llm.invoke(messages);
      return response.content as string;
    } catch (error) {
      console.error('Error in AI assistant:', error);
      return "I'm sorry, I encountered an error while processing your question. Please try again later.";
    }
  },
});

export const generateFinancialSummary = action({
  args: {},
  handler: async (ctx): Promise<string> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    try {
      const currentDate = new Date();
      const monthlyStats = await ctx.runQuery(api.transactions.getMonthlyStats, {
        year: currentDate.getFullYear(),
        month: currentDate.getMonth() + 1,
      });

      const budgets = await ctx.runQuery(api.budgets.list);
      const goals = await ctx.runQuery(api.goals.list);

      const systemPrompt = `You are a financial advisor AI. Generate a brief, insightful financial summary for the user based on their current month's data. Focus on key insights, achievements, and recommendations.

Monthly Stats:
- Total Income: $${monthlyStats.totalIncome}
- Total Expenses: $${monthlyStats.totalExpenses}
- Net Income: $${monthlyStats.netIncome}
- Transaction Count: ${monthlyStats.transactionCount}

Budgets: ${budgets.length} active budgets
Goals: ${goals.length} financial goals

Keep the summary concise (2-3 paragraphs) and actionable.`;

      const messages = [
        new SystemMessage(systemPrompt),
        new HumanMessage("Please generate a financial summary for this month."),
      ];

      const response = await llm.invoke(messages);
      return response.content as string;
    } catch (error) {
      console.error('Error generating summary:', error);
      return "Unable to generate financial summary at this time.";
    }
  },
});
