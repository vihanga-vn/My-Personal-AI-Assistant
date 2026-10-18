const express = require('express');
const router = express.Router();
const memoryService = require('../services/memoryService');

/**
 * GET /api/memories/search?q=query&category=category
 * Search saved memories by keywords.
 */
router.get('/search', async (req, res) => {
  try {
    const { q, category, limit } = req.query;
    if (!q || typeof q !== 'string' || q.trim() === '') {
      return res.status(400).json({ error: 'Search query "q" parameter is required.' });
    }

    const results = await memoryService.searchMemories(q, {
      category,
      limit: limit ? parseInt(limit, 10) : 10,
    });

    return res.status(200).json({
      query: q,
      count: results.length,
      memories: results,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Error searching memories.',
    });
  }
});

/**
 * GET /api/memories
 * List all saved memories with optional filtering and pagination.
 */
router.get('/', async (req, res) => {
  try {
    const { category, limit, skip, sort } = req.query;

    const data = await memoryService.listMemories({
      category,
      limit: limit ? parseInt(limit, 10) : 50,
      skip: skip ? parseInt(skip, 10) : 0,
      sort: sort === 'asc' ? 1 : -1,
    });

    return res.status(200).json(data);
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Error listing memories.',
    });
  }
});

/**
 * GET /api/memories/:id
 * Retrieve a specific memory by its ID.
 */
router.get('/:id', async (req, res) => {
  try {
    const memory = await memoryService.getMemoryById(req.params.id);
    return res.status(200).json(memory);
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Error retrieving memory.',
    });
  }
});

/**
 * POST /api/memories
 * Create a new personal memory.
 */
router.post('/', async (req, res) => {
  try {
    const { title, detail, category, importance, tags, source } = req.body;

    if (!title || !detail) {
      return res.status(400).json({
        error: 'Both "title" and "detail" are required to create a memory.',
      });
    }

    const saved = await memoryService.createMemory({
      title,
      detail,
      category,
      importance,
      tags,
      source: source || 'manual',
    });

    return res.status(201).json({
      message: 'Memory created successfully.',
      memory: saved,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Error creating memory.',
    });
  }
});

/**
 * PUT /api/memories/:id
 * Update an existing memory by ID.
 */
router.put('/:id', async (req, res) => {
  try {
    const updated = await memoryService.updateMemory(req.params.id, req.body);
    return res.status(200).json({
      message: 'Memory updated successfully.',
      memory: updated,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Error updating memory.',
    });
  }
});

/**
 * DELETE /api/memories/:id
 * Delete a memory by ID.
 */
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await memoryService.deleteMemory(req.params.id);
    return res.status(200).json({
      message: 'Memory deleted successfully.',
      memory: deleted,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Error deleting memory.',
    });
  }
});

module.exports = router;
