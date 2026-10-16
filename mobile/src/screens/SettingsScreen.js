import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radii } from '../theme/spacing';
import { Header } from '../components/Header';
import { mockUser } from '../data/mockData';

export const SettingsScreen = () => {
  // Settings toggle states
  const [speakResponses, setSpeakResponses] = useState(true);
  const [autoListen, setAutoListen] = useState(false);
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(true);
  const [speechRate, setSpeechRate] = useState('Normal (1.0x)');
  const [persona, setPersona] = useState('Proactive & Concise');

  const handleResetData = () => {
    Alert.alert(
      'Reset Mock Data',
      'This will reset your local mock tasks and memories back to initial state.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: () => {} },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Header subtitle="Preferences" title="Settings" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* User & Assistant Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>{mockUser.avatarInitials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{mockUser.name}</Text>
            <Text style={styles.profileRole}>Primary User</Text>
          </View>
          <View style={styles.assistantBadge}>
            <Ionicons name="sparkles" size={14} color={colors.accent} />
            <Text style={styles.assistantBadgeText}>{mockUser.assistantName}</Text>
          </View>
        </View>

        {/* AI Persona Preference */}
        <Text style={styles.sectionHeading}>Assistant Personality</Text>
        <View style={styles.settingGroup}>
          <View style={styles.settingRow}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingLabel}>Persona Style</Text>
              <Text style={styles.settingDescription}>How Aura crafts recommendations</Text>
            </View>
            <TouchableOpacity
              style={styles.pillSelector}
              onPress={() => {
                const styles = ['Proactive & Concise', 'Analytical & Deep', 'Friendly & Casual'];
                const nextIndex = (styles.indexOf(persona) + 1) % styles.length;
                setPersona(styles[nextIndex]);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.pillSelectorText}>{persona}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Voice & Speech Section */}
        <Text style={styles.sectionHeading}>Voice & Spoken Audio</Text>
        <View style={styles.settingGroup}>
          <View style={styles.settingRow}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingLabel}>Spoken Responses</Text>
              <Text style={styles.settingDescription}>Aura speaks assistant replies aloud</Text>
            </View>
            <Switch
              value={speakResponses}
              onValueChange={setSpeakResponses}
              trackColor={{ false: colors.surfaceHighlight, true: colors.primary }}
              thumbColor={speakResponses ? '#ffffff' : colors.textMuted}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingLabel}>Speech Rate</Text>
              <Text style={styles.settingDescription}>Playback speed for text-to-speech</Text>
            </View>
            <TouchableOpacity
              style={styles.pillSelector}
              onPress={() => {
                const rates = ['Relaxed (0.8x)', 'Normal (1.0x)', 'Fast (1.2x)'];
                const nextIndex = (rates.indexOf(speechRate) + 1) % rates.length;
                setSpeechRate(rates[nextIndex]);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.pillSelectorText}>{speechRate}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingLabel}>Auto-listen after reply</Text>
              <Text style={styles.settingDescription}>Keep mic open for hands-free dialogue</Text>
            </View>
            <Switch
              value={autoListen}
              onValueChange={setAutoListen}
              trackColor={{ false: colors.surfaceHighlight, true: colors.primary }}
              thumbColor={autoListen ? '#ffffff' : colors.textMuted}
            />
          </View>
        </View>

        {/* Memory & Privacy Section */}
        <Text style={styles.sectionHeading}>Memory & Context</Text>
        <View style={styles.settingGroup}>
          <View style={styles.settingRow}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingLabel}>Persistent Memory</Text>
              <Text style={styles.settingDescription}>Store preferences, routines and facts</Text>
            </View>
            <Switch
              value={memoryEnabled}
              onValueChange={setMemoryEnabled}
              trackColor={{ false: colors.surfaceHighlight, true: colors.primary }}
              thumbColor={memoryEnabled ? '#ffffff' : colors.textMuted}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingLabel}>Morning Schedule Digest</Text>
              <Text style={styles.settingDescription}>Notification of today's key tasks at 8 AM</Text>
            </View>
            <Switch
              value={dailyDigest}
              onValueChange={setDailyDigest}
              trackColor={{ false: colors.surfaceHighlight, true: colors.primary }}
              thumbColor={dailyDigest ? '#ffffff' : colors.textMuted}
            />
          </View>
        </View>

        {/* Security & System Architecture */}
        <Text style={styles.sectionHeading}>System & Security</Text>
        <View style={styles.securityCard}>
          <View style={styles.securityHeader}>
            <Ionicons name="shield-checkmark" size={20} color={colors.success} />
            <Text style={styles.securityTitle}>Zero-Secret Architecture</Text>
          </View>
          <Text style={styles.securityBody}>
            • Gemini API Keys: Held exclusively in Node.js backend.
            {'\n'}• MongoDB Database: Connected only via backend service.
            {'\n'}• Mobile Application: Stores 0 credentials or secrets.
            {'\n'}• Cost: 100% Free Tier tools with no billing attached.
          </Text>

          <View style={styles.backendStatusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.backendStatusText}>
              Backend Target: http://localhost:5000/api/health
            </Text>
          </View>
        </View>

        {/* Reset Mock Data Action */}
        <TouchableOpacity
          style={styles.resetButton}
          onPress={handleResetData}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh-outline" size={18} color={colors.danger} />
          <Text style={styles.resetButtonText}>Reset Mock Data</Text>
        </TouchableOpacity>

        {/* App Version Footer */}
        <Text style={styles.versionFooter}>
          Personal AI Assistant • Milestone 2 UI
          {'\n'}Expo SDK 58 • React Native 0.88
        </Text>
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
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  profileAvatarText: {
    color: '#ffffff',
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  profileRole: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  assistantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceHighlight,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  assistantBadgeText: {
    fontSize: typography.sizes.xs,
    color: colors.accent,
    fontWeight: typography.weights.semibold,
  },
  sectionHeading: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.xs + 2,
    marginTop: spacing.md,
  },
  settingGroup: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  settingTextContainer: {
    flex: 1,
    paddingRight: spacing.md,
  },
  settingLabel: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  pillSelector: {
    backgroundColor: colors.surfaceHighlight,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 6,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillSelectorText: {
    fontSize: typography.sizes.xs,
    color: colors.primaryLight,
    fontWeight: typography.weights.semibold,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  securityCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
  },
  securityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginBottom: spacing.xs + 2,
  },
  securityTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  securityBody: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  backendStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
    marginRight: 6,
  },
  backendStatusText: {
    fontSize: typography.sizes.xs - 1,
    color: colors.textMuted,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.dangerLight,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.danger,
    marginBottom: spacing.xl,
  },
  resetButtonText: {
    color: colors.danger,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  versionFooter: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: typography.sizes.xs - 1,
    lineHeight: 16,
    marginBottom: spacing.xl,
  },
});
