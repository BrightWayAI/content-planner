export type ContentStatus = 'idea' | 'drafting' | 'review' | 'scheduled' | 'published' | 'archived';
export type Channel = 'personal_linkedin' | 'business_linkedin' | 'both';
export type ContentType = 'short_post' | 'long_article' | 'monthly_digest' | 'case_study';
export type Pillar = 'operational_ai' | 'human_ai_collaboration' | 'practical_implementation';
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';

export interface ContentPiece {
  id: string;
  title: string;
  status: ContentStatus;
  channel: Channel;
  contentType: ContentType;
  pillar: Pillar;

  body: string;
  hook?: string;
  cta?: string;

  plannedDate?: string;
  publishedDate?: string;
  publishedUrl?: string;

  createdAt: string;
  updatedAt: string;
  notes?: string;
  tags?: string[];
}

export interface ContentMetrics {
  id: string;
  contentPieceId: string;
  recordedAt: string;

  impressions?: number;
  reactions?: number;
  comments?: number;
  shares?: number;
  clicks?: number;

  engagementRate?: number;

  qualityNotes?: string;
  businessOutcome?: string;
}

export interface WeeklySlot {
  day: DayOfWeek;
  channel: Channel;
  contentPieceId?: string;
  contentType?: string;
}

export interface WeeklyPlan {
  id: string;
  weekStartDate: string;
  slots: WeeklySlot[];
  goals?: string;
  retrospectiveNotes?: string;
  lessonsLearned?: string;
}

export interface MonthlyGoals {
  id: string;
  month: number;
  year: number;

  targetPosts: number;
  targetArticles: number;
  targetEngagementRate: number;

  actualPosts?: number;
  actualArticles?: number;
  actualEngagementRate?: number;

  focusAreas?: string[];
  keyMessages?: string[];

  monthEndReflection?: string;
}

export interface ContentIdea {
  id: string;
  title: string;
  pillar: Pillar;
  notes?: string;
  priority: 'high' | 'medium' | 'someday';
  createdAt: string;
}

export interface AppData {
  contentPieces: ContentPiece[];
  contentMetrics: ContentMetrics[];
  weeklyPlans: WeeklyPlan[];
  monthlyGoals: MonthlyGoals[];
  contentIdeas: ContentIdea[];
}
