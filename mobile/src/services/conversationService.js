import { getApiBaseUrl } from '../config/api';

/**
 * Mobile Service for Persisted Conversations and Message History
 * Interacts with:
 * - GET    /api/conversations
 * - GET    /api/conversations/:id
 * - POST   /api/conversations
 * - PATCH  /api/conversations/:id
 * - DELETE /api/conversations/:id
 */

async function apiFetch(endpoint, options = {}, timeoutMs = 10000) {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint}`;

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
    if (err.message && err.message.startsWith('Server returned')) {
      throw err;
    }
    const isTimeout = err.name === 'AbortError';
    const reason = isTimeout ? 'Request timed out after 10s' : (err.message || 'Network request failed');
    throw new Error(`Unable to reach backend at ${url} (${reason}).`);
  }
}

/**
 * Fetch list of saved conversations.
 */
export async function getConversations({ limit = 50, skip = 0 } = {}) {
  const query = new URLSearchParams({ limit: String(limit), skip: String(skip) });
  return await apiFetch(`/api/conversations?${query.toString()}`, { method: 'GET' });
}

/**
 * Retrieve a full conversation by ID with all historical messages.
 */
export async function getConversation(id) {
  if (!id) throw new Error('Conversation ID is required.');
  return await apiFetch(`/api/conversations/${id}`, { method: 'GET' });
}

/**
 * Create a new empty or initial conversation.
 */
export async function createConversation({ title = 'New Conversation', initialMessages = [] } = {}) {
  return await apiFetch('/api/conversations', {
    method: 'POST',
    body: JSON.stringify({ title, initialMessages }),
  });
}

/**
 * Update / rename a conversation title.
 */
export async function updateConversationTitle(id, title) {
  if (!id) throw new Error('Conversation ID is required.');
  return await apiFetch(`/api/conversations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  });
}

/**
 * Delete a saved conversation.
 */
export async function deleteConversation(id) {
  if (!id) throw new Error('Conversation ID is required.');
  return await apiFetch(`/api/conversations/${id}`, { method: 'DELETE' });
}
