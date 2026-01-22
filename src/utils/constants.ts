import type { Pillar, Channel, ContentType, ContentStatus } from '../types';

export const PILLARS: Record<Pillar, { label: string; description: string; color: string }> = {
  operational_ai: {
    label: 'Operational AI',
    description: 'AI as infrastructure, not project. Governance, operating models, organizational change.',
    color: 'bg-blue-500',
  },
  human_ai_collaboration: {
    label: 'Human-AI Collaboration',
    description: 'Pilot not passenger. Skills, workflows, mindset shifts.',
    color: 'bg-green-500',
  },
  practical_implementation: {
    label: 'Practical Implementation',
    description: 'Actionable guidance. Tools, how-tos, real examples.',
    color: 'bg-purple-500',
  },
};

export const CHANNELS: Record<Channel, { label: string; color: string }> = {
  personal_linkedin: {
    label: 'Personal LinkedIn',
    color: 'bg-orange-500',
  },
  business_linkedin: {
    label: 'BrightWay Business',
    color: 'bg-cyan-500',
  },
  both: {
    label: 'Both Channels',
    color: 'bg-gray-500',
  },
};

export const CONTENT_TYPES: Record<ContentType, { label: string }> = {
  short_post: { label: 'Short Post' },
  long_article: { label: 'Long Article' },
  monthly_digest: { label: 'Monthly Digest' },
  case_study: { label: 'Case Study' },
};

export const CONTENT_STATUSES: Record<ContentStatus, { label: string; color: string }> = {
  idea: { label: 'Idea', color: 'bg-gray-400' },
  drafting: { label: 'Drafting', color: 'bg-yellow-500' },
  review: { label: 'Review', color: 'bg-orange-500' },
  scheduled: { label: 'Scheduled', color: 'bg-blue-500' },
  published: { label: 'Published', color: 'bg-green-500' },
  archived: { label: 'Archived', color: 'bg-gray-600' },
};

export const JARGON_WORDS = [
  'leverage',
  'synergy',
  'paradigm shift',
  'best-in-class',
  'cutting-edge',
  'game-changer',
  'disruptive',
  'innovative',
  'scalable',
  'robust',
  'holistic',
  'end-to-end',
  'mission-critical',
  'bleeding edge',
  'world-class',
  'next-generation',
  'seamless',
  'turnkey',
  'value-add',
  'bandwidth',
  'circle back',
  'deep dive',
  'low-hanging fruit',
  'move the needle',
  'pivot',
  'synergize',
  'touch base',
  'unpack',
  'value proposition',
  'verticals',
];

export const VOICE_GUIDELINES = {
  do: [
    "Here's what I've learned...",
    "This didn't work for us because...",
    'Try this instead...',
    'Most AI projects fail...',
    'I tested this with three clients...',
  ],
  dont: [
    'Research indicates that...',
    'Suboptimal outcomes resulted from...',
    'Consider implementing...',
    'Challenges in AI adoption include...',
    'Industry leaders report...',
  ],
  principles: [
    'Plain language over jargon',
    'Concise sentences (under 20 words)',
    'Authentic voice',
    'Narrative flow (paragraphs over bullets)',
    'Real examples only',
  ],
  reminders: [
    "Write like you're explaining to a smart friend over coffee",
    'If a sentence needs re-reading, simplify it',
    'One idea per post/section',
    'Real > Impressive',
    'Helpful > Viral',
  ],
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

export const QUARTERLY_THEMES = {
  Q1: {
    name: 'Setting the Foundation',
    topics: [
      'AI strategy planning for the year',
      'Organizational readiness assessment',
      'Building the business case for operational AI',
    ],
  },
  Q2: {
    name: 'Building Momentum',
    topics: [
      'Implementation playbooks',
      'Mid-year course corrections',
      'Scaling what works',
    ],
  },
  Q3: {
    name: 'Operational Excellence',
    topics: [
      'Measuring AI ROI',
      'Optimizing human-AI workflows',
      'Case studies and outcomes',
    ],
  },
  Q4: {
    name: 'Future-Proofing',
    topics: [
      'Emerging trends and implications',
      'Strategic planning for next year',
      'Reflection and lessons learned',
    ],
  },
};
