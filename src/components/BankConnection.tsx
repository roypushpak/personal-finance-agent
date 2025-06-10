import { useState, useCallback, useEffect } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

declare global {
  interface Window {
    Plaid: any;
  }
}

export function BankConnection() {
  const [isConnecting, setIsConnecting] = useState(false);
  const createLinkToken = useAction(api.plaid.createLinkToken);
  const exchangePublicToken = useAction(api.plaid.exchangePublicToken);
  const accounts = useQuery(api.plaidData.getAccounts);
  const plaidTransactions = useQuery(api.plaidData.getPlaidTransactions, { limit: 10 });

  const onSuccess = useCallback(async (public_token: string) => {
    setIsConnecting(true);
    try {
      await exchangePublicToken({ publicToken: public_token });
      toast.success("Bank account connected successfully!");
    } catch (error) {
      toast.error("Failed to connect bank account");
    } finally {
      setIsConnecting(false);
    }
  }, [exchangePublicToken]);

  const onExit = useCallback((err: any) => {
    if (err != null) {
      console.error('Plaid Link exit:', err);
    }
  }, []);

  const initializePlaidLink = useCallback(async () => {
    try {
      const { link_token } = await createLinkToken();
      
      const handler = window.Plaid.create({
        token: link_token,
        onSuccess,
        onExit,
      });

      handler.open();
    } catch (error) {
      toast.error("Failed to initialize bank connection");
    }
  }, [createLinkToken, onSuccess, onExit]);

  useEffect(() => {
    // Load Plaid Link script
    const script = document.createElement('script');
    script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Bank Accounts</h2>
        <button
          onClick={initializePlaidLink}
          disabled={isConnecting}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {isConnecting ? "Connecting..." : "🏦 Connect Bank"}
        </button>
      </div>

      {!accounts ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">🏦</div>
          <div>No bank accounts connected</div>
          <p className="text-sm mt-2">Connect your bank account to automatically sync transactions</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4">
            {accounts.map((account) => (
              <div key={account._id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">{account.name}</h3>
                    <p className="text-sm text-gray-600 capitalize">
                      {account.type} • {account.subtype}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-lg">
                      {formatCurrency(account.balance)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {plaidTransactions && plaidTransactions.length > 0 && (
            <div className="mt-6">
              <h3 className="font-medium mb-3">Recent Bank Transactions</h3>
              <div className="space-y-2">
                {plaidTransactions.slice(0, 5).map((transaction) => (
                  <div
                    key={transaction._id}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded"
                  >
                    <div>
                      <div className="font-medium">{transaction.description}</div>
                      <div className="text-sm text-gray-600">
                        {transaction.category} • {new Date(transaction.date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="font-semibold text-red-600">
                      -{formatCurrency(transaction.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
