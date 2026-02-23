import { useState, useEffect } from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import browserNotificationService from '../services/browserNotificationService';

interface NotificationPermissionProps {
  onClose?: () => void;
}

export default function NotificationPermission({ onClose }: NotificationPermissionProps) {
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const supported = browserNotificationService.isNotificationSupported();
    setIsSupported(supported);
    
    if (supported) {
      const status = browserNotificationService.getPermissionStatus();
      setPermissionStatus(status);
      
      // Show banner if permission not yet requested
      if (status === 'default') {
        // Check if user has dismissed the banner before
        const dismissed = localStorage.getItem('notification-banner-dismissed');
        if (!dismissed) {
          setShowBanner(true);
        }
      }
      
      // Initialize service worker if already granted
      if (status === 'granted') {
        browserNotificationService.initialize();
      }
    }
  }, []);

  const handleEnableNotifications = async () => {
    setIsLoading(true);
    try {
      const permission = await browserNotificationService.requestPermission();
      setPermissionStatus(permission);
      
      if (permission === 'granted') {
        // Show a test notification
        await browserNotificationService.showNotification(
          'Notifications Enabled! 🎉',
          {
            body: 'You will now receive notifications for tasks, messages, and updates.',
            tag: 'welcome-notification',
          }
        );
        setShowBanner(false);
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('notification-banner-dismissed', 'true');
    onClose?.();
  };

  if (!isSupported) {
    return null;
  }

  if (!showBanner || permissionStatus === 'granted') {
    return null;
  }

  if (permissionStatus === 'denied') {
    return (
      <div className="fixed bottom-4 right-4 max-w-sm bg-red-50 border border-red-200 rounded-lg shadow-lg p-4 z-50">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <BellOff className="w-5 h-5 text-red-500" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-medium text-red-800">Notifications Blocked</h4>
            <p className="text-xs text-red-600 mt-1">
              Please enable notifications in your browser settings to receive updates.
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-red-400 hover:text-red-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 max-w-sm bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 animate-slide-up">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 bg-green-100 rounded-full p-2">
          <Bell className="w-5 h-5 text-green-600" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-900">Enable Notifications</h4>
          <p className="text-xs text-gray-500 mt-1">
            Get notified about new tasks, messages, and updates even when you're not on this page.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleEnableNotifications}
              disabled={isLoading}
              className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Enabling...' : 'Enable'}
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
