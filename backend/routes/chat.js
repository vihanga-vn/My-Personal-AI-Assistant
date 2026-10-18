const express = require('express');
const router = express.Router();
const { generateAssistantResponse } = require('../services/geminiService');
const conversationService = require('../services/conversationService');

/**
 * Format timestamp string (e.g. "7:15 PM")
 */
function formatCurrentTime() {
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
}

/**
 * POST /api/chat
 * Accepts a user message and optional conversation history and conversationId,
 * returns the assistant's response, and persists the turn in MongoDB.
 *
 * Request Body:
 * {
 *   "message": "Hello Vox",
 *   "history": [ { "sender": "user", "text": "..." }, ... ] (optional),
 *   "conversationId": "6ad...", // (optional: if omitted, creates new conversation)
 *   "userId": "default_user"
 * }
 */
router.post('/', async (req, res) => {
  try {
    const { message, history, conversationId, userId } = req.body;

    // Validate message
    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({
        error: 'Message is required and cannot be empty.'
      });
    }

    const trimmedMessage = message.trim();
    const timeString = formatCurrentTime();

    // Call Gemini Service
    const { reply, model, executedOperations } = await generateAssistantResponse(trimmedMessage, history);

    // Persist to conversation in MongoDB
    let activeConversationId = conversationId;
    let savedConversation = null;

    try {
      if (activeConversationId) {
        // Append user message then assistant reply to existing conversation
        await conversationService.addMessageToConversation(activeConversationId, {
          sender: 'user',
          text: trimmedMessage,
          timestamp: timeString,
        });
        savedConversation = await conversationService.addMessageToConversation(activeConversationId, {
          sender: 'assistant',
          text: reply,
          timestamp: timeString,
          model,
        });
      } else {
        // Create new conversation with these first two messages
        savedConversation = await conversationService.createConversation({
          userId: userId || 'default_user',
          initialMessages: [
            { sender: 'user', text: trimmedMessage, timestamp: timeString },
            { sender: 'assistant', text: reply, timestamp: timeString, model },
          ],
        });
        activeConversationId = savedConversation._id.toString();
      }
    } catch (saveErr) {
      console.warn('[ChatRoute] Notice: Could not persist turn to conversation:', saveErr.message);
    }

    return res.status(200).json({
      reply,
      model,
      executedOperations,
      conversationId: activeConversationId || null,
      conversationTitle: savedConversation ? savedConversation.title : null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      error: error.message || 'An unexpected error occurred while processing the chat request.'
    });
  }
});

module.exports = router;
