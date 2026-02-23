// Browser Push Notification Service
// Handles service worker registration and browser notifications with Web Push

// @ts-ignore - api.js doesn't have type declarations
import api from './api';

class BrowserNotificationService {
  private static instance: BrowserNotificationService;
  private swRegistration: ServiceWorkerRegistration | null = null;
  private isSupported: boolean = false;
  private permissionStatus: NotificationPermission = 'default';
  private vapidPublicKey: string | null = null;

  private constructor() {
    this.isSupported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    if (this.isSupported) {
      this.permissionStatus = Notification.permission;
    }
  }

  static getInstance(): BrowserNotificationService {
    if (!BrowserNotificationService.instance) {
      BrowserNotificationService.instance = new BrowserNotificationService();
    }
    return BrowserNotificationService.instance;
  }

  // Check if browser notifications are supported
  isNotificationSupported(): boolean {
    return this.isSupported;
  }

  // Get current permission status
  getPermissionStatus(): NotificationPermission {
    return this.permissionStatus;
  }

  // Check if notifications are enabled
  isEnabled(): boolean {
    return this.isSupported && this.permissionStatus === 'granted';
  }

  // Fetch VAPID public key from server
  private async fetchVapidKey(): Promise<string | null> {
    if (this.vapidPublicKey) return this.vapidPublicKey;
    
    try {
      const response = await api.get('/webpush/key');
      this.vapidPublicKey = response.data.publicKey;
      return this.vapidPublicKey;
    } catch (error) {
      console.error('Failed to fetch VAPID key:', error);
      return null;
    }
  }

  // Convert URL-safe base64 to Uint8Array for VAPID key
  private urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const buffer = new ArrayBuffer(rawData.length);
    const outputArray = new Uint8Array(buffer);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Request notification permission
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported) {
      console.warn('Notifications not supported in this browser');
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      this.permissionStatus = permission;
      
      if (permission === 'granted') {
        await this.subscribeToWebPush();
      }
      
      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }

  // Register service worker
  async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported');
      return null;
    }

    try {
      // Check if already registered
      const existingReg = await navigator.serviceWorker.getRegistration('/');
      if (existingReg) {
        this.swRegistration = existingReg;
        console.log('Service Worker already registered');
        return existingReg;
      }

      // Register new service worker
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      
      this.swRegistration = registration;
      console.log('Service Worker registered:', registration);
      
      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;
      
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }

  // Subscribe to Web Push notifications
  async subscribeToWebPush(): Promise<boolean> {
    try {
      const registration = await this.registerServiceWorker();
      if (!registration) return false;

      const vapidKey = await this.fetchVapidKey();
      if (!vapidKey) {
        console.error('No VAPID key available');
        return false;
      }

      // Check for existing subscription
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        // Create new subscription
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(vapidKey)
        });
        console.log('Push subscription created:', subscription);
      }

      // Send subscription to server
      const subscriptionJson = subscription.toJSON();
      await api.post('/webpush/subscribe', {
        endpoint: subscriptionJson.endpoint,
        keys: subscriptionJson.keys,
        contentEncoding: (PushManager as any).supportedContentEncodings?.[0] || 'aesgcm'
      });

      console.log('Push subscription saved to server');
      return true;
    } catch (error) {
      console.error('Failed to subscribe to Web Push:', error);
      return false;
    }
  }

  // Unsubscribe from Web Push
  async unsubscribeFromWebPush(): Promise<boolean> {
    try {
      if (!this.swRegistration) return false;

      const subscription = await this.swRegistration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        await api.post('/webpush/unsubscribe', {
          endpoint: subscription.endpoint
        });
        console.log('Unsubscribed from push notifications');
      }
      return true;
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      return false;
    }
  }

  // Show a browser notification (fallback for local notifications)
  async showNotification(
    title: string,
    options: {
      body?: string;
      icon?: string;
      tag?: string;
      data?: Record<string, unknown>;
      requireInteraction?: boolean;
    } = {}
  ): Promise<boolean> {
    if (!this.isEnabled()) {
      console.warn('Notifications not enabled');
      return false;
    }

    const notificationOptions: NotificationOptions = {
      body: options.body || '',
      icon: options.icon || '/favicon.svg',
      badge: '/favicon.svg',
      tag: options.tag || `notification-${Date.now()}`,
      data: options.data || {},
      requireInteraction: options.requireInteraction ?? false,
      silent: false,
    };

    try {
      // Try using Service Worker for background notifications
      if (this.swRegistration) {
        await this.swRegistration.showNotification(title, notificationOptions);
        return true;
      }
      
      // Fallback to regular Notification API
      const notification = new Notification(title, notificationOptions);
      
      notification.onclick = () => {
        window.focus();
        if (options.data?.task_id) {
          window.location.href = `/dashboard/tasks/${options.data.task_id}`;
        } else if (options.data?.url) {
          window.location.href = options.data.url as string;
        }
        notification.close();
      };
      
      return true;
    } catch (error) {
      console.error('Error showing notification:', error);
      return false;
    }
  }

  // Initialize the service (call on app load if permission already granted)
  async initialize(): Promise<void> {
    if (this.isSupported && this.permissionStatus === 'granted') {
      await this.subscribeToWebPush();
    }
  }
}

// Export singleton instance
export const browserNotificationService = BrowserNotificationService.getInstance();
export default browserNotificationService;
