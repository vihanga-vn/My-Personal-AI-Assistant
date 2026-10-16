import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radii } from '../theme/spacing';

const PRIORITY_CONFIG = {
  Urgent: { bg: colors.dangerLight, text: colors.danger, border: colors.danger },
  High: { bg: colors.warningLight, text: colors.warning, border: colors.warning },
  Medium: { bg: 'rgba(59, 130, 246, 0.15)', text: colors.info, border: colors.info },
  Low: { bg: 'rgba(100, 116, 139, 0.15)', text: colors.textMuted, border: colors.border },
};

export const TaskCard = ({ task, onToggleComplete }) => {
  const isCompleted = task.completed;
  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.Medium;

  return (
    <View style={[styles.card, isCompleted && styles.cardCompleted]}>
      <TouchableOpacity
        style={styles.checkboxTouchArea}
        onPress={() => onToggleComplete && onToggleComplete(task.id)}
        activeOpacity={0.7}
      >
        <View style={[styles.checkbox, isCompleted && styles.checkboxActive]}>
          {isCompleted && <Ionicons name="checkmark" size={14} color="#ffffff" />}
        </View>
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{task.category}</Text>
          </View>
          <View style={[styles.priorityBadge, { backgroundColor: priority.bg }]}>
            <Text style={[styles.priorityText, { color: priority.text }]}>{task.priority}</Text>
          </View>
        </View>

        <Text style={[styles.title, isCompleted && styles.titleCompleted]}>
          {task.title}
        </Text>

        {task.notes ? (
          <Text style={styles.notes} numberOfLines={2}>
            {task.notes}
          </Text>
        ) : null}

        <View style={styles.footerRow}>
          <View style={styles.dueRow}>
            <Ionicons name="time-outline" size={13} color={colors.textMuted} />
            <Text style={styles.dueText}>{task.dueTime}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardCompleted: {
    opacity: 0.65,
    backgroundColor: 'rgba(21, 29, 48, 0.5)',
  },
  checkboxTouchArea: {
    paddingRight: spacing.sm,
    paddingTop: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  checkboxActive: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  categoryBadge: {
    backgroundColor: colors.surfaceHighlight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  categoryText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  priorityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  priorityText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  title: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    lineHeight: 20,
    marginBottom: 4,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  notes: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 6,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dueText: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
});
