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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radii } from '../theme/spacing';
import { useNavigation } from '../navigation/NavigationContext';
import {
  mockInitialMessages,
  mockSuggestedPrompts,
  mockAiReplies,
} from '../data/mockData';

export const ChatScreen = () => {
  const { navigate } = useNavigation();
  const [messages, setMessages] = useState(mockInitialMessages);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
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
    }, 800);
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'msg-welcome',
        sender: 'assistant',
        text: 'Chat history cleared. How can I assist you with your schedule or tasks?',
        timestamp: formatCurrentTime(),
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
    >
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

        <Text style={styles.headerTitle}>Chat History</Text>

        <TouchableOpacity
          style={styles.clearButton}
          onPress={clearChat}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={18} color="#9ca3af" />
        </TouchableOpacity>
      </View>

      {/* Suggested Quick Prompts */}
      <View style={styles.quickPromptsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickPromptsList}
        >
          {mockSuggestedPrompts.map((prompt, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.promptChip}
              onPress={() => handleSendMessage(prompt)}
              activeOpacity={0.7}
            >
              <Text style={styles.promptChipText}>{prompt}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Messages Scroll Area */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messageList}
        contentContainerStyle={styles.messageContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((item) => {
          const isUser = item.sender === 'user';
          return (
            <View
              key={item.id}
              style={[
                styles.bubbleWrapper,
                isUser ? styles.bubbleUserWrapper : styles.bubbleAiWrapper,
              ]}
            >
              {!isUser && (
                <View style={styles.aiAvatar}>
                  <Ionicons name="sparkles" size={12} color="#ff6b5b" />
                </View>
              )}

              <View
                style={[
                  styles.bubble,
                  isUser ? styles.bubbleUser : styles.bubbleAi,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    isUser ? styles.messageTextUser : styles.messageTextAi,
                  ]}
                >
                  {item.text}
                </Text>
                <Text style={styles.timestamp}>{item.timestamp}</Text>
              </View>
            </View>
          );
        })}

        {isThinking && (
          <View style={[styles.bubbleWrapper, styles.bubbleAiWrapper]}>
            <View style={styles.aiAvatar}>
              <Ionicons name="sparkles" size={12} color="#ff6b5b" />
            </View>
            <View style={[styles.bubble, styles.bubbleAi, styles.thinkingBubble]}>
              <Text style={styles.thinkingText}>Vox AI is thinking...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input Bar */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="Ask Vox anything..."
          placeholderTextColor="#6b7280"
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={() => handleSendMessage()}
          returnKeyType="send"
        />

        <TouchableOpacity
          style={styles.sendButton}
          onPress={() => handleSendMessage()}
          disabled={!inputText.trim() || isThinking}
          activeOpacity={0.7}
        >
          <Ionicons
            name="arrow-up"
            size={20}
            color={inputText.trim() ? '#ffffff' : '#6b7280'}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  clearButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickPromptsWrapper: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  quickPromptsList: {
    paddingHorizontal: spacing.lg,
    gap: 8,
  },
  promptChip: {
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
  messageList: {
    flex: 1,
  },
  messageContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: 12,
  },
  bubbleWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  bubbleUserWrapper: {
    justifyContent: 'flex-end',
  },
  bubbleAiWrapper: {
    justifyContent: 'flex-start',
  },
  aiAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 77, 58, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 58, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleUser: {
    backgroundColor: '#ff4d3a',
    borderBottomRightRadius: 4,
  },
  bubbleAi: {
    backgroundColor: '#161922',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageTextUser: {
    color: '#ffffff',
  },
  messageTextAi: {
    color: '#f3f4f6',
  },
  timestamp: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  thinkingBubble: {
    paddingVertical: 12,
  },
  thinkingText: {
    color: '#9ca3af',
    fontSize: 13,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 4,
    backgroundColor: '#0a0d14',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    gap: 10,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#151922',
    borderRadius: radii.full,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    color: '#ffffff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ff4d3a',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
