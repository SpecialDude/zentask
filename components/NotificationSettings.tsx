import React, { useState, useEffect } from 'react';
import { NotificationPreference, NotificationType, PushSubscription } from '../types';
import {
  checkNotificationPermission,
  isNotificationSupported,
  subscribeToPush,
  unsubscribeFromPush,
  fetchNotificationPreferences,
  fetchUserSubscriptions,
  toggleNotificationType,
  updateQuietHours,
  updateReminderMinutes,
  removeSubscription,
  sendTestNotification,
  formatDeviceName,
  getRelativeTime,
  registerServiceWorker
} from '../services/notificationService';
import LoadingSpinner from './LoadingSpinner';
import { useToast } from './Toast';

interface NotificationSettingsProps {
  userId: string;
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({ userId }) => {
  const { showToast } = useToast();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [subscriptions, setSubscriptions] = useState<PushSubscription[]>([]);
  const [activeTab, setActiveTab] = useState<'settings' | 'devices'>('settings');

  // Load initial data
  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      setIsSupported(isNotificationSupported());
      setPermission(checkNotificationPermission());

      if (isNotificationSupported()) {
        const [prefs, subs] = await Promise.all([
          fetchNotificationPreferences(userId),
          fetchUserSubscriptions(userId)
        ]);
        setPreferences(prefs);
        setSubscriptions(subs);
        setIsSubscribed(subs.length > 0);
      }
    } catch (error) {
      console.error('Error loading notification data:', error);
      showToast('Failed to load notification settings', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnableNotifications = async () => {
    setIsSaving(true);
    try {
      // Register service worker first
      await registerServiceWorker();
      
      // Subscribe to push
      await subscribeToPush(userId);
      
      showToast('Notifications enabled successfully!', 'success');
      await loadData();
    } catch (error: any) {
      console.error('Error enabling notifications:', error);
      showToast(error.message || 'Failed to enable notifications', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisableNotifications = async () => {
    if (!confirm('Are you sure you want to disable all notifications?')) {
      return;
    }

    setIsSaving(true);
    try {
      await unsubscribeFromPush(userId);
      showToast('Notifications disabled', 'success');
      await loadData();
    } catch (error) {
      console.error('Error disabling notifications:', error);
      showToast('Failed to disable notifications', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleType = async (type: NotificationType, enabled: boolean) => {
    try {
      await toggleNotificationType(userId, type, enabled);
      setPreferences(prev =>
        prev.map(p => p.notification_type === type ? { ...p, enabled } : p)
      );
      showToast(`${getNotificationLabel(type)} ${enabled ? 'enabled' : 'disabled'}`, 'success');
    } catch (error) {
      console.error('Error toggling notification type:', error);
      showToast('Failed to update preference', 'error');
    }
  };

  const handleUpdateReminderMinutes = async (minutes: number) => {
    try {
      await updateReminderMinutes(userId, minutes);
      setPreferences(prev =>
        prev.map(p =>
          p.notification_type === NotificationType.TASK_REMINDER
            ? { ...p, reminder_minutes: minutes }
            : p
        )
      );
      showToast('Reminder time updated', 'success');
    } catch (error) {
      console.error('Error updating reminder time:', error);
      showToast('Failed to update reminder time', 'error');
    }
  };

  const handleUpdateQuietHours = async (
    type: NotificationType,
    start: string | null,
    end: string | null
  ) => {
    try {
      await updateQuietHours(userId, type, start, end);
      setPreferences(prev =>
        prev.map(p =>
          p.notification_type === type
            ? { ...p, quiet_hours_start: start, quiet_hours_end: end }
            : p
        )
      );
      showToast('Quiet hours updated', 'success');
    } catch (error) {
      console.error('Error updating quiet hours:', error);
      showToast('Failed to update quiet hours', 'error');
    }
  };

  const handleRemoveDevice = async (subscriptionId: string) => {
    if (!confirm('Remove this device from receiving notifications?')) {
      return;
    }

    try {
      await removeSubscription(subscriptionId);
      setSubscriptions(prev => prev.filter(s => s.id !== subscriptionId));
      showToast('Device removed', 'success');
    } catch (error) {
      console.error('Error removing device:', error);
      showToast('Failed to remove device', 'error');
    }
  };

  const handleTestNotification = async () => {
    try {
      await sendTestNotification();
      showToast('Test notification sent!', 'success');
    } catch (error: any) {
      console.error('Error sending test notification:', error);
      showToast(error.message || 'Failed to send test notification', 'error');
    }
  };

  const getNotificationLabel = (type: NotificationType): string => {
    const labels: Record<NotificationType, string> = {
      [NotificationType.TASK_REMINDER]: 'Task Reminders',
      [NotificationType.MCP_TASK_CREATED]: 'Task Created (MCP)',
      [NotificationType.MCP_TASK_UPDATED]: 'Task Updated (MCP)',
      [NotificationType.MCP_TASK_DELETED]: 'Task Deleted (MCP)',
      [NotificationType.MCP_LIST_CREATED]: 'List Created (MCP)',
      [NotificationType.MCP_LIST_UPDATED]: 'List Updated (MCP)',
      [NotificationType.MCP_LIST_DELETED]: 'List Deleted (MCP)',
      [NotificationType.MCP_CATEGORY_CREATED]: 'Category Created (MCP)',
      [NotificationType.MCP_CATEGORY_UPDATED]: 'Category Updated (MCP)',
      [NotificationType.MCP_CATEGORY_DELETED]: 'Category Deleted (MCP)',
    };
    return labels[type] || type;
  };

  const getNotificationIcon = (type: NotificationType): string => {
    if (type === NotificationType.TASK_REMINDER) return '🔔';
    if (type.includes('task')) return '✅';
    if (type.includes('list')) return '📝';
    if (type.includes('category')) return '🏷️';
    return '📬';
  };

  if (!isSupported) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
              Notifications Not Supported
            </h3>
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Your browser doesn't support push notifications. Try using Chrome, Firefox, Edge, or Safari (iOS 16.4+).
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="md" message="Loading notification settings..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">🔔 Push Notifications</h2>
        <p className="text-slate-600 dark:text-slate-400">
          Get notified about task reminders and MCP operations
        </p>
      </div>

      {/* Enable/Disable Section */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-lg">Notification Status</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {permission === 'granted' && isSubscribed
                ? '✅ Notifications are enabled'
                : permission === 'denied'
                ? '❌ Notifications are blocked'
                : '⚠️ Notifications are not enabled'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isSubscribed && (
              <button
                onClick={handleTestNotification}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Test
              </button>
            )}
            <button
              onClick={isSubscribed ? handleDisableNotifications : handleEnableNotifications}
              disabled={isSaving || permission === 'denied'}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                isSubscribed
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isSaving ? 'Processing...' : isSubscribed ? 'Disable' : 'Enable Notifications'}
            </button>
          </div>
        </div>

        {permission === 'denied' && (
          <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-sm text-red-800 dark:text-red-200">
              <strong>Permission Blocked:</strong> You've blocked notifications for this site. 
              To enable them, click the lock icon in your browser's address bar and allow notifications.
            </p>
          </div>
        )}
      </div>

      {/* Tabs */}
      {isSubscribed && (
        <>
          <div className="border-b border-slate-200 dark:border-slate-700">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab('settings')}
                className={`pb-3 px-1 font-medium transition-colors relative ${
                  activeTab === 'settings'
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Settings
                {activeTab === 'settings' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('devices')}
                className={`pb-3 px-1 font-medium transition-colors relative ${
                  activeTab === 'devices'
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Devices ({subscriptions.length})
                {activeTab === 'devices' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400" />
                )}
              </button>
            </div>
          </div>

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-4">
              {preferences.map(pref => (
                <div
                  key={pref.id}
                  className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <span className="text-2xl">{getNotificationIcon(pref.notification_type)}</span>
                      <div className="flex-1">
                        <h4 className="font-medium">{getNotificationLabel(pref.notification_type)}</h4>
                        
                        {/* Reminder Minutes (Task Reminder only) */}
                        {pref.notification_type === NotificationType.TASK_REMINDER && (
                          <div className="mt-3">
                            <label className="text-sm text-slate-600 dark:text-slate-400 block mb-1">
                              Remind me before task starts:
                            </label>
                            <select
                              value={pref.reminder_minutes}
                              onChange={(e) => handleUpdateReminderMinutes(Number(e.target.value))}
                              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"
                            >
                              <option value={5}>5 minutes</option>
                              <option value={10}>10 minutes</option>
                              <option value={15}>15 minutes</option>
                              <option value={30}>30 minutes</option>
                              <option value={60}>1 hour</option>
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleType(pref.notification_type, !pref.enabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        pref.enabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          pref.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Devices Tab */}
          {activeTab === 'devices' && (
            <div className="space-y-3">
              {subscriptions.length === 0 ? (
                <div className="text-center py-12 text-slate-600 dark:text-slate-400">
                  No active devices
                </div>
              ) : (
                subscriptions.map(sub => (
                  <div
                    key={sub.id}
                    className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between"
                  >
                    <div>
                      <h4 className="font-medium">
                        {sub.device_name || formatDeviceName(sub.user_agent || '')}
                      </h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        Added {getRelativeTime(sub.created_at)}
                      </p>
                      {sub.last_notified_at && (
                        <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">
                          Last notification: {getRelativeTime(sub.last_notified_at)}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveDevice(sub.id)}
                      className="px-3 py-1.5 rounded-lg text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default NotificationSettings;
