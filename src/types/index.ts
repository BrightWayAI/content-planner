// Status types remain fixed (workflow constants)
export type ContentStatus = 'idea' | 'drafting' | 'review' | 'scheduled' | 'published' | 'archived';
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';

// Database-backed config types
export interface AppConfig {
  id: string;
  brandName: string;
  tagline: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContentPillar {
  id: string;
  slug: string;
  label: string;
  description: string | null;
  color: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Channel {
  id: string;
  slug: string;
  label: string;
  platform: string;
  color: string;
  maxLength: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContentType {
  id: string;
  slug: string;
  label: string;
  createdAt: string;
}

export interface NewsSource {
  id: string;
  name: string;
  url: string;
  cssSelector: string;
  category: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VoiceProfile {
  id: string;
  principles: string[];
  doExamples: string[];
  dontExamples: string[];
  reminders: string[];
  jargonBlacklist: string[];
  analyzedVoiceSummary: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VoiceSample {
  id: string;
  title: string;
  content: string;
  sourceType: string;
  metadata: Record<string, string>;
  wordCount: number;
  createdAt: string;
}

export interface ContentIdea {
  id: string;
  title: string;
  pillarId: string | null;
  notes: string | null;
  priority: string;
  sourceUrl: string | null;
  sourceName: string | null;
  sourceType: string | null;
  createdAt: string;
}

export interface ContentPiece {
  id: string;
  title: string;
  status: ContentStatus;
  channelId: string | null;
  contentTypeId: string | null;
  pillarId: string | null;
  body: string;
  hook: string | null;
  cta: string | null;
  plannedDate: string | null;
  publishedDate: string | null;
  publishedUrl: string | null;
  notes: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ContentMetrics {
  id: string;
  contentPieceId: string;
  impressions: number | null;
  reactions: number | null;
  comments: number | null;
  shares: number | null;
  clicks: number | null;
  engagementRate: string | null;
  qualityNotes: string | null;
  businessOutcome: string | null;
  recordedAt: string;
}

export interface DraftVersion {
  id: string;
  contentPieceId: string;
  hook: string | null;
  body: string;
  versionNote: string | null;
  version: number;
  createdAt: string;
}

export interface WeeklyPlan {
  id: string;
  weekStartDate: string;
  goals: string | null;
  retrospectiveNotes: string | null;
  lessonsLearned: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklySlot {
  id: string;
  weeklyPlanId: string;
  day: DayOfWeek;
  channelId: string | null;
  contentPieceId: string | null;
  contentType: string | null;
}

export interface MonthlyGoals {
  id: string;
  month: number;
  year: number;
  targetPosts: number;
  targetArticles: number;
  targetEngagementRate: string | null;
  actualPosts: number | null;
  actualArticles: number | null;
  actualEngagementRate: string | null;
  focusAreas: string[];
  keyMessages: string[];
  monthEndReflection: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StarterTemplate {
  id: string;
  name: string;
  description: string | null;
  templateData: {
    brandName: string;
    tagline: string;
    pillars: Array<{ slug: string; label: string; description: string; color: string }>;
    channels: Array<{ slug: string; label: string; platform: string; color: string; maxLength?: number }>;
    contentTypes: Array<{ slug: string; label: string }>;
    sources: Array<{ name: string; url: string; cssSelector: string; category: string }>;
    voice: {
      principles: string[];
      doExamples: string[];
      dontExamples: string[];
      reminders: string[];
      jargonBlacklist: string[];
    };
  };
  createdAt: string;
}

export interface ScrapeResult {
  source: string;
  headlines: string[];
}

// Full config response
export interface FullConfig {
  config: AppConfig | null;
  pillars: ContentPillar[];
  channels: Channel[];
  contentTypes: ContentType[];
}
