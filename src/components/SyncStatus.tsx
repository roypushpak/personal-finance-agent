import { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { useOfflineSync } from '../hooks/useOfflineSync';

export function SyncStatus() {
  const { isOnline, queue } = useOfflineSync();
  const [showQueue, setShowQueue] = useState(false);
  const [recentlySynced, setRecentlySynced] = useState(false);

  const pendingItems = queue.filter(item => item.status === 'pending' || item.status === 'error');
  const hasPendingItems = pendingItems.length > 0;

  useEffect(() => {
    if (isOnline && hasPendingItems) {
      setRecentlySynced(true);
      const timer = setTimeout(() => {
        setRecentlySynced(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [queue.length, isOnline, hasPendingItems]);

  if (!hasPendingItems && !recentlySynced) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end space-y-2">
      {/* Queue indicator */}
      {hasPendingItems && (
        <div className="relative">
          <button
            onClick={() => setShowQueue(!showQueue)}
            className={`p-2 rounded-full ${
              isOnline ? 'bg-blue-100 text-blue-600' : 'bg-yellow-100 text-yellow-600'
            } hover:bg-opacity-80 transition-colors shadow-md`}
            aria-label="View sync status"
          >
            <div className="flex items-center">
              {isOnline ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : (
                <WifiOff className="h-5 w-5" />
              )}
              {pendingItems.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {pendingItems.length}
                </span>
              )}
            </div>
          </button>
        </div>
      )}

      {/* Recently synced indicator */}
      {recentlySynced && !hasPendingItems && (
        <div className="bg-green-100 text-green-700 px-3 py-2 rounded-md shadow-md flex items-center space-x-2">
          <CheckCircle className="h-5 w-5" />
          <span>All changes synced</span>
        </div>
      )}

      {/* Queue dropdown */}
      {showQueue && hasPendingItems && (
        <div className="bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden w-64">
          <div className="p-3 border-b border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center">
              <h3 className="font-medium text-gray-900">Offline Changes</h3>
              <button
                onClick={() => setShowQueue(false)}
                className="text-gray-400 hover:text-gray-500"
                aria-label="Close"
              >
                &times;
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {isOnline 
                ? 'Syncing changes...' 
                : 'Changes will sync when you\'re back online'}
            </p>
          </div>
          
          <div className="max-h-60 overflow-y-auto">
            {pendingItems.map((item) => (
              <div 
                key={item.id} 
                className="p-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0 pt-0.5">
                    {item.status === 'pending' ? (
                      <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                    )}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">
                      {item.type === 'transaction' 
                        ? `${item.data.type === 'income' ? 'Income' : 'Expense'}: ${item.data.description}`
                        : `${item.type}: ${item.data.name || item.data.title || item.data.description?.substring(0, 30)}...`}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(item.timestamp).toLocaleString()}
                      {item.status === 'error' && ' • Failed to sync'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {isOnline && (
            <div className="p-3 bg-gray-50 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                Syncing {pendingItems.length} item{pendingItems.length !== 1 ? 's' : ''}...
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
