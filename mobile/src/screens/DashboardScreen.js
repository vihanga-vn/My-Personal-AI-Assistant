import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radii } from '../theme/spacing';
import { useNavigation } from '../navigation/NavigationContext';
import { EVENT_CATEGORIES } from '../data/mockData';
import { getTasks, onTasksUpdated } from '../services/taskService';

export const DashboardScreen = () => {
  const { navigate } = useNavigation();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    setError(null);
    try {
      const data = await getTasks({ status: 'all' });
      setTasks(data.tasks || []);
    } catch (err) {
      console.error('[DashboardScreen] Error fetching tasks:', err);
      setError(err.message || 'Unable to connect to backend server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData(true);
    // Subscribe to task updates across the app (from Chat, Vox, or Upcoming)
    const unsubscribe = onTasksUpdated(() => {
      fetchDashboardData(false);
    });
    return unsubscribe;
  }, [fetchDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData(false);
  };

  // Derive metrics from real task records
  const pendingTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  // Determine earliest upcoming pending task
  const nextTask = pendingTasks
    .slice()
    .sort((a, b) => {
      const timeA = a.dueDate
        ? new Date(a.dueDate).getTime()
        : a.reminderTime
        ? new Date(a.reminderTime).getTime()
        : Infinity;
      const timeB = b.dueDate
        ? new Date(b.dueDate).getTime()
        : b.reminderTime
        ? new Date(b.reminderTime).getTime()
        : Infinity;
      return timeA - timeB;
    })[0];

  const getCategoryDetails = (catName) => {
    return (
      EVENT_CATEGORIES.find(
        (c) => c.key.toLowerCase() === (catName || '').toLowerCase()
      ) || {
        key: catName || 'Other',
        label: catName || 'Other',
        color: '#fde047',
        bgColor: 'rgba(253, 224, 71, 0.22)',
        borderColor: 'rgba(253, 224, 71, 0.55)',
        icon: 'ellipsis-horizontal-circle-outline',
      }
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigate('vox')}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={20} color="#ff6b5b" />
          <Text style={styles.backButtonText}>Vox AI</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Dashboard</Text>

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => fetchDashboardData(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="reload" size={17} color="#ff6b5b" />
        </TouchableOpacity>
      </View>

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
              onPress={() => fetchDashboardData(true)}
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
            <Text style={styles.loadingText}>Syncing schedule with MongoDB...</Text>
          </View>
        )}

        {/* Summary Metric Ribbon */}
        {!loading && (
          <View style={styles.metricsRibbon}>
            <View style={styles.metricItem}>
              <Text style={styles.metricNumber}>{pendingTasks.length}</Text>
              <Text style={styles.metricLabel}>Pending Tasks</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={[styles.metricNumber, { color: '#34d399' }]}>
                {completedTasks.length}
              </Text>
              <Text style={styles.metricLabel}>Completed</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={[styles.metricNumber, { color: '#4fa2ff' }]}>
                {tasks.length}
              </Text>
              <Text style={styles.metricLabel}>Total Saved</Text>
            </View>
          </View>
        )}

        {/* Categories Breakdown Section with Real Counts */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>Active Categories</Text>
            <TouchableOpacity
              onPress={() => navigate('events')}
              activeOpacity={0.7}
            >
              <Text style={styles.viewAllText}>
                {pendingTasks.length} Active {pendingTasks.length === 1 ? 'Task' : 'Tasks'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.categoryGrid}>
            {EVENT_CATEGORIES.map((cat) => {
              const count = pendingTasks.filter(
                (t) => (t.category || '').toLowerCase() === cat.key.toLowerCase()
              ).length;

              return (
                <TouchableOpacity
                  key={cat.key}
                  style={[
                    styles.categoryCard,
                    {
                      borderColor: cat.borderColor,
                      borderTopColor: cat.color,
                      borderTopWidth: 3.5,
                      shadowColor: cat.color,
                    },
                  ]}
                  onPress={() => navigate('events')}
                  activeOpacity={0.75}
                >
                  <View style={styles.categoryCardTop}>
                    <View
                      style={[
                        styles.categoryIconWrap,
                        {
                          backgroundColor: cat.bgColor,
                          borderColor: cat.borderColor,
                        },
                      ]}
                    >
                      <Ionicons name={cat.icon} size={20} color={cat.color} />
                    </View>
                    <View
                      style={[
                        styles.categoryBadgePill,
                        {
                          backgroundColor: cat.bgColor,
                          borderColor: cat.borderColor,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.categoryBadgeText,
                          { color: cat.color },
                        ]}
                      >
                        {count}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.categoryTitle}>{cat.label}</Text>

                  <Text
                    style={[styles.categoryCountLabel, { color: cat.color }]}
                  >
                    {count} {count === 1 ? 'task' : 'tasks'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Next Up Hero Task / Reminder Card */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Next Up</Text>
          {nextTask ? (
            (() => {
              const cat = getCategoryDetails(nextTask.category);
              return (
                <TouchableOpacity
                  style={[
                    styles.nextEventCard,
                    { borderLeftColor: cat.color, borderLeftWidth: 3.5 },
                  ]}
                  onPress={() => navigate('events')}
                  activeOpacity={0.8}
                >
                  <View style={styles.nextEventHeader}>
                    <View style={styles.nextBadge}>
                      <View style={styles.dot} />
                      <Text style={styles.nextBadgeText}>
                        {nextTask.priority ? `${nextTask.priority} Priority` : 'Upcoming'}
                      </Text>
                    </View>
                    <Text style={styles.nextEventTime}>
                      {nextTask.dueTimeText || (nextTask.dueDate ? 'Scheduled' : 'No time set')}
                    </Text>
                  </View>

                  <Text style={styles.nextEventTitle}>{nextTask.title}</Text>

                  {nextTask.description ? (
                    <Text style={styles.nextEventDesc} numberOfLines={2}>
                      {nextTask.description}
                    </Text>
                  ) : null}

                  <View style={styles.nextEventFooter}>
                    <View style={styles.reminderRow}>
                      <Ionicons
                        name={nextTask.hasReminder ? 'notifications' : 'calendar-outline'}
                        size={14}
                        color={nextTask.hasReminder ? '#ff6b5b' : '#9ca3af'}
                      />
                      <Text
                        style={[
                          styles.reminderText,
                          nextTask.hasReminder && { color: '#ff6b5b', fontWeight: '600' },
                        ]}
                      >
                        {nextTask.hasReminder ? 'Alarm Scheduled' : 'Task'}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.tagBadge,
                        { backgroundColor: cat.bgColor, borderColor: cat.borderColor, borderWidth: 1 },
                      ]}
                    >
                      <Text style={[styles.tagText, { color: cat.color }]}>
                        {nextTask.category || 'General'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })()
          ) : !loading ? (
            <View style={styles.emptyCard}>
              <Ionicons name="sparkles-outline" size={32} color="#ff6b5b" />
              <Text style={styles.emptyTitle}>All caught up!</Text>
              <Text style={styles.emptySubtitle}>
                No upcoming tasks or reminders. Tell Vox AI or Chat to create one.
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
          ) : null}
        </View>
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: 20,
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
  metricsRibbon: {
    flexDirection: 'row',
    backgroundColor: '#0c0f17',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: spacing.md,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  metricItem: {
    alignItems: 'center',
    gap: 2,
  },
  metricNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ff6b5b',
  },
  metricLabel: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  section: {
    gap: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 13,
    color: '#ff6b5b',
    fontWeight: '600',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryCard: {
    width: '48%',
    backgroundColor: '#131826',
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    justifyContent: 'space-between',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  categoryCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryBadgePill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  categoryCountLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  nextEventCard: {
    backgroundColor: '#11141c',
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 58, 0.4)',
  },
  nextEventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nextBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 77, 58, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ff4d3a',
  },
  nextBadgeText: {
    color: '#ff6b5b',
    fontSize: 11,
    fontWeight: '700',
  },
  nextEventTime: {
    color: '#f3f4f6',
    fontSize: 13,
    fontWeight: '600',
  },
  nextEventTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 6,
  },
  nextEventDesc: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 10,
    lineHeight: 18,
  },
  nextEventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reminderText: {
    color: '#9ca3af',
    fontSize: 12,
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0c0f17',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: 8,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
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
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.full,
  },
  emptyActionText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
});
