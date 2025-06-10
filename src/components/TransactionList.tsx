import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { toast } from "sonner";

export function TransactionList() {
  const transactions = useQuery(api.plaidData.getPlaidTransactions, { limit: 50 });
  const deleteTransaction = useMutation(api.transactions.remove);

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this transaction?")) {
      try {
        await deleteTransaction({ id: id as any });
        toast.success("Transaction deleted");
      } catch (error) {
        toast.error("Failed to delete transaction");
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Recent Transactions</h2>
      </div>

      {!transactions ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No transactions found. Link a bank account to get started.
        </div>
      ) : (
        <div className="space-y-2">
          {transactions
            .slice()
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map((transaction) => (
            <div
              key={transaction._id}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <div className="text-2xl">{transaction.category?.icon}</div>
                <div>
                  <div className="font-medium">{transaction.description || transaction.name}</div>
                  <div className="text-sm text-gray-500">
                    {transaction.category?.name} • {formatDate(transaction.date)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div
                  className={`font-semibold ${
                    transaction.type === "expense" ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {transaction.type === "expense" ? "-" : "+"}
                  {formatCurrency(transaction.amount)}
                </div>
                <button
                  onClick={() => handleDelete(transaction._id)}
                  className="text-gray-400 hover:text-red-600 transition-colors"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
