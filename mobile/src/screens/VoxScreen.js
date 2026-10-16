import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radii } from '../theme/spacing';
import { useNavigation } from '../navigation/NavigationContext';

export const VoxScreen = () => {
  const { navigate } = useNavigation();

  // Voice state: 'idle' | 'listening' | 'speaking'
  const [voiceState, setVoiceState] = useState('listening');
  const [aiResponse, setAiResponse] = useState(
    "You have 'Quarterly Project Review' scheduled today at 3:30 PM."
  );

  // Animated values for the concentric pulsing rings
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.7)).current;
  const innerPulse = useRef(new Animated.Value(1)).current;
  const dotPulse = useRef(new Animated.Value(0.4)).current;

  // Concentric circle breathing animation loop
  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 1800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 1,
            duration: 1800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(innerPulse, {
            toValue: 1.12,
            duration: 1400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 0.94,
            duration: 1800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0.65,
            duration: 1800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(innerPulse, {
            toValue: 0.96,
            duration: 1400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    const dotLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(dotPulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(dotPulse, {
          toValue: 0.3,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );

    pulseLoop.start();
    dotLoop.start();

    return () => {
      pulseLoop.stop();
      dotLoop.stop();
    };
  }, []);

  const handleMicPress = () => {
    if (voiceState === 'idle') {
      setVoiceState('listening');
      setAiResponse(null);

      setTimeout(() => {
        setVoiceState('speaking');
        setAiResponse(
          "Your next event is 'Quarterly Project Review' today at 3:30 PM via Zoom."
        );
      }, 2000);
    } else if (voiceState === 'listening') {
      setVoiceState('speaking');
      setAiResponse(
        "Your next event is 'Quarterly Project Review' today at 3:30 PM via Zoom."
      );
    } else {
      setVoiceState('idle');
      setAiResponse(null);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header with Chat button in top-left, centered Vox AI, and balanced right spacer */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.chatButton}
          onPress={() => navigate('chat')}
          activeOpacity={0.7}
          accessibilityLabel="Open Chat History"
        >
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={18}
            color="#ff4d3a"
          />
          <Text style={styles.chatButtonText}>Chat</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Vox AI</Text>

        {/* Clean right spacer to keep title centered */}
        <View style={styles.headerSpacer} />
      </View>

      {/* Main Voice Center Visualization */}
      <View style={styles.centerContainer}>
        {/* Interactive Pulsing Concentric Soundwave Rings */}
        <TouchableOpacity
          style={styles.ringsContainer}
          onPress={handleMicPress}
          activeOpacity={0.9}
          accessibilityLabel="Tap to toggle Vox AI voice interaction"
        >
          {/* Outermost Ring */}
          <Animated.View
            style={[
              styles.ring,
              styles.outerRing,
              {
                transform: [{ scale: pulseAnim }],
                opacity: pulseOpacity,
              },
            ]}
          />

          {/* Middle Ring */}
          <Animated.View
            style={[
              styles.ring,
              styles.middleRing,
              {
                transform: [{ scale: innerPulse }],
                opacity: pulseOpacity,
              },
            ]}
          />

          {/* Inner Ring */}
          <Animated.View
            style={[
              styles.ring,
              styles.innerRing,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />

          {/* Core Orb Center */}
          <View style={styles.coreOrb}>
            <Ionicons
              name={voiceState === 'listening' ? 'radio-outline' : 'sparkles'}
              size={28}
              color={colors.voxGlow}
            />
          </View>
        </TouchableOpacity>

        {/* State Indicator */}
        <View style={styles.statusSection}>
          <Text style={styles.statusLabel}>
            {voiceState === 'listening'
              ? 'Listening...'
              : voiceState === 'speaking'
              ? 'Speaking...'
              : 'Vox AI'}
          </Text>

          {/* Red Glowing Indicator Dot */}
          <Animated.View
            style={[
              styles.glowingDot,
              {
                opacity: dotPulse,
                transform: [
                  {
                    scale: dotPulse.interpolate({
                      inputRange: [0.3, 1],
                      outputRange: [0.8, 1.3],
                    }),
                  },
                ],
              },
            ]}
          />

          {/* AI Response Card (appears when AI speaks) */}
          {aiResponse && (
            <View style={styles.responseContainer}>
              <Text style={styles.responseText}>{aiResponse}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05070a',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 12 : 20,
    paddingBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 77, 58, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 58, 0.28)',
    gap: 6,
  },
  chatButtonText: {
    color: '#ff6b5b',
    fontSize: 13,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.8,
  },
  headerSpacer: {
    width: 72,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  ringsContainer: {
    width: 280,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 14,
  },
  ring: {
    position: 'absolute',
    borderRadius: 999,
  },
  outerRing: {
    width: 270,
    height: 270,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 77, 58, 0.22)',
  },
  middleRing: {
    width: 200,
    height: 200,
    borderWidth: 2,
    borderColor: 'rgba(255, 77, 58, 0.45)',
  },
  innerRing: {
    width: 140,
    height: 140,
    borderWidth: 2.5,
    borderColor: 'rgba(255, 77, 58, 0.80)',
    shadowColor: colors.voxGlow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 8,
  },
  coreOrb: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 77, 58, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 77, 58, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusSection: {
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: spacing.md,
  },
  statusLabel: {
    fontSize: 16,
    color: '#9ca3af',
    fontWeight: '400',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  glowingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff4d3a',
    shadowColor: '#ff4d3a',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 12,
  },
  responseContainer: {
    backgroundColor: 'rgba(255, 77, 58, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 58, 0.28)',
    borderRadius: radii.lg,
    paddingHorizontal: 18,
    paddingVertical: 12,
    maxWidth: '92%',
  },
  responseText: {
    color: '#f3f4f6',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
