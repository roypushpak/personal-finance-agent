import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

export function AIAssistant() {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState("");
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const askQuestion = useAction(api.aiAssistant.askFinancialQuestion);
  const generateSummary = useAction(api.aiAssistant.generateFinancialSummary);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setIsLoading(true);
    try {
      const answer = await askQuestion({ question });
      setResponse(answer);
    } catch (error) {
      toast.error("Failed to get AI response");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateSummary = async () => {
    setIsGeneratingSummary(true);
    try {
      const summaryText = await generateSummary();
      setSummary(summaryText);
    } catch (error) {
      toast.error("Failed to generate summary");
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const suggestedQuestions = [
    "How am I doing with my budget this month?",
    "What are my biggest spending categories?",
    "Am I on track to meet my financial goals?",
    "Where can I cut expenses to save more money?",
    "What's my spending pattern compared to last month?",
  ];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">🤖 AI Financial Assistant</h2>
        <button
          onClick={handleGenerateSummary}
          disabled={isGeneratingSummary}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          {isGeneratingSummary ? "Generating..." : "📊 Monthly Summary"}
        </button>
      </div>

      {summary && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-medium text-green-800 mb-2">Monthly Financial Summary</h3>
          <div className="text-green-700 whitespace-pre-wrap">{summary}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask me anything about your finances..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !question.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? "..." : "Ask"}
          </button>
        </div>
      </form>

      {response && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-medium text-blue-800 mb-2">AI Response</h3>
          <div className="text-blue-700 whitespace-pre-wrap">{response}</div>
        </div>
      )}

      <div>
        <h3 className="font-medium mb-3">Suggested Questions</h3>
        <div className="space-y-2">
          {suggestedQuestions.map((q, index) => (
            <button
              key={index}
              onClick={() => setQuestion(q)}
              className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-sm"
              disabled={isLoading}
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
