import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";

export function MonthlyStats() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d; // first day of current month
  });

  const stats = useQuery(api.transactions.getMonthlyStats, {
    year: selectedDate.getFullYear(),
    month: selectedDate.getMonth() + 1,
  });

  const changeMonth = (delta: number) => {
    setSelectedDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + delta);
      return newDate;
    });
  };

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

  const monthName = selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">{monthName} Overview</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => changeMonth(-1)} className="px-2 py-1 border rounded">◀</button>
          <input
            type="month"
            value={`${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2,"0")}`}
            onChange={(e) => {
              const [year, month] = e.target.value.split("-").map(Number);
              const d = new Date(selectedDate);
              d.setFullYear(year);
              d.setMonth(month - 1);
              setSelectedDate(d);
            }}
            className="border rounded px-2 py-1 text-sm"
          />
          <button
            onClick={() => changeMonth(1)}
            disabled={(() => {
              const today = new Date();
              return (
                selectedDate.getFullYear() === today.getFullYear() &&
                selectedDate.getMonth() === today.getMonth()
              );
            })()}
            className="px-2 py-1 border rounded disabled:opacity-50"
          >
            ▶
          </button>
        </div>
      </div>
      
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
