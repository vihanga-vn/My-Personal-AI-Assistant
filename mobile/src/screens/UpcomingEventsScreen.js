import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radii } from '../theme/spacing';
import { useNavigation } from '../navigation/NavigationContext';
import { mockUpcomingEvents, EVENT_CATEGORIES } from '../data/mockData';

export const UpcomingEventsScreen = () => {
  const { navigate } = useNavigation();
  const [filter, setFilter] = useState('all');
  const [events, setEvents] = useState(mockUpcomingEvents);

  const filteredEvents = events.filter((e) => {
    if (filter === 'all') return true;
    return e.category.toLowerCase() === filter.toLowerCase();
  });

  const getCategoryDetails = (catName) => {
    return (
      EVENT_CATEGORIES.find(
        (c) => c.key.toLowerCase() === catName.toLowerCase()
      ) || {
        color: '#ff4d3a',
        bgColor: 'rgba(255, 77, 58, 0.15)',
        icon: 'calendar-outline',
      }
    );
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

        <Text style={styles.headerTitle}>Upcoming Events</Text>

        <View style={styles.headerSpacer} />
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
              filter === 'all' && styles.filterChipActiveAll,
            ]}
            onPress={() => setFilter('all')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterChipText,
                filter === 'all' && styles.filterChipTextActive,
              ]}
            >
              All ({events.length})
            </Text>
          </TouchableOpacity>

          {/* 5 Specific Category Chips */}
          {EVENT_CATEGORIES.map((cat) => {
            const isActive = filter.toLowerCase() === cat.key.toLowerCase();
            const count = events.filter(
              (e) => e.category.toLowerCase() === cat.key.toLowerCase()
            ).length;

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
                onPress={() => setFilter(cat.key)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={cat.icon}
                  size={14}
                  color={isActive ? cat.color : '#9ca3af'}
                  style={{ marginRight: 5 }}
                />
                <Text
                  style={[
                    styles.filterChipText,
                    isActive && { color: cat.color, fontWeight: '700' },
                  ]}
                >
                  {cat.label} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Events List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {filteredEvents.map((item) => {
          const cat = getCategoryDetails(item.category);

          return (
            <View
              key={item.id}
              style={[
                styles.eventCard,
                { borderLeftColor: cat.color, borderLeftWidth: 3.5 },
                item.isNext && styles.nextEventCard,
              ]}
            >
              {item.isNext && (
                <View style={styles.nextBadge}>
                  <View style={styles.nextDot} />
                  <Text style={styles.nextBadgeText}>Priority</Text>
                </View>
              )}

              <View style={styles.cardHeader}>
                <View style={styles.timeTag}>
                  <Ionicons name="time-outline" size={14} color="#ff6b5b" />
                  <Text style={styles.timeText}>{item.fullDateTime}</Text>
                </View>

                {/* Specific Highlighted Colored Tag */}
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
                  <Ionicons
                    name={cat.icon}
                    size={13}
                    color={cat.color}
                    style={{ marginRight: 5 }}
                  />
                  <Text style={[styles.categoryText, { color: cat.color }]}>
                    {item.category}
                  </Text>
                </View>
              </View>

              <Text style={styles.eventTitle}>{item.title}</Text>

              {item.notes && (
                <Text style={styles.eventNotes} numberOfLines={2}>
                  {item.notes}
                </Text>
              )}

              <View style={styles.cardFooter}>
                <View style={styles.locationRow}>
                  <Ionicons
                    name="location-outline"
                    size={14}
                    color={colors.textMuted}
                  />
                  <Text style={styles.locationText}>{item.location}</Text>
                </View>

                <TouchableOpacity
                  style={styles.askVoxButton}
                  onPress={() => navigate('vox')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="mic-outline" size={14} color="#ff6b5b" />
                  <Text style={styles.askVoxText}>Ask Vox</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
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
  headerSpacer: {
    width: 60,
  },
  filterWrapper: {
    paddingVertical: spacing.sm + 2,
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
    paddingHorizontal: 13,
    paddingVertical: 7,
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
  eventCard: {
    backgroundColor: '#11141c',
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  nextEventCard: {
    borderColor: 'rgba(255, 77, 58, 0.45)',
    backgroundColor: 'rgba(255, 77, 58, 0.06)',
  },
  nextBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 77, 58, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
    marginBottom: 8,
    gap: 5,
  },
  nextDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ff4d3a',
  },
  nextBadgeText: {
    color: '#ff6b5b',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.md,
  },
  categoryText: {
    fontSize: 12,
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
  eventNotes: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 10,
    lineHeight: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  locationText: {
    color: '#9ca3af',
    fontSize: 12,
  },
  askVoxButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 77, 58, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
  },
  askVoxText: {
    color: '#ff6b5b',
    fontSize: 12,
    fontWeight: '600',
  },
});
