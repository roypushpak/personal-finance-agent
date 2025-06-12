import { useEffect, useState } from 'react';

export function useServiceWorker() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isServiceWorkerSupported, setIsServiceWorkerSupported] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Check if service workers are supported
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      setIsServiceWorkerSupported(true);
    }
  }, []);

  // Register service worker
  useEffect(() => {
    if (!isServiceWorkerSupported) return;

    const registerServiceWorker = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/service-worker.js');
        setRegistration(reg);
        console.log('Service Worker registered with scope: ', reg.scope);
      } catch (error) {
        console.error('Service Worker registration failed: ', error);
      }
    };

    if (isServiceWorkerSupported) {
      registerServiceWorker();
    }
  }, [isServiceWorkerSupported]);

  // Update online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, isServiceWorkerSupported, registration };
}
