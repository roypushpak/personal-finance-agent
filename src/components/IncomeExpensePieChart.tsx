import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Doc } from "../../convex/_generated/dataModel";

const COLORS = ['#4CAF50', '#FF6B6B']; // Green for income, Red for expenses

interface ChartData {
  name: string;
  value: number;
  color: string;
}

interface IncomeExpensePieChartProps {
  selectedDate: Date;
}

export function IncomeExpensePieChart({ selectedDate }: IncomeExpensePieChartProps) {
  const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
  
  const transactions = useQuery(api.plaidData.getPlaidTransactions, { 
    startDate: startOfMonth.toISOString().split('T')[0],
    endDate: endOfMonth.toISOString().split('T')[0],
    limit: 1000 
  });

  if (!transactions) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-200 border-t-blue-600"></div>
      </div>
    );
  }

  // Calculate total income and expenses
  const { totalIncome, totalExpenses } = transactions.reduce<{ totalIncome: number; totalExpenses: number }>(
    (acc: { totalIncome: number; totalExpenses: number }, transaction: Doc<"plaidTransactions">) => {
      if (transaction.type === 'income') {
        acc.totalIncome += transaction.amount;
      } else {
        acc.totalExpenses += transaction.amount;
      }
      return acc;
    },
    { totalIncome: 0, totalExpenses: 0 }
  );

  const data: ChartData[] = [
    { name: 'Income', value: totalIncome, color: COLORS[0] },
    { name: 'Expenses', value: totalExpenses, color: COLORS[1] },
  ].filter(item => item.value > 0); // Only show categories with values > 0

  if (data.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-sm font-medium">No transaction data available</p>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
    index,
    name,
  }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        className="text-[10px] font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = data.reduce((sum, item) => sum + item.value, 0);
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

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={65}
              paddingAngle={2}
              dataKey="value"
              label={false}
              labelLine={false}
              animationBegin={0}
              animationDuration={800}
              animationEasing="ease-out"
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color}
                  stroke="#fff"
                  strokeWidth={1.5}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              layout="horizontal" 
              verticalAlign="bottom"
              align="center"
              iconSize={10}
              wrapperStyle={{
                paddingTop: '1rem',
                fontSize: '0.75rem',
              }}
              formatter={(value, entry: any, index) => (
                <span className="text-xs text-gray-600 ml-1">
                  {value}
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}
