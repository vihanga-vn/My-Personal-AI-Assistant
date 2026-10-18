const mongoose = require('mongoose');

/**
 * Message Sub-Schema for Conversations
 */
const MessageSchema = new mongoose.Schema(
  {
    sender: {
      type: String,
      enum: ['user', 'assistant'],
      required: [true, 'Message sender is required.'],
    },
    text: {
      type: String,
      required: [true, 'Message text is required.'],
      trim: true,
    },
    timestamp: {
      type: String,
      default: () => {
        const now = new Date();
        let hours = now.getHours();
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return `${hours}:${minutes} ${ampm}`;
      },
    },
    model: {
      type: String,
      default: '',
    },
    isError: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

/**
 * Conversation Schema
 * Persists full conversation history between user and Vox AI.
 */
const ConversationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Conversation title is required.'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters.'],
      default: 'New Conversation',
    },
    userId: {
      type: String,
      default: 'default_user',
      index: true,
    },
    messages: [MessageSchema],
    lastMessage: {
      type: String,
      default: '',
    },
    messageCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast lookup by user and updated time
ConversationSchema.index({ userId: 1, updatedAt: -1 });

const Conversation = mongoose.models.Conversation || mongoose.model('Conversation', ConversationSchema);

module.exports = Conversation;
