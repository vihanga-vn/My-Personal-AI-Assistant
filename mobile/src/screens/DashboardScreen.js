import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radii } from '../theme/spacing';
import { Header } from '../components/Header';
import { StatBadge } from '../components/StatBadge';
import { TaskCard } from '../components/TaskCard';
import { mockTasks, mockUpcomingDeadlines, mockMemories, mockUser } from '../data/mockData';
import { useNavigation } from '../navigation/NavigationContext';

export const DashboardScreen = () => {
  const { navigate } = useNavigation();
  const [tasks, setTasks] = useState(mockTasks);

  const toggleTask = (id) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const todayTasks = tasks.filter((t) => t.deadlineDate === 'Today');
  const pendingTodayCount = todayTasks.filter((t) => !t.completed).length;

  return (
    <View style={styles.container}>
      <Header
        subtitle="Good day"
        title={`Hello, ${mockUser.name}`}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Voice / Chat Prompt Banner */}
        <TouchableOpacity
          style={styles.aiBanner}
          onPress={() => navigate('chat')}
          activeOpacity={0.85}
        >
          <View style={styles.aiBannerIcon}>
            <Ionicons name="sparkles" size={24} color={colors.accent} />
          </View>
          <View style={styles.aiBannerText}>
            <Text style={styles.aiBannerTitle}>Ask {mockUser.assistantName}</Text>
            <Text style={styles.aiBannerSubtitle}>
              Tap to speak or chat about tasks, memories & schedule
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <StatBadge
            icon="checkbox-outline"
            count={pendingTodayCount}
            label="Today's Tasks"
            accentColor={colors.primary}
            onPress={() => navigate('tasks')}
          />
          <StatBadge
            icon="alarm-outline"
            count={mockUpcomingDeadlines.length}
            label="Deadlines"
            accentColor={colors.warning}
            onPress={() => navigate('tasks')}
          />
          <StatBadge
            icon="bookmark-outline"
            count={mockMemories.length}
            label="Memories"
            accentColor={colors.accent}
            onPress={() => navigate('memories')}
          />
        </View>

        {/* Today's Tasks Section */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Today's Schedule</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{pendingTodayCount} remaining</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => navigate('tasks')} activeOpacity={0.7}>
            <Text style={styles.viewAllText}>View all</Text>
          </TouchableOpacity>
        </View>

        {todayTasks.slice(0, 3).map((task) => (
          <TaskCard key={task.id} task={task} onToggleComplete={toggleTask} />
        ))}

        {/* Upcoming Deadlines Section */}
        <View style={[styles.sectionHeader, { marginTop: spacing.lg }]}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Upcoming Deadlines</Text>
          </View>
        </View>

        <View style={styles.deadlinesCard}>
          {mockUpcomingDeadlines.map((item, idx) => (
            <View
              key={item.id}
              style={[
                styles.deadlineItem,
                idx === mockUpcomingDeadlines.length - 1 && styles.deadlineItemLast,
              ]}
            >
              <View style={[styles.deadlineDot, { backgroundColor: item.color }]} />
              <View style={styles.deadlineInfo}>
                <Text style={styles.deadlineTitle}>{item.title}</Text>
                <Text style={styles.deadlineDate}>{item.date}</Text>
              </View>
              <View style={[styles.deadlineTag, { backgroundColor: `${item.color}20` }]}>
                <Text style={[styles.deadlineTagText, { color: item.color }]}>
                  {item.tag}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Assistant Memory Insight */}
        <View style={[styles.sectionHeader, { marginTop: spacing.lg }]}>
          <Text style={styles.sectionTitle}>Assistant Memory Highlight</Text>
          <TouchableOpacity onPress={() => navigate('memories')} activeOpacity={0.7}>
            <Text style={styles.viewAllText}>All memories</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.memoryHighlightCard}>
          <View style={styles.memoryHighlightHeader}>
            <Ionicons name="bulb-outline" size={18} color="#fbbf24" />
            <Text style={styles.memoryHighlightLabel}>Recognized Preference</Text>
          </View>
          <Text style={styles.memoryHighlightTitle}>{mockMemories[0].title}</Text>
          <Text style={styles.memoryHighlightDetail}>{mockMemories[0].detail}</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  aiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  aiBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.lg,
    backgroundColor: colors.accentGlow,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  aiBannerText: {
    flex: 1,
  },
  aiBannerTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  aiBannerSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  countBadge: {
    backgroundColor: colors.surfaceHighlight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  countBadgeText: {
    fontSize: typography.sizes.xs - 1,
    color: colors.accent,
    fontWeight: typography.weights.semibold,
  },
  viewAllText: {
    fontSize: typography.sizes.sm,
    color: colors.primaryLight,
    fontWeight: typography.weights.semibold,
  },
  deadlinesCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deadlineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  deadlineItemLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  deadlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.md,
  },
  deadlineInfo: {
    flex: 1,
  },
  deadlineTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  deadlineDate: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
  deadlineTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  deadlineTagText: {
    fontSize: typography.sizes.xs - 1,
    fontWeight: typography.weights.bold,
  },
  memoryHighlightCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: '#fbbf24',
    borderWidth: 1,
    borderColor: colors.border,
  },
  memoryHighlightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  memoryHighlightLabel: {
    fontSize: typography.sizes.xs,
    color: '#fbbf24',
    fontWeight: typography.weights.semibold,
  },
  memoryHighlightTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  memoryHighlightDetail: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
