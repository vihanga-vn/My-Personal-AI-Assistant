import { getApiBaseUrl } from '../config/api';

/**
 * Sends a chat message to the Express backend endpoint (POST /api/chat).
 * The mobile app never touches the Gemini API key directly.
 *
 * @param {string} message - The user's input text.
 * @param {Array<{sender: string, text: string}>} [history=[]] - Previous conversation history.
 * @returns {Promise<{reply: string, model: string}>}
 */
export async function sendChatMessage(message, history = [], conversationId = null) {
  const trimmed = message ? message.trim() : '';
  if (!trimmed) {
    throw new Error('Message cannot be empty.');
  }

  // Sanitize history to keep payload light (last 8 messages)
  const sanitizedHistory = Array.isArray(history)
    ? history.slice(-8).map((item) => ({
      sender: item.sender === 'user' ? 'user' : 'assistant',
      text: item.text,
    }))
    : [];

  const payload = {
    message: trimmed,
    history: sanitizedHistory,
    conversationId: conversationId || undefined,
  };

  const baseUrl = getApiBaseUrl();
  const targetUrl = `${baseUrl}/api/chat`;

  const controller = new AbortController();
  const TIMEOUT_MS = 25000;
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response;
  try {
    response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timer);
  } catch (netErr) {
    clearTimeout(timer);
    const isTimeout = netErr.name === 'AbortError' || controller.signal.aborted;
    const reason = isTimeout ? `Request timed out after ${TIMEOUT_MS / 1000}s` : (netErr.message || 'Network request failed');
    throw new Error(
      `Unable to connect to backend at ${targetUrl} (${reason}). Ensure backend is running ("npm run dev" in /backend) and device is on the same network.`
    );
  }

  // Handle HTTP status codes
  if (response.status === 429) {
    let errorDetail = 'Gemini free tier rate limit reached. Please wait a few seconds and try again.';
    try {
      const errJson = await response.json();
      if (errJson.error) errorDetail = errJson.error;
    } catch (_) { }
    const rateLimitError = new Error(errorDetail);
    rateLimitError.isRateLimit = true;
    throw rateLimitError;
  }

  if (!response.ok) {
    let errorMsg = `Server error (${response.status})`;
    try {
      const errJson = await response.json();
      if (errJson.error) errorMsg = errJson.error;
    } catch (_) { }
    throw new Error(errorMsg);
  }

  const data = await response.json();
  if (!data || typeof data.reply !== 'string') {
    throw new Error('Received an invalid or malformed response from the backend.');
  }

  return {
    reply: data.reply,
    model: data.model || 'gemini',
    executedOperations: data.executedOperations || [],
    conversationId: data.conversationId || null,
    conversationTitle: data.conversationTitle || null,
    timestamp: data.timestamp || new Date().toISOString(),
  };
}
