import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Animated,
  Easing,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing, radii } from '../theme/spacing';
import { useNavigation } from '../navigation/NavigationContext';
import { sendChatMessage } from '../services/chatService';
import {
  speakAssistantResponse,
  stopSpeaking,
  startListeningSession,
  checkSttAvailability,
  requestSpeechPermissions,
} from '../services/voiceService';
import { scheduleLocalReminder, cancelLocalReminder } from '../services/notificationService';
import { notifyTasksUpdated, getTasks } from '../services/taskService';
import { getConversations, getConversation } from '../services/conversationService';

export const VoxScreen = () => {
  const { navigate, navParams } = useNavigation();

  // Voice States: 'idle' | 'permission' | 'listening' | 'processing' | 'responding'
  const [voiceState, setVoiceState] = useState('idle');
  const [aiResponse, setAiResponse] = useState(
    "Tap the microphone button or the orb to start speaking. I will listen automatically, transcribe your words, and respond without needing the keyboard."
  );
  const [recognizedText, setRecognizedText] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);
  const [voiceHistory, setVoiceHistory] = useState([]);
  
  // Alternative manual text input (Never auto-focuses)
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualInputText, setManualInputText] = useState('');
  const [unsupportedNotice, setUnsupportedNotice] = useState(null);

  // References for reliable silence detection and duplicate prevention
  const sessionCleanupRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const latestTranscriptRef = useRef('');
  const isSubmittingRef = useRef(false);

  // Animated values for pulsing soundwave rings
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
            toValue: 1.15,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(innerPulse, {
            toValue: 1.2,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 0.92,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0.55,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(innerPulse, {
            toValue: 0.92,
            duration: 1200,
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
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(dotPulse, {
          toValue: 0.3,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );

    pulseLoop.start();
    dotLoop.start();

    return () => {
      pulseLoop.stop();
      dotLoop.stop();
      stopSpeaking();
      clearSilenceTimer();
      if (sessionCleanupRef.current) {
        sessionCleanupRef.current();
        sessionCleanupRef.current = null;
      }
    };
  }, []);

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  /**
   * Cancel the active listening session without submitting.
   */
  const handleCancelListening = () => {
    clearSilenceTimer();
    latestTranscriptRef.current = '';
    isSubmittingRef.current = false;

    if (sessionCleanupRef.current) {
      sessionCleanupRef.current();
      sessionCleanupRef.current = null;
    }

    setRecognizedText('');
    setVoiceState('idle');
  };

  /**
   * Automatically submit transcript when speech finishes.
   */
  const handleAutoSubmit = (transcriptToSubmit) => {
    if (isSubmittingRef.current) return;
    const trimmed = (transcriptToSubmit || latestTranscriptRef.current || '').trim();

    clearSilenceTimer();
    if (sessionCleanupRef.current) {
      sessionCleanupRef.current();
      sessionCleanupRef.current = null;
    }

    if (!trimmed) {
      setVoiceState('idle');
      return;
    }

    isSubmittingRef.current = true;
    processVoiceInput(trimmed);
  };

  /**
   * Start hands-free speech recognition session.
   */
  const startVoiceSession = async () => {
    setErrorMessage(null);
    setUnsupportedNotice(null);
    clearSilenceTimer();
    latestTranscriptRef.current = '';
    isSubmittingRef.current = false;

    // If currently speaking, stop TTS first
    if (voiceState === 'responding') {
      await stopSpeaking();
      setVoiceState('idle');
      return;
    }

    // Stop any existing session
    if (sessionCleanupRef.current) {
      sessionCleanupRef.current();
      sessionCleanupRef.current = null;
    }

    setRecognizedText('');

    // Check platform & STT availability
    const stt = await checkSttAvailability();
    if (!stt.available && Platform.OS !== 'web') {
      setUnsupportedNotice(
        'Native voice recognition requires an Expo development build (npx expo run:android) or Web browser. In standard Expo Go, you can type your request below.'
      );
      setShowManualInput(true);
      setVoiceState('idle');
      return;
    }

    // Step: Request microphone permissions
    setVoiceState('permission');
    const permissions = await requestSpeechPermissions();
    if (!permissions.granted) {
      setErrorMessage(
        'Microphone permission was denied. Please allow microphone access in device settings to use hands-free voice.'
      );
      setVoiceState('idle');
      return;
    }

    // Step: Start listening
    setVoiceState('listening');

    try {
      const session = await startListeningSession({
        onStart: () => {
          setVoiceState('listening');
        },
        onSpeechEnd: () => {
          // Native or Web detected user stopped talking.
          // Give a short 600ms grace window for the final transcript segment, then auto-submit!
          if (!silenceTimerRef.current && latestTranscriptRef.current.trim()) {
            silenceTimerRef.current = setTimeout(() => {
              if (!isSubmittingRef.current && latestTranscriptRef.current.trim()) {
                handleAutoSubmit(latestTranscriptRef.current.trim());
              }
            }, 600);
          }
        },
        onResult: (transcript, isFinal) => {
          if (isSubmittingRef.current) return;
          latestTranscriptRef.current = transcript;
          setRecognizedText(transcript);

          clearSilenceTimer();

          if (isFinal && transcript.trim()) {
            handleAutoSubmit(transcript);
          } else {
            // Silence watchdog: if no new speech segment arrives in 1.8 seconds, auto-submit!
            silenceTimerRef.current = setTimeout(() => {
              if (!isSubmittingRef.current && latestTranscriptRef.current.trim()) {
                handleAutoSubmit(latestTranscriptRef.current.trim());
              }
            }, 1800);
          }
        },
        onError: (errText) => {
          clearSilenceTimer();
          console.warn('[VoxScreen STT Error]:', errText);
          const isNoSpeech =
            typeof errText === 'string' &&
            (errText.includes('no-speech') || errText.includes('7') || errText.includes('timeout'));

          if (isNoSpeech) {
            // User did not say anything, cleanly return to idle
            setVoiceState('idle');
          } else {
            setErrorMessage(errText || 'Voice recognition encountered an error.');
            setVoiceState('idle');
          }
        },
        onEnd: () => {
          // STT session completed
          if (!isSubmittingRef.current) {
            if (latestTranscriptRef.current.trim()) {
              handleAutoSubmit(latestTranscriptRef.current.trim());
            } else {
              setVoiceState('idle');
            }
          }
        },
      });

      sessionCleanupRef.current = session.cleanup;
    } catch (err) {
      console.error('[VoxScreen Start Session Error]:', err);
      setErrorMessage(err.message || 'Unable to start speech recognition.');
      setVoiceState('idle');
    }
  };

  /**
   * Quick Command 1: Tasks Today
   * Show or retrieve tasks due today from persistent storage, excluding completed tasks.
   */
  const handleTasksTodayCommand = async () => {
    try {
      setVoiceState('processing');
      setErrorMessage(null);

      const data = await getTasks({ status: 'pending', limit: 100 });
      const tasks = data.tasks || [];

      // Determine tasks due today in local time
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      const tasksToday = tasks.filter((t) => {
        if (t.completed) return false;
        const timeVal = t.dueDate || t.reminderTime;
        if (!timeVal) return false;
        const d = new Date(timeVal);
        return d >= startOfDay && d <= endOfDay;
      });

      let responseText = '';
      if (tasksToday.length === 0) {
        responseText = "You have no pending tasks due today. You're all caught up!";
      } else if (tasksToday.length === 1) {
        const t = tasksToday[0];
        const timeInfo = t.dueTimeText ? ` at ${t.dueTimeText}` : '';
        responseText = `You have 1 task due today: "${t.title}"${timeInfo} (${t.category || 'Other'}).`;
      } else {
        const taskListStr = tasksToday
          .map((t, idx) => `${idx + 1}. "${t.title}"${t.dueTimeText ? ` at ${t.dueTimeText}` : ''}`)
          .join(', ');
        responseText = `You have ${tasksToday.length} tasks due today: ${taskListStr}.`;
      }

      setAiResponse(responseText);
      setVoiceHistory((prev) => [
        ...prev,
        { sender: 'user', text: 'Tasks Today' },
        { sender: 'assistant', text: responseText },
      ]);

      setVoiceState('responding');
      await speakAssistantResponse(responseText, {
        onDone: () => {
          setVoiceState('idle');
          isSubmittingRef.current = false;
        },
        onError: () => {
          setVoiceState('idle');
          isSubmittingRef.current = false;
        },
      });
    } catch (err) {
      console.error('[VoxScreen Tasks Today Error]:', err);
      const errMsg = 'Unable to fetch tasks due today. Please ensure the backend is running.';
      setErrorMessage(errMsg);
      setVoiceState('idle');
      isSubmittingRef.current = false;
    }
  };

  /**
   * Quick Command 2: Last Chat
   * Opens or restores the most recent saved conversation from MongoDB.
   * If no previous conversation exists, shows a friendly empty-state message.
   */
  const handleLastChatCommand = async () => {
    try {
      setVoiceState('processing');
      setErrorMessage(null);

      const data = await getConversations({ limit: 1 });
      const convs = data.conversations || [];

      if (convs.length === 0) {
        const emptyMsg = "You don't have any previous chat conversations saved yet. Start a new chat or tap the microphone to begin!";
        setAiResponse(emptyMsg);
        setVoiceHistory((prev) => [
          ...prev,
          { sender: 'user', text: 'Last Chat' },
          { sender: 'assistant', text: emptyMsg },
        ]);
        setVoiceState('responding');
        await speakAssistantResponse(emptyMsg, {
          onDone: () => {
            setVoiceState('idle');
            isSubmittingRef.current = false;
          },
          onError: () => {
            setVoiceState('idle');
            isSubmittingRef.current = false;
          },
        });
        return;
      }

      const latestConv = convs[0];
      const fullConv = await getConversation(latestConv._id);

      // Restore messages into Vox voiceHistory
      if (Array.isArray(fullConv.messages)) {
        const restored = fullConv.messages.map((m) => ({
          sender: m.sender === 'user' ? 'user' : 'assistant',
          text: m.text,
        }));
        setVoiceHistory(restored);
      }

      const restoredMsg = `Restored your last conversation: "${fullConv.title || 'Previous Chat'}". Opening chat...`;
      setAiResponse(restoredMsg);
      setVoiceState('idle');
      isSubmittingRef.current = false;
      stopSpeaking();

      // Open the Chat screen with the restored conversation
      navigate('chat', { conversationId: fullConv._id });
    } catch (err) {
      console.error('[VoxScreen Last Chat Error]:', err);
      const errMsg = 'Unable to retrieve your last conversation. Please ensure the backend is running.';
      setErrorMessage(errMsg);
      setVoiceState('idle');
      isSubmittingRef.current = false;
    }
  };

  /**
   * Quick Command 3: Next Up Task
   * Retrieves the next upcoming pending task based on canonical sorting:
   * Overdue tasks first (oldest overdue first), earliest pending next, undated last.
   */
  const handleNextUpTaskCommand = async () => {
    try {
      setVoiceState('processing');
      setErrorMessage(null);

      const data = await getTasks({ status: 'pending', limit: 100 });
      const pendingTasks = (data.tasks || []).filter((t) => !t.completed);

      if (pendingTasks.length === 0) {
        const noTaskMsg = "You don't have any pending tasks right now. Great job!";
        setAiResponse(noTaskMsg);
        setVoiceHistory((prev) => [
          ...prev,
          { sender: 'user', text: 'Next Up Task' },
          { sender: 'assistant', text: noTaskMsg },
        ]);
        setVoiceState('responding');
        await speakAssistantResponse(noTaskMsg, {
          onDone: () => {
            setVoiceState('idle');
            isSubmittingRef.current = false;
          },
          onError: () => {
            setVoiceState('idle');
            isSubmittingRef.current = false;
          },
        });
        return;
      }

      const nowMs = Date.now();
      const getTaskTime = (t) => {
        const timeVal = t.dueDate || t.reminderTime;
        if (!timeVal) return Infinity;
        const ms = new Date(timeVal).getTime();
        return isNaN(ms) ? Infinity : ms;
      };

      // Canonical sorting: Overdue (oldest overdue first), earliest pending next, undated last
      const sorted = [...pendingTasks].sort((a, b) => {
        const timeA = getTaskTime(a);
        const timeB = getTaskTime(b);
        const hasA = timeA !== Infinity ? 0 : 1;
        const hasB = timeB !== Infinity ? 0 : 1;
        if (hasA !== hasB) return hasA - hasB;
        if (timeA !== timeB) return timeA - timeB;
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      });

      const nextTask = sorted[0];
      const taskTime = getTaskTime(nextTask);
      let responseText = '';

      if (taskTime === Infinity) {
        responseText = `Your next up task is "${nextTask.title}" (${nextTask.category || 'Other'}), with no specific due date set.`;
      } else if (taskTime < nowMs) {
        const timeStr = nextTask.dueTimeText || new Date(taskTime).toLocaleDateString();
        responseText = `Your next up task is overdue: "${nextTask.title}" was due at ${timeStr} (${nextTask.category || 'Other'}).`;
      } else {
        const timeStr = nextTask.dueTimeText || new Date(taskTime).toLocaleDateString();
        responseText = `Your next up task is "${nextTask.title}", due at ${timeStr} (${nextTask.category || 'Other'}).`;
      }

      setAiResponse(responseText);
      setVoiceHistory((prev) => [
        ...prev,
        { sender: 'user', text: 'Next Up Task' },
        { sender: 'assistant', text: responseText },
      ]);

      setVoiceState('responding');
      await speakAssistantResponse(responseText, {
        onDone: () => {
          setVoiceState('idle');
          isSubmittingRef.current = false;
        },
        onError: () => {
          setVoiceState('idle');
          isSubmittingRef.current = false;
        },
      });
    } catch (err) {
      console.error('[VoxScreen Next Up Task Error]:', err);
      const errMsg = 'Unable to retrieve your next upcoming task. Please ensure the backend is running.';
      setErrorMessage(errMsg);
      setVoiceState('idle');
      isSubmittingRef.current = false;
    }
  };

  /**
   * Process recognized speech or text prompt through backend /api/chat.
   */
  const processVoiceInput = async (spokenQuery) => {
    const trimmed = spokenQuery ? spokenQuery.trim() : '';
    if (!trimmed) {
      setVoiceState('idle');
      isSubmittingRef.current = false;
      return;
    }

    // Check if voice query matches any of the 3 quick voice commands
    const normalized = trimmed.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

    if (
      normalized === 'tasks today' ||
      normalized === 'task today' ||
      normalized === 'what are my tasks today' ||
      normalized === 'my tasks today' ||
      normalized === 'show tasks today' ||
      normalized === 'upcoming tasks today'
    ) {
      handleTasksTodayCommand();
      return;
    }

    if (
      normalized === 'last chat' ||
      normalized === 'open last chat' ||
      normalized === 'restore last chat' ||
      normalized === 'previous chat' ||
      normalized === 'show last chat'
    ) {
      handleLastChatCommand();
      return;
    }

    if (
      normalized === 'next up task' ||
      normalized === 'next task' ||
      normalized === 'what is my next task' ||
      normalized === 'next upcoming task' ||
      normalized === 'show next task'
    ) {
      handleNextUpTaskCommand();
      return;
    }

    setVoiceState('processing');
    setErrorMessage(null);

    const userMessage = { sender: 'user', text: trimmed };
    const updatedHistory = [...voiceHistory, userMessage];
    setVoiceHistory(updatedHistory);

    try {
      const result = await sendChatMessage(trimmed, voiceHistory);
      const assistantText = result.reply || 'I have completed your request.';
      setAiResponse(assistantText);

      // Handle any scheduled reminders or cancelled tasks
      if (Array.isArray(result.executedOperations)) {
        let hasTaskOp = false;
        for (const op of result.executedOperations) {
          if (
            op.operation === 'create_task' ||
            op.operation === 'complete_task' ||
            op.operation === 'cancel_task' ||
            op.operation === 'reschedule_task'
          ) {
            hasTaskOp = true;
          }

          if (op.operation === 'create_task' && op.task?.hasReminder && op.task?.reminderTime) {
            scheduleLocalReminder({
              taskId: op.task._id,
              title: op.task.title,
              body: op.task.description || `Task due at ${op.task.dueTimeText || 'scheduled time'}`,
              triggerDate: op.task.reminderTime,
              category: op.task.category || 'Other',
            }).catch((e) => console.warn('[VoxScreen Reminder Schedule Error]:', e));
          } else if (op.operation === 'reschedule_task') {
            if (op.task?.hasReminder && op.task?.reminderTime) {
              scheduleLocalReminder({
                taskId: op.task._id,
                title: op.task.title,
                body: op.task.description || `Task due at ${op.task.dueTimeText || 'scheduled time'}`,
                triggerDate: op.task.reminderTime,
                category: op.task.category || 'Other',
              }).catch((e) => console.warn('[VoxScreen Reschedule Notification Error]:', e));
            } else if (op.task?.notificationId) {
              cancelLocalReminder(op.task.notificationId).catch(() => {});
            }
          } else if ((op.operation === 'cancel_task' || op.operation === 'complete_task') && op.task?.notificationId) {
            cancelLocalReminder(op.task.notificationId).catch((e) =>
              console.warn('[VoxScreen Cancel Notification Error]:', e)
            );
          }
        }

        if (hasTaskOp) {
          notifyTasksUpdated();
        }
      }

      const assistantMessage = { sender: 'assistant', text: assistantText };
      setVoiceHistory([...updatedHistory, assistantMessage]);

      // Speak assistant response aloud
      setVoiceState('responding');
      await speakAssistantResponse(assistantText, {
        onDone: () => {
          setVoiceState('idle');
          isSubmittingRef.current = false;
        },
        onError: () => {
          setVoiceState('idle');
          isSubmittingRef.current = false;
        },
      });
    } catch (err) {
      console.error('[VoxScreen Chat Error]:', err);
      const errMsg = err.message || 'Unable to connect to Vox AI assistant.';
      setErrorMessage(errMsg);
      setVoiceState('idle');
      isSubmittingRef.current = false;
    }
  };

  /**
   * Central Orb button interaction.
   */
  const handleOrbPress = async () => {
    if (voiceState === 'responding') {
      await stopSpeaking();
      setVoiceState('idle');
      return;
    }

    if (voiceState === 'listening') {
      // Tap while listening stops and auto-submits current speech if available
      if (latestTranscriptRef.current.trim()) {
        handleAutoSubmit(latestTranscriptRef.current.trim());
      } else {
        handleCancelListening();
      }
      return;
    }

    if (voiceState === 'processing') {
      // Busy processing, ignore tap
      return;
    }

    startVoiceSession();
  };

  const getStatusText = () => {
    switch (voiceState) {
      case 'permission':
        return 'Requesting microphone permission...';
      case 'listening':
        return 'Listening... Speak naturally';
      case 'processing':
        return 'Vox is thinking...';
      case 'responding':
        return 'Responding... (Tap orb to stop)';
      case 'idle':
      default:
        return 'Tap orb or mic to speak';
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.chatButton}
          onPress={() => {
            stopSpeaking();
            navigate('chat');
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={18} color="#ff4d3a" />
          <Text style={styles.chatButtonText}>Chat</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Vox AI</Text>

        {voiceState === 'responding' ? (
          <TouchableOpacity
            style={styles.stopButton}
            onPress={async () => {
              await stopSpeaking();
              setVoiceState('idle');
            }}
          >
            <Ionicons name="volume-mute-outline" size={18} color="#f87171" />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {/* Error Banner */}
      {errorMessage && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={16} color="#fca5a5" />
          <Text style={styles.errorText} numberOfLines={2}>
            {errorMessage}
          </Text>
          <TouchableOpacity onPress={() => setErrorMessage(null)}>
            <Ionicons name="close-circle" size={16} color="#9ca3af" />
          </TouchableOpacity>
        </View>
      )}

      {/* Unsupported Native Module Notice (Expo Go Info) */}
      {unsupportedNotice && (
        <View style={styles.noticeBanner}>
          <Ionicons name="information-circle-outline" size={16} color="#60a5fa" />
          <Text style={styles.noticeText}>{unsupportedNotice}</Text>
          <TouchableOpacity onPress={() => setUnsupportedNotice(null)}>
            <Ionicons name="close-circle" size={16} color="#9ca3af" />
          </TouchableOpacity>
        </View>
      )}

      {/* Main Voice Center Visualization */}
      <View style={styles.centerContainer}>
        <TouchableOpacity
          style={styles.ringsContainer}
          onPress={handleOrbPress}
          activeOpacity={0.88}
        >
          {/* Outermost Soundwave Ring */}
          <Animated.View
            style={[
              styles.ring,
              styles.outerRing,
              voiceState === 'listening' && styles.ringActive,
              {
                transform: [{ scale: pulseAnim }],
                opacity: pulseOpacity,
              },
            ]}
          />

          {/* Middle Soundwave Ring */}
          <Animated.View
            style={[
              styles.ring,
              styles.middleRing,
              voiceState === 'listening' && styles.ringActive,
              {
                transform: [{ scale: innerPulse }],
                opacity: pulseOpacity,
              },
            ]}
          />

          {/* Inner Soundwave Ring */}
          <Animated.View
            style={[
              styles.ring,
              styles.innerRing,
              voiceState === 'listening' && styles.ringActive,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />

          {/* Core Orb Center */}
          <View
            style={[
              styles.coreOrb,
              voiceState === 'permission' && styles.coreOrbPermission,
              voiceState === 'listening' && styles.coreOrbListening,
              voiceState === 'responding' && styles.coreOrbSpeaking,
            ]}
          >
            {voiceState === 'processing' || voiceState === 'permission' ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Ionicons
                name={
                  voiceState === 'listening'
                    ? 'mic'
                    : voiceState === 'responding'
                    ? 'volume-high'
                    : 'sparkles'
                }
                size={30}
                color={voiceState === 'listening' ? '#ffffff' : colors.voxGlow}
              />
            )}
          </View>
        </TouchableOpacity>

        {/* State Label & Live Transcript */}
        <View style={styles.statusSection}>
          <View style={styles.stateBadge}>
            <Animated.View
              style={[
                styles.glowingDot,
                voiceState === 'permission' && styles.glowingDotPermission,
                voiceState === 'listening' && styles.glowingDotListening,
                voiceState === 'responding' && styles.glowingDotSpeaking,
                { opacity: dotPulse },
              ]}
            />
            <Text style={styles.statusLabel}>{getStatusText()}</Text>
          </View>

          {/* Listening Cancel Control */}
          {voiceState === 'listening' && (
            <TouchableOpacity
              style={styles.cancelListeningBtn}
              onPress={handleCancelListening}
              activeOpacity={0.8}
            >
              <Ionicons name="close-circle-outline" size={15} color="#ef4444" />
              <Text style={styles.cancelListeningText}>Cancel Voice</Text>
            </TouchableOpacity>
          )}

          {/* Live Recognized Speech Transcript */}
          {recognizedText ? (
            <View style={styles.liveTranscriptBox}>
              <Text style={styles.liveTranscriptText}>"{recognizedText}"</Text>
            </View>
          ) : null}

          {/* AI Response Card */}
          {aiResponse ? (
            <ScrollView style={styles.responseScroll} contentContainerStyle={styles.responseContainer}>
              <Text style={styles.responseText}>{aiResponse}</Text>
            </ScrollView>
          ) : null}
        </View>

        {/* Optional Manual Text Input Accordion (Never auto-focuses) */}
        <View style={styles.manualInputSection}>
          <TouchableOpacity
            style={styles.manualInputToggle}
            onPress={() => setShowManualInput(!showManualInput)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={showManualInput ? 'chevron-down' : 'keypad-outline'}
              size={15}
              color="#9ca3af"
            />
            <Text style={styles.manualInputToggleText}>
              {showManualInput ? 'Hide text input' : 'Type a message instead'}
            </Text>
          </TouchableOpacity>

          {showManualInput && (
            <View style={styles.manualInputRow}>
              <TextInput
                style={styles.manualInputField}
                placeholder="Type a request (e.g. Remind me tomorrow at 9am)"
                placeholderTextColor="#6b7280"
                value={manualInputText}
                onChangeText={setManualInputText}
                autoFocus={false}
                onSubmitEditing={() => {
                  if (manualInputText.trim()) {
                    processVoiceInput(manualInputText);
                    setManualInputText('');
                  }
                }}
              />
              <TouchableOpacity
                style={[
                  styles.manualSendButton,
                  !manualInputText.trim() && styles.manualSendDisabled,
                ]}
                onPress={() => {
                  if (manualInputText.trim()) {
                    processVoiceInput(manualInputText);
                    setManualInputText('');
                  }
                }}
                disabled={!manualInputText.trim()}
              >
                <Ionicons name="arrow-up" size={18} color="#ffffff" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Quick Voice Commands */}
      <View style={styles.quickPromptsSection}>
        <Text style={styles.quickPromptsTitle}>Quick Voice Commands</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickPromptsList}
        >
          <TouchableOpacity
            style={styles.promptChip}
            onPress={handleTasksTodayCommand}
            activeOpacity={0.7}
          >
            <Ionicons name="checkbox-outline" size={14} color="#ff6b5b" />
            <Text style={styles.promptChipText}>Tasks Today</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.promptChip}
            onPress={handleLastChatCommand}
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubbles-outline" size={14} color="#ff6b5b" />
            <Text style={styles.promptChipText}>Last Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.promptChip}
            onPress={handleNextUpTaskCommand}
            activeOpacity={0.7}
          >
            <Ionicons name="time-outline" size={14} color="#ff6b5b" />
            <Text style={styles.promptChipText}>Next Up Task</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
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
  stopButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.8,
  },
  headerSpacer: {
    width: 60,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(239, 68, 68, 0.3)',
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: '#fca5a5',
    fontSize: 12,
    lineHeight: 16,
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(59, 130, 246, 0.3)',
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
    gap: 8,
  },
  noticeText: {
    flex: 1,
    color: '#93c5fd',
    fontSize: 12,
    lineHeight: 16,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  ringsContainer: {
    width: 250,
    height: 250,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  ring: {
    position: 'absolute',
    borderRadius: 999,
  },
  outerRing: {
    width: 240,
    height: 240,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 77, 58, 0.20)',
  },
  middleRing: {
    width: 180,
    height: 180,
    borderWidth: 2,
    borderColor: 'rgba(255, 77, 58, 0.40)',
  },
  innerRing: {
    width: 125,
    height: 125,
    borderWidth: 2.5,
    borderColor: 'rgba(255, 77, 58, 0.75)',
    shadowColor: colors.voxGlow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 8,
  },
  ringActive: {
    borderColor: '#ff4d3a',
  },
  coreOrb: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255, 77, 58, 0.14)',
    borderWidth: 1.8,
    borderColor: 'rgba(255, 77, 58, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coreOrbPermission: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderColor: '#f59e0b',
  },
  coreOrbListening: {
    backgroundColor: '#ff4d3a',
    borderColor: '#ffffff',
  },
  coreOrbSpeaking: {
    backgroundColor: 'rgba(52, 211, 153, 0.2)',
    borderColor: '#34d399',
  },
  statusSection: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: spacing.md,
  },
  stateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  statusLabel: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
  },
  glowingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#ff4d3a',
  },
  glowingDotPermission: {
    backgroundColor: '#f59e0b',
  },
  glowingDotListening: {
    backgroundColor: '#ef4444',
  },
  glowingDotSpeaking: {
    backgroundColor: '#34d399',
  },
  cancelListeningBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginBottom: 8,
  },
  cancelListeningText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '500',
  },
  liveTranscriptBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 8,
    maxWidth: '90%',
  },
  liveTranscriptText: {
    color: '#ff8a7a',
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  responseScroll: {
    maxHeight: 110,
    width: '100%',
  },
  responseContainer: {
    backgroundColor: 'rgba(255, 77, 58, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 58, 0.22)',
    borderRadius: radii.lg,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  responseText: {
    color: '#f3f4f6',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  manualInputSection: {
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
  },
  manualInputToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  manualInputToggleText: {
    color: '#9ca3af',
    fontSize: 12,
  },
  manualInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151922',
    borderRadius: radii.full,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 58, 0.35)',
    width: '92%',
    marginTop: 6,
    gap: 8,
  },
  manualInputField: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
  },
  manualSendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ff4d3a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  manualSendDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  quickPromptsSection: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  quickPromptsTitle: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: spacing.lg,
    marginBottom: 8,
  },
  quickPromptsList: {
    paddingHorizontal: spacing.lg,
    gap: 8,
  },
  promptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  promptChipText: {
    color: '#d1d5db',
    fontSize: 12,
  },
});
