import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function MonthlyStats() {
  const currentDate = new Date();
  const stats = useQuery(api.transactions.getMonthlyStats, {
    year: currentDate.getFullYear(),
    month: currentDate.getMonth() + 1,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (!stats) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">{monthName} Overview</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-green-600 text-sm font-medium">Total Income</div>
          <div className="text-2xl font-bold text-green-700">
            {formatCurrency(stats.totalIncome)}
          </div>
        </div>
        
        <div className="bg-red-50 p-4 rounded-lg">
          <div className="text-red-600 text-sm font-medium">Total Expenses</div>
          <div className="text-2xl font-bold text-red-700">
            {formatCurrency(stats.totalExpenses)}
          </div>
        </div>
        
        <div className={`p-4 rounded-lg ${stats.netIncome >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
          <div className={`text-sm font-medium ${stats.netIncome >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
            Net Income
          </div>
          <div className={`text-2xl font-bold ${stats.netIncome >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
            {formatCurrency(stats.netIncome)}
          </div>
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        {stats.transactionCount} transactions this month
      </div>
    </div>
  );
}
