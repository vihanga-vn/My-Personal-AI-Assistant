const mongoose = require('mongoose');

/**
 * Structured Memory Schema for Persistent Personal Memory.
 * 
 * Fields:
 * - title: Concise headline/summary of the memory (e.g., "Prefers morning deep work")
 * - detail: Full descriptive text of the memory
 * - category: Functional classification ('Preferences', 'Personal', 'Work', 'Health', 'Finance', 'General')
 * - importance: Priority tier ('Low', 'Medium', 'High')
 * - tags: Searchable keywords
 * - source: Provenance of the memory ('chat', 'manual', 'system')
 * - createdAt / updatedAt: Automatic timestamps
 */
const MemorySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Memory title is required.'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters.'],
    },
    detail: {
      type: String,
      required: [true, 'Memory detail is required.'],
      trim: true,
      maxlength: [2000, 'Detail cannot exceed 2000 characters.'],
    },
    category: {
      type: String,
      enum: {
        values: ['Preferences', 'Personal', 'Work', 'Health', 'Finance', 'General'],
        message: '{VALUE} is not a supported category.',
      },
      default: 'General',
      index: true,
    },
    importance: {
      type: String,
      enum: {
        values: ['Low', 'Medium', 'High'],
        message: '{VALUE} is not a valid importance level.',
      },
      default: 'Medium',
    },
    tags: {
      type: [String],
      default: [],
      index: true,
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

// Compound text index for text queries
MemorySchema.index(
  {
    title: 'text',
    detail: 'text',
    tags: 'text',
  },
  {
    weights: {
      title: 5,
      detail: 3,
      tags: 2,
    },
    name: 'MemoryTextIndex',
  }
);

const Memory = mongoose.models.Memory || mongoose.model('Memory', MemorySchema);

module.exports = Memory;
