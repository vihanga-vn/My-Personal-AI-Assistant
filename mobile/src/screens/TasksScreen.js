import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radii } from '../theme/spacing';
import { Header } from '../components/Header';
import { TaskCard } from '../components/TaskCard';
import { mockTasks } from '../data/mockData';

const FILTERS = ['All', 'Today', 'Upcoming', 'Completed'];
const CATEGORIES = ['Work', 'Personal', 'Health'];
const PRIORITIES = ['Urgent', 'High', 'Medium', 'Low'];

export const TasksScreen = () => {
  const [tasks, setTasks] = useState(mockTasks);
  const [activeFilter, setActiveFilter] = useState('All');
  const [isModalVisible, setIsModalVisible] = useState(false);

  // New task form state
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Work');
  const [newPriority, setNewPriority] = useState('High');
  const [newDueTime, setNewDueTime] = useState('Today, 5:00 PM');

  const toggleTask = (id) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleAddTask = () => {
    if (!newTitle.trim()) return;

    const newTask = {
      id: `task-${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory,
      priority: newPriority,
      dueTime: newDueTime,
      deadlineDate: newDueTime.toLowerCase().includes('today') ? 'Today' : 'Upcoming',
      completed: false,
      notes: 'Added via mobile tasks manager',
    };

    setTasks([newTask, ...tasks]);
    setNewTitle('');
    setIsModalVisible(false);
  };

  const filteredTasks = tasks.filter((task) => {
    if (activeFilter === 'Today') return task.deadlineDate === 'Today' && !task.completed;
    if (activeFilter === 'Upcoming') return task.deadlineDate === 'Upcoming' && !task.completed;
    if (activeFilter === 'Completed') return task.completed;
    return true; // 'All'
  });

  const activeCount = tasks.filter((t) => !t.completed).length;
  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <View style={styles.container}>
      <Header
        subtitle="Schedule & Focus"
        title="Tasks & Reminders"
        rightAction="add"
        onRightActionPress={() => setIsModalVisible(true)}
      />

      {/* Filter Tabs */}
      <View style={styles.filterBar}>
        {FILTERS.map((filter) => {
          const isActive = activeFilter === filter;
          return (
            <TouchableOpacity
              key={filter}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setActiveFilter(filter)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                {filter}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Summary Tracker */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{activeCount}</Text>
          <Text style={styles.summaryLabel}>Active</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.success }]}>{completedCount}</Text>
          <Text style={styles.summaryLabel}>Completed</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.warning }]}>
            {tasks.filter((t) => t.priority === 'Urgent' && !t.completed).length}
          </Text>
          <Text style={styles.summaryLabel}>Urgent</Text>
        </View>
      </View>

      {/* Task List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {filteredTasks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-done-circle-outline" size={54} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No tasks found</Text>
            <Text style={styles.emptySubtitle}>
              {activeFilter === 'Completed'
                ? 'Check off tasks as you finish them!'
                : 'You are all caught up in this view.'}
            </Text>
          </View>
        ) : (
          filteredTasks.map((task) => (
            <TaskCard key={task.id} task={task} onToggleComplete={toggleTask} />
          ))
        )}
      </ScrollView>

      {/* Add Task Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Task / Reminder</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Task Title Input */}
            <Text style={styles.fieldLabel}>Task Description</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g., Review cloud security settings"
              placeholderTextColor={colors.textMuted}
              value={newTitle}
              onChangeText={setNewTitle}
              autoFocus
            />

            {/* Category Selection */}
            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.optionsRow}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.optionChip, newCategory === cat && styles.optionChipActive]}
                  onPress={() => setNewCategory(cat)}
                >
                  <Text
                    style={[
                      styles.optionChipText,
                      newCategory === cat && styles.optionChipTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Priority Selection */}
            <Text style={styles.fieldLabel}>Priority</Text>
            <View style={styles.optionsRow}>
              {PRIORITIES.map((pri) => (
                <TouchableOpacity
                  key={pri}
                  style={[styles.optionChip, newPriority === pri && styles.optionChipActive]}
                  onPress={() => setNewPriority(pri)}
                >
                  <Text
                    style={[
                      styles.optionChipText,
                      newPriority === pri && styles.optionChipTextActive,
                    ]}
                  >
                    {pri}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Due Time */}
            <Text style={styles.fieldLabel}>Due Time</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g., Today, 5:00 PM"
              placeholderTextColor={colors.textMuted}
              value={newDueTime}
              onChangeText={setNewDueTime}
            />

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.modalSubmitButton, !newTitle.trim() && { opacity: 0.5 }]}
              onPress={handleAddTask}
              disabled={!newTitle.trim()}
              activeOpacity={0.8}
            >
              <Text style={styles.modalSubmitText}>Add to Schedule</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.background,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  filterChipTextActive: {
    color: '#ffffff',
    fontWeight: typography.weights.bold,
  },
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    borderRadius: radii.lg,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  summaryLabel: {
    fontSize: typography.sizes.xs - 1,
    color: colors.textMuted,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  fieldLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  modalInput: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    color: colors.textPrimary,
    fontSize: typography.sizes.base,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  optionChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionChipText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  optionChipTextActive: {
    color: '#ffffff',
    fontWeight: typography.weights.bold,
  },
  modalSubmitButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  modalSubmitText: {
    color: '#ffffff',
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
  },
});
