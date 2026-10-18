import { getApiBaseUrl } from '../config/api';

/**
 * Mobile Task and Reminder Service.
 * Connects the React Native frontend to the Express/MongoDB backend:
 * - GET    /api/tasks
 * - GET    /api/tasks/:id
 * - POST   /api/tasks
 * - PATCH  /api/tasks/:id/complete
 * - PATCH  /api/tasks/:id/reschedule
 * - DELETE /api/tasks/:id
 * 
 * Includes automatic LAN host fallback for physical Android/iOS devices on Wi-Fi.
 */

// Subscribers for cross-screen reactivity (Dashboard, Upcoming, Chat, Vox)
const listeners = new Set();

export function onTasksUpdated(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function notifyTasksUpdated() {
  listeners.forEach((callback) => {
    try {
      callback();
    } catch (err) {
      console.warn('[TaskService] Listener callback error:', err);
    }
  });
}

/**
 * Fetch helper with timeout and clear error messaging.
 * Uses centralized getApiBaseUrl() without silent URL switching.
 */
async function resilientApiFetch(endpointPath, options = {}, timeoutMs = 10000) {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpointPath}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!response.ok) {
      let errDetail = `Server returned ${response.status}`;
      try {
        const body = await response.json();
        if (body.error) errDetail = body.error;
      } catch (_) {}
      throw new Error(errDetail);
    }
    return await response.json();
  } catch (err) {
    clearTimeout(timer);

    // If it's already a server response error (e.g. 400/404/500 with custom message), preserve it
    if (err.message && err.message.startsWith('Server returned')) {
      throw err;
    }

    // Network / connection failure: report clear, actionable error
    const isTimeout = err.name === 'AbortError';
    const reason = isTimeout ? 'Request timed out after 10s' : (err.message || 'Network request failed');
    throw new Error(
      `Unable to reach backend at ${url} (${reason}). Ensure backend is running ("npm run dev" in /backend) and device is on the same network.`
    );
  }
}

/**
 * Fetch tasks and reminders with optional filters.
 *
 * @param {Object} [params={}]
 * @param {string} [params.status='all'] - 'all' | 'pending' | 'completed'
 * @param {string} [params.category] - Filter by category (e.g. 'Work', 'Health')
 * @param {string} [params.dateFilter='all'] - 'all' | 'today' | 'upcoming'
 * @param {number} [params.limit=100]
 * @returns {Promise<{tasks: Array, total: number}>}
 */
export async function getTasks({ status = 'all', category, dateFilter = 'all', limit = 100 } = {}) {
  const queryParams = new URLSearchParams();
  if (status && status !== 'all') queryParams.append('status', status);
  if (category && category !== 'all') queryParams.append('category', category);
  if (dateFilter && dateFilter !== 'all') queryParams.append('dateFilter', dateFilter);
  if (limit) queryParams.append('limit', String(limit));

  const queryString = queryParams.toString();
  const endpoint = `/api/tasks${queryString ? `?${queryString}` : ''}`;

  return await resilientApiFetch(endpoint, { method: 'GET' });
}

/**
 * Retrieve a single task by ID.
 *
 * @param {string} taskId
 * @returns {Promise<Object>}
 */
export async function getTaskById(taskId) {
  if (!taskId) throw new Error('Task ID is required.');
  return await resilientApiFetch(`/api/tasks/${taskId}`, { method: 'GET' });
}

/**
 * Mark a task as completed.
 *
 * @param {string} taskId
 * @returns {Promise<{message: string, task: Object}>}
 */
export async function completeTask(taskId) {
  if (!taskId) throw new Error('Task ID is required.');
  const result = await resilientApiFetch(`/api/tasks/${taskId}/complete`, { method: 'PATCH' });
  notifyTasksUpdated();
  return result;
}

/**
 * Reschedule a task to a new due date / reminder time.
 *
 * @param {string} taskId
 * @param {Object} rescheduleData
 * @param {string} [rescheduleData.newDueDate] - ISO string or Date
 * @param {string} [rescheduleData.newReminderTime] - ISO string or Date
 * @param {string} [rescheduleData.timeZone='Asia/Colombo']
 * @returns {Promise<{message: string, task: Object}>}
 */
export async function rescheduleTask(taskId, { newDueDate, newReminderTime, timeZone = 'Asia/Colombo' }) {
  if (!taskId) throw new Error('Task ID is required.');
  const result = await resilientApiFetch(`/api/tasks/${taskId}/reschedule`, {
    method: 'PATCH',
    body: JSON.stringify({
      newDueDate: newDueDate ? new Date(newDueDate).toISOString() : undefined,
      newReminderTime: newReminderTime ? new Date(newReminderTime).toISOString() : undefined,
      timeZone,
    }),
  });
  notifyTasksUpdated();
  return result;
}

/**
 * Cancel or permanently delete a task.
 *
 * @param {string} taskId
 * @returns {Promise<{message: string, task: Object}>}
 */
export async function deleteTask(taskId) {
  if (!taskId) throw new Error('Task ID is required.');
  const result = await resilientApiFetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
  notifyTasksUpdated();
  return result;
}
