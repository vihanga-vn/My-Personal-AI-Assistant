const mongoose = require('mongoose');
const Memory = require('../models/Memory');
const { isDBConnected } = require('../config/db');

/**
 * Memory Service providing CRUD, search, and validation operations.
 * Operates on MongoDB Atlas, with graceful in-memory storage fallback
 * if database is temporarily unavailable during initial configuration.
 */

// In-memory fallback storage for offline/testing resilience
const inMemoryStore = new Map();

/**
 * Validates whether a string is a valid MongoDB ObjectId.
 */
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

/**
 * Clean and normalize tags.
 */
function normalizeTags(tags) {
  if (!tags) return [];
  if (Array.isArray(tags)) {
    return tags
      .map((t) => String(t).trim().toLowerCase())
      .filter((t) => t.length > 0);
  }
  if (typeof tags === 'string') {
    return tags
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);
  }
  return [];
}

/**
 * Create a new personal memory.
 */
async function createMemory({ title, detail, category = 'General', importance = 'Medium', tags = [], source = 'chat' }) {
  if (!title || typeof title !== 'string' || title.trim() === '') {
    const error = new Error('Memory title is required.');
    error.statusCode = 400;
    throw error;
  }

  if (!detail || typeof detail !== 'string' || detail.trim() === '') {
    const error = new Error('Memory detail description is required.');
    error.statusCode = 400;
    throw error;
  }

  const validCategories = ['Preferences', 'Personal', 'Work', 'Health', 'Finance', 'General'];
  const normalizedCategory = validCategories.includes(category) ? category : 'General';

  const validImportances = ['Low', 'Medium', 'High'];
  const normalizedImportance = validImportances.includes(importance) ? importance : 'Medium';

  const cleanedTags = normalizeTags(tags);

  const memoryData = {
    title: title.trim(),
    detail: detail.trim(),
    category: normalizedCategory,
    importance: normalizedImportance,
    tags: cleanedTags,
    source,
  };

  if (isDBConnected()) {
    try {
      const memory = new Memory(memoryData);
      const saved = await memory.save();
      return saved.toObject();
    } catch (err) {
      console.error('[MemoryService Create Error]:', err.message);
      throw err;
    }
  } else {
    // In-memory fallback
    const id = new mongoose.Types.ObjectId().toString();
    const now = new Date();
    const saved = {
      _id: id,
      ...memoryData,
      createdAt: now,
      updatedAt: now,
    };
    inMemoryStore.set(id, saved);
    console.warn(`[MemoryService] Saved to in-memory store (MongoDB Atlas offline): ${saved.title}`);
    return saved;
  }
}

/**
 * Retrieve a memory by ID.
 */
async function getMemoryById(id) {
  if (!id) {
    const err = new Error('Memory ID is required.');
    err.statusCode = 400;
    throw err;
  }

  if (isDBConnected() && isValidObjectId(id)) {
    const memory = await Memory.findById(id).lean();
    if (!memory) {
      const err = new Error(`Memory with ID ${id} not found.`);
      err.statusCode = 404;
      throw err;
    }
    return memory;
  } else {
    const memory = inMemoryStore.get(String(id));
    if (!memory) {
      const err = new Error(`Memory with ID ${id} not found.`);
      err.statusCode = 404;
      throw err;
    }
    return memory;
  }
}

/**
 * List all memories with optional category filtering and pagination.
 */
async function listMemories({ category, limit = 50, skip = 0, sort = -1 } = {}) {
  const filter = {};
  if (category && category !== 'All') {
    filter.category = category;
  }

  if (isDBConnected()) {
    const [memories, total] = await Promise.all([
      Memory.find(filter)
        .sort({ createdAt: sort })
        .skip(skip)
        .limit(limit)
        .lean(),
      Memory.countDocuments(filter),
    ]);
    return { memories, total };
  } else {
    let items = Array.from(inMemoryStore.values());
    if (filter.category) {
      items = items.filter((m) => m.category === filter.category);
    }
    items.sort((a, b) => (sort === -1 ? b.createdAt - a.createdAt : a.createdAt - b.createdAt));
    return {
      memories: items.slice(skip, skip + limit),
      total: items.length,
    };
  }
}

/**
 * Search memories by keyword query using text index and regex fallback.
 */
async function searchMemories(query, { category, limit = 10 } = {}) {
  if (!query || typeof query !== 'string' || query.trim() === '') {
    return [];
  }

  const trimmedQuery = query.trim();

  if (isDBConnected()) {
    try {
      const filter = {};
      if (category && category !== 'All') {
        filter.category = category;
      }

      // Try MongoDB text search first
      let results = await Memory.find({
        ...filter,
        $text: { $search: trimmedQuery },
      })
        .sort({ score: { $meta: 'textScore' } })
        .limit(limit)
        .lean();

      // If no text matches (e.g. partial words), fallback to regex search
      if (!results || results.length === 0) {
        const regex = new RegExp(trimmedQuery.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'i');
        results = await Memory.find({
          ...filter,
          $or: [{ title: regex }, { detail: regex }, { tags: regex }],
        })
          .sort({ createdAt: -1 })
          .limit(limit)
          .lean();
      }

      return results;
    } catch (err) {
      console.warn('[MemoryService Text Search Fallback]:', err.message);
      const regex = new RegExp(trimmedQuery.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'i');
      return await Memory.find({
        $or: [{ title: regex }, { detail: regex }, { tags: regex }],
      })
        .limit(limit)
        .lean();
    }
  } else {
    // In-memory search fallback
    const q = trimmedQuery.toLowerCase();
    const items = Array.from(inMemoryStore.values()).filter((m) => {
      const matchCat = !category || category === 'All' || m.category === category;
      const matchQuery =
        m.title.toLowerCase().includes(q) ||
        m.detail.toLowerCase().includes(q) ||
        (Array.isArray(m.tags) && m.tags.some((t) => t.includes(q)));
      return matchCat && matchQuery;
    });
    return items.slice(0, limit);
  }
}

/**
 * Update an existing memory by ID.
 */
async function updateMemory(id, updateData) {
  if (!id) {
    const err = new Error('Memory ID is required for update.');
    err.statusCode = 400;
    throw err;
  }

  const updates = {};
  if (updateData.title) updates.title = updateData.title.trim();
  if (updateData.detail) updates.detail = updateData.detail.trim();
  if (updateData.category) updates.category = updateData.category;
  if (updateData.importance) updates.importance = updateData.importance;
  if (updateData.tags) updates.tags = normalizeTags(updateData.tags);

  if (isDBConnected() && isValidObjectId(id)) {
    const updated = await Memory.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).lean();

    if (!updated) {
      const err = new Error(`Memory with ID ${id} not found.`);
      err.statusCode = 404;
      throw err;
    }
    return updated;
  } else {
    const existing = inMemoryStore.get(String(id));
    if (!existing) {
      const err = new Error(`Memory with ID ${id} not found.`);
      err.statusCode = 404;
      throw err;
    }
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    inMemoryStore.set(String(id), updated);
    return updated;
  }
}

/**
 * Delete a memory by ID or title query.
 */
async function deleteMemory(idOrQuery) {
  if (!idOrQuery) {
    const err = new Error('Memory identifier is required for deletion.');
    err.statusCode = 400;
    throw err;
  }

  if (isDBConnected()) {
    if (isValidObjectId(idOrQuery)) {
      const deleted = await Memory.findByIdAndDelete(idOrQuery).lean();
      if (!deleted) {
        const err = new Error(`Memory with ID ${idOrQuery} not found.`);
        err.statusCode = 404;
        throw err;
      }
      return deleted;
    } else {
      // Find by title regex
      const regex = new RegExp(`^${idOrQuery.trim()}$`, 'i');
      const deleted = await Memory.findOneAndDelete({ title: regex }).lean();
      if (!deleted) {
        const err = new Error(`No memory found matching "${idOrQuery}".`);
        err.statusCode = 404;
        throw err;
      }
      return deleted;
    }
  } else {
    const id = String(idOrQuery);
    if (inMemoryStore.has(id)) {
      const item = inMemoryStore.get(id);
      inMemoryStore.delete(id);
      return item;
    }
    // Search by title in memory
    for (const [k, v] of inMemoryStore.entries()) {
      if (v.title.toLowerCase() === idOrQuery.trim().toLowerCase()) {
        inMemoryStore.delete(k);
        return v;
      }
    }
    const err = new Error(`No memory found matching "${idOrQuery}".`);
    err.statusCode = 404;
    throw err;
  }
}

module.exports = {
  createMemory,
  getMemoryById,
  listMemories,
  searchMemories,
  updateMemory,
  deleteMemory,
};
