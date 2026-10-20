const express = require('express');
const router = express.Router();
const taskService = require('../services/taskService');

/**
 * GET /api/tasks
 * List tasks and reminders with optional query filters (status, category, dateFilter, limit, skip).
 */
router.get('/', async (req, res) => {
  try {
    const { status, category, dateFilter, limit, skip } = req.query;

    const data = await taskService.listTasks({
      status,
      category,
      dateFilter,
      limit: limit ? parseInt(limit, 10) : 50,
      skip: skip ? parseInt(skip, 10) : 0,
    });

    return res.status(200).json(data);
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Error listing tasks.',
    });
  }
});

/**
 * GET /api/tasks/:id
 * Retrieve a single task by ID.
 */
router.get('/:id', async (req, res) => {
  try {
    const task = await taskService.getTaskById(req.params.id);
    return res.status(200).json(task);
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Error retrieving task.',
    });
  }
});

/**
 * POST /api/tasks
 * Create a new task or reminder.
 */
router.post('/', async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      priority,
      dueDate,
      reminderTime,
      timeZone,
      source,
    } = req.body;

    const saved = await taskService.createTask({
      title,
      description,
      category,
      priority,
      dueDate,
      reminderTime,
      timeZone,
      source: source || 'manual',
    });

    return res.status(201).json({
      message: 'Task created successfully.',
      task: saved,
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      error: error.message || 'Error creating task.',
    });
  }
});

/**
 * PATCH /api/tasks/:id/complete
 * Mark a task as completed.
 */
router.patch('/:id/complete', async (req, res) => {
  try {
    const completed = await taskService.completeTask(req.params.id);
    return res.status(200).json({
      message: 'Task marked as completed.',
      task: completed,
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      error: error.message || 'Error completing task.',
    });
  }
});

/**
 * PATCH /api/tasks/:id
 * Update editable task details (title, description, category, priority, dates, reminder).
 */
router.patch('/:id', async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      priority,
      dueDate,
      reminderTime,
      hasReminder,
      timeZone,
    } = req.body;

    const updated = await taskService.updateTask(req.params.id, {
      title,
      description,
      category,
      priority,
      dueDate,
      reminderTime,
      hasReminder,
      timeZone,
    });

    return res.status(200).json({
      message: 'Task updated successfully.',
      task: updated,
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      error: error.message || 'Error updating task.',
    });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      priority,
      dueDate,
      reminderTime,
      hasReminder,
      timeZone,
    } = req.body;

    const updated = await taskService.updateTask(req.params.id, {
      title,
      description,
      category,
      priority,
      dueDate,
      reminderTime,
      hasReminder,
      timeZone,
    });

    return res.status(200).json({
      message: 'Task updated successfully.',
      task: updated,
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      error: error.message || 'Error updating task.',
    });
  }
});

/**
 * PATCH /api/tasks/:id/reschedule
 * Reschedule a task or reminder.
 */
router.patch('/:id/reschedule', async (req, res) => {
  try {
    const { newDueDate, newReminderTime, timeZone } = req.body;
    const rescheduled = await taskService.rescheduleTask(req.params.id, {
      newDueDate,
      newReminderTime,
      timeZone,
    });

    return res.status(200).json({
      message: 'Task rescheduled successfully.',
      task: rescheduled,
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      error: error.message || 'Error rescheduling task.',
    });
  }
});

/**
 * PATCH /api/tasks/:id/notification
 * Update local Expo notification ID.
 */
router.patch('/:id/notification', async (req, res) => {
  try {
    const { notificationId } = req.body;
    const updated = await taskService.updateNotificationId(req.params.id, notificationId);
    return res.status(200).json({
      message: 'Notification ID updated.',
      task: updated,
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      error: error.message || 'Error updating notification ID.',
    });
  }
});

/**
 * DELETE /api/tasks/:id
 * Cancel or delete a task/reminder.
 */
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await taskService.cancelTaskOrReminder(req.params.id);
    return res.status(200).json({
      message: 'Task deleted successfully.',
      task: deleted,
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      error: error.message || 'Error deleting task.',
    });
  }
});

module.exports = router;
