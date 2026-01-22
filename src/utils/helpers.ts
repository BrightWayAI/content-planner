import { startOfWeek, format, parseISO, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import type { ContentPiece, ContentMetrics } from '../types';
import { JARGON_WORDS } from './constants';

export function getWeekStartDate(date: Date = new Date()): string {
  return format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

export function formatDate(dateStr: string, formatStr: string = 'MMM d, yyyy'): string {
  return format(parseISO(dateStr), formatStr);
}

export function getCurrentQuarter(): 'Q1' | 'Q2' | 'Q3' | 'Q4' {
  const month = new Date().getMonth();
  if (month < 3) return 'Q1';
  if (month < 6) return 'Q2';
  if (month < 9) return 'Q3';
  return 'Q4';
}

export function detectJargon(text: string): string[] {
  const lowercaseText = text.toLowerCase();
  return JARGON_WORDS.filter(word => lowercaseText.includes(word.toLowerCase()));
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function estimateReadingLevel(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'N/A';

  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgWordsPerSentence = words.length / Math.max(sentences.length, 1);

  if (avgWordsPerSentence < 10) return 'Very easy';
  if (avgWordsPerSentence < 15) return 'Easy';
  if (avgWordsPerSentence < 20) return 'Good';
  if (avgWordsPerSentence < 25) return 'Moderate';
  return 'Complex';
}

export function calculateEngagementRate(metrics: ContentMetrics): number {
  if (!metrics.impressions || metrics.impressions === 0) return 0;
  const engagements = (metrics.reactions || 0) + (metrics.comments || 0) + (metrics.shares || 0);
  return (engagements / metrics.impressions) * 100;
}

export function getContentForMonth(
  pieces: ContentPiece[],
  year: number,
  month: number
): ContentPiece[] {
  const start = startOfMonth(new Date(year, month - 1));
  const end = endOfMonth(new Date(year, month - 1));

  return pieces.filter(piece => {
    const dateStr = piece.publishedDate || piece.plannedDate;
    if (!dateStr) return false;
    const date = parseISO(dateStr);
    return isWithinInterval(date, { start, end });
  });
}

export function getContentForDate(pieces: ContentPiece[], dateStr: string): ContentPiece[] {
  return pieces.filter(piece => {
    const pieceDate = piece.publishedDate || piece.plannedDate;
    return pieceDate?.split('T')[0] === dateStr;
  });
}

export function analyzeHookStrength(hook: string): { score: number; feedback: string } {
  if (!hook || hook.trim().length === 0) {
    return { score: 0, feedback: 'Add a hook to grab attention' };
  }

  const words = hook.split(/\s+/).length;
  const hasQuestion = hook.includes('?');
  const hasNumber = /\d/.test(hook);
  const startsWithI = hook.trim().toLowerCase().startsWith('i ');
  const hasContrarian = /but|however|actually|wrong|mistake/i.test(hook);

  let score = 50;
  const feedback: string[] = [];

  if (words < 5) {
    score += 10;
  } else if (words > 20) {
    score -= 10;
    feedback.push('Hook is long - consider shortening');
  }

  if (hasQuestion) {
    score += 15;
    feedback.push('Questions engage readers');
  }

  if (hasNumber) {
    score += 10;
    feedback.push('Numbers add specificity');
  }

  if (startsWithI) {
    score += 5;
    feedback.push('Personal voice is good');
  }

  if (hasContrarian) {
    score += 10;
    feedback.push('Contrarian angle creates curiosity');
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    feedback: feedback.length > 0 ? feedback.join('. ') : 'Solid hook',
  };
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    idea: 'bg-gray-100 text-gray-700',
    drafting: 'bg-yellow-100 text-yellow-700',
    review: 'bg-orange-100 text-orange-700',
    scheduled: 'bg-blue-100 text-blue-700',
    published: 'bg-green-100 text-green-700',
    archived: 'bg-gray-200 text-gray-600',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
}

export function getChannelColor(channel: string): string {
  const colors: Record<string, string> = {
    personal_linkedin: 'bg-orange-100 text-orange-700',
    business_linkedin: 'bg-cyan-100 text-cyan-700',
    both: 'bg-gray-100 text-gray-700',
  };
  return colors[channel] || 'bg-gray-100 text-gray-700';
}

export function getPillarColor(pillar: string): string {
  const colors: Record<string, string> = {
    operational_ai: 'bg-blue-100 text-blue-700',
    human_ai_collaboration: 'bg-green-100 text-green-700',
    practical_implementation: 'bg-purple-100 text-purple-700',
  };
  return colors[pillar] || 'bg-gray-100 text-gray-700';
}
