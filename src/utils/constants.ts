import type { ContentStatus } from '@/types';

// These are workflow-fixed and don't change per user
export const CONTENT_STATUSES: Record<ContentStatus, { label: string; color: string }> = {
  idea: { label: 'Idea', color: 'bg-gray-400' },
  drafting: { label: 'Drafting', color: 'bg-yellow-500' },
  review: { label: 'Review', color: 'bg-orange-500' },
  scheduled: { label: 'Scheduled', color: 'bg-blue-500' },
  published: { label: 'Published', color: 'bg-green-500' },
  archived: { label: 'Archived', color: 'bg-gray-600' },
};

export const PUBLISHING_CHECKLIST = [
  'Does this provide genuine value (not just content for content\'s sake)?',
  'Is the language plain and jargon-free?',
  'Are sentences under 20 words (mostly)?',
  'Is there a clear hook in the first line?',
  'Are all examples real (not fabricated)?',
  'Does this align with one of my content pillars?',
  'Would I be proud to have my name on this in 5 years?',
];
