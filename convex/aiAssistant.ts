"use node";

import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api, internal } from "./_generated/api";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { OpenAI } from "openai";

const llm = new ChatOpenAI({
  modelName: "deepseek/deepseek-chat-v3-0324:free",
  openAIApiKey: process.env.OPENROUTER_API_KEY,
  configuration: {
    baseURL: "https://openrouter.ai/api/v1",
  },
  temperature: 0.1,
});

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
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
        ctx.runQuery(api.budgets.list, {}),
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

      const systemPrompt = `You are a professional personal-finance advisor. Using the data supplied, craft concise, actionable answers in a clear business tone (no emojis, no markdown code fences).  
• Focus on insights, recommendations, and explanations grounded in the numbers.  
• When showing money, format as USD currency (e.g. $1,234.56).  
• Do not reveal raw JSON or internal data structures.  
• Do not prefix lines with bullets such as "*", "-", "•", or comment markers like "//".  
• Keep the response under 300 words.

Current Financial Snapshot  
Income: $${monthlyStats.totalIncome}  
Expenses: $${monthlyStats.totalExpenses}  
Net Income: $${monthlyStats.netIncome}  
Transactions: ${transactions.length}  
Budgets: ${budgets.length}  
Goals: ${goals.length}`;

      const messages = [
        new SystemMessage(systemPrompt),
        new HumanMessage(args.question),
      ];

      const response = await llm.invoke(messages);
      return cleanResponse(response.content as string);
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

      const budgets = await ctx.runQuery(api.budgets.list, {});
      const goals = await ctx.runQuery(api.goals.list);

      const systemPrompt = `You are a professional personal-finance advisor. Draft a concise (2–3 short paragraphs) summary of the user's current month, focusing on accomplishments, concerns, and next steps.  
Use a formal, business-like tone—no emojis, markdown fences, or list bullets.  
Always format dollar amounts as USD (e.g. $1,234.56).

DATA  
Income: $${monthlyStats.totalIncome}  
Expenses: $${monthlyStats.totalExpenses}  
Net: $${monthlyStats.netIncome}  
Transactions: ${monthlyStats.transactionCount}  
Budgets: ${budgets.length}  
Goals: ${goals.length}`;

      const messages = [
        new SystemMessage(systemPrompt),
        new HumanMessage("Please generate a financial summary for this month."),
      ];

      const response = await llm.invoke(messages);
      return cleanResponse(response.content as string);
    } catch (error) {
      console.error('Error generating summary:', error);
      return "Unable to generate financial summary at this time.";
    }
  },
});

export const batchCategorizeTransactions = internalAction({
  args: {
    transactions: v.array(v.object({ id: v.string(), description: v.string() })),
    userCategories: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const { transactions, userCategories } = args;

    const response = await openai.chat.completions.create({
      model: "google/gemini-flash-1.5",
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are an expert financial assistant. Your task is to categorize a batch of transactions. For each transaction, provide its category and type (income or expense).

          Respond with a single JSON object with a "results" key, which is an array of objects. Each object must have "id", "category", and "type".

          - The "category" must be one of the following: [${userCategories.join(", ")}], or "Other" if none fit.
          - The "type" must be either "income" or "expense".

          Example Request:
          [{"id": "txn_1", "description": "Starbucks"}, {"id": "txn_2", "description": "Paycheck"}]

          Example Response:
          {"results": [{"id": "txn_1", "category": "Food & Dining", "type": "expense"}, {"id": "txn_2", "category": "Paycheck", "type": "income"}]}
          `,
        },
        {
          role: "user",
          content: JSON.stringify(transactions.map(t => ({ id: t.id, description: t.description }))),
        },
      ],
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content in AI response");
    }

    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed.results)) {
        return parsed.results;
      }
    } catch (e) {
      console.error("Failed to parse AI response JSON", e);
    }

    // Fallback for the entire batch
    return transactions.map(t => ({ id: t.id, category: "Other", type: "expense" }));
  },
});

export const categorizeTransaction = internalAction({
  args: {
    description: v.string(),
    userCategories: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const { description, userCategories } = args;

    const response = await openai.chat.completions.create({
      model: "google/gemini-flash-1.5",
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are an expert financial assistant. Your task is to categorize a transaction based on its description and a list of available categories. Also, determine if the transaction is 'income' or 'expense'.

          Respond with a JSON object with two keys: "category" and "type".

          - The "category" must be one of the following: [${userCategories.join(", ")}].
          - Choose the most relevant category. If no category is a good fit, use "Other".
          - The "type" must be either "income" or "expense".

          For example, for a description "Starbucks Coffee", you might respond:
          {"category": "Food & Dining", "type": "expense"}
          
          For a description "Gusto Payroll", you might respond:
          {"category": "Paycheck", "type": "income"}
          `,
        },
        { role: "user", content: `Transaction description: "${description}"` },
      ],
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content in AI response");
    }

    try {
      const parsed = JSON.parse(content);
      if (
        typeof parsed.category === "string" &&
        (parsed.type === "income" || parsed.type === "expense")
      ) {
        return parsed;
      }
    } catch (e) {
      console.error("Failed to parse AI response JSON", e);
    }
    
    // Fallback
    return { category: "Other", type: "expense" };
  },
});

function cleanResponse(text: string): string {
  // Remove leading markdown fences and asterisks/bullets from beginnings of lines
  return text
    .replace(/^```[\s\S]*?```/g, "") // remove fenced blocks
    .split("\n")
    .map((line) => line.replace(/^\s*([*•\-\/]{1,2}\s*)/, "").trimEnd())
    .join("\n")
    .trim();
}
