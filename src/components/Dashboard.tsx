import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useEffect } from "react";
import { TransactionForm } from "./TransactionForm";
import { TransactionList } from "./TransactionList";
import { BudgetOverview } from "./BudgetOverview";
import { GoalTracker } from "./GoalTracker";
import { InsightPanel } from "./InsightPanel";
import { MonthlyStats } from "./MonthlyStats";
import { BankConnection } from "./BankConnection";
import { AIAssistant } from "./AIAssistant";

export function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  
  const categories = useQuery(api.categories.list);
  const createDefaultCategories = useMutation(api.categories.createDefaultCategories);

  // Create default categories if none exist
  useEffect(() => {
    if (categories && categories.length === 0) {
      createDefaultCategories();
    }
  }, [categories, createDefaultCategories]);

  const tabs = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "transactions", label: "Transactions", icon: "💳" },
    { id: "budgets", label: "Budgets", icon: "📋" },
    { id: "goals", label: "Goals", icon: "🎯" },
    { id: "insights", label: "Insights", icon: "💡" },
    { id: "banking", label: "Banking", icon: "🏦" },
    { id: "ai-assistant", label: "AI Assistant", icon: "🤖" },
  ];

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Navigation */}
      <div className="flex flex-wrap gap-2 mb-6 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-white border-b-2 border-blue-500 text-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <button
          onClick={() => setShowTransactionForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Add Transaction
        </button>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <MonthlyStats selectedDate={selectedDate} setSelectedDate={setSelectedDate} />
              <BudgetOverview selectedDate={selectedDate} setSelectedDate={setSelectedDate} />
            </div>
            <div className="space-y-6">
              <GoalTracker />
              <InsightPanel />
            </div>
          </div>
        )}

        {activeTab === "transactions" && <TransactionList />}
        {activeTab === "budgets" && <BudgetOverview detailed selectedDate={selectedDate} setSelectedDate={setSelectedDate} />}
        {activeTab === "goals" && <GoalTracker detailed />}
        {activeTab === "insights" && <InsightPanel detailed />}
        {activeTab === "banking" && <BankConnection />}
        {activeTab === "ai-assistant" && <AIAssistant />}
      </div>

      {/* Transaction Form Modal */}
      {showTransactionForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Add Transaction</h3>
              <button
                onClick={() => setShowTransactionForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <TransactionForm onSuccess={() => setShowTransactionForm(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
