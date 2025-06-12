import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { useOfflineSync } from "../hooks/useOfflineSync";
import { MobileToast } from "./MobileToast";

interface TransactionFormProps {
  onSuccess?: () => void;
}

export function TransactionForm({ onSuccess }: TransactionFormProps) {
  const [formData, setFormData] = useState({
    amount: "",
    description: "",
    categoryId: "",
    date: new Date().toISOString().split('T')[0],
    type: "expense" as "income" | "expense",
    tags: "",
  });

  const categories = useQuery(api.categories.list);
  const createTransaction = useMutation(api.transactions.create);
  const { isOnline, addToQueue, getQueueItem } = useOfflineSync();
  const [queuedTransactionId, setQueuedTransactionId] = useState<string | null>(null);
  const [showOfflineToast, setShowOfflineToast] = useState(false);

  // Check if we have a queued transaction that was just added
  const queuedTransaction = queuedTransactionId ? getQueueItem(queuedTransactionId) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || !formData.description || !formData.categoryId) {
      toast.error("Please fill in all required fields");
      return;
    }

    const transactionData = {
      amount: parseFloat(formData.amount),
      description: formData.description,
      categoryId: formData.categoryId as any,
      date: formData.date,
      type: formData.type,
      tags: formData.tags ? formData.tags.split(",").map(tag => tag.trim()) : undefined,
    };

    try {
      if (isOnline) {
        await createTransaction(transactionData);
        toast.success("Transaction added successfully!");
      } else {
        // Add to offline queue
        const queueId = addToQueue('transaction', transactionData);
        setQueuedTransactionId(queueId);
        setShowOfflineToast(true);
        // Show success message after a short delay to allow the queue to update
        setTimeout(() => onSuccess?.(), 100);
        return;
      }

      // Reset form on success
      setFormData({
        amount: "",
        description: "",
        categoryId: "",
        date: new Date().toISOString().split('T')[0],
        type: "expense",
        tags: "",
      });
      onSuccess?.();
    } catch (error) {
      toast.error("Failed to add transaction");
    }
  };

  const filteredCategories = categories?.filter(cat => cat.type === formData.type) || [];

  return (
    <div className="space-y-4">
      {showOfflineToast && (
        <MobileToast
          message="You're offline. Transaction will be synced when you're back online."
          type="info"
          duration={5000}
          onClose={() => setShowOfflineToast(false)}
        />
      )}
      {queuedTransaction && queuedTransaction.status === 'pending' && (
        <div className="bg-blue-50 text-blue-800 p-3 rounded-md text-sm flex items-center">
          <span className="mr-2">🔄</span>
          <span>Transaction saved offline and will sync when you're back online</span>
        </div>
      )}
      {queuedTransaction && queuedTransaction.status === 'error' && (
        <div className="bg-red-50 text-red-800 p-3 rounded-md text-sm flex items-center">
          <span className="mr-2">❌</span>
          <span>Failed to sync transaction. Please try again when online.</span>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setFormData(prev => ({ ...prev, type: "expense", categoryId: "" }))}
          className={`flex-1 py-2 px-4 rounded ${
            formData.type === "expense"
              ? "bg-red-100 text-red-700 border-red-300"
              : "bg-gray-100 text-gray-700"
          }`}
        >
          💸 Expense
        </button>
        <button
          type="button"
          onClick={() => setFormData(prev => ({ ...prev, type: "income", categoryId: "" }))}
          className={`flex-1 py-2 px-4 rounded ${
            formData.type === "income"
              ? "bg-green-100 text-green-700 border-green-300"
              : "bg-gray-100 text-gray-700"
          }`}
        >
          💰 Income
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Amount *
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
          Description *
        </label>
        <input
          type="text"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="What was this for?"
          required
        />
      </div>

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
          {filteredCategories.map((category) => (
            <option key={category._id} value={category._id}>
              {category.icon} {category.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Date *
        </label>
        <input
          type="date"
          value={formData.date}
          onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tags (optional)
        </label>
        <input
          type="text"
          value={formData.tags}
          onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="work, travel, groceries (comma separated)"
        />
      </div>

      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
      >
        Add Transaction
      </button>
    </form>
    </div>
  );
}
