import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { toast } from "sonner";

interface GoalTrackerProps {
  detailed?: boolean;
}

export function GoalTracker({ detailed = false }: GoalTrackerProps) {
  const [showForm, setShowForm] = useState(false);
  const [showProgressForm, setShowProgressForm] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    targetAmount: "",
    targetDate: "",
    description: "",
    priority: "medium" as "low" | "medium" | "high",
  });
  const [progressAmount, setProgressAmount] = useState("");

  const goals = useQuery(api.goals.list);
  const createGoal = useMutation(api.goals.create);
  const updateProgress = useMutation(api.goals.updateProgress);
  const deleteGoal = useMutation(api.goals.remove);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.targetAmount || !formData.targetDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await createGoal({
        name: formData.name,
        targetAmount: parseFloat(formData.targetAmount),
        targetDate: formData.targetDate,
        description: formData.description || undefined,
        priority: formData.priority,
      });

      toast.success("Goal created successfully!");
      setFormData({
        name: "",
        targetAmount: "",
        targetDate: "",
        description: "",
        priority: "medium",
      });
      setShowForm(false);
    } catch (error) {
      toast.error("Failed to create goal");
    }
  };

  const handleProgressUpdate = async (goalId: string) => {
    if (!progressAmount) {
      toast.error("Please enter an amount");
      return;
    }

    try {
      await updateProgress({
        id: goalId as any,
        amount: parseFloat(progressAmount),
      });

      toast.success("Progress updated!");
      setProgressAmount("");
      setShowProgressForm(null);
    } catch (error) {
      toast.error("Failed to update progress");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this goal?")) {
      try {
        await deleteGoal({ id: id as any });
        toast.success("Goal deleted");
      } catch (error) {
        toast.error("Failed to delete goal");
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "text-red-600 bg-red-100";
      case "medium": return "text-yellow-600 bg-yellow-100";
      case "low": return "text-green-600 bg-green-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Financial Goals</h2>
        {detailed && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Add Goal
          </button>
        )}
      </div>

      {!goals ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      ) : goals.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">🎯</div>
          <div>No financial goals set yet</div>
          {detailed && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-2 text-blue-600 hover:text-blue-700"
            >
              Set your first goal
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {goals.slice(0, detailed ? undefined : 3).map((goal) => (
            <div key={goal._id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-medium">{goal.name}</h3>
                  {goal.description && (
                    <p className="text-sm text-gray-600">{goal.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs ${getPriorityColor(goal.priority)}`}>
                    {goal.priority}
                  </span>
                  {detailed && (
                    <button
                      onClick={() => handleDelete(goal._id)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
              
              <div className="mb-2">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>
                    {formatCurrency(goal.currentAmount || 0)} of {formatCurrency(goal.targetAmount)}
                  </span>
                  <span>{goal.progress.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(goal.progress, 100)}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className={goal.daysRemaining > 0 ? "text-gray-600" : "text-red-600"}>
                  {goal.daysRemaining > 0 
                    ? `${goal.daysRemaining} days remaining`
                    : `${Math.abs(goal.daysRemaining)} days overdue`
                  }
                </span>
                {detailed && goal.status === "active" && (
                  <button
                    onClick={() => setShowProgressForm(goal._id)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    + Add Progress
                  </button>
                )}
              </div>
            </div>
          ))}
          
          {!detailed && goals.length > 3 && (
            <div className="text-center">
              <span className="text-gray-500">+{goals.length - 3} more goals</span>
            </div>
          )}
        </div>
      )}

      {/* Goal Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Create Goal</h3>
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
                  Goal Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Emergency Fund"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Amount *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.targetAmount}
                  onChange={(e) => setFormData(prev => ({ ...prev, targetAmount: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="10000.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Date *
                </label>
                <input
                  type="date"
                  value={formData.targetDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, targetDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Describe your goal..."
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                Create Goal
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Progress Update Modal */}
      {showProgressForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Add Progress</h3>
              <button
                onClick={() => setShowProgressForm(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount to Add
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={progressAmount}
                  onChange={(e) => setProgressAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="100.00"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowProgressForm(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleProgressUpdate(showProgressForm)}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Add Progress
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
