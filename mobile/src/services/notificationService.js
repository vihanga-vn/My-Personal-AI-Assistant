import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getApiBaseUrl } from '../config/api';

/**
 * Mobile Local Notification Service using Expo Notifications.
 * Handles permissions, local scheduling for one-time reminders,
 * deduplication, cancellation, and synchronization with backend.
 */

// Configure foreground notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let androidChannelCreated = false;

/**
 * Configure Android notification channel if supported by the native runtime.
 * In Expo Go on Android, NotificationsChannelsProvider is null and throws NullPointerException.
 * We catch this gracefully so local notifications can still use the system fallback channel.
 */
async function setupAndroidChannel() {
  if (Platform.OS !== 'android') return;
  try {
    if (typeof Notifications.setNotificationChannelAsync === 'function') {
      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Vox AI Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#ff4d3a',
        sound: 'default',
      });
      androidChannelCreated = true;
    }
  } catch (channelErr) {
    // Expo Go limitation: NotificationsChannelsProvider is null in Expo Go client.
    // Local notifications will still fire using Android's default notification channel.
    console.warn(
      '[NotificationService] Custom Android channel setup skipped (Expo Go limitation):',
      channelErr?.message || channelErr
    );
  }
}

/**
 * Request notification permissions and configure Android notification channel.
 *
 * @returns {Promise<boolean>} Whether permissions are granted.
 */
export async function requestNotificationPermissions() {
  if (Platform.OS === 'web') {
    console.warn('[NotificationService] Local push notifications are not supported on Web.');
    return false;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[NotificationService] Notification permission not granted by user.');
      return false;
    }

    // Attempt Android channel setup non-fatally
    await setupAndroidChannel();

    return true;
  } catch (error) {
    console.error('[NotificationService] Permission error:', error);
    return false;
  }
}

/**
 * Schedule a one-time local phone notification for a task/reminder.
 *
 * @param {Object} params
 * @param {string} params.taskId - Database task ID
 * @param {string} params.title - Task or reminder title
 * @param {string} [params.body] - Optional message body
 * @param {Date|string} params.triggerDate - When notification should fire
 * @returns {Promise<{success: boolean, notificationId?: string, error?: string}>}
 */
export async function scheduleLocalReminder({ taskId, title, body = '', triggerDate }) {
  if (Platform.OS === 'web') {
    return { success: false, error: 'Notifications not supported on Web.' };
  }

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    return { success: false, error: 'Notification permissions were not granted.' };
  }

  const date = new Date(triggerDate);
  if (isNaN(date.getTime())) {
    return { success: false, error: 'Invalid reminder date format.' };
  }

  const now = new Date();
  if (date <= now) {
    return { success: false, error: 'Reminder time is in the past.' };
  }

  try {
    // Avoid duplicate scheduling: check if a notification for this taskId is already active
    try {
      const activeNotifications = await Notifications.getAllScheduledNotificationsAsync();
      for (const item of activeNotifications) {
        if (item.content?.data?.taskId === taskId) {
          console.log(`[NotificationService] Cancelling existing duplicate notification ${item.identifier} for task ${taskId}`);
          await Notifications.cancelScheduledNotificationAsync(item.identifier);
        }
      }
    } catch (dupErr) {
      console.warn('[NotificationService] Duplicate check skipped:', dupErr?.message || dupErr);
    }

    // Schedule the notification
    const content = {
      title: `⏰ Reminder: ${title}`,
      body: body || 'You have a scheduled task due now.',
      data: { taskId },
      sound: 'default',
    };

    if (androidChannelCreated) {
      content.channelId = 'reminders';
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: 'date',
        date,
      },
    });

    console.log(`[NotificationService] Scheduled notification ID=${notificationId} for ${date.toLocaleString()}`);

    // Synchronize notification ID with backend task record
    if (taskId) {
      const syncUrl = `${getApiBaseUrl()}/api/tasks/${taskId}/notification`;
      try {
        await fetch(syncUrl, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notificationId }),
        });
      } catch (syncErr) {
        console.warn(`[NotificationService] Failed to sync notification ID to backend at ${syncUrl}:`, syncErr.message);
      }
    }

    return {
      success: true,
      notificationId,
    };
  } catch (error) {
    console.error('[NotificationService] Schedule error:', error);
    return {
      success: false,
      error: error.message || 'Failed to schedule local notification.',
    };
  }
}

/**
 * Cancel a scheduled local notification.
 *
 * @param {string} notificationId
 */
export async function cancelLocalReminder(notificationId) {
  if (!notificationId || Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    console.log(`[NotificationService] Cancelled notification ${notificationId}`);
  } catch (error) {
    console.warn(`[NotificationService] Cancel error for ${notificationId}:`, error.message);
  }
}

/**
 * Get all currently scheduled local notifications on this device.
 */
export async function getScheduledReminders() {
  if (Platform.OS === 'web') return [];
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (err) {
    console.error('[NotificationService] Get all scheduled error:', err);
    return [];
  }
}
