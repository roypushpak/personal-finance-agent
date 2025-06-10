import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { toast } from "sonner";

interface InsightPanelProps {
  detailed?: boolean;
}

export function InsightPanel({ detailed = false }: InsightPanelProps) {
  const insights = useQuery(api.insights.list);
  const generateInsights = useAction(api.insights.generate);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    toast.info("Generating new financial insights...");
    try {
      await generateInsights();
      toast.success("New insights generated!");
    } catch (error) {
      toast.error("Failed to generate insights");
    } finally {
      setIsGenerating(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "spending_pattern": return "📊";
      case "budget_alert": return "⚠️";
      case "saving_opportunity": return "💡";
      case "goal_progress": return "🎯";
      default: return "➡️";
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Financial Insights</h2>
        {detailed && (
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isGenerating ? "Generating..." : "Refresh Insights"}
          </button>
        )}
      </div>

      {!insights ? (
        <div className="text-center py-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div></div>
      ) : insights.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">🧠</div>
          <div>No insights available yet.</div>
          <p className="text-sm">Generate insights to get personalized financial advice.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {insights.slice(0, detailed ? undefined : 2).map((insight) => (
            <div key={insight._id} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl">{getIcon(insight.type)}</div>
              <div>
                <p className="font-medium">{insight.title}</p>
                <p className="text-sm text-gray-600">{insight.description}</p>
                <p className="text-xs text-gray-400 mt-1">{new Date(insight._creationTime).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
