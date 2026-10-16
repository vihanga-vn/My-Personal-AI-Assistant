// Realistic Mock Data for Milestone 2 UI Demonstration

export const mockUser = {
  name: 'Vihanga',
  avatarInitials: 'VA',
  status: 'Online',
  assistantName: 'Aura',
  assistantRole: 'Personal AI Companion',
};

export const mockTasks = [
  {
    id: 't-1',
    title: 'Review System Architecture document',
    category: 'Work',
    priority: 'High',
    dueTime: 'Today, 3:30 PM',
    deadlineDate: 'Today',
    completed: false,
    notes: 'Confirm MongoDB schema design for persistent memory.',
  },
  {
    id: 't-2',
    title: 'Grocery run: Oat milk, apples & coffee beans',
    category: 'Personal',
    priority: 'Medium',
    dueTime: 'Today, 6:00 PM',
    deadlineDate: 'Today',
    completed: false,
    notes: 'Remember the dark roast blend.',
  },
  {
    id: 't-3',
    title: 'Submit quarterly project progress report',
    category: 'Work',
    priority: 'Urgent',
    dueTime: 'Tomorrow, 10:00 AM',
    deadlineDate: 'Upcoming',
    completed: false,
    notes: 'Include test coverage metrics from mobile and backend test runs.',
  },
  {
    id: 't-4',
    title: 'Call dentist for annual checkup',
    category: 'Health',
    priority: 'Low',
    dueTime: 'Friday, 11:00 AM',
    deadlineDate: 'Upcoming',
    completed: false,
    notes: 'Ask about morning appointment slots.',
  },
  {
    id: 't-5',
    title: 'Set up Milestone 1 project directory',
    category: 'Work',
    priority: 'High',
    dueTime: 'Completed today',
    deadlineDate: 'Today',
    completed: true,
    notes: 'Verified React Native Expo and Express backend setup.',
  },
];

export const mockUpcomingDeadlines = [
  {
    id: 'd-1',
    title: 'Quarterly Project Report',
    date: 'Tomorrow, 10:00 AM',
    tag: 'Urgent',
    color: '#ef4444',
  },
  {
    id: 'd-2',
    title: 'Cloud Billing Cycle Review (Zero-cost audit)',
    date: 'Oct 20, 2026',
    tag: 'Financial',
    color: '#f59e0b',
  },
  {
    id: 'd-3',
    title: 'Antigravity Hackathon Submission',
    date: 'Oct 25, 2026',
    tag: 'Milestone',
    color: '#6366f1',
  },
];

export const mockMemories = [
  {
    id: 'm-1',
    title: 'Prefers morning deep work between 8 AM - 11 AM',
    category: 'Preferences',
    storedDate: 'Oct 14, 2026',
    importance: 'High',
    detail: 'Do not schedule reminder notifications during this time unless urgent.',
    tags: ['focus', 'routine', 'productivity'],
  },
  {
    id: 'm-2',
    title: 'Loves black coffee, pour-over single origin',
    category: 'Personal',
    storedDate: 'Oct 12, 2026',
    importance: 'Medium',
    detail: 'Favorite roast is Ethiopian Yirgacheffe.',
    tags: ['coffee', 'taste'],
  },
  {
    id: 'm-3',
    title: 'Primary programming stack: React Native, Node.js, Python',
    category: 'Work',
    storedDate: 'Oct 10, 2026',
    importance: 'High',
    detail: 'Always prefer clean architecture, dark themes, and cost-free open source tools.',
    tags: ['coding', 'tech'],
  },
  {
    id: 'm-4',
    title: 'Daily hydration goal: 2.5 Liters',
    category: 'Health',
    storedDate: 'Oct 08, 2026',
    importance: 'Low',
    detail: 'Prompt gentle hydration reminders in the afternoon.',
    tags: ['health', 'habits'],
  },
  {
    id: 'm-5',
    title: 'Sister\'s birthday is on November 14',
    category: 'Personal',
    storedDate: 'Oct 05, 2026',
    importance: 'High',
    detail: 'Remind 1 week in advance to order a gift.',
    tags: ['family', 'dates'],
  },
];

export const mockInitialMessages = [
  {
    id: 'msg-1',
    sender: 'assistant',
    text: 'Good afternoon, Vihanga! I am Aura, your personal AI assistant. I have your schedule and memories ready. How can I assist your workflow today?',
    timestamp: '1:45 PM',
  },
  {
    id: 'msg-2',
    sender: 'user',
    text: 'What are the main tasks left on my plate for this afternoon?',
    timestamp: '1:46 PM',
  },
  {
    id: 'msg-3',
    sender: 'assistant',
    text: 'You have 2 tasks scheduled for today:\n• Review System Architecture (High Priority, due 3:30 PM)\n• Grocery run for coffee & oat milk (6:00 PM)\n\nAlso, your quarterly report is due tomorrow morning at 10:00 AM.',
    timestamp: '1:47 PM',
  },
];

export const mockSuggestedPrompts = [
  'What should I prioritize next?',
  'Summarize my upcoming deadlines',
  'Add a reminder for 5 PM',
  'What did I save about coffee?',
];

export const mockAiReplies = [
  'I have made a note of that in your personal memory. Anything else you would like me to remember?',
  'Got it! I will make sure you stay on track with that deadline.',
  'Looking at your schedule, you have an open focus window between 3:30 PM and 5:00 PM.',
  'Your personal memory confirms: you prefer single-origin Ethiopian coffee and morning deep work.',
  'I can help you break this task down into 3 manageable steps whenever you are ready.',
];
