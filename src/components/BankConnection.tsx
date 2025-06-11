import { useState, useCallback, useEffect } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { usePlaidLink } from "react-plaid-link";


export function BankConnection() {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const generateLinkToken = useAction(api.plaid.createLinkToken);
  const exchangePublicToken = useAction(api.plaid.exchangePublicToken);
  const accounts = useQuery(api.plaidData.getAccounts) || [];
  const migrateTransactions = useAction(api.plaidData.migrateTransactionsToCategorized);
  const [isMigrating, setIsMigrating] = useState(false);

  const handleMigrate = async () => {
    setIsMigrating(true);
    toast.info("Starting transaction migration...");
    try {
      const result = await migrateTransactions();
      toast.success(`Migration complete! ${result.migratedCount} transactions updated.`);
    } catch (error) {
      toast.error("Migration failed. Please try again.");
      console.error(error);
    } finally {
      setIsMigrating(false);
    }
  };

  const handleSuccess = useCallback(async (public_token: string) => {
    try {
      await exchangePublicToken({ publicToken: public_token });
      toast.success("Bank account linked successfully!");

    } catch (error) {
      console.error("Error exchanging public token", error);
      toast.error("Failed to link bank account. Please try again.");
    } finally {
      setIsConnecting(false);
    }
  }, [exchangePublicToken, accounts]);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: handleSuccess,
    onExit: () => {
      setIsConnecting(false);
    },
  });

  useEffect(() => {
    if (ready && linkToken) {
      open();
    }
  }, [ready, open, linkToken]);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const { link_token } = await generateLinkToken();
      setLinkToken(link_token);
    } catch (error) {
      console.error("Error generating link token", error);
      toast.error("Failed to connect to Plaid. Please try again.");
      setIsConnecting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Bank Connections</h2>
      
      <div className="space-y-4">
        {accounts && accounts.length > 0 ? (
          accounts.map(account => (
            <div key={account.accountId} className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
              <div>
                <p className="font-medium">{account.name}</p>
                <p className="text-sm text-gray-500">{account.subtype}</p>
              </div>
              <p className="font-mono text-gray-700">${account.balance.toFixed(2)}</p>
            </div>
          ))
        ) : (
          <p className="text-gray-500">No bank accounts linked yet.</p>
        )}
      </div>

      <div className="mt-6 flex gap-4">
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center"
        >
          {isConnecting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              <span>Connecting...</span>
            </>
          ) : (
            "Link New Bank Account"
          )}
        </button>
        <button
          onClick={handleMigrate}
          disabled={isMigrating}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400"
        >
          {isMigrating ? "Migrating..." : "Categorize Old Transactions"}
        </button>
      </div>
    </div>
  );
}
