import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { toast } from "sonner";

interface BudgetOverviewProps {
  detailed?: boolean;
}

export function BudgetOverview({ detailed = false }: BudgetOverviewProps) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    categoryId: "",
    amount: "",
    period: "monthly" as "monthly" | "yearly",
    alertThreshold: "80",
  });

  const budgets = useQuery(api.budgets.list);
  const categories = useQuery(api.categories.list);
  const createBudget = useMutation(api.budgets.create);
  const deleteBudget = useMutation(api.budgets.remove);

  const expenseCategories = categories?.filter(cat => cat.type === "expense") || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.categoryId || !formData.amount) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const currentDate = new Date();
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      await createBudget({
        categoryId: formData.categoryId as any,
        amount: parseFloat(formData.amount),
        period: formData.period,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        alertThreshold: parseFloat(formData.alertThreshold),
      });

      toast.success("Budget created successfully!");
      setFormData({
        categoryId: "",
        amount: "",
        period: "monthly",
        alertThreshold: "80",
      });
      setShowForm(false);
    } catch (error) {
      toast.error("Failed to create budget");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this budget?")) {
      try {
        await deleteBudget({ id: id as any });
        toast.success("Budget deleted");
      } catch (error) {
        toast.error("Failed to delete budget");
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Budget Overview</h2>
        {detailed && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Add Budget
          </button>
        )}
      </div>

      {!budgets ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      ) : budgets.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">📋</div>
          <div>No budgets set up yet</div>
          {detailed && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-2 text-blue-600 hover:text-blue-700"
            >
              Create your first budget
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {budgets.slice(0, detailed ? undefined : 3).map((budget) => (
            <div key={budget._id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{budget.category?.icon}</span>
                  <span className="font-medium">{budget.category?.name}</span>
                </div>
                {detailed && (
                  <button
                    onClick={() => handleDelete(budget._id)}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                  >
                    🗑️
                  </button>
                )}
              </div>
              
              <div className="mb-2">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>
                    {formatCurrency(budget.spent)} of {formatCurrency(budget.amount)}
                  </span>
                  <span>{budget.percentageUsed.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      budget.isOverBudget
                        ? "bg-red-500"
                        : budget.percentageUsed > 80
                        ? "bg-yellow-500"
                        : "bg-green-500"
                    }`}
                    style={{ width: `${Math.min(budget.percentageUsed, 100)}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="text-sm">
                <span className={budget.remaining >= 0 ? "text-green-600" : "text-red-600"}>
                  {budget.remaining >= 0 ? "Remaining: " : "Over budget: "}
                  {formatCurrency(Math.abs(budget.remaining))}
                </span>
              </div>
            </div>
          ))}
          
          {!detailed && budgets.length > 3 && (
            <div className="text-center">
              <span className="text-gray-500">+{budgets.length - 3} more budgets</span>
            </div>
          )}
        </div>
      )}

      {/* Budget Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Create Budget</h3>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData(prev => ({ ...prev, categoryId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a category</option>
                  {expenseCategories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.icon} {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Budget Amount *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alert Threshold (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.alertThreshold}
                  onChange={(e) => setFormData(prev => ({ ...prev, alertThreshold: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                Create Budget
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
