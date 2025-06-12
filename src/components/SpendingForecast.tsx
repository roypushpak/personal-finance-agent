import { useEffect, useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
// Using basic divs instead of shadcn/ui components
const Card = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
    {children}
  </div>
);

const CardHeader = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`border-b border-gray-100 p-6 ${className}`}>
    {children}
  </div>
);

const CardTitle = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <h3 className={`text-lg font-semibold ${className}`}>
    {children}
  </h3>
);

const CardContent = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`p-6 ${className}`}>
    {children}
  </div>
);

const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`bg-gray-200 animate-pulse rounded ${className}`} />
);
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function SpendingForecast() {
  const [forecastMonths, setForecastMonths] = useState(3);
  interface ChartDataPoint {
    name: string;
    [key: string]: string | number;
  }

  // --- HOOKS (must be at the top level) ---
  const forecastData = useQuery(api.forecast.predictSpending, { months: forecastMonths });
  const categoriesData = useQuery(api.categories.list);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

  const categoryMap = useMemo(() => {
    if (!categoriesData) return {};
    return categoriesData.reduce<Record<string, string>>((acc, category) => {
      acc[category._id] = category.name;
      return acc;
    }, {});
  }, [categoriesData]);

  useEffect(() => {
    try {
      if (!forecastData || !('forecast' in forecastData) || !Array.isArray(forecastData.forecast)) {
        if (forecastData) console.error('Invalid forecast data format:', forecastData);
        setChartData([]); // Clear previous data if format is invalid
        return;
      }

      const transformedData = forecastData.forecast.map(monthData => {
        if (!monthData || typeof monthData !== 'object') return { name: 'Invalid month' };
        
        const monthEntry: ChartDataPoint = { name: monthData.month || 'Unknown month' };
        
        if (monthData.categories && typeof monthData.categories === 'object') {
          Object.entries(monthData.categories).forEach(([categoryId, amount]) => {
            try {
              const categoryName = (categoryMap && categoryMap[categoryId]) || categoryId;
              const numericAmount = Number(amount);
              if (!isNaN(numericAmount)) {
                monthEntry[categoryName] = Math.round(numericAmount / 100);
              }
            } catch (e) {
              console.error('Error processing category:', categoryId, e);
            }
          });
        }
        
        return monthEntry;
      });

      setChartData(transformedData);
    } catch (error) {
      console.error('Error processing forecast data:', error);
    }
  }, [forecastData, categoryMap]);

  const categories = useMemo(() => {
    try {
      if (!Array.isArray(chartData) || chartData.length === 0) return [];
      
      const allCategories = new Set<string>();
      
      chartData.forEach(data => {
        if (data && typeof data === 'object') {
          Object.keys(data).forEach(key => {
            if (key !== 'name' && typeof key === 'string') {
              allCategories.add(key);
            }
          });
        }
      });
      
      return Array.from(allCategories).sort((a, b) => a.localeCompare(b));
    } catch (error) {
      console.error('Error getting categories:', error);
      return [];
    }
  }, [chartData]);

  // --- HELPERS & CONSTANTS ---
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border rounded-lg shadow-lg">
          <p className="font-semibold">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {`${entry.name}: ${formatCurrency(entry.value)}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const COLORS = [
    '#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#F43F5E'
  ];

  // --- CONDITIONAL RENDERING (after hooks) ---
  if (!forecastData || !categoriesData) {
    return (
      <Card className="w-full">
        <CardHeader><CardTitle>Spending Forecast</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-[300px] w-full" /></CardContent>
      </Card>
    );
  }

  if ('message' in forecastData) {
    return (
      <Card className="w-full">
        <CardHeader><CardTitle>Spending Forecast</CardTitle></CardHeader>
        <CardContent className="text-center text-gray-500">{forecastData.message}</CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader><CardTitle>Spending Forecast</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-[300px] w-full" /></CardContent>
      </Card>
    );
  }

  // --- MAIN RENDER ---
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Spending Forecast</CardTitle>
          <select
            value={forecastMonths}
            onChange={(e) => setForecastMonths(Number(e.target.value))}
            className="text-sm border rounded-md px-2 py-1"
          >
            <option value={3}>3 Months</option>
            <option value={6}>6 Months</option>
            <option value={12}>12 Months</option>
          </select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} tickMargin={10} />
              <YAxis tickFormatter={(value) => `$${value}`} tick={{ fontSize: 12 }} width={60} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {categories.map((category, index) => (
                <Line
                  key={category}
                  type="monotone"
                  dataKey={category}
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">
          This is a forecast based on your past spending habits and may not be 100% accurate.
        </p>
      </CardContent>
    </Card>
  );
}
