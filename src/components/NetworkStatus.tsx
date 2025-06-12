import { useState, useEffect } from 'react';
import { Wifi, WifiOff, X } from 'lucide-react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

export function NetworkStatus() {
  const { showOfflineBanner } = useNetworkStatus();
  const [isVisible, setIsVisible] = useState(showOfflineBanner);

  useEffect(() => {
    if (showOfflineBanner) {
      setIsVisible(true);
    } else {
      // Start fade out animation before hiding
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 300); // Match this with the CSS transition duration
      return () => clearTimeout(timer);
    }
  }, [showOfflineBanner]);

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded shadow-lg flex items-center space-x-2 z-50 transition-all duration-300 ${
        showOfflineBanner ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
      }`}
      role="alert"
    >
      <WifiOff className="h-5 w-5" />
      <div>
        <p className="font-medium">You're offline</p>
        <p className="text-sm">Some features may be limited</p>
      </div>
      <button 
        onClick={() => setIsVisible(false)}
        className="ml-4 text-yellow-700 hover:text-yellow-900 p-1 -mr-2"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
