import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radii } from '../theme/spacing';

const CATEGORY_COLORS = {
  Preferences: { bg: 'rgba(99, 102, 241, 0.15)', text: colors.primaryLight },
  Personal: { bg: 'rgba(236, 72, 153, 0.15)', text: '#f472b6' },
  Work: { bg: 'rgba(6, 182, 212, 0.15)', text: colors.accent },
  Health: { bg: 'rgba(16, 185, 129, 0.15)', text: colors.success },
};

export const MemoryCard = ({ memory }) => {
  const categoryStyle = CATEGORY_COLORS[memory.category] || CATEGORY_COLORS.Preferences;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={[styles.categoryBadge, { backgroundColor: categoryStyle.bg }]}>
          <Text style={[styles.categoryText, { color: categoryStyle.text }]}>
            {memory.category}
          </Text>
        </View>

        <View style={styles.metaRow}>
          {memory.importance === 'High' && (
            <View style={styles.importanceTag}>
              <Ionicons name="sparkles" size={12} color="#fbbf24" />
              <Text style={styles.importanceText}>Core Memory</Text>
            </View>
          )}
          <Text style={styles.dateText}>{memory.storedDate}</Text>
        </View>
      </View>

      <Text style={styles.title}>{memory.title}</Text>

      {memory.detail ? (
        <Text style={styles.detail}>{memory.detail}</Text>
      ) : null}

      {memory.tags && memory.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {memory.tags.map((tag, idx) => (
            <View key={idx} style={styles.tagPill}>
              <Text style={styles.tagText}>#{tag}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  categoryBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  categoryText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  importanceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  importanceText: {
    fontSize: typography.sizes.xs - 1,
    color: '#fbbf24',
    fontWeight: typography.weights.medium,
  },
  dateText: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
  title: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    lineHeight: 21,
    marginBottom: 6,
  },
  detail: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  tagPill: {
    backgroundColor: colors.surfaceHighlight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  tagText: {
    fontSize: typography.sizes.xs - 1,
    color: colors.textSecondary,
  },
});
