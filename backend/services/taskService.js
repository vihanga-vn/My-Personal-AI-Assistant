const mongoose = require('mongoose');
const Task = require('../models/Task');
const { isDBConnected } = require('../config/db');
const {
  DEFAULT_TIMEZONE,
  parseAndValidateDateTime,
  isFutureDate,
  formatHumanTime,
} = require('../utils/dateTimeUtils');

// Resilient in-memory fallback store for tasks & reminders
const inMemoryTasks = new Map();

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

/**
 * Creates a structured task or reminder.
 */
async function createTask({
  title,
  description = '',
  category = 'Personal',
  priority = 'Medium',
  dueDate = null,
  reminderTime = null,
  timeZone = DEFAULT_TIMEZONE,
  source = 'chat',
}) {
  if (!title || typeof title !== 'string' || title.trim() === '') {
    const error = new Error('Task title is required.');
    error.statusCode = 400;
    throw error;
  }

  const validCategories = ['Work', 'University', 'Health', 'Finance', 'Hangouts', 'Personal', 'Other'];
  const normalizedCategory = validCategories.includes(category) ? category : 'Personal';

  const validPriorities = ['Low', 'Medium', 'High', 'Urgent'];
  const normalizedPriority = validPriorities.includes(priority) ? priority : 'Medium';

  let parsedDueDate = null;
  if (dueDate) {
    const validated = parseAndValidateDateTime(dueDate, timeZone);
    if (!validated.isValid) {
      const err = new Error(`Invalid due date: ${validated.error}`);
      err.statusCode = 400;
      throw err;
    }
    parsedDueDate = validated.date;
  }

  let parsedReminderTime = null;
  let hasReminder = false;
  let reminderStatus = 'none';

  if (reminderTime) {
    const validated = parseAndValidateDateTime(reminderTime, timeZone);
    if (!validated.isValid) {
      const err = new Error(`Invalid reminder time: ${validated.error}`);
      err.statusCode = 400;
      throw err;
    }

    // Reminders must be scheduled in the future (with 1-minute grace buffer)
    if (!isFutureDate(validated.date, 1)) {
      const err = new Error(
        `Reminder time "${formatHumanTime(validated.date, timeZone)}" is in the past. Reminders must be scheduled in the future.`
      );
      err.statusCode = 400;
      throw err;
    }

    parsedReminderTime = validated.date;
    hasReminder = true;
    reminderStatus = 'scheduled';

    if (!parsedDueDate) {
      parsedDueDate = parsedReminderTime;
    }
  }

  const dueTimeText = formatHumanTime(parsedDueDate || parsedReminderTime, timeZone);

  const taskData = {
    title: title.trim(),
    description: description ? description.trim() : '',
    category: normalizedCategory,
    priority: normalizedPriority,
    dueDate: parsedDueDate,
    dueTimeText,
    hasReminder,
    reminderTime: parsedReminderTime,
    reminderStatus,
    notificationId: null,
    completed: false,
    completedAt: null,
    timeZone,
    source,
  };

  if (isDBConnected()) {
    try {
      const task = new Task(taskData);
      const saved = await task.save();
      return saved.toObject();
    } catch (err) {
      console.error('[TaskService Create Error]:', err.message);
      throw err;
    }
  } else {
    const id = new mongoose.Types.ObjectId().toString();
    const now = new Date();
    const saved = {
      _id: id,
      ...taskData,
      createdAt: now,
      updatedAt: now,
    };
    inMemoryTasks.set(id, saved);
    console.warn(`[TaskService] Saved task to in-memory store (MongoDB Atlas offline): ${saved.title}`);
    return saved;
  }
}

/**
 * Retrieve a task by ID.
 */
async function getTaskById(id) {
  if (!id) {
    const err = new Error('Task ID is required.');
    err.statusCode = 400;
    throw err;
  }

  if (isDBConnected() && isValidObjectId(id)) {
    const task = await Task.findById(id).lean();
    if (!task) {
      const err = new Error(`Task with ID ${id} not found.`);
      err.statusCode = 404;
      throw err;
    }
    return task;
  } else {
    const task = inMemoryTasks.get(String(id));
    if (!task) {
      const err = new Error(`Task with ID ${id} not found.`);
      err.statusCode = 404;
      throw err;
    }
    return task;
  }
}

/**
 * List tasks and reminders with flexible filters.
 */
async function listTasks({
  status = 'all',
  category = null,
  dateFilter = 'all',
  limit = 50,
  skip = 0,
} = {}) {
  const filter = {};

  if (status === 'pending') {
    filter.completed = false;
  } else if (status === 'completed') {
    filter.completed = true;
  }

  if (category && category !== 'All') {
    filter.category = category;
  }

  const now = new Date();
  if (dateFilter === 'today') {
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    filter.dueDate = { $gte: startOfDay, $lte: endOfDay };
  } else if (dateFilter === 'upcoming') {
    filter.dueDate = { $gt: now };
    filter.completed = false;
  }

  if (isDBConnected()) {
    const pipeline = [
      { $match: filter },
      {
        $addFields: {
          hasDueDate: {
            $cond: [
              {
                $or: [
                  { $gt: ['$dueDate', null] },
                  { $gt: ['$reminderTime', null] },
                ],
              },
              0,
              1,
            ],
          },
          effectiveDueDate: {
            $ifNull: ['$dueDate', '$reminderTime'],
          },
        },
      },
      {
        $sort: {
          hasDueDate: 1,
          effectiveDueDate: 1,
          createdAt: 1,
        },
      },
      {
        $project: {
          hasDueDate: 0,
          effectiveDueDate: 0,
        },
      },
      { $skip: skip },
      { $limit: limit },
    ];

    const [tasks, total] = await Promise.all([
      Task.aggregate(pipeline),
      Task.countDocuments(filter),
    ]);
    return { tasks, total };
  } else {
    let items = Array.from(inMemoryTasks.values());

    if (filter.completed !== undefined) {
      items = items.filter((t) => t.completed === filter.completed);
    }
    if (filter.category) {
      items = items.filter((t) => t.category === filter.category);
    }
    if (dateFilter === 'today') {
      const todayStr = now.toDateString();
      items = items.filter((t) => t.dueDate && new Date(t.dueDate).toDateString() === todayStr);
    } else if (dateFilter === 'upcoming') {
      items = items.filter((t) => t.dueDate && new Date(t.dueDate) > now && !t.completed);
    }

    const getTaskTime = (t) => {
      if (t.dueDate) {
        const ms = new Date(t.dueDate).getTime();
        if (!isNaN(ms)) return ms;
      }
      if (t.reminderTime) {
        const ms = new Date(t.reminderTime).getTime();
        if (!isNaN(ms)) return ms;
      }
      return Infinity;
    };

    items.sort((a, b) => {
      const timeA = getTaskTime(a);
      const timeB = getTaskTime(b);
      if (timeA !== timeB) return timeA - timeB;
      return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
    });

    return {
      tasks: items.slice(skip, skip + limit),
      total: items.length,
    };
  }
}

/**
 * Mark a task as completed.
 */
async function completeTask(idOrTitle) {
  if (!idOrTitle) {
    const err = new Error('Task identifier is required.');
    err.statusCode = 400;
    throw err;
  }

  const updates = {
    completed: true,
    completedAt: new Date(),
    reminderStatus: 'delivered',
  };

  if (isDBConnected()) {
    let task;
    if (isValidObjectId(idOrTitle)) {
      task = await Task.findByIdAndUpdate(idOrTitle, updates, { new: true }).lean();
    } else {
      const regex = new RegExp(idOrTitle.trim(), 'i');
      task = await Task.findOneAndUpdate({ title: regex, completed: false }, updates, { new: true }).lean();
    }

    if (!task) {
      const err = new Error(`Active task matching "${idOrTitle}" not found.`);
      err.statusCode = 404;
      throw err;
    }
    return task;
  } else {
    const id = String(idOrTitle);
    let task = inMemoryTasks.get(id);

    if (!task) {
      for (const [, t] of inMemoryTasks.entries()) {
        if (t.title.toLowerCase().includes(idOrTitle.toLowerCase()) && !t.completed) {
          task = t;
          break;
        }
      }
    }

    if (!task) {
      const err = new Error(`Active task matching "${idOrTitle}" not found.`);
      err.statusCode = 404;
      throw err;
    }

    const completedTask = {
      ...task,
      ...updates,
      updatedAt: new Date(),
    };
    inMemoryTasks.set(String(completedTask._id), completedTask);
    return completedTask;
  }
}

/**
 * Reschedule an existing task or reminder.
 */
async function rescheduleTask(idOrTitle, { newDueDate, newReminderTime, timeZone = DEFAULT_TIMEZONE }) {
  if (!idOrTitle) {
    const err = new Error('Task identifier is required for rescheduling.');
    err.statusCode = 400;
    throw err;
  }

  const updates = {};

  if (newDueDate) {
    const val = parseAndValidateDateTime(newDueDate, timeZone);
    if (!val.isValid) throw new Error(val.error);
    updates.dueDate = val.date;
  }

  if (newReminderTime) {
    const val = parseAndValidateDateTime(newReminderTime, timeZone);
    if (!val.isValid) throw new Error(val.error);
    if (!isFutureDate(val.date, 1)) {
      throw new Error(`Rescheduled time "${formatHumanTime(val.date, timeZone)}" is in the past.`);
    }
    updates.reminderTime = val.date;
    updates.hasReminder = true;
    updates.reminderStatus = 'scheduled';
    if (!updates.dueDate) updates.dueDate = val.date;
  }

  updates.dueTimeText = formatHumanTime(updates.dueDate || updates.reminderTime, timeZone);

  if (isDBConnected()) {
    let task;
    if (isValidObjectId(idOrTitle)) {
      task = await Task.findByIdAndUpdate(idOrTitle, updates, { new: true }).lean();
    } else {
      const regex = new RegExp(idOrTitle.trim(), 'i');
      task = await Task.findOneAndUpdate({ title: regex }, updates, { new: true }).lean();
    }

    if (!task) {
      const err = new Error(`Task matching "${idOrTitle}" not found.`);
      err.statusCode = 404;
      throw err;
    }
    return task;
  } else {
    const id = String(idOrTitle);
    let task = inMemoryTasks.get(id);

    if (!task) {
      for (const [, t] of inMemoryTasks.entries()) {
        if (t.title.toLowerCase().includes(idOrTitle.toLowerCase())) {
          task = t;
          break;
        }
      }
    }

    if (!task) {
      const err = new Error(`Task matching "${idOrTitle}" not found.`);
      err.statusCode = 404;
      throw err;
    }

    const rescheduled = {
      ...task,
      ...updates,
      updatedAt: new Date(),
    };
    inMemoryTasks.set(String(rescheduled._id), rescheduled);
    return rescheduled;
  }
}

/**
 * Cancel or delete a task or reminder.
 */
async function cancelTaskOrReminder(idOrTitle) {
  if (!idOrTitle) {
    const err = new Error('Task identifier is required.');
    err.statusCode = 400;
    throw err;
  }

  if (isDBConnected()) {
    let task;
    if (isValidObjectId(idOrTitle)) {
      task = await Task.findByIdAndDelete(idOrTitle).lean();
    } else {
      const regex = new RegExp(idOrTitle.trim(), 'i');
      task = await Task.findOneAndDelete({ title: regex }).lean();
    }

    if (!task) {
      const err = new Error(`Task matching "${idOrTitle}" not found.`);
      err.statusCode = 404;
      throw err;
    }
    return task;
  } else {
    const id = String(idOrTitle);
    let foundKey = inMemoryTasks.has(id) ? id : null;

    if (!foundKey) {
      for (const [k, t] of inMemoryTasks.entries()) {
        if (t.title.toLowerCase().includes(idOrTitle.toLowerCase())) {
          foundKey = k;
          break;
        }
      }
    }

    if (!foundKey) {
      const err = new Error(`Task matching "${idOrTitle}" not found.`);
      err.statusCode = 404;
      throw err;
    }

    const removed = inMemoryTasks.get(foundKey);
    inMemoryTasks.delete(foundKey);
    return removed;
  }
}

/**
 * Associate a client-scheduled Expo notification ID with a backend task.
 */
async function updateNotificationId(taskId, notificationId) {
  if (isDBConnected() && isValidObjectId(taskId)) {
    return await Task.findByIdAndUpdate(taskId, { notificationId }, { new: true }).lean();
  } else {
    const task = inMemoryTasks.get(String(taskId));
    if (task) {
      task.notificationId = notificationId;
      inMemoryTasks.set(String(taskId), task);
      return task;
    }
  }
  return null;
}

module.exports = {
  createTask,
  getTaskById,
  listTasks,
  completeTask,
  rescheduleTask,
  cancelTaskOrReminder,
  updateNotificationId,
};
