const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const { isDBConnected } = require('../config/db');

const MAX_CONVERSATIONS_PER_USER = 20;

// In-memory fallback store for offline / mock testing resilience
const inMemoryConversations = new Map();

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

/**
 * Enforce the 20-conversation limit per user.
 * Deletes the oldest conversations (ordered by createdAt) for the specified user
 * until only the 20 newest conversations remain in persistent MongoDB storage.
 */
async function pruneOldConversations(userId = 'default_user') {
  if (isDBConnected()) {
    try {
      // Find the 20 newest conversation IDs for this user, sorted by createdAt descending
      const newestDocs = await Conversation.find({ userId })
        .sort({ createdAt: -1 })
        .limit(MAX_CONVERSATIONS_PER_USER)
        .select('_id')
        .lean();

      if (newestDocs.length >= MAX_CONVERSATIONS_PER_USER) {
        const keepIds = newestDocs.map((doc) => doc._id);
        const result = await Conversation.deleteMany({
          userId,
          _id: { $nin: keepIds },
        });
        if (result.deletedCount > 0) {
          console.log(
            `[ConversationService] Pruned ${result.deletedCount} old conversations for user "${userId}" (enforcing ${MAX_CONVERSATIONS_PER_USER} limit).`
          );
        }
      }
    } catch (err) {
      console.error('[ConversationService pruneOldConversations Error]:', err.message);
    }
  } else {
    // In-memory fallback
    const userConvs = Array.from(inMemoryConversations.values())
      .filter((c) => c.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (userConvs.length > MAX_CONVERSATIONS_PER_USER) {
      const toRemove = userConvs.slice(MAX_CONVERSATIONS_PER_USER);
      for (const conv of toRemove) {
        inMemoryConversations.delete(String(conv._id));
      }
    }
  }
}

/**
 * Generate a smart, human-readable title from the first message text.
 */
function generateTitleFromMessage(text) {
  if (!text || typeof text !== 'string') return 'New Conversation';
  const clean = text.replace(/[\r\n]+/g, ' ').trim();
  if (clean.length <= 40) return clean;
  return clean.substring(0, 37) + '...';
}

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
 * List all saved conversations for a user, sorted by most recent first.
 * Default limit is 20 to align with conversation storage limit.
 */
async function listConversations({ userId = 'default_user', limit = 20, skip = 0 } = {}) {
  const filter = { userId };

  if (isDBConnected()) {
    try {
      const [conversations, total] = await Promise.all([
        Conversation.find(filter)
          .select('_id title lastMessage messageCount createdAt updatedAt')
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Conversation.countDocuments(filter),
      ]);
      return { conversations, total };
    } catch (err) {
      console.error('[ConversationService listConversations Error]:', err.message);
      throw err;
    }
  } else {
    const all = Array.from(inMemoryConversations.values())
      .filter((c) => c.userId === userId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    const paged = all.slice(skip, skip + limit).map((c) => ({
      _id: c._id,
      title: c.title,
      lastMessage: c.lastMessage,
      messageCount: c.messages ? c.messages.length : 0,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

    return {
      conversations: paged,
      total: all.length,
    };
  }
}

/**
 * Retrieve a full conversation by ID with all messages in chronological order.
 */
async function getConversationById(id) {
  if (!id) {
    const err = new Error('Conversation ID is required.');
    err.statusCode = 400;
    throw err;
  }

  if (isDBConnected() && isValidObjectId(id)) {
    const conversation = await Conversation.findById(id).lean();
    if (!conversation) {
      const err = new Error(`Conversation with ID ${id} not found.`);
      err.statusCode = 404;
      throw err;
    }
    return conversation;
  } else {
    const conversation = inMemoryConversations.get(String(id));
    if (!conversation) {
      const err = new Error(`Conversation with ID ${id} not found.`);
      err.statusCode = 404;
      throw err;
    }
    return conversation;
  }
}

/**
 * Create a new conversation document.
 */
async function createConversation({
  title = 'New Conversation',
  userId = 'default_user',
  initialMessages = [],
} = {}) {
  const formattedMessages = (Array.isArray(initialMessages) ? initialMessages : []).map((m) => ({
    sender: m.sender === 'user' ? 'user' : 'assistant',
    text: m.text || '',
    timestamp: m.timestamp || formatCurrentTime(),
    model: m.model || '',
    isError: Boolean(m.isError),
    createdAt: m.createdAt || new Date(),
  }));

  let lastMessageText = '';
  if (formattedMessages.length > 0) {
    lastMessageText = formattedMessages[formattedMessages.length - 1].text.slice(0, 100);
  }

  // Derive sensible title if none provided or default
  let finalTitle = title;
  if ((!title || title === 'New Conversation') && formattedMessages.length > 0) {
    const firstUserMsg = formattedMessages.find((m) => m.sender === 'user');
    if (firstUserMsg && firstUserMsg.text) {
      finalTitle = generateTitleFromMessage(firstUserMsg.text);
    }
  }

  const conversationData = {
    title: finalTitle || 'New Conversation',
    userId,
    messages: formattedMessages,
    lastMessage: lastMessageText,
    messageCount: formattedMessages.length,
  };

  if (isDBConnected()) {
    try {
      const conversation = new Conversation(conversationData);
      const saved = await conversation.save();
      // Enforce the 20-conversation limit per user by removing oldest conversations
      await pruneOldConversations(userId);
      return saved.toObject();
    } catch (err) {
      console.error('[ConversationService createConversation Error]:', err.message);
      throw err;
    }
  } else {
    const id = new mongoose.Types.ObjectId().toString();
    const now = new Date();
    const saved = {
      _id: id,
      ...conversationData,
      createdAt: now,
      updatedAt: now,
    };
    inMemoryConversations.set(id, saved);
    await pruneOldConversations(userId);
    return saved;
  }
}

/**
 * Append one or more messages to an existing conversation.
 */
async function addMessageToConversation(id, { sender, text, timestamp, model, isError = false }) {
  if (!id) {
    const err = new Error('Conversation ID is required.');
    err.statusCode = 400;
    throw err;
  }

  if (!text || typeof text !== 'string' || text.trim() === '') {
    const err = new Error('Message text cannot be empty.');
    err.statusCode = 400;
    throw err;
  }

  const messageObj = {
    sender: sender === 'user' ? 'user' : 'assistant',
    text: text.trim(),
    timestamp: timestamp || formatCurrentTime(),
    model: model || '',
    isError: Boolean(isError),
    createdAt: new Date(),
  };

  if (isDBConnected() && isValidObjectId(id)) {
    const conv = await Conversation.findById(id);
    if (!conv) {
      const err = new Error(`Conversation with ID ${id} not found.`);
      err.statusCode = 404;
      throw err;
    }

    conv.messages.push(messageObj);
    conv.lastMessage = messageObj.text.slice(0, 100);
    conv.messageCount = conv.messages.length;

    // Update title if it's currently default and this is a user message
    if ((conv.title === 'New Conversation' || !conv.title) && messageObj.sender === 'user') {
      conv.title = generateTitleFromMessage(messageObj.text);
    }

    const saved = await conv.save();
    return saved.toObject();
  } else {
    const conv = inMemoryConversations.get(String(id));
    if (!conv) {
      const err = new Error(`Conversation with ID ${id} not found.`);
      err.statusCode = 404;
      throw err;
    }

    conv.messages.push({
      _id: new mongoose.Types.ObjectId().toString(),
      ...messageObj,
    });
    conv.lastMessage = messageObj.text.slice(0, 100);
    conv.messageCount = conv.messages.length;
    conv.updatedAt = new Date();

    if ((conv.title === 'New Conversation' || !conv.title) && messageObj.sender === 'user') {
      conv.title = generateTitleFromMessage(messageObj.text);
    }

    return conv;
  }
}

/**
 * Update conversation title.
 */
async function updateConversationTitle(id, newTitle) {
  if (!id) {
    const err = new Error('Conversation ID is required.');
    err.statusCode = 400;
    throw err;
  }

  const cleanTitle = (newTitle || '').trim();
  if (!cleanTitle) {
    const err = new Error('Title cannot be empty.');
    err.statusCode = 400;
    throw err;
  }

  if (isDBConnected() && isValidObjectId(id)) {
    const updated = await Conversation.findByIdAndUpdate(
      id,
      { $set: { title: cleanTitle } },
      { new: true }
    ).lean();
    if (!updated) {
      const err = new Error(`Conversation with ID ${id} not found.`);
      err.statusCode = 404;
      throw err;
    }
    return updated;
  } else {
    const conv = inMemoryConversations.get(String(id));
    if (!conv) {
      const err = new Error(`Conversation with ID ${id} not found.`);
      err.statusCode = 404;
      throw err;
    }
    conv.title = cleanTitle;
    conv.updatedAt = new Date();
    return conv;
  }
}

/**
 * Delete a conversation.
 */
async function deleteConversation(id) {
  if (!id) {
    const err = new Error('Conversation ID is required.');
    err.statusCode = 400;
    throw err;
  }

  if (isDBConnected() && isValidObjectId(id)) {
    const deleted = await Conversation.findByIdAndDelete(id).lean();
    if (!deleted) {
      const err = new Error(`Conversation with ID ${id} not found.`);
      err.statusCode = 404;
      throw err;
    }
    return deleted;
  } else {
    const conv = inMemoryConversations.get(String(id));
    if (!conv) {
      const err = new Error(`Conversation with ID ${id} not found.`);
      err.statusCode = 404;
      throw err;
    }
    inMemoryConversations.delete(String(id));
    return conv;
  }
}

module.exports = {
  MAX_CONVERSATIONS_PER_USER,
  pruneOldConversations,
  listConversations,
  getConversationById,
  createConversation,
  addMessageToConversation,
  updateConversationTitle,
  deleteConversation,
  generateTitleFromMessage,
};
