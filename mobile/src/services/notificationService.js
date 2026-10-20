import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getApiBaseUrl } from '../config/api';
import { getCategoryDetails } from '../config/categories';

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
 * Incorporates category-specific emojis and structured titles.
 *
 * @param {Object} params
 * @param {string} params.taskId - Database task ID
 * @param {string} params.title - Task or reminder title
 * @param {string} [params.body] - Optional message body or notes
 * @param {Date|string} params.triggerDate - When notification should fire
 * @param {string} [params.category='Other'] - One of the 7 supported categories
 * @returns {Promise<{success: boolean, notificationId?: string, error?: string}>}
 */
export async function scheduleLocalReminder({ taskId, title, body = '', triggerDate, category = 'Other' }) {
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
    // Avoid duplicate scheduling: cancel any existing notification for this taskId
    if (taskId) {
      await cancelLocalReminderForTask(taskId);
    }

    // Resolve category details and category-specific emoji
    const catDetails = getCategoryDetails(category);
    const notificationTitle = `${catDetails.emoji} ${catDetails.label} Reminder`;
    const notificationBody = body
      ? `${title} — ${body}`
      : `${title} is due now.`;

    // Schedule the notification with category emoji in the title
    const content = {
      title: notificationTitle,
      body: notificationBody,
      data: { taskId, category: catDetails.key },
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
 * Cancel any scheduled local notifications for a specific task ID.
 *
 * @param {string} taskId
 */
export async function cancelLocalReminderForTask(taskId) {
  if (!taskId || Platform.OS === 'web') return;
  try {
    const activeNotifications = await Notifications.getAllScheduledNotificationsAsync();
    for (const item of activeNotifications) {
      if (item.content?.data?.taskId === taskId) {
        await Notifications.cancelScheduledNotificationAsync(item.identifier);
        console.log(`[NotificationService] Cancelled notification ${item.identifier} for task ${taskId}`);
      }
    }
  } catch (error) {
    console.warn(`[NotificationService] Cancel for task ${taskId} error:`, error?.message || error);
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
