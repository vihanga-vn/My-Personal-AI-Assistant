import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radii } from '../theme/spacing';
import { useNavigation } from '../navigation/NavigationContext';
import { mockSuggestedPrompts } from '../data/mockData';
import { sendChatMessage } from '../services/chatService';
import {
  getConversations,
  getConversation,
  deleteConversation,
} from '../services/conversationService';
import { scheduleLocalReminder, cancelLocalReminder } from '../services/notificationService';
import { notifyTasksUpdated } from '../services/taskService';

export const ChatScreen = () => {
  const { navigate } = useNavigation();

  // Active Conversation State
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [conversationTitle, setConversationTitle] = useState('New Chat');
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [errorBanner, setErrorBanner] = useState(null);

  // History Modal State
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [conversationsList, setConversationsList] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState(null);

  const scrollViewRef = useRef(null);

  const formatCurrentTime = () => {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
  };

  /**
   * Fetch all saved conversations from MongoDB Atlas.
   */
  const fetchConversationsList = useCallback(async () => {
    setIsLoadingHistory(true);
    setHistoryError(null);
    try {
      const data = await getConversations({ limit: 50 });
      setConversationsList(data.conversations || []);
      return data.conversations || [];
    } catch (err) {
      console.error('[ChatScreen] Error fetching conversations list:', err);
      setHistoryError(err.message || 'Unable to load conversations.');
      return [];
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  /**
   * Load a specific conversation and restore its historical messages in order.
   */
  const loadConversation = async (conversationId) => {
    if (!conversationId) return;
    setIsLoadingMessages(true);
    setErrorBanner(null);
    try {
      const conv = await getConversation(conversationId);
      setActiveConversationId(conv._id);
      setConversationTitle(conv.title || 'Conversation');

      const restored = (conv.messages || []).map((m, idx) => ({
        id: m._id || `msg-${idx}-${Date.now()}`,
        sender: m.sender,
        text: m.text,
        timestamp: m.timestamp || formatCurrentTime(),
        model: m.model,
        isError: m.isError,
      }));

      setMessages(restored);
      setHistoryModalVisible(false);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      }, 100);
    } catch (err) {
      console.error('[ChatScreen] Error loading conversation:', err);
      setErrorBanner(err.message || 'Failed to load conversation.');
    } finally {
      setIsLoadingMessages(false);
    }
  };

  /**
   * Initialize: load the most recent conversation or start fresh.
   */
  useEffect(() => {
    let isMounted = true;
    const initializeChat = async () => {
      const list = await fetchConversationsList();
      if (isMounted && list.length > 0) {
        // Load the most recently active conversation
        loadConversation(list[0]._id);
      }
    };
    initializeChat();
    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Start a brand new conversation session.
   */
  const startNewChat = () => {
    setActiveConversationId(null);
    setConversationTitle('New Chat');
    setMessages([]);
    setErrorBanner(null);
    setInputText('');
    setHistoryModalVisible(false);
  };

  /**
   * Send user message to active conversation (or create new conversation).
   */
  const handleSendMessage = async (textToSend = inputText) => {
    const trimmed = textToSend.trim();
    if (!trimmed || isThinking) return;

    setErrorBanner(null);

    const userMsg = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: trimmed,
      timestamp: formatCurrentTime(),
    };

    // Sanitize context history for Gemini (excluding error messages)
    const contextHistory = messages.filter((m) => !m.isError);

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsThinking(true);

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      // Call backend POST /api/chat with the message, history, and activeConversationId
      const result = await sendChatMessage(trimmed, contextHistory, activeConversationId);

      const assistantMsg = {
        id: `msg-${Date.now() + 1}`,
        sender: 'assistant',
        text: result.reply,
        timestamp: formatCurrentTime(),
        model: result.model,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // If a new conversation was created on the backend, update activeConversationId
      if (result.conversationId && result.conversationId !== activeConversationId) {
        setActiveConversationId(result.conversationId);
      }
      if (result.conversationTitle) {
        setConversationTitle(result.conversationTitle);
      }

      // Check if any operation scheduled or cancelled local phone notifications
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
              body: op.task.description || `Due at ${op.task.dueTimeText || 'scheduled time'}`,
              triggerDate: op.task.reminderTime,
            }).catch((err) => console.warn('[ChatScreen Notification Error]:', err));
          } else if (op.operation === 'cancel_task' && op.task?.notificationId) {
            cancelLocalReminder(op.task.notificationId).catch((err) =>
              console.warn('[ChatScreen Cancel Notification Error]:', err)
            );
          }
        }

        if (hasTaskOp) {
          notifyTasksUpdated();
        }
      }
    } catch (err) {
      console.error('[ChatScreen] Error communicating with backend:', err);

      const errorMessageText = err.message || 'Unable to get response from Gemini.';
      setErrorBanner(errorMessageText);

      const errorNoticeMsg = {
        id: `msg-err-${Date.now()}`,
        sender: 'assistant',
        isError: true,
        text: err.isRateLimit
          ? `⏳ Rate Limit Reached: ${errorMessageText}`
          : `⚠️ Connection Issue: ${errorMessageText}`,
        timestamp: formatCurrentTime(),
      };

      setMessages((prev) => [...prev, errorNoticeMsg]);
    } finally {
      setIsThinking(false);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  /**
   * Delete a conversation from MongoDB Atlas.
   */
  const handleDeleteConversation = (idToDelete, title) => {
    Alert.alert(
      'Delete Conversation',
      `Are you sure you want to delete "${title || 'this conversation'}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteConversation(idToDelete);
              setConversationsList((prev) => prev.filter((c) => c._id !== idToDelete));

              // If deleted the currently active conversation, reset to new chat
              if (activeConversationId === idToDelete) {
                startNewChat();
              }
            } catch (err) {
              Alert.alert('Delete Failed', err.message || 'Could not delete conversation.');
            }
          },
        },
      ]
    );
  };

  /**
   * Clear current chat or delete active conversation.
   */
  const handleClearCurrentChat = () => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }

    Alert.alert(
      'Delete Chat',
      'Do you want to delete this saved conversation or start a new chat?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start New Chat',
          onPress: startNewChat,
        },
        {
          text: 'Delete Conversation',
          style: 'destructive',
          onPress: () => handleDeleteConversation(activeConversationId, conversationTitle),
        },
      ]
    );
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

        {/* Center Title and Status */}
        <TouchableOpacity
          style={styles.headerTitleContainer}
          onPress={() => {
            fetchConversationsList();
            setHistoryModalVisible(true);
          }}
          activeOpacity={0.8}
        >
          <View style={styles.titleRow}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {conversationTitle}
            </Text>
            <Ionicons name="chevron-down" size={14} color="#9ca3af" style={{ marginLeft: 4 }} />
          </View>
          <View style={styles.statusBadge}>
            <View style={styles.onlineDot} />
            <Text style={styles.statusText}>Gemini Live</Text>
          </View>
        </TouchableOpacity>

        {/* Header Right Actions */}
        <View style={styles.headerActions}>
          {/* History Button */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => {
              fetchConversationsList();
              setHistoryModalVisible(true);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="time-outline" size={20} color="#ff6b5b" />
          </TouchableOpacity>

          {/* New Chat Button */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={startNewChat}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={20} color="#9ca3af" />
          </TouchableOpacity>

          {/* Delete / Clear Button */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleClearCurrentChat}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={18} color="#9ca3af" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Dismissible Error Banner */}
      {errorBanner && (
        <View style={styles.errorBannerContainer}>
          <Ionicons name="alert-circle-outline" size={16} color="#f87171" />
          <Text style={styles.errorBannerText} numberOfLines={2}>
            {errorBanner}
          </Text>
          <TouchableOpacity
            onPress={() => setErrorBanner(null)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-outline" size={16} color="#9ca3af" />
          </TouchableOpacity>
        </View>
      )}

      {/* Loading Messages Spinner */}
      {isLoadingMessages ? (
        <View style={styles.loadingMessagesContainer}>
          <ActivityIndicator size="large" color="#ff4d3a" />
          <Text style={styles.loadingMessagesText}>Restoring conversation from MongoDB...</Text>
        </View>
      ) : (
        <>
          {/* Suggested Quick Prompts (Only shown if conversation is brand new) */}
          {messages.length === 0 && (
            <View style={styles.emptyWelcomeContainer}>
              <View style={styles.welcomeIconWrap}>
                <Ionicons name="sparkles" size={28} color="#ff6b5b" />
              </View>
              <Text style={styles.welcomeTitle}>Start a Conversation</Text>
              <Text style={styles.welcomeSubtitle}>
                Ask Vox AI anything, manage tasks, set reminders, or share facts to store in persistent memory.
              </Text>

              <View style={styles.quickPromptsWrapper}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.quickPromptsList}
                >
                  {mockSuggestedPrompts.map((prompt, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.promptChip, isThinking && styles.promptChipDisabled]}
                      onPress={() => handleSendMessage(prompt)}
                      disabled={isThinking}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.promptChipText}>{prompt}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          )}

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
              const isError = item.isError;

              return (
                <View
                  key={item.id}
                  style={[
                    styles.bubbleWrapper,
                    isUser ? styles.bubbleUserWrapper : styles.bubbleAiWrapper,
                  ]}
                >
                  {!isUser && (
                    <View
                      style={[
                        styles.aiAvatar,
                        isError && styles.aiAvatarError,
                      ]}
                    >
                      <Ionicons
                        name={isError ? 'alert' : 'sparkles'}
                        size={12}
                        color={isError ? '#f87171' : '#ff6b5b'}
                      />
                    </View>
                  )}

                  <View
                    style={[
                      styles.bubble,
                      isUser
                        ? styles.bubbleUser
                        : isError
                        ? styles.bubbleError
                        : styles.bubbleAi,
                    ]}
                  >
                    <Text
                      style={[
                        styles.messageText,
                        isUser
                          ? styles.messageTextUser
                          : isError
                          ? styles.messageTextError
                          : styles.messageTextAi,
                      ]}
                    >
                      {item.text}
                    </Text>
                    <View style={styles.bubbleFooter}>
                      {item.model && (
                        <Text style={styles.modelTag}>{item.model}</Text>
                      )}
                      <Text style={styles.timestamp}>{item.timestamp}</Text>
                    </View>
                  </View>
                </View>
              );
            })}

            {/* Live Loading Indicator */}
            {isThinking && (
              <View style={[styles.bubbleWrapper, styles.bubbleAiWrapper]}>
                <View style={styles.aiAvatar}>
                  <Ionicons name="sparkles" size={12} color="#ff6b5b" />
                </View>
                <View style={[styles.bubble, styles.bubbleAi, styles.thinkingBubble]}>
                  <ActivityIndicator size="small" color="#ff6b5b" style={styles.thinkingSpinner} />
                  <Text style={styles.thinkingText}>Vox is thinking...</Text>
                </View>
              </View>
            )}
          </ScrollView>
        </>
      )}

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
          editable={!isThinking}
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            (!inputText.trim() || isThinking) && styles.sendButtonDisabled,
          ]}
          onPress={() => handleSendMessage()}
          disabled={!inputText.trim() || isThinking}
          activeOpacity={0.7}
        >
          {isThinking ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Ionicons
              name="arrow-up"
              size={20}
              color={inputText.trim() ? '#ffffff' : '#6b7280'}
            />
          )}
        </TouchableOpacity>
      </View>

      {/* Saved Conversations History Modal */}
      <Modal
        visible={historyModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setHistoryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Chat History</Text>
                <Text style={styles.modalSubtitle}>Saved conversations in MongoDB Atlas</Text>
              </View>
              <TouchableOpacity
                onPress={() => setHistoryModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={20} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            {/* "+ New Chat" Action Button */}
            <TouchableOpacity
              style={styles.newChatButton}
              onPress={startNewChat}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle" size={18} color="#ffffff" />
              <Text style={styles.newChatButtonText}>+ Start New Conversation</Text>
            </TouchableOpacity>

            {/* History Content */}
            {isLoadingHistory ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="large" color="#ff4d3a" />
                <Text style={styles.modalLoadingText}>Loading conversation history...</Text>
              </View>
            ) : historyError ? (
              <View style={styles.modalErrorContainer}>
                <Ionicons name="alert-circle-outline" size={32} color="#f87171" />
                <Text style={styles.modalErrorTitle}>Connection Error</Text>
                <Text style={styles.modalErrorText}>{historyError}</Text>
                <TouchableOpacity
                  style={styles.modalRetryButton}
                  onPress={fetchConversationsList}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalRetryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : conversationsList.length === 0 ? (
              <View style={styles.modalEmptyContainer}>
                <Ionicons name="chatbubbles-outline" size={44} color="#ff6b5b" />
                <Text style={styles.modalEmptyTitle}>No saved chats yet</Text>
                <Text style={styles.modalEmptySubtitle}>
                  Your conversations with Vox AI will be safely saved in MongoDB Atlas.
                </Text>
              </View>
            ) : (
              <ScrollView
                style={styles.conversationsScroll}
                showsVerticalScrollIndicator={false}
              >
                {conversationsList.map((item) => {
                  const isActive = item._id === activeConversationId;
                  const dateStr = item.updatedAt
                    ? new Date(item.updatedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '';

                  return (
                    <TouchableOpacity
                      key={item._id}
                      style={[
                        styles.conversationCard,
                        isActive && styles.conversationCardActive,
                      ]}
                      onPress={() => loadConversation(item._id)}
                      activeOpacity={0.75}
                    >
                      <View style={styles.conversationCardContent}>
                        <View style={styles.conversationHeaderRow}>
                          <Text
                            style={[
                              styles.conversationItemTitle,
                              isActive && styles.conversationItemTitleActive,
                            ]}
                            numberOfLines={1}
                          >
                            {item.title || 'Untitled Conversation'}
                          </Text>
                          {isActive && (
                            <View style={styles.activePill}>
                              <Text style={styles.activePillText}>Active</Text>
                            </View>
                          )}
                        </View>

                        {item.lastMessage ? (
                          <Text style={styles.conversationSnippet} numberOfLines={2}>
                            {item.lastMessage}
                          </Text>
                        ) : null}

                        <View style={styles.conversationMetaRow}>
                          <Text style={styles.conversationDate}>{dateStr}</Text>
                          <View style={styles.messageCountBadge}>
                            <Ionicons name="chatbubble-outline" size={11} color="#9ca3af" />
                            <Text style={styles.messageCountText}>
                              {item.messageCount || 0}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Delete Conversation Button */}
                      <TouchableOpacity
                        style={styles.deleteConversationButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDeleteConversation(item._id, item.title);
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash-outline" size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
    paddingVertical: 6,
    paddingRight: 8,
  },
  backButtonText: {
    color: '#ff6b5b',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 2,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 180,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
    marginRight: 4,
  },
  statusText: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  errorBannerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(239, 68, 68, 0.3)',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  errorBannerText: {
    flex: 1,
    color: '#fca5a5',
    fontSize: 12,
    marginLeft: 8,
  },
  loadingMessagesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingMessagesText: {
    color: '#9ca3af',
    fontSize: 13,
    marginTop: 12,
  },
  emptyWelcomeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: 36,
  },
  welcomeIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 77, 58, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 58, 0.3)',
  },
  welcomeTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  welcomeSubtitle: {
    color: '#9ca3af',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  quickPromptsWrapper: {
    width: '100%',
    paddingVertical: 4,
  },
  quickPromptsList: {
    paddingHorizontal: spacing.md,
    gap: 8,
  },
  promptChip: {
    backgroundColor: '#121620',
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 58, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.full,
  },
  promptChipDisabled: {
    opacity: 0.5,
  },
  promptChipText: {
    color: '#ff6b5b',
    fontSize: 12,
    fontWeight: '500',
  },
  messageList: {
    flex: 1,
  },
  messageContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
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
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 58, 0.3)',
    marginBottom: 4,
  },
  aiAvatarError: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#ef4444',
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
    backgroundColor: '#151922',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderBottomLeftRadius: 4,
  },
  bubbleError: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageTextUser: {
    color: '#ffffff',
  },
  messageTextAi: {
    color: '#e5e7eb',
  },
  messageTextError: {
    color: '#fca5a5',
  },
  bubbleFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  modelTag: {
    color: '#6b7280',
    fontSize: 9,
    textTransform: 'uppercase',
  },
  timestamp: {
    color: '#9ca3af',
    fontSize: 10,
  },
  thinkingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  thinkingSpinner: {
    marginRight: 8,
  },
  thinkingText: {
    color: '#9ca3af',
    fontSize: 13,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#07090e',
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#121620',
    color: '#ffffff',
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ff4d3a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#1f2937',
  },

  /* History Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0a0d14',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    height: '75%',
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  modalSubtitle: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 2,
  },
  modalCloseButton: {
    padding: 6,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff4d3a',
    borderRadius: radii.md,
    paddingVertical: 11,
    marginBottom: spacing.md,
    gap: 8,
  },
  newChatButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalLoadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalLoadingText: {
    color: '#9ca3af',
    fontSize: 13,
    marginTop: 12,
  },
  modalErrorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalErrorTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
  },
  modalErrorText: {
    color: '#f87171',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  modalRetryButton: {
    backgroundColor: 'rgba(255, 77, 58, 0.2)',
    borderColor: '#ff4d3a',
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: radii.sm,
  },
  modalRetryText: {
    color: '#ff4d3a',
    fontWeight: '600',
  },
  modalEmptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  modalEmptyTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  modalEmptySubtitle: {
    color: '#9ca3af',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  conversationsScroll: {
    flex: 1,
  },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121620',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: radii.md,
    padding: 12,
    marginBottom: 8,
  },
  conversationCardActive: {
    borderColor: '#ff4d3a',
    backgroundColor: 'rgba(255, 77, 58, 0.08)',
  },
  conversationCardContent: {
    flex: 1,
    paddingRight: 8,
  },
  conversationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  conversationItemTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  conversationItemTitleActive: {
    color: '#ff6b5b',
  },
  activePill: {
    backgroundColor: 'rgba(255, 77, 58, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  activePillText: {
    color: '#ff6b5b',
    fontSize: 10,
    fontWeight: '700',
  },
  conversationSnippet: {
    color: '#9ca3af',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 6,
  },
  conversationMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  conversationDate: {
    color: '#6b7280',
    fontSize: 11,
  },
  messageCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  messageCountText: {
    color: '#9ca3af',
    fontSize: 11,
  },
  deleteConversationButton: {
    padding: 8,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
});
