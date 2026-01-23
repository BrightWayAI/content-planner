import { v4 as uuidv4 } from 'uuid';
import type { ContentIdea } from '../types';

const now = new Date().toISOString();

export const SEED_IDEAS: ContentIdea[] = [
  // Operational AI (40%)
  {
    id: uuidv4(),
    title: "Why your AI strategy needs an operating model, not just pilots",
    pillar: 'operational_ai',
    notes: "Most orgs run disconnected AI experiments. The ones seeing ROI treat AI as infrastructure with governance, not one-off projects.",
    priority: 'high',
    createdAt: now,
  },
  {
    id: uuidv4(),
    title: "The hidden cost of 'workslop' in AI-enabled teams",
    pillar: 'operational_ai',
    notes: "AI-generated work that burdens colleagues without adding value. How to spot it and what to do instead.",
    priority: 'high',
    createdAt: now,
  },
  {
    id: uuidv4(),
    title: "Building AI governance that actually works",
    pillar: 'operational_ai',
    notes: "Dynamic governance frameworks vs. static policies. Decision trees over prohibition lists.",
    priority: 'high',
    createdAt: now,
  },
  {
    id: uuidv4(),
    title: "Domain-specific AI beats general-purpose every time",
    pillar: 'operational_ai',
    notes: "Why specialized AI systems consistently outperform for operational work. Examples from our Learning Production System.",
    priority: 'medium',
    createdAt: now,
  },
  {
    id: uuidv4(),
    title: "AI should be infrastructure, not fuel for existing systems",
    pillar: 'operational_ai',
    notes: "Core insight: treating AI as organizational infrastructure requiring new operational approaches.",
    priority: 'high',
    createdAt: now,
  },

  // Human-AI Collaboration (30%)
  {
    id: uuidv4(),
    title: "The pilot vs. passenger mindset for AI adoption",
    pillar: 'human_ai_collaboration',
    notes: "You're either steering the AI or letting it steer you. What top performers do differently.",
    priority: 'high',
    createdAt: now,
  },
  {
    id: uuidv4(),
    title: "Why your best people are hiding their AI use",
    pillar: 'human_ai_collaboration',
    notes: "Top performers often use AI secretly. What this says about org culture and how to fix it.",
    priority: 'high',
    createdAt: now,
  },
  {
    id: uuidv4(),
    title: "What top AI users do differently",
    pillar: 'human_ai_collaboration',
    notes: "Skills and mindsets that separate effective AI collaborators from the rest.",
    priority: 'medium',
    createdAt: now,
  },
  {
    id: uuidv4(),
    title: "When humans should lead vs. when AI should lead",
    pillar: 'human_ai_collaboration',
    notes: "Clear framework for dividing work. Not about replacement—about optimal collaboration.",
    priority: 'medium',
    createdAt: now,
  },

  // Practical Implementation (30%)
  {
    id: uuidv4(),
    title: "5 AI workflows that actually save time (not create more work)",
    pillar: 'practical_implementation',
    notes: "Concrete examples from real work. Focus on net time savings, not activity metrics.",
    priority: 'high',
    createdAt: now,
  },
  {
    id: uuidv4(),
    title: "The AI stack that runs my consulting practice",
    pillar: 'practical_implementation',
    notes: "Behind-the-scenes look at actual tools and how they connect.",
    priority: 'high',
    createdAt: now,
  },
  {
    id: uuidv4(),
    title: "How I use AI to draft client proposals in half the time",
    pillar: 'practical_implementation',
    notes: "Step-by-step workflow with specific prompts and process.",
    priority: 'medium',
    createdAt: now,
  },
  {
    id: uuidv4(),
    title: "Common AI implementation pitfalls and how to avoid them",
    pillar: 'practical_implementation',
    notes: "Lessons from watching clients fail. What not to do.",
    priority: 'medium',
    createdAt: now,
  },
  {
    id: uuidv4(),
    title: "Tool comparison: When to use Claude vs. GPT vs. Gemini",
    pillar: 'practical_implementation',
    notes: "Practical guidance based on actual use cases, not benchmarks.",
    priority: 'medium',
    createdAt: now,
  },
  {
    id: uuidv4(),
    title: "My weekly AI workflow for content creation",
    pillar: 'practical_implementation',
    notes: "How AI fits into the actual content process. Real examples.",
    priority: 'high',
    createdAt: now,
  },
];
