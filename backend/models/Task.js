const mongoose = require('mongoose');

/**
 * Structured Task & Reminder Schema
 * Supports task tracking, deadline scheduling, and reminder notifications.
 *
 * Fields:
 * - title: Task or reminder headline
 * - description: Optional details or notes
 * - category: Category (Work, University, Health, Finance, Hangouts, Personal, Other)
 * - priority: Low, Medium, High, Urgent
 * - dueDate: Target completion date/time (ISO Date)
 * - dueTimeText: Human-readable time representation (e.g., "Today, 3:30 PM")
 * - hasReminder: Whether an alert/notification is requested
 * - reminderTime: Exact date/time when local notification should trigger (ISO Date)
 * - reminderStatus: 'none' | 'scheduled' | 'delivered' | 'failed' | 'cancelled'
 * - notificationId: Local Expo notification identifier for cancellation/rescheduling
 * - completed: Task completion flag
 * - completedAt: Timestamp of completion
 * - timeZone: Explicit user timezone (default: 'Asia/Colombo')
 * - source: 'chat' | 'manual' | 'system'
 */
const TaskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required.'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters.'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [2000, 'Description cannot exceed 2000 characters.'],
    },
    category: {
      type: String,
      enum: {
        values: ['Work', 'University', 'Health', 'Finance', 'Hangouts', 'Personal', 'Other'],
        message: '{VALUE} is not a supported task category.',
      },
      default: 'Personal',
      index: true,
    },
    priority: {
      type: String,
      enum: {
        values: ['Low', 'Medium', 'High', 'Urgent'],
        message: '{VALUE} is not a valid priority level.',
      },
      default: 'Medium',
      index: true,
    },
    dueDate: {
      type: Date,
      index: true,
    },
    dueTimeText: {
      type: String,
      default: '',
    },
    hasReminder: {
      type: Boolean,
      default: false,
      index: true,
    },
    reminderTime: {
      type: Date,
      index: true,
    },
    reminderStatus: {
      type: String,
      enum: ['none', 'scheduled', 'delivered', 'failed', 'cancelled'],
      default: 'none',
      index: true,
    },
    notificationId: {
      type: String,
      default: null,
    },
    completed: {
      type: Boolean,
      default: false,
      index: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    timeZone: {
      type: String,
      default: 'Asia/Colombo',
    },
    source: {
      type: String,
      enum: ['chat', 'manual', 'system'],
      default: 'chat',
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
TaskSchema.index({ dueDate: 1, completed: 1 });
TaskSchema.index({ reminderTime: 1, reminderStatus: 1 });
TaskSchema.index({ title: 'text', description: 'text' });

const Task = mongoose.models.Task || mongoose.model('Task', TaskSchema);

module.exports = Task;
