import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";

export function TransactionList() {
  const transactions = useQuery(api.plaidData.getPlaidTransactions, { limit: 50 });
  const deletePlaidTransaction = useMutation(api.plaidData.remove);
  const exportTransactions = useAction(api.csv.exportTransactions);
  const [isExporting, setIsExporting] = useState(false);

  const handleDelete = async (id: Id<"plaidTransactions">) => {
    if (confirm("Are you sure you want to delete this transaction?")) {
      try {
        await deletePlaidTransaction({ id });
        toast.success("Transaction deleted");
      } catch (error) {
        console.error("Delete error:", error);
        toast.error("Failed to delete transaction");
      }
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const csvData = await exportTransactions();
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'transactions.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Transactions exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export transactions');
    } finally {
      setIsExporting(false);
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
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isExporting ? 'Exporting...' : 'Export to CSV'}
        </button>
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
