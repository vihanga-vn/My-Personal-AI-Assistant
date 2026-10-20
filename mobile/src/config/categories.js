/**
 * Vox AI Task Categories & Emojis
 * ================================
 * Vox AI defines exactly seven task categories:
 * 1. Work (💼)
 * 2. University (🎓)
 * 3. Health (🩺)
 * 4. Finance (💰)
 * 5. Hangouts (🎉)
 * 6. Personal (👤)
 * 7. Other (📌)
 */

export const TASK_CATEGORIES = [
  {
    key: 'Work',
    label: 'Work',
    emoji: '💼',
    color: '#4fa2ff',
    bgColor: 'rgba(79, 162, 255, 0.22)',
    borderColor: 'rgba(79, 162, 255, 0.55)',
    icon: 'briefcase-outline',
  },
  {
    key: 'University',
    label: 'University',
    emoji: '🎓',
    color: '#c084fc',
    bgColor: 'rgba(192, 132, 252, 0.22)',
    borderColor: 'rgba(192, 132, 252, 0.55)',
    icon: 'school-outline',
  },
  {
    key: 'Health',
    label: 'Health',
    emoji: '🩺',
    color: '#34d399',
    bgColor: 'rgba(52, 211, 153, 0.22)',
    borderColor: 'rgba(52, 211, 153, 0.55)',
    icon: 'fitness-outline',
  },
  {
    key: 'Finance',
    label: 'Finance',
    emoji: '💰',
    color: '#f97316',
    bgColor: 'rgba(249, 115, 22, 0.22)',
    borderColor: 'rgba(249, 115, 22, 0.55)',
    icon: 'wallet-outline',
  },
  {
    key: 'Hangouts',
    label: 'Hangouts',
    emoji: '🎉',
    color: '#ec4899',
    bgColor: 'rgba(236, 72, 153, 0.22)',
    borderColor: 'rgba(236, 72, 153, 0.55)',
    icon: 'people-outline',
  },
  {
    key: 'Personal',
    label: 'Personal',
    emoji: '👤',
    color: '#818cf8',
    bgColor: 'rgba(129, 140, 248, 0.22)',
    borderColor: 'rgba(129, 140, 248, 0.55)',
    icon: 'person-outline',
  },
  {
    key: 'Other',
    label: 'Other',
    emoji: '📌',
    color: '#fde047',
    bgColor: 'rgba(253, 224, 71, 0.22)',
    borderColor: 'rgba(253, 224, 71, 0.55)',
    icon: 'ellipsis-horizontal-circle-outline',
  },
];

export const CATEGORY_EMOJI_MAP = {
  Work: '💼',
  University: '🎓',
  Health: '🩺',
  Finance: '💰',
  Hangouts: '🎉',
  Personal: '👤',
  Other: '📌',
};

export const DEFAULT_CATEGORY = 'Other';

/**
 * Returns complete category styling and emoji for any category name.
 * Gracefully falls back to 'Other' (📌) if missing or unknown.
 */
export function getCategoryDetails(categoryName) {
  if (!categoryName || typeof categoryName !== 'string') {
    return TASK_CATEGORIES.find((c) => c.key === 'Other');
  }

  const normalized = categoryName.trim().toLowerCase();
  const found = TASK_CATEGORIES.find((c) => c.key.toLowerCase() === normalized);
  return found || TASK_CATEGORIES.find((c) => c.key === 'Other');
}

/**
 * Returns the single emoji character for a category, with '📌' as fallback.
 */
export function getCategoryEmoji(categoryName) {
  const details = getCategoryDetails(categoryName);
  return details.emoji;
}

/**
 * Starter suggested prompts for empty chat sessions.
 */
export const SUGGESTED_PROMPTS = [
  'What should I prioritize next?',
  'Summarize my upcoming deadlines',
  'Add a reminder for 5 PM',
  'What did I save about coffee?',
];
