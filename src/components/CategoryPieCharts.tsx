import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Doc } from "../../convex/_generated/dataModel";

const EXPENSE_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD', '#FFB347', '#47B5FF', '#8367C7', '#F25F5C', '#FFE066'];
const INCOME_COLORS = ['#4CAF50', '#81C784', '#A5D6A7', '#C8E6C9', '#E8F5E9', '#66BB6A', '#43A047', '#2E7D32', '#1B5E20'];

interface ChartData {
  name: string;
  value: number;
  color: string;
}

interface CategoryPieChartsProps {
  showOnly?: 'expenses' | 'income';
  selectedDate: Date;
}

export function CategoryPieCharts({ showOnly, selectedDate }: CategoryPieChartsProps) {
  const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
  
  const transactions = useQuery(api.plaidData.getPlaidTransactions, { 
    startDate: startOfMonth.toISOString().split('T')[0],
    endDate: endOfMonth.toISOString().split('T')[0],
    limit: 1000 
  });
  
  const categories = useQuery(api.categories.list);

  if (!transactions || !categories) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="flex justify-center py-8 bg-white rounded-lg shadow">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ))}
      </div>
    );
  }

  // Process transactions into expense and income categories
  const expenseData = processCategoryData(transactions, 'expense', categories, EXPENSE_COLORS);
  const incomeData = processCategoryData(transactions, 'income', categories, INCOME_COLORS);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label, data = [] }: any) => {
    if (active && payload && payload.length) {
      const total = data.reduce((sum: number, item: any) => sum + item.value, 0);
      const percentage = total > 0 ? (payload[0].value / total) * 100 : 0;
      
      return (
        <div className="bg-white p-2 rounded-md shadow-lg border border-gray-100">
          <p className="font-medium text-sm">{payload[0].name}</p>
          <p className="text-xs">{formatCurrency(payload[0].value)}</p>
          <p className="text-xs text-gray-500">{percentage.toFixed(1)}% of total</p>
        </div>
      );
    }
    return null;
  };

  // If showOnly is specified, only show that chart
  if (showOnly === 'expenses') {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-1">
          {expenseData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expenseData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={2}
                  dataKey="value"
                  label={false}
                  labelLine={false}
                >
                  {expenseData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#fff" strokeWidth={1} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip data={expenseData} />} />
                <Legend 
                  formatter={(value) => <span className="text-black">{value}</span>}
                  iconSize={10}
                  wrapperStyle={{ fontSize: '0.75rem', paddingTop: '10px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-xs font-medium">No expense data</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (showOnly === 'income') {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-1">
          {incomeData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={incomeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={2}
                  dataKey="value"
                  label={false}
                  labelLine={false}
                >
                  {incomeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#fff" strokeWidth={1} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip data={incomeData} />} />
                <Legend 
                  formatter={(value) => <span className="text-black">{value}</span>}
                  iconSize={10}
                  wrapperStyle={{ fontSize: '0.75rem', paddingTop: '10px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-xs font-medium">No income data</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Expense by Category */}
      <div className="bg-white rounded-lg shadow p-6 h-[400px] flex flex-col">
        <h3 className="text-lg font-semibold mb-4">Expenses by Category</h3>
        <div className="flex-1">
          {expenseData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expenseData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={2}
                  dataKey="value"
                  label={false}
                  labelLine={false}
                >
                  {expenseData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip data={expenseData} />} />
                <Legend 
                  formatter={(value) => <span className="text-black">{value}</span>}
                  iconSize={10}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              No expense data available
            </div>
          )}
        </div>
      </div>

      {/* Income by Category */}
      <div className="bg-white rounded-lg shadow p-6 h-[400px] flex flex-col">
        <h3 className="text-lg font-semibold mb-4">Income by Category</h3>
        <div className="flex-1">
          {incomeData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={incomeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={2}
                  dataKey="value"
                  label={false}
                  labelLine={false}
                >
                  {incomeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip data={incomeData} />} />
                <Legend 
                  formatter={(value) => <span className="text-black">{value}</span>}
                  iconSize={10}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              No income data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper function to process transactions into category data
function processCategoryData(
  transactions: Doc<"plaidTransactions">[],
  type: 'income' | 'expense',
  allCategories: { _id: string; name: string; type: string }[],
  colors: string[]
): ChartData[] {
  // Filter transactions by type and group by category
  const categoryMap = new Map<string, number>();
  
  transactions.forEach(transaction => {
    if (transaction.type === type && transaction.categoryId) {
      const category = allCategories.find(c => c._id === transaction.categoryId);
      if (category) {
        const currentAmount = categoryMap.get(category.name) || 0;
        categoryMap.set(category.name, currentAmount + transaction.amount);
      }
    }
  });

  // Convert to array and sort by amount (descending)
  const result = Array.from(categoryMap.entries())
    .map(([name, value]) => ({
      name,
      value: Math.abs(value), // Ensure values are positive for the chart
      percent: 0 // Will be calculated below
    }))
    .sort((a, b) => b.value - a.value);

  // Calculate total for percentage calculation
  const total = result.reduce((sum, item) => sum + item.value, 0);
  
  // Add percentage to each item
  return result.map((item, index) => ({
    ...item,
    percent: item.value / total,
    color: colors[index % colors.length]
  }));
}
