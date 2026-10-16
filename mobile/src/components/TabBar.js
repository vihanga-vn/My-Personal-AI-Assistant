import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radii } from '../theme/spacing';
import { useNavigation } from '../navigation/NavigationContext';

const TABS = [
  {
    key: 'dashboard',
    label: 'Overview',
    iconActive: 'grid',
    iconInactive: 'grid-outline',
  },
  {
    key: 'chat',
    label: 'AI Chat',
    iconActive: 'chatbubble-ellipses',
    iconInactive: 'chatbubble-ellipses-outline',
  },
  {
    key: 'tasks',
    label: 'Tasks',
    iconActive: 'checkbox',
    iconInactive: 'checkbox-outline',
  },
  {
    key: 'memories',
    label: 'Memories',
    iconActive: 'bookmark',
    iconInactive: 'bookmark-outline',
  },
  {
    key: 'settings',
    label: 'Settings',
    iconActive: 'settings',
    iconInactive: 'settings-outline',
  },
];

export const TabBar = () => {
  const { currentTab, navigate } = useNavigation();

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        {TABS.map((tab) => {
          const isActive = currentTab === tab.key;
          const iconName = isActive ? tab.iconActive : tab.iconInactive;
          const activeColor = isActive ? colors.primaryLight : colors.textMuted;

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
              <View style={[styles.iconWrapper, isActive && styles.activeIconWrapper]}>
                <Ionicons name={iconName} size={22} color={activeColor} />
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  { color: activeColor, fontWeight: isActive ? typography.weights.bold : typography.weights.medium },
                ]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    paddingTop: 8,
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: spacing.xs,
  },
  iconWrapper: {
    width: 36,
    height: 30,
    borderRadius: radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  activeIconWrapper: {
    backgroundColor: colors.primaryGlow,
  },
  tabLabel: {
    fontSize: typography.sizes.xs - 1,
    letterSpacing: 0.2,
  },
});
