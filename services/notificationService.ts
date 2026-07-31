/**
 * Notification Service
 * Handles push notification subscriptions and management
 */

import { supabase } from '../supabase';
import { PushSubscription, NotificationPreference, WebPushSubscription, NotificationType } from '../types';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

// ==================== Permission Management ====================

export const checkNotificationPermission = (): NotificationPermission => {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
};

export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) {
    throw new Error('This browser does not support notifications');
  }

  if (!('serviceWorker' in navigator)) {
    throw new Error('This browser does not support service workers');
  }

  const permission = await Notification.requestPermission();
  return permission;
};

export const isNotificationSupported = (): boolean => {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
};

// ==================== Service Worker Registration ====================

export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration> => {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service workers are not supported');
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    
    // Push the VAPID public key to the service worker so it can handle
    // pushsubscriptionchange events (the SW cannot read build-time env vars).
    await sendVapidKeyToSw();

    console.log('Service Worker registered:', registration);
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    throw error;
  }
};

// Send the VAPID public key to the service worker (used on pushsubscriptionchange).
export const sendVapidKeyToSw = async (): Promise<void> => {
  if (!VAPID_PUBLIC_KEY || !('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const controller = registration.active || navigator.serviceWorker.controller;
    if (controller) {
      controller.postMessage({ type: 'SET_VAPID_KEY', key: VAPID_PUBLIC_KEY });
    }
  } catch (error) {
    console.error('Error sending VAPID key to service worker:', error);
  }
};

export const getServiceWorkerRegistration = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!('serviceWorker' in navigator)) {
    return null;
  }

  try {
    return await navigator.serviceWorker.ready;
  } catch (error) {
    console.error('Error getting service worker registration:', error);
    return null;
  }
};

// ==================== Push Subscription Management ====================

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const subscribeToPush = async (userId: string): Promise<PushSubscription | null> => {
  try {
    // Check permission
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      throw new Error('Notification permission not granted');
    }

    // Get service worker registration
    const registration = await getServiceWorkerRegistration();
    if (!registration) {
      throw new Error('Service worker not registered');
    }

    // VAPID public key is required to create a push subscription
    if (!VAPID_PUBLIC_KEY) {
      throw new Error('VAPID public key is not configured. Add VITE_VAPID_PUBLIC_KEY to your environment.');
    }

    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();

    // If no subscription, create one
    if (!subscription) {
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      });
    }

    // Save subscription to database
    const subscriptionJson = subscription.toJSON();
    const deviceName = getDeviceName();
    const userAgent = navigator.userAgent;

    const { data, error } = await supabase
      .from('push_subscriptions')
      .upsert([{
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh_key: subscriptionJson.keys?.p256dh || '',
        auth_key: subscriptionJson.keys?.auth || '',
        device_name: deviceName,
        user_agent: userAgent,
        is_active: true,
        updated_at: new Date().toISOString()
      }], {
        onConflict: 'endpoint',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving subscription:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error subscribing to push:', error);
    throw error;
  }
};

export const unsubscribeFromPush = async (userId: string): Promise<void> => {
  try {
    const registration = await getServiceWorkerRegistration();
    if (!registration) {
      return;
    }

    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      // Remove only this device's subscription (other devices stay enabled)
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('endpoint', endpoint);
    }

  } catch (error) {
    console.error('Error unsubscribing from push:', error);
    throw error;
  }
};

export const getActiveSubscription = async (): Promise<WebPushSubscription | null> => {
  try {
    const registration = await getServiceWorkerRegistration();
    if (!registration) {
      return null;
    }

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      return null;
    }

    const subscriptionJson = subscription.toJSON();
    return {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscriptionJson.keys?.p256dh || '',
        auth: subscriptionJson.keys?.auth || ''
      }
    };
  } catch (error) {
    console.error('Error getting active subscription:', error);
    return null;
  }
};

// ==================== User Subscriptions ====================

export const fetchUserSubscriptions = async (userId: string): Promise<PushSubscription[]> => {
  try {
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching user subscriptions:', error);
    return [];
  }
};

export const updateSubscriptionActive = async (
  subscriptionId: string,
  isActive: boolean
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('push_subscriptions')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', subscriptionId);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }
};

export const removeSubscription = async (subscriptionId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('id', subscriptionId);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error removing subscription:', error);
    throw error;
  }
};

// ==================== Notification Preferences ====================

export const fetchNotificationPreferences = async (userId: string): Promise<NotificationPreference[]> => {
  try {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .order('notification_type');

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return [];
  }
};

export const updateNotificationPreference = async (
  userId: string,
  notificationType: NotificationType,
  updates: Partial<NotificationPreference>
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('notification_preferences')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('notification_type', notificationType);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error updating notification preference:', error);
    throw error;
  }
};

export const toggleNotificationType = async (
  userId: string,
  notificationType: NotificationType,
  enabled: boolean
): Promise<void> => {
  return updateNotificationPreference(userId, notificationType, { enabled });
};

export const updateQuietHours = async (
  userId: string,
  notificationType: NotificationType,
  quietHoursStart: string | null,
  quietHoursEnd: string | null
): Promise<void> => {
  return updateNotificationPreference(userId, notificationType, {
    quiet_hours_start: quietHoursStart,
    quiet_hours_end: quietHoursEnd
  });
};

export const updateReminderMinutes = async (
  userId: string,
  reminderMinutes: number
): Promise<void> => {
  return updateNotificationPreference(userId, NotificationType.TASK_REMINDER, {
    reminder_minutes: reminderMinutes
  });
};

// ==================== Test Notification ====================

export const sendTestNotification = async (): Promise<void> => {
  const permission = checkNotificationPermission();
  
  if (permission !== 'granted') {
    throw new Error('Notification permission not granted');
  }

  const registration = await getServiceWorkerRegistration();
  if (!registration) {
    throw new Error('Service worker not registered');
  }

  // Use a unique tag per test: a fixed tag would silently replace the previous
  // test notification (still displayed) instead of showing a fresh popup.
  const options: NotificationOptions & { renotify?: boolean; vibrate?: number[] } = {
    body: 'This is a test notification. If you see this, push notifications are working!',
    icon: '/icon-512.png',
    badge: '/icon-512.png',
    tag: `test-notification-${Date.now()}`,
    renotify: true,
    data: {
      type: 'test',
      url: '/'
    },
    requireInteraction: false,
    vibrate: [200, 100, 200]
  };
  await registration.showNotification('ZenTask Test Notification', options);
};

// ==================== Utility Functions ====================

function getDeviceName(): string {
  const ua = navigator.userAgent;
  
  if (/Mobile|Android|iPhone|iPad|iPod/i.test(ua)) {
    if (/iPhone/i.test(ua)) return 'iPhone';
    if (/iPad/i.test(ua)) return 'iPad';
    if (/Android/i.test(ua)) return 'Android';
    return 'Mobile Device';
  }
  
  if (/Windows/i.test(ua)) return 'Windows PC';
  if (/Mac/i.test(ua)) return 'Mac';
  if (/Linux/i.test(ua)) return 'Linux';
  
  return 'Desktop';
}

export const formatDeviceName = (userAgent: string): string => {
  if (!userAgent) return 'Unknown Device';
  
  if (/iPhone/i.test(userAgent)) return 'iPhone';
  if (/iPad/i.test(userAgent)) return 'iPad';
  if (/Android/i.test(userAgent)) return 'Android';
  if (/Windows/i.test(userAgent)) return 'Windows';
  if (/Mac/i.test(userAgent)) return 'Mac';
  if (/Linux/i.test(userAgent)) return 'Linux';
  
  return 'Unknown Device';
};

export const getRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'Just now';
};
