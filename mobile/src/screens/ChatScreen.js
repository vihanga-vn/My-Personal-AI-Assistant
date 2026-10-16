import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radii } from '../theme/spacing';
import { Header } from '../components/Header';
import { ChatBubble } from '../components/ChatBubble';
import {
  mockInitialMessages,
  mockSuggestedPrompts,
  mockAiReplies,
  mockUser,
} from '../data/mockData';

export const ChatScreen = () => {
  const [messages, setMessages] = useState(mockInitialMessages);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const scrollViewRef = useRef(null);

  const formatCurrentTime = () => {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
  };

  const handleSendMessage = (textToSend = inputText) => {
    const trimmed = textToSend.trim();
    if (!trimmed || isThinking) return;

    const userMsg = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: trimmed,
      timestamp: formatCurrentTime(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsThinking(true);

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    // Simulate AI response using contextual mock pool
    setTimeout(() => {
      const replyIndex = Math.floor(Math.random() * mockAiReplies.length);
      const assistantMsg = {
        id: `msg-${Date.now() + 1}`,
        sender: 'assistant',
        text: mockAiReplies[replyIndex],
        timestamp: formatCurrentTime(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setIsThinking(false);

      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }, 900);
  };

  const toggleMicrophone = () => {
    if (!isListening) {
      setIsListening(true);
      // Simulate speech-to-text recognition after 2.5s
      setTimeout(() => {
        setIsListening(false);
        setInputText('Set a reminder to review project milestone at 5 PM');
      }, 2500);
    } else {
      setIsListening(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: `msg-${Date.now()}`,
        sender: 'assistant',
        text: `Chat reset. I am ready to assist you, ${mockUser.name}!`,
        timestamp: formatCurrentTime(),
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <Header
        subtitle="AI Companion"
        title="Chat with Aura"
        rightAction="trash-outline"
        onRightActionPress={clearChat}
      />

      {/* Suggestion Prompts Carousel */}
      <View style={styles.suggestionsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.suggestionsContainer}
        >
          {mockSuggestedPrompts.map((prompt, index) => (
            <TouchableOpacity
              key={index}
              style={styles.suggestionChip}
              onPress={() => handleSendMessage(prompt)}
              activeOpacity={0.7}
            >
              <Ionicons name="sparkles" size={12} color={colors.accent} style={{ marginRight: 6 }} />
              <Text style={styles.suggestionText}>{prompt}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Messages Scroll Area */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((message) => (
          <ChatBubble key={message.id} message={message} />
        ))}

        {isThinking && (
          <View style={styles.thinkingContainer}>
            <View style={styles.thinkingBubble}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={styles.thinkingText}>Aura is composing response...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Voice Listening Active Banner */}
      {isListening && (
        <View style={styles.listeningBanner}>
          <View style={styles.pulsingRedDot} />
          <Text style={styles.listeningText}>
            Listening... Speak now (Simulating Speech-to-Text)
          </Text>
          <TouchableOpacity onPress={() => setIsListening(false)}>
            <Ionicons name="close-circle" size={18} color={colors.danger} />
          </TouchableOpacity>
        </View>
      )}

      {/* Input Action Bar */}
      <View style={styles.inputBar}>
        {/* Voice Input Button */}
        <TouchableOpacity
          style={[styles.micButton, isListening && styles.micButtonActive]}
          onPress={toggleMicrophone}
          activeOpacity={0.7}
          accessibilityLabel="Voice Input"
          accessibilityRole="button"
        >
          <Ionicons
            name={isListening ? 'mic' : 'mic-outline'}
            size={22}
            color={isListening ? '#ffffff' : colors.textSecondary}
          />
        </TouchableOpacity>

        {/* Text Input Field */}
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            placeholder="Ask Aura anything..."
            placeholderTextColor={colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={() => handleSendMessage()}
          />
        </View>

        {/* Send Button */}
        <TouchableOpacity
          style={[
            styles.sendButton,
            !inputText.trim() && !isThinking ? styles.sendButtonDisabled : styles.sendButtonActive,
          ]}
          onPress={() => handleSendMessage()}
          disabled={!inputText.trim() || isThinking}
          activeOpacity={0.8}
          accessibilityLabel="Send Message"
          accessibilityRole="button"
        >
          <Ionicons
            name="send"
            size={18}
            color={inputText.trim() ? '#ffffff' : colors.textMuted}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  suggestionsWrapper: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  suggestionsContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  suggestionText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  thinkingContainer: {
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  thinkingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.assistantBubble,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.xl,
    borderBottomLeftRadius: radii.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thinkingText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  listeningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerLight,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.danger,
    gap: spacing.sm,
  },
  pulsingRedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },
  listeningText: {
    flex: 1,
    fontSize: typography.sizes.xs,
    color: colors.danger,
    fontWeight: typography.weights.medium,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  micButton: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceHighlight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micButtonActive: {
    backgroundColor: colors.danger,
  },
  inputWrapper: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    backgroundColor: colors.background,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  textInput: {
    fontSize: typography.sizes.base,
    color: colors.textPrimary,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: {
    backgroundColor: colors.primary,
  },
  sendButtonDisabled: {
    backgroundColor: colors.surfaceHighlight,
  },
});
