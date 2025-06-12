import { useEffect, useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

interface OfflineQueueItem {
  id: string;
  type: 'transaction' | 'category' | 'budget' | 'goal';
  data: any;
  timestamp: number;
  status: 'pending' | 'syncing' | 'synced' | 'error';
}

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queue, setQueue] = useState<OfflineQueueItem[]>(() => {
    const savedQueue = localStorage.getItem('offlineQueue');
    return savedQueue ? JSON.parse(savedQueue) : [];
  });

  const addTransaction = useMutation(api.transactions.create);
  const addCategory = useMutation(api.categories.create);
  const addBudget = useMutation(api.budgets.create);
  const addGoal = useMutation(api.goals.create);

  // Sync queue when coming back online
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial sync check
    if (isOnline && queue.length > 0) {
      syncQueue();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [queue]);

  // Save queue to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('offlineQueue', JSON.stringify(queue));
  }, [queue]);

  const addToQueue = (type: OfflineQueueItem['type'], data: any) => {
    const newItem: OfflineQueueItem = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: Date.now(),
      status: 'pending',
    };

    setQueue(prevQueue => [...prevQueue, newItem]);

    // If online, try to sync immediately
    if (isOnline) {
      syncQueue();
    }

    return newItem.id;
  };

  const syncQueue = async () => {
    if (!isOnline || queue.length === 0) return;

    const pendingItems = queue.filter(item => item.status === 'pending' || item.status === 'error');
    
    for (const item of pendingItems) {
      try {
        // Update status to syncing
        setQueue(prevQueue =>
          prevQueue.map(q => (q.id === item.id ? { ...q, status: 'syncing' as const } : q))
        );

        // Execute the appropriate mutation based on item type
        switch (item.type) {
          case 'transaction':
            await addTransaction(item.data);
            break;
          case 'category':
            await addCategory(item.data);
            break;
          case 'budget':
            await addBudget(item.data);
            break;
          case 'goal':
            await addGoal(item.data);
            break;
        }

        // Update status to synced
        setQueue(prevQueue =>
          prevQueue.map(q => (q.id === item.id ? { ...q, status: 'synced' as const } : q))
        );

        // Remove synced items after a delay
        setTimeout(() => {
          setQueue(prevQueue => prevQueue.filter(q => q.id !== item.id));
        }, 3000);
      } catch (error) {
        console.error(`Failed to sync ${item.type}:`, error);
        // Update status to error
        setQueue(prevQueue =>
          prevQueue.map(q => (q.id === item.id ? { ...q, status: 'error' as const } : q))
        );
      }
    }
  };

  const getQueueItem = (id: string) => {
    return queue.find(item => item.id === id);
  };

  const removeFromQueue = (id: string) => {
    setQueue(prevQueue => prevQueue.filter(item => item.id !== id));
  };

  return {
    isOnline,
    queue,
    addToQueue,
    syncQueue,
    getQueueItem,
    removeFromQueue,
  };
}
