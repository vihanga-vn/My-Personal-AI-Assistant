import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radii } from '../theme/spacing';
import { useNavigation } from '../navigation/NavigationContext';
import { mockUpcomingEvents } from '../data/mockData';

const TABS = [
  {
    key: 'events',
    label: 'Upcoming',
    iconActive: 'notifications',
    iconInactive: 'notifications-outline',
    hasBadge: true,
  },
  {
    key: 'vox',
    label: 'Vox AI',
    iconActive: 'mic',
    iconInactive: 'mic-outline',
    isCenter: true,
  },
  {
    key: 'dashboard',
    label: 'Dashboard',
    iconActive: 'grid',
    iconInactive: 'grid-outline',
  },
];

export const TabBar = () => {
  const { currentTab, navigate } = useNavigation();
  const eventCount = mockUpcomingEvents.length;

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        {TABS.map((tab) => {
          const isActive = currentTab === tab.key;
          const iconName = isActive ? tab.iconActive : tab.iconInactive;
          const activeColor = isActive ? '#ff4d3a' : '#8e95a5';

          // Center Prominent Glowing Vox AI Mic Button (Middle)
          if (tab.isCenter) {
            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.centerTabButton}
                onPress={() => navigate(tab.key)}
                activeOpacity={0.8}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel="Vox AI Voice Assistant"
              >
                <View style={styles.centerMicContainer}>
                  {/* Outer Ambient Glow Ring */}
                  <View
                    style={[
                      styles.centerHalo,
                      isActive && styles.centerHaloActive,
                    ]}
                  />

                  {/* Inner Mic Button */}
                  <View
                    style={[
                      styles.centerMicCore,
                      isActive && styles.centerMicCoreActive,
                    ]}
                  >
                    <Ionicons
                      name={isActive ? 'mic' : 'mic-outline'}
                      size={28}
                      color="#ffffff"
                    />
                  </View>
                </View>

                <Text
                  style={[
                    styles.tabLabel,
                    styles.centerTabLabel,
                    { color: isActive ? '#ff6b5b' : '#8e95a5' },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          }

          // Side Navigation Tabs: Upcoming (Left), Dashboard (Right)
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabButton}
              onPress={() => navigate(tab.key)}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={tab.label}
            >
              <View
                style={[
                  styles.iconWrapper,
                  isActive && styles.activeIconWrapper,
                ]}
              >
                <Ionicons name={iconName} size={24} color={activeColor} />

                {/* Event Count Badge on Upcoming */}
                {tab.hasBadge && eventCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{eventCount}</Text>
                  </View>
                )}
              </View>

              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: activeColor,
                    fontWeight: isActive ? '700' : '500',
                  },
                ]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Integrated iOS Home Bar Area */}
      <View style={styles.homeBarArea}>
        <View style={styles.homeIndicator} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#07090e',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 6,
    paddingBottom: Platform.OS === 'ios' ? 4 : 8,
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.xl,
    height: 60,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 4,
  },
  iconWrapper: {
    position: 'relative',
    width: 44,
    height: 34,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  activeIconWrapper: {
    backgroundColor: 'rgba(255, 77, 58, 0.12)',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 4,
    backgroundColor: '#ff4d3a',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
  },
  centerTabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
  },
  centerMicContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
    height: 64,
    marginBottom: 2,
  },
  centerHalo: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 77, 58, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 58, 0.3)',
  },
  centerHaloActive: {
    backgroundColor: 'rgba(255, 77, 58, 0.25)',
    borderColor: '#ff4d3a',
    shadowColor: '#ff4d3a',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 14,
    elevation: 8,
  },
  centerMicCore: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#151922',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 77, 58, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerMicCoreActive: {
    backgroundColor: '#ff4d3a',
    borderColor: '#ff6b5b',
  },
  tabLabel: {
    fontSize: 11,
    letterSpacing: 0.2,
  },
  centerTabLabel: {
    fontWeight: '600',
  },
  homeBarArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 6,
    paddingBottom: 2,
  },
  homeIndicator: {
    width: 120,
    height: 3.5,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 2,
  },
});
