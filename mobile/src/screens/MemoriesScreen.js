import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radii } from '../theme/spacing';
import { Header } from '../components/Header';
import { MemoryCard } from '../components/MemoryCard';
import { mockMemories } from '../data/mockData';

const CATEGORIES = ['All', 'Preferences', 'Personal', 'Work', 'Health'];

export const MemoriesScreen = () => {
  const [memories, setMemories] = useState(mockMemories);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [isModalVisible, setIsModalVisible] = useState(false);

  // New memory modal fields
  const [newTitle, setNewTitle] = useState('');
  const [newDetail, setNewDetail] = useState('');
  const [newCategory, setNewCategory] = useState('Preferences');

  const filteredMemories = memories.filter((memory) => {
    const matchesCategory =
      activeCategory === 'All' || memory.category === activeCategory;

    const query = searchQuery.toLowerCase().trim();
    if (!query) return matchesCategory;

    const matchesSearch =
      memory.title.toLowerCase().includes(query) ||
      (memory.detail && memory.detail.toLowerCase().includes(query)) ||
      (memory.tags && memory.tags.some((t) => t.toLowerCase().includes(query)));

    return matchesCategory && matchesSearch;
  });

  const handleAddMemory = () => {
    if (!newTitle.trim()) return;

    const newMem = {
      id: `mem-${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory,
      storedDate: 'Just now',
      importance: 'Medium',
      detail: newDetail.trim() || 'Recorded from mobile assistant memories screen.',
      tags: [newCategory.toLowerCase()],
    };

    setMemories([newMem, ...memories]);
    setNewTitle('');
    setNewDetail('');
    setIsModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <Header
        subtitle="Knowledge Base"
        title="Personal Memory"
        rightAction="add"
        onRightActionPress={() => setIsModalVisible(true)}
      />

      {/* Search Input Bar */}
      <View style={styles.searchBarWrapper}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search preferences, habits, facts..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Pills */}
      <View style={styles.categoriesWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        >
          {CATEGORIES.map((category) => {
            const isActive = activeCategory === category;
            return (
              <TouchableOpacity
                key={category}
                style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                onPress={() => setActiveCategory(category)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    isActive && styles.categoryChipTextActive,
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Privacy Guarantee Note */}
      <View style={styles.privacyBanner}>
        <Ionicons name="shield-checkmark-outline" size={16} color={colors.success} />
        <Text style={styles.privacyText}>
          Mock memory only. Future milestone will store encrypted in MongoDB via backend.
        </Text>
      </View>

      {/* Memory Cards List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {filteredMemories.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No memories match your search</Text>
            <Text style={styles.emptySubtitle}>
              Try a different keyword or tap + to teach Aura something new.
            </Text>
          </View>
        ) : (
          filteredMemories.map((memory) => (
            <MemoryCard key={memory.id} memory={memory} />
          ))
        )}
      </ScrollView>

      {/* Add Memory Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Teach Aura a Memory</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Memory Title / Fact</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g., Prefers green tea over matcha"
              placeholderTextColor={colors.textMuted}
              value={newTitle}
              onChangeText={setNewTitle}
              autoFocus
            />

            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.optionsRow}>
              {['Preferences', 'Personal', 'Work', 'Health'].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.optionChip, newCategory === cat && styles.optionChipActive]}
                  onPress={() => setNewCategory(cat)}
                >
                  <Text
                    style={[
                      styles.optionChipText,
                      newCategory === cat && styles.optionChipTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Context Details (Optional)</Text>
            <TextInput
              style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
              placeholder="Additional background context to help the assistant understand..."
              placeholderTextColor={colors.textMuted}
              value={newDetail}
              onChangeText={setNewDetail}
              multiline
            />

            <TouchableOpacity
              style={[styles.modalSubmitButton, !newTitle.trim() && { opacity: 0.5 }]}
              onPress={handleAddMemory}
              disabled={!newTitle.trim()}
              activeOpacity={0.8}
            >
              <Text style={styles.modalSubmitText}>Save to Memory</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchBarWrapper: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.md,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.textPrimary,
  },
  categoriesWrapper: {
    paddingVertical: spacing.sm,
  },
  categoriesContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  categoryChipText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  categoryChipTextActive: {
    color: '#000000',
    fontWeight: typography.weights.bold,
  },
  privacyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  privacyText: {
    fontSize: typography.sizes.xs - 1,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 15,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  fieldLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  modalInput: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    color: colors.textPrimary,
    fontSize: typography.sizes.base,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  optionChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  optionChipText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  optionChipTextActive: {
    color: '#000000',
    fontWeight: typography.weights.bold,
  },
  modalSubmitButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  modalSubmitText: {
    color: '#000000',
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
  },
});
