import { useState, useCallback, useEffect } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { PlaidLink } from "react-plaid-link";

declare global {
  interface Window {
    Plaid: any;
  }
}

export function BankConnection() {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const generateLinkToken = useAction(api.plaid.createLinkToken);
  const exchangePublicToken = useAction(api.plaid.exchangePublicToken);
  const accounts = useQuery(api.plaidData.getAccounts);
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

  const handleConnect = async () => {
    try {
      const { link_token } = await generateLinkToken();
      setLinkToken(link_token);
    } catch (error) {
      console.error("Error generating link token", error);
      toast.error("Failed to connect to Plaid. Please try again.");
    }
  };

  const handleSuccess = async (public_token: string) => {
    try {
      await exchangePublicToken({ publicToken: public_token });
      toast.success("Bank account linked successfully!");
    } catch (error) {
      console.error("Error exchanging public token", error);
      toast.error("Failed to link bank account. Please try again.");
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
        {linkToken ? (
          <PlaidLink
            token={linkToken}
            onSuccess={(public_token: string) => handleSuccess(public_token)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Continue to Plaid
          </PlaidLink>
        ) : (
          <button
            onClick={handleConnect}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Link New Bank Account
          </button>
        )}
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
