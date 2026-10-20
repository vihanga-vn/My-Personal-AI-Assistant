import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radii } from '../theme/spacing';
import { useNavigation } from '../navigation/NavigationContext';
import {
  TASK_CATEGORIES,
  getCategoryDetails,
  getCategoryEmoji,
} from '../config/categories';
import {
  getTasks,
  completeTask,
  deleteTask,
  onTasksUpdated,
} from '../services/taskService';
import { cancelLocalReminderForTask } from '../services/notificationService';
import { TaskEditModal } from '../components/TaskEditModal';

export const UpcomingEventsScreen = () => {
  const { navigate } = useNavigation();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters: category filter and status filter ('all', 'pending', 'completed')
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState('pending'); // 'pending' | 'completed' | 'all'

  // Task Details & Reschedule Modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchTasks = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    setError(null);
    try {
      const data = await getTasks({
        status: statusFilter,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
      });

      let list = data.tasks || [];

      // Filter: if viewing pending (upcoming), ensure completed tasks never appear
      if (statusFilter === 'pending') {
        list = list.filter((t) => !t.completed);
      } else if (statusFilter === 'completed') {
        list = list.filter((t) => t.completed);
      }

      // Canonical Upcoming Task Sorting Rules:
      // 1. Pending tasks with earliest due date and time first.
      // 2. Tasks with the same due date sorted by due time.
      // 3. Overdue pending tasks remain visible, ordered from oldest overdue to most recently overdue.
      // 4. Completed tasks do not appear in the upcoming task list.
      // 5. Tasks without a valid due date appear after tasks with valid due dates.
      const sorted = list.slice().sort((a, b) => {
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
        const timeA = getTaskTime(a);
        const timeB = getTaskTime(b);
        if (timeA !== timeB) return timeA - timeB;
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      });

      setTasks(sorted);
    } catch (err) {
      console.error('[UpcomingEventsScreen] Fetch error:', err);
      setError(err.message || 'Unable to connect to backend server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, selectedCategory]);

  useEffect(() => {
    fetchTasks(true);
    // Listen for updates from ChatScreen or VoxScreen or other actions
    const unsubscribe = onTasksUpdated(() => {
      fetchTasks(false);
    });
    return unsubscribe;
  }, [fetchTasks]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTasks(false);
  };

  // Handle Complete
  const handleCompleteTask = async (task) => {
    if (task.completed) return;
    try {
      setActionLoading(true);
      await cancelLocalReminderForTask(task._id);
      await completeTask(task._id);
      await fetchTasks(false);
    } catch (err) {
      Alert.alert('Complete Error', err.message || 'Failed to complete task.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Delete
  const handleDeleteTask = (task) => {
    Alert.alert(
      'Delete Task',
      `Are you sure you want to delete "${task.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              await cancelLocalReminderForTask(task._id);
              await deleteTask(task._id);
              await fetchTasks(false);
            } catch (err) {
              Alert.alert('Delete Error', err.message || 'Failed to delete task.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // Open Edit / Reschedule Modal
  const openEditModal = (task) => {
    setTaskToEdit(task);
    setEditModalVisible(true);
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigate('vox')}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={20} color="#ff6b5b" />
          <Text style={styles.backButtonText}>Vox AI</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Tasks & Reminders</Text>

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => fetchTasks(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="reload" size={17} color="#ff6b5b" />
        </TouchableOpacity>
      </View>

      {/* Status Segmented Control (Pending / Completed / All) */}
      <View style={styles.statusSegmentContainer}>
        {[
          { key: 'pending', label: 'Pending' },
          { key: 'completed', label: 'Completed' },
          { key: 'all', label: 'All Tasks' },
        ].map((item) => {
          const isActive = statusFilter === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.statusSegmentButton,
                isActive && styles.statusSegmentButtonActive,
              ]}
              onPress={() => setStatusFilter(item.key)}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.statusSegmentText,
                  isActive && styles.statusSegmentTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Category Filter Chips */}
      <View style={styles.filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {/* All Chip */}
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedCategory === 'all' && styles.filterChipActiveAll,
            ]}
            onPress={() => setSelectedCategory('all')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedCategory === 'all' && styles.filterChipTextActive,
              ]}
            >
              All Categories
            </Text>
          </TouchableOpacity>

          {/* Specific Category Chips */}
          {TASK_CATEGORIES.map((cat) => {
            const isActive = selectedCategory.toLowerCase() === cat.key.toLowerCase();

            return (
              <TouchableOpacity
                key={cat.key}
                style={[
                  styles.filterChip,
                  isActive && {
                    backgroundColor: `${cat.color}25`,
                    borderColor: cat.color,
                  },
                ]}
                onPress={() => setSelectedCategory(cat.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isActive && { color: cat.color, fontWeight: '700' },
                  ]}
                >
                  {cat.emoji} {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Task List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#ff4d3a"
            colors={['#ff4d3a']}
          />
        }
      >
        {/* Error Banner */}
        {error && (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={20} color="#ef4444" />
            <View style={{ flex: 1 }}>
              <Text style={styles.errorTitle}>Connection Issue</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => fetchTasks(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Loading Spinner */}
        {loading && tasks.length === 0 && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#ff4d3a" />
            <Text style={styles.loadingText}>Fetching tasks from MongoDB Atlas...</Text>
          </View>
        )}

        {/* Empty State */}
        {!loading && tasks.length === 0 && !error && (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <Ionicons
                name={statusFilter === 'completed' ? 'checkmark-circle-outline' : 'calendar-outline'}
                size={40}
                color="#ff6b5b"
              />
            </View>
            <Text style={styles.emptyTitle}>
              {statusFilter === 'completed' ? 'No completed tasks' : 'No tasks scheduled'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {statusFilter === 'completed'
                ? 'Tasks marked complete will appear here.'
                : 'Say "Remind me tomorrow at 9 AM" in Vox or Chat to create one.'}
            </Text>
            <TouchableOpacity
              style={styles.emptyActionButton}
              onPress={() => navigate('vox')}
              activeOpacity={0.7}
            >
              <Ionicons name="mic-outline" size={16} color="#ffffff" />
              <Text style={styles.emptyActionText}>Ask Vox AI</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Task Cards */}
        {tasks.map((item) => {
          const cat = getCategoryDetails(item.category);
          const isCompleted = item.completed;

          return (
            <View
              key={item._id}
              style={[
                styles.eventCard,
                { borderLeftColor: cat.color, borderLeftWidth: 3.5 },
                isCompleted && styles.completedEventCard,
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.timeTag}>
                  <Ionicons
                    name={item.hasReminder ? 'alarm-outline' : 'time-outline'}
                    size={14}
                    color={item.hasReminder ? '#ff6b5b' : '#9ca3af'}
                  />
                  <Text
                    style={[
                      styles.timeText,
                      item.hasReminder && { color: '#ff6b5b', fontWeight: '700' },
                    ]}
                  >
                    {item.dueTimeText || (item.dueDate ? 'Scheduled' : 'No time set')}
                  </Text>
                </View>

                {/* Category Tag */}
                <View
                  style={[
                    styles.categoryTag,
                    {
                      backgroundColor: `${cat.color}25`,
                      borderColor: cat.borderColor,
                      borderWidth: 1.2,
                    },
                  ]}
                >
                  <Text style={[styles.categoryText, { color: cat.color }]}>
                    {cat.emoji} {cat.label}
                  </Text>
                </View>
              </View>

              <Text
                style={[
                  styles.eventTitle,
                  isCompleted && styles.completedTitleText,
                ]}
              >
                {item.title}
              </Text>

              {item.description ? (
                <Text style={styles.eventNotes} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}

              {/* Priority & Status Badges */}
              <View style={styles.metaRow}>
                {item.priority && (
                  <View
                    style={[
                      styles.priorityPill,
                      item.priority === 'Urgent' && styles.priorityUrgent,
                      item.priority === 'High' && styles.priorityHigh,
                    ]}
                  >
                    <Text style={styles.priorityText}>{item.priority}</Text>
                  </View>
                )}

                {item.hasReminder && (
                  <View style={styles.reminderBadge}>
                    <Ionicons name="notifications" size={10} color="#ff4d3a" />
                    <Text style={styles.reminderBadgeText}>Phone Alarm</Text>
                  </View>
                )}

                {isCompleted && (
                  <View style={styles.completedBadge}>
                    <Ionicons name="checkmark-circle" size={11} color="#34d399" />
                    <Text style={styles.completedBadgeText}>Done</Text>
                  </View>
                )}
              </View>

              {/* Interactive Card Action Controls */}
              <View style={styles.cardFooter}>
                <View style={styles.actionButtonGroup}>
                  {/* Complete Action */}
                  {!isCompleted ? (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleCompleteTask(item)}
                      disabled={actionLoading}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="checkmark-done" size={15} color="#34d399" />
                      <Text style={[styles.actionButtonText, { color: '#34d399' }]}>
                        Done
                      </Text>
                    </TouchableOpacity>
                  ) : null}

                  {/* Edit & Reschedule Action */}
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => openEditModal(item)}
                    disabled={actionLoading}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="create-outline" size={14} color="#60a5fa" />
                    <Text style={[styles.actionButtonText, { color: '#60a5fa' }]}>
                      Edit / Reschedule
                    </Text>
                  </TouchableOpacity>

                  {/* Delete Action */}
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDeleteTask(item)}
                    disabled={actionLoading}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={14} color="#f87171" />
                    <Text style={[styles.actionButtonText, { color: '#f87171' }]}>
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.askVoxButton}
                  onPress={() => navigate('vox')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="mic-outline" size={13} color="#ff6b5b" />
                  <Text style={styles.askVoxText}>Vox</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Task Details & Custom Reschedule Modal */}
      <TaskEditModal
        visible={editModalVisible}
        task={taskToEdit}
        onClose={() => {
          setEditModalVisible(false);
          setTaskToEdit(null);
        }}
        onTaskUpdated={() => fetchTasks(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05070a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: 4,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingRight: 8,
    gap: 4,
  },
  backButtonText: {
    color: '#ff6b5b',
    fontSize: 15,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  refreshButton: {
    padding: 6,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255, 77, 58, 0.12)',
  },
  statusSegmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#0c0f17',
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    padding: 3,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  statusSegmentButton: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  statusSegmentButtonActive: {
    backgroundColor: '#ff4d3a',
  },
  statusSegmentText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
  },
  statusSegmentTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  filterWrapper: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  filterScroll: {
    paddingHorizontal: spacing.lg,
    gap: 8,
    alignItems: 'center',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterChipActiveAll: {
    backgroundColor: 'rgba(255, 77, 58, 0.18)',
    borderColor: '#ff4d3a',
  },
  filterChipText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingBottom: spacing.xxl,
    gap: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    gap: 12,
  },
  loadingText: {
    color: '#9ca3af',
    fontSize: 13,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 10,
  },
  errorTitle: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '700',
  },
  errorText: {
    color: '#d1d5db',
    fontSize: 12,
  },
  retryButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0c0f17',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: spacing.xl * 1.5,
    paddingHorizontal: spacing.lg,
    gap: 10,
  },
  emptyIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 77, 58, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: '#9ca3af',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ff4d3a',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radii.full,
  },
  emptyActionText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  eventCard: {
    backgroundColor: '#11141c',
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  completedEventCard: {
    opacity: 0.65,
    backgroundColor: '#0a0d14',
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    color: '#f3f4f6',
    fontSize: 13,
    fontWeight: '600',
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radii.md,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 6,
    lineHeight: 22,
  },
  completedTitleText: {
    textDecorationLine: 'line-through',
    color: '#9ca3af',
  },
  eventNotes: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 10,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  priorityPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  priorityHigh: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  priorityUrgent: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#d1d5db',
    textTransform: 'uppercase',
  },
  reminderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 77, 58, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  reminderBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ff6b5b',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  completedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#34d399',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  actionButtonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  actionButtonText: {
    fontSize: 11,
    fontWeight: '600',
  },
  askVoxButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 77, 58, 0.12)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  askVoxText: {
    color: '#ff6b5b',
    fontSize: 11,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#11141c',
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
  modalSubtitle: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 2,
  },
  modalCloseButton: {
    padding: 4,
  },
  rescheduleOptionsList: {
    gap: 10,
  },
  rescheduleOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#191f2d',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  rescheduleOptionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
