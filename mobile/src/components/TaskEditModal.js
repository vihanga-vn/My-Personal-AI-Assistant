import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radii } from '../theme/spacing';
import {
  TASK_CATEGORIES,
  getCategoryDetails,
} from '../config/categories';
import { updateTask } from '../services/taskService';
import {
  scheduleLocalReminder,
  cancelLocalReminderForTask,
} from '../services/notificationService';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function getMaxDays(year, month) {
  if (month === 1 && isLeapYear(year)) return 29;
  return DAYS_IN_MONTH[month] || 31;
}

export const TaskEditModal = ({ visible, task, onClose, onTaskUpdated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Other');
  const [hasReminder, setHasReminder] = useState(false);

  // Custom Date state
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth()); // 0-11
  const [day, setDay] = useState(new Date().getDate());

  // Custom Time state
  const [hour12, setHour12] = useState(9); // 1-12
  const [minute, setMinute] = useState(0); // 0-59
  const [isPm, setIsPm] = useState(false);

  // Status
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Populate initial state from task when opened
  useEffect(() => {
    if (!task) return;

    setTitle(task.title || '');
    setDescription(task.description || '');
    setCategory(task.category || 'Other');
    setHasReminder(Boolean(task.hasReminder));
    setErrorMsg(null);
    setSuccessMsg(null);

    // Initial date/time extraction from task.dueDate or task.reminderTime
    let initialDate = new Date();
    if (task.dueDate) {
      const d = new Date(task.dueDate);
      if (!isNaN(d.getTime())) initialDate = d;
    } else if (task.reminderTime) {
      const d = new Date(task.reminderTime);
      if (!isNaN(d.getTime())) initialDate = d;
    }

    setYear(initialDate.getFullYear());
    setMonth(initialDate.getMonth());
    setDay(initialDate.getDate());

    const h24 = initialDate.getHours();
    const m = initialDate.getMinutes();
    setIsPm(h24 >= 12);
    setHour12(h24 % 12 || 12);
    // Round minute to nearest 5 for clean UX
    setMinute(Math.round(m / 5) * 5 % 60);
  }, [task, visible]);

  if (!task) return null;

  // Quick Date Helpers
  const handleSetQuickDate = (offsetDays) => {
    const target = new Date();
    target.setDate(target.getDate() + offsetDays);
    setYear(target.getFullYear());
    setMonth(target.getMonth());
    setDay(target.getDate());
  };

  // Adjust Month
  const handlePrevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  // Construct final Date object in local time
  const constructSelectedDateTime = () => {
    const maxD = getMaxDays(year, month);
    const validDay = Math.min(Math.max(1, day), maxD);

    let h24 = hour12 % 12;
    if (isPm) h24 += 12;

    const dt = new Date(year, month, validDay, h24, minute, 0, 0);
    return dt;
  };

  const selectedDateTime = constructSelectedDateTime();

  const formattedDatePreview = selectedDateTime.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const formattedTimePreview = `${hour12}:${minute.toString().padStart(2, '0')} ${isPm ? 'PM' : 'AM'}`;

  // Handle Save
  const handleSave = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setErrorMsg('Task title cannot be empty.');
      return;
    }

    const maxD = getMaxDays(year, month);
    if (day < 1 || day > maxD) {
      setErrorMsg(`Day must be between 1 and ${maxD} for ${MONTH_NAMES[month]}.`);
      return;
    }

    try {
      setSaving(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const targetIso = selectedDateTime.toISOString();

      const updatePayload = {
        title: trimmedTitle,
        description: description.trim(),
        category,
        dueDate: targetIso,
        hasReminder,
        reminderTime: hasReminder ? targetIso : null,
      };

      // 1. Save to backend and MongoDB Atlas
      const response = await updateTask(task._id, updatePayload);
      const updatedTask = response.task || { ...task, ...updatePayload };

      // 2. Synchronize notifications
      if (hasReminder) {
        // If the date is in the future, schedule local notification
        const now = new Date();
        if (selectedDateTime > now) {
          await scheduleLocalReminder({
            taskId: updatedTask._id,
            title: updatedTask.title,
            body: updatedTask.description || `Due at ${formattedTimePreview}`,
            triggerDate: targetIso,
            category: updatedTask.category,
          });
        }
      } else {
        // Cancel any existing notification if reminder was disabled
        await cancelLocalReminderForTask(updatedTask._id);
      }

      setSuccessMsg('Task updated and saved successfully!');

      setTimeout(() => {
        onTaskUpdated?.(updatedTask);
        onClose();
      }, 700);
    } catch (err) {
      console.error('[TaskEditModal] Save error:', err);
      setErrorMsg(err.message || 'Failed to update task.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>Edit & Reschedule Task</Text>
              <Text style={styles.modalSubtitle}>Saved persistently in MongoDB Atlas</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          {/* Messages */}
          {errorMsg && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color="#f87171" />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          {successMsg && (
            <View style={styles.successBox}>
              <Ionicons name="checkmark-circle" size={16} color="#34d399" />
              <Text style={styles.successText}>{successMsg}</Text>
            </View>
          )}

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Title Input */}
            <Text style={styles.inputLabel}>Task Title</Text>
            <TextInput
              style={styles.textInput}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Study for exam"
              placeholderTextColor="#6b7280"
              maxLength={200}
            />

            {/* Description Input */}
            <Text style={styles.inputLabel}>Details / Notes (Optional)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Add optional notes or location..."
              placeholderTextColor="#6b7280"
              multiline
              numberOfLines={2}
              maxLength={1000}
            />

            {/* Category Selector (All 7 Categories with Emojis) */}
            <Text style={styles.inputLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryChipsList}>
              {TASK_CATEGORIES.map((cat) => {
                const isSelected = category.toLowerCase() === cat.key.toLowerCase();
                return (
                  <TouchableOpacity
                    key={cat.key}
                    style={[
                      styles.categoryChip,
                      isSelected && {
                        backgroundColor: `${cat.color}35`,
                        borderColor: cat.color,
                        borderWidth: 1.5,
                      },
                    ]}
                    onPress={() => setCategory(cat.key)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.categoryChipEmoji}>{cat.emoji}</Text>
                    <Text
                      style={[
                        styles.categoryChipLabel,
                        isSelected && { color: '#ffffff', fontWeight: '700' },
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Date Selection Section */}
            <View style={styles.sectionDivider} />
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Custom Date</Text>
              <Text style={styles.previewBadge}>{formattedDatePreview}</Text>
            </View>

            {/* Quick Date Presets */}
            <View style={styles.quickDateRow}>
              {[
                { label: 'Today', days: 0 },
                { label: 'Tomorrow', days: 1 },
                { label: '+2 Days', days: 2 },
                { label: '+1 Week', days: 7 },
              ].map((preset) => (
                <TouchableOpacity
                  key={preset.label}
                  style={styles.quickDateBtn}
                  onPress={() => handleSetQuickDate(preset.days)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.quickDateText}>{preset.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Month & Year Stepper */}
            <View style={styles.stepperContainer}>
              <View style={styles.monthHeader}>
                <TouchableOpacity onPress={handlePrevMonth} style={styles.stepperArrow}>
                  <Ionicons name="chevron-back" size={18} color="#ff6b5b" />
                </TouchableOpacity>
                <Text style={styles.monthYearTitle}>
                  {MONTH_NAMES[month]} {year}
                </Text>
                <TouchableOpacity onPress={handleNextMonth} style={styles.stepperArrow}>
                  <Ionicons name="chevron-forward" size={18} color="#ff6b5b" />
                </TouchableOpacity>
              </View>

              {/* Day Selector Stepper / Direct Input */}
              <View style={styles.dayControlRow}>
                <Text style={styles.controlSubLabel}>Day of Month:</Text>
                <View style={styles.numericStepper}>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => setDay((d) => Math.max(1, d - 1))}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="remove" size={16} color="#ffffff" />
                  </TouchableOpacity>
                  <Text style={styles.stepperValue}>{day}</Text>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => setDay((d) => Math.min(getMaxDays(year, month), d + 1))}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add" size={16} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Time Selection Section */}
            <View style={styles.sectionDivider} />
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Custom Time</Text>
              <Text style={styles.previewBadge}>{formattedTimePreview}</Text>
            </View>

            {/* Quick Time Presets */}
            <View style={styles.quickDateRow}>
              {[
                { label: '9 AM', h: 9, m: 0, pm: false },
                { label: '12 PM', h: 12, m: 0, pm: true },
                { label: '3 PM', h: 3, m: 0, pm: true },
                { label: '6 PM', h: 6, m: 0, pm: true },
                { label: '9 PM', h: 9, m: 0, pm: true },
              ].map((t) => (
                <TouchableOpacity
                  key={t.label}
                  style={styles.quickDateBtn}
                  onPress={() => {
                    setHour12(t.h);
                    setMinute(t.m);
                    setIsPm(t.pm);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.quickDateText}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Hour & Minute Stepper Controls */}
            <View style={styles.timeControlsCard}>
              {/* Hour Control */}
              <View style={styles.timePickerUnit}>
                <Text style={styles.timeUnitLabel}>Hour</Text>
                <View style={styles.numericStepper}>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => setHour12((h) => (h === 1 ? 12 : h - 1))}
                  >
                    <Ionicons name="remove" size={16} color="#ffffff" />
                  </TouchableOpacity>
                  <Text style={styles.stepperValue}>{hour12}</Text>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => setHour12((h) => (h === 12 ? 1 : h + 1))}
                  >
                    <Ionicons name="add" size={16} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.timeSeparator}>:</Text>

              {/* Minute Control */}
              <View style={styles.timePickerUnit}>
                <Text style={styles.timeUnitLabel}>Minute</Text>
                <View style={styles.numericStepper}>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => setMinute((m) => (m === 0 ? 55 : m - 5))}
                  >
                    <Ionicons name="remove" size={16} color="#ffffff" />
                  </TouchableOpacity>
                  <Text style={styles.stepperValue}>{minute.toString().padStart(2, '0')}</Text>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => setMinute((m) => (m >= 55 ? 0 : m + 5))}
                  >
                    <Ionicons name="add" size={16} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* AM / PM Toggle */}
              <View style={styles.amPmContainer}>
                <TouchableOpacity
                  style={[styles.amPmBtn, !isPm && styles.amPmBtnActive]}
                  onPress={() => setIsPm(false)}
                >
                  <Text style={[styles.amPmText, !isPm && styles.amPmTextActive]}>AM</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.amPmBtn, isPm && styles.amPmBtnActive]}
                  onPress={() => setIsPm(true)}
                >
                  <Text style={[styles.amPmText, isPm && styles.amPmTextActive]}>PM</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Reminder Alert Switch */}
            <View style={styles.reminderToggleCard}>
              <View style={{ flex: 1, paddingRight: spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="notifications" size={18} color="#ff6b5b" />
                  <Text style={styles.reminderCardTitle}>Phone Notification Alert</Text>
                </View>
                <Text style={styles.reminderCardSub}>
                  Triggers an alarm with category emoji ({getCategoryDetails(category).emoji}) on your device.
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.customToggle, hasReminder && styles.customToggleOn]}
                onPress={() => setHasReminder((prev) => !prev)}
                activeOpacity={0.8}
              >
                <View style={[styles.toggleCircle, hasReminder && styles.toggleCircleOn]} />
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={saving}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="checkmark-done" size={18} color="#ffffff" />
                  <Text style={styles.saveBtnText}>Save Task Changes</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 7, 10, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0c0f17',
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    maxHeight: '92%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#d1d5db',
    marginBottom: 6,
    marginTop: 10,
  },
  textInput: {
    backgroundColor: '#151922',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: radii.md,
    color: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  textArea: {
    minHeight: 58,
    textAlignVertical: 'top',
  },
  categoryChipsList: {
    gap: 8,
    paddingVertical: 4,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151922',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: radii.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 6,
  },
  categoryChipEmoji: {
    fontSize: 14,
  },
  categoryChipLabel: {
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: '500',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  previewBadge: {
    fontSize: 12,
    color: '#ff6b5b',
    fontWeight: '600',
    backgroundColor: 'rgba(255, 77, 58, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  quickDateRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  quickDateBtn: {
    flex: 1,
    backgroundColor: '#151922',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: radii.sm,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickDateText: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '600',
  },
  stepperContainer: {
    backgroundColor: '#151922',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: radii.md,
    padding: 10,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  stepperArrow: {
    padding: 6,
  },
  monthYearTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  dayControlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  controlSubLabel: {
    fontSize: 13,
    color: '#9ca3af',
  },
  numericStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0c0f17',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  stepperBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  stepperValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    minWidth: 32,
    textAlign: 'center',
  },
  timeControlsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#151922',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: radii.md,
    padding: 12,
    gap: 8,
  },
  timePickerUnit: {
    alignItems: 'center',
  },
  timeUnitLabel: {
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 4,
  },
  timeSeparator: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ff6b5b',
    marginTop: 14,
  },
  amPmContainer: {
    marginLeft: 12,
    backgroundColor: '#0c0f17',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
    marginTop: 14,
  },
  amPmBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  amPmBtnActive: {
    backgroundColor: '#ff4d3a',
  },
  amPmText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9ca3af',
  },
  amPmTextActive: {
    color: '#ffffff',
  },
  reminderToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#151922',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: radii.md,
    padding: 12,
    marginTop: 12,
    marginBottom: 20,
  },
  reminderCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  reminderCardSub: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
    lineHeight: 15,
  },
  customToggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#374151',
    justifyContent: 'center',
    padding: 2,
  },
  customToggleOn: {
    backgroundColor: '#ff4d3a',
  },
  toggleCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
  },
  toggleCircleOn: {
    alignSelf: 'flex-end',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    gap: 8,
    borderRadius: 4,
  },
  errorText: {
    color: '#f87171',
    fontSize: 13,
    flex: 1,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    borderLeftWidth: 3,
    borderLeftColor: '#34d399',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    gap: 8,
    borderRadius: 4,
  },
  successText: {
    color: '#34d399',
    fontSize: 13,
    flex: 1,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#151922',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: radii.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: '#9ca3af',
    fontWeight: '600',
    fontSize: 14,
  },
  saveBtn: {
    flex: 2,
    backgroundColor: '#ff4d3a',
    borderRadius: radii.md,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
});
