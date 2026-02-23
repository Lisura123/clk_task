import { useState, useEffect } from 'react';
import { RefreshCw, X } from 'lucide-react';

// Current app version - update this when deploying new versions
const APP_VERSION = '2026.01.16.1';

const UpdateNotification = () => {
  const [showUpdate, setShowUpdate] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check version on mount
    checkForUpdates();

    // Check for updates every 30 seconds
    const interval = setInterval(checkForUpdates, 30000);

    // Also check when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const checkForUpdates = async () => {
    if (dismissed) return;

    try {
      // Fetch version.json with cache-busting
      const response = await fetch(`/version.json?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.version && data.version !== APP_VERSION) {
          setShowUpdate(true);
        }
      }
    } catch (error) {
      // Silently fail - don't show errors for version check
      console.debug('Version check failed:', error);
    }
  };

  const handleRefresh = () => {
    // Clear all caches and reload
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }
    // Force reload from server
    window.location.reload();
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowUpdate(false);
    // Remember dismissal for this session
    sessionStorage.setItem('updateDismissed', APP_VERSION);
  };

  // Check if already dismissed this session
  useEffect(() => {
    const dismissedVersion = sessionStorage.getItem('updateDismissed');
    if (dismissedVersion === APP_VERSION) {
      setDismissed(true);
    }
  }, []);

  if (!showUpdate) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] animate-slideDown">
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-3 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-full animate-pulse">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-sm sm:text-base">
                🎉 A new version is available!
              </p>
              <p className="text-xs sm:text-sm text-green-100">
                Click refresh to get the latest features and improvements
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2 bg-white text-green-600 rounded-lg font-semibold text-sm hover:bg-green-50 transition-colors shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Refresh Now</span>
              <span className="sm:hidden">Refresh</span>
            </button>
            <button
              onClick={handleDismiss}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Dismiss"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdateNotification;
