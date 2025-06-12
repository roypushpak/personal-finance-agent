import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useEffect, useRef } from "react";
import { TransactionForm } from "./TransactionForm";
import { TransactionList } from "./TransactionList";
import { BudgetOverview } from "./BudgetOverview";
import { GoalTracker } from "./GoalTracker";
import { InsightPanel } from "./InsightPanel";
import { MonthlyStats } from "./MonthlyStats";
import { BankConnection } from "./BankConnection";
import { AIAssistant } from "./AIAssistant";
import { ChartCarousel } from "./ChartCarousel";
import { SpendingForecast } from "./SpendingForecast";
import { Menu, X } from "lucide-react";
import { useMediaQuery } from "../hooks/useMediaQuery";

export function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  
  const isMobile = useMediaQuery("(max-width: 768px)");
  const sidebarRef = useRef<HTMLDivElement>(null);
  const categories = useQuery(api.categories.list);
  const createDefaultCategories = useMutation(api.categories.createDefaultCategories);

  // Close sidebar when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setIsSidebarOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close sidebar when changing tabs on mobile
  useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [activeTab, isMobile]);

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
    <div className="relative min-h-screen bg-gray-50 flex">
      {/* Mobile Header */}
      <div className="md:hidden bg-white shadow-sm p-4 flex justify-between items-center sticky top-0 z-20 w-full">
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 rounded-md text-gray-700 hover:bg-gray-100"
          aria-label="Toggle menu"
        >
          <Menu className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-semibold text-gray-800">
          {tabs.find(tab => tab.id === activeTab)?.label || 'Dashboard'}
        </h1>
        <div className="w-10"></div> {/* Spacer for alignment */}
      </div>

      {/* Sidebar - Only show on mobile when toggled */}
      {isMobile && (
        <>
          {/* Mobile overlay when sidebar is open */}
          {isSidebarOpen && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-20"
              onClick={() => setIsSidebarOpen(false)}
              aria-hidden="true"
            />
          )}
          <div 
            ref={sidebarRef}
            className={`fixed inset-y-0 left-0 transform ${
              isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            } transition-transform duration-300 ease-in-out z-30 w-64 bg-white shadow-lg`}
          >
            <div className="p-4 flex justify-between items-center border-b">
              <h2 className="text-lg font-semibold">Menu</h2>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="p-1 rounded-full hover:bg-gray-100"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="p-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-4 py-3 rounded-lg mb-1 text-left transition-colors ${
                    activeTab === tab.id
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <span className="mr-3">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </>
      )}

      {/* Main Content */}
      <div className="flex-1">
        <div className="max-w-7xl mx-auto p-4 md:p-6 w-full">
          {/* Desktop Tabs - Primary navigation on larger screens */}
          <div className="hidden md:flex flex-col space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-800">
                {tabs.find(tab => tab.id === activeTab)?.label || 'Dashboard'}
              </h2>
              <button
                onClick={() => setShowTransactionForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
              >
                + Add Transaction
              </button>
            </div>
            <div className="overflow-x-auto pb-2 scrollbar-hide">
              <div className="flex space-x-1 min-w-max">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? "bg-blue-50 text-blue-600"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <span className="mr-2">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Mobile Quick Action - Only show on mobile */}
          <div className="md:hidden mb-6">
            <button
              onClick={() => setShowTransactionForm(true)}
              className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              + Add Transaction
            </button>
          </div>

          {/* Content */}
          <div className="pb-8">
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: Stats and Budget */}
                  <div className="lg:col-span-7 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                      <MonthlyStats selectedDate={selectedDate} setSelectedDate={setSelectedDate} />
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                      <BudgetOverview selectedDate={selectedDate} setSelectedDate={setSelectedDate} />
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                      <GoalTracker />
                    </div>
                  </div>

                  {/* Right Column: Chart Carousel and Insights */}
                  <div className="lg:col-span-5 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                      <div className="px-4 pt-4 pb-2">
                        <h3 className="text-sm font-medium text-gray-500">
                          {selectedDate.toLocaleString('default', { month: 'long' })} {selectedDate.getFullYear()}
                        </h3>
                      </div>
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-6">
                          <ChartCarousel selectedDate={selectedDate} />
                        </div>
                        <SpendingForecast />
                      </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                      <InsightPanel />
                    </div>
                  </div>
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
        </div>
      </div>

      {/* Transaction Form Modal */}
      {showTransactionForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start md:items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-4 w-full max-w-md my-8 md:my-0">
            <div className="flex justify-between items-center mb-4 sticky top-0 bg-white py-2">
              <h3 className="text-lg font-semibold">Add Transaction</h3>
              <button
                onClick={() => setShowTransactionForm(false)}
                className="text-gray-500 hover:text-gray-700 p-2 -mr-2"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
              <TransactionForm onSuccess={() => setShowTransactionForm(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
