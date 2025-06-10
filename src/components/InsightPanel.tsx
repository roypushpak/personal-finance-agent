import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { toast } from "sonner";

interface InsightPanelProps {
  detailed?: boolean;
}

export function InsightPanel({ detailed = false }: InsightPanelProps) {
  const insights = useQuery(api.insights.list);
  const generateInsights = useAction(api.insights.generateInsights);
  const markAsRead = useMutation(api.insights.markAsRead);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateInsights = async () => {
    setIsGenerating(true);
    try {
      await generateInsights();
      toast.success("New insights generated!");
    } catch (error) {
      toast.error("Failed to generate insights");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead({ id: id as any });
    } catch (error) {
      toast.error("Failed to mark insight as read");
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "high": return "🔴";
      case "medium": return "🟡";
      case "low": return "🟢";
      default: return "ℹ️";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "budget_alert": return "⚠️";
      case "spending_pattern": return "📊";
      case "saving_opportunity": return "💡";
      case "goal_progress": return "🎯";
      default: return "💭";
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Financial Insights</h2>
        {detailed && (
          <button
            onClick={handleGenerateInsights}
            disabled={isGenerating}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isGenerating ? "Generating..." : "🔄 Generate Insights"}
          </button>
        )}
      </div>

      {!insights ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      ) : insights.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">💡</div>
          <div>No insights available yet</div>
          {detailed && (
            <button
              onClick={handleGenerateInsights}
              disabled={isGenerating}
              className="mt-2 text-blue-600 hover:text-blue-700 disabled:opacity-50"
            >
              {isGenerating ? "Generating..." : "Generate your first insights"}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {insights.slice(0, detailed ? undefined : 5).map((insight) => (
            <div
              key={insight._id}
              className={`p-4 rounded-lg border transition-all cursor-pointer ${
                insight.isRead 
                  ? "bg-gray-50 border-gray-200" 
                  : "bg-blue-50 border-blue-200 hover:bg-blue-100"
              }`}
              onClick={() => !insight.isRead && handleMarkAsRead(insight._id)}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 text-lg">
                  {getTypeIcon(insight.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-gray-900 truncate">
                      {insight.title}
                    </h3>
                    <span className="text-sm">
                      {getPriorityIcon(insight.priority)}
                    </span>
                    {!insight.isRead && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {insight.description}
                  </p>
                  <div className="mt-2 text-xs text-gray-500">
                    {new Date(insight._creationTime).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {!detailed && insights.length > 5 && (
            <div className="text-center">
              <span className="text-gray-500">+{insights.length - 5} more insights</span>
            </div>
          )}
        </div>
      )}

      {!detailed && insights && insights.length > 0 && (
        <div className="mt-4 text-center">
          <button
            onClick={handleGenerateInsights}
            disabled={isGenerating}
            className="text-blue-600 hover:text-blue-700 text-sm disabled:opacity-50"
          >
            {isGenerating ? "Generating..." : "🔄 Refresh Insights"}
          </button>
        </div>
      )}
    </div>
  );
}
