import React from 'react';
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

export const DashboardScreen = () => {
  const { navigate } = useNavigation();
  const nextEvent = mockUpcomingEvents[0];

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

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Categories Breakdown Section with Counts */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>Event Categories</Text>
            <TouchableOpacity
              onPress={() => navigate('events')}
              activeOpacity={0.7}
            >
              <Text style={styles.viewAllText}>
                {mockUpcomingEvents.length} Total Events
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.categoryGrid}>
            {EVENT_CATEGORIES.map((cat) => {
              const count = mockUpcomingEvents.filter(
                (e) => e.category.toLowerCase() === cat.key.toLowerCase()
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
                    {count} {count === 1 ? 'event' : 'events'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Next Up Hero Event */}
        {nextEvent && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Next Up</Text>
            <TouchableOpacity
              style={styles.nextEventCard}
              onPress={() => navigate('events')}
              activeOpacity={0.8}
            >
              <View style={styles.nextEventHeader}>
                <View style={styles.nextBadge}>
                  <View style={styles.dot} />
                  <Text style={styles.nextBadgeText}>Priority</Text>
                </View>
                <Text style={styles.nextEventTime}>{nextEvent.time}</Text>
              </View>

              <Text style={styles.nextEventTitle}>{nextEvent.title}</Text>

              <View style={styles.nextEventFooter}>
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={14} color="#9ca3af" />
                  <Text style={styles.locationText}>{nextEvent.location}</Text>
                </View>
                <View
                  style={[
                    styles.tagBadge,
                    { backgroundColor: `${nextEvent.tagColor}22` },
                  ]}
                >
                  <Text style={[styles.tagText, { color: nextEvent.tagColor }]}>
                    {nextEvent.category}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        )}
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
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: 22,
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
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  categoryCountLabel: {
    fontSize: 13,
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
    marginBottom: 12,
  },
  nextEventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
