import { query } from './_generated/server';
import { v } from 'convex/values';

export const predictSpending = query({
  args: {
    months: v.number(),
  },
  handler: async (ctx, args) => {
    // Get transactions from the last 6 months for better prediction
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const transactions = await ctx.db
      .query('plaidTransactions')
      .filter(q => q.eq(q.field('type'), 'expense'))
      .filter(q => q.gte(q.field('date'), sixMonthsAgo.toISOString().split('T')[0]))
      .collect();

    if (transactions.length === 0) {
      return { forecast: [], message: 'Not enough transaction history for forecasting' };
    }

    // Group transactions by month and category
    const monthlyData: Record<string, Record<string, number>> = {};
    const categories = new Set<string>();

    transactions.forEach(transaction => {
      if (!transaction.categoryId) return;
      
      const date = new Date(transaction.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {};
      }
      
      const catName = transaction.categoryId; // In a real app, you'd look up the category name
      categories.add(catName);
      monthlyData[monthKey][catName] = (monthlyData[monthKey][catName] || 0) + Math.abs(transaction.amount);
    });

    // Simple moving average forecast (in a real app, you might use a more sophisticated model)
    const forecast: Array<{month: string, categories: Record<string, number>}> = [];
    const lastMonth = new Date();
    
    for (let i = 1; i <= args.months; i++) {
      const forecastDate = new Date(lastMonth);
      forecastDate.setMonth(lastMonth.getMonth() + i);
      const monthKey = `${forecastDate.getFullYear()}-${String(forecastDate.getMonth() + 1).padStart(2, '0')}`;
      
      // Calculate average spending for each category
      const categorySpending: Record<string, number> = {};
      categories.forEach(category => {
        const values = Object.values(monthlyData)
          .map(month => month[category] || 0)
          .filter(v => v > 0);
        
        if (values.length > 0) {
          // Simple average, could be improved with weighted average or ML model
          const avg = values.reduce((a, b) => a + b, 0) / values.length;
          // Add some randomness to simulate prediction (in a real app, use a proper forecasting model)
          const randomFactor = 0.9 + Math.random() * 0.2; // Random between 0.9 and 1.1
          categorySpending[category] = Math.round(avg * randomFactor);
        }
      });
      
      forecast.push({
        month: monthKey,
        categories: categorySpending
      });
    }

    return { forecast };
  },
});
