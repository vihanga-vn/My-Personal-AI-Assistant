const express = require('express');
const router = express.Router();
const conversationService = require('../services/conversationService');

/**
 * GET /api/conversations
 * List conversations sorted by most recently active.
 */
router.get('/', async (req, res) => {
  try {
    const { userId, limit, skip } = req.query;
    const data = await conversationService.listConversations({
      userId: userId || 'default_user',
      limit: limit ? parseInt(limit, 10) : 50,
      skip: skip ? parseInt(skip, 10) : 0,
    });
    return res.status(200).json(data);
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      error: err.message || 'Error listing conversations.',
    });
  }
});

/**
 * GET /api/conversations/:id
 * Retrieve a specific conversation with all historical messages in order.
 */
router.get('/:id', async (req, res) => {
  try {
    const conversation = await conversationService.getConversationById(req.params.id);
    return res.status(200).json(conversation);
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      error: err.message || 'Error retrieving conversation.',
    });
  }
});

/**
 * POST /api/conversations
 * Create a new conversation.
 */
router.post('/', async (req, res) => {
  try {
    const { title, userId, initialMessages } = req.body;
    const created = await conversationService.createConversation({
      title,
      userId: userId || 'default_user',
      initialMessages,
    });
    return res.status(201).json({
      message: 'Conversation created successfully.',
      conversation: created,
    });
  } catch (err) {
    return res.status(err.statusCode || 400).json({
      error: err.message || 'Error creating conversation.',
    });
  }
});

/**
 * PATCH /api/conversations/:id
 * Rename or update conversation title.
 */
router.patch('/:id', async (req, res) => {
  try {
    const { title } = req.body;
    const updated = await conversationService.updateConversationTitle(req.params.id, title);
    return res.status(200).json({
      message: 'Conversation title updated successfully.',
      conversation: updated,
    });
  } catch (err) {
    return res.status(err.statusCode || 400).json({
      error: err.message || 'Error updating conversation.',
    });
  }
});

/**
 * POST /api/conversations/:id/messages
 * Append a message to an existing conversation.
 */
router.post('/:id/messages', async (req, res) => {
  try {
    const { sender, text, timestamp, model, isError } = req.body;
    const updated = await conversationService.addMessageToConversation(req.params.id, {
      sender,
      text,
      timestamp,
      model,
      isError,
    });
    return res.status(200).json({
      message: 'Message added successfully.',
      conversation: updated,
    });
  } catch (err) {
    return res.status(err.statusCode || 400).json({
      error: err.message || 'Error adding message to conversation.',
    });
  }
});

/**
 * DELETE /api/conversations/:id
 * Delete a conversation.
 */
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await conversationService.deleteConversation(req.params.id);
    return res.status(200).json({
      message: 'Conversation deleted successfully.',
      conversation: deleted,
    });
  } catch (err) {
    return res.status(err.statusCode || 400).json({
      error: err.message || 'Error deleting conversation.',
    });
  }
});

module.exports = router;
