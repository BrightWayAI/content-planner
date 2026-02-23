import { pgTable, uuid, text, integer, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';

// App configuration (brand name, tagline)
export const appConfig = pgTable('app_config', {
  id: uuid('id').defaultRandom().primaryKey(),
  brandName: text('brand_name').notNull().default('My Brand'),
  tagline: text('tagline').default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// User-defined content pillars
export const contentPillars = pgTable('content_pillars', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').notNull().unique(),
  label: text('label').notNull(),
  description: text('description').default(''),
  color: text('color').notNull().default('bg-blue-500'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// User-defined channels
export const channels = pgTable('channels', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').notNull().unique(),
  label: text('label').notNull(),
  platform: text('platform').notNull().default('linkedin'),
  color: text('color').notNull().default('bg-orange-500'),
  maxLength: integer('max_length'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// User-defined content types
export const contentTypes = pgTable('content_types', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').notNull().unique(),
  label: text('label').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Configurable news/scraping sources
export const newsSources = pgTable('news_sources', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  url: text('url').notNull(),
  cssSelector: text('css_selector').notNull().default('article h2, article h3'),
  category: text('category').default('General'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Voice profile (principles, guidelines, AI-analyzed summary)
export const voiceProfile = pgTable('voice_profile', {
  id: uuid('id').defaultRandom().primaryKey(),
  principles: jsonb('principles').$type<string[]>().default([]),
  doExamples: jsonb('do_examples').$type<string[]>().default([]),
  dontExamples: jsonb('dont_examples').$type<string[]>().default([]),
  reminders: jsonb('reminders').$type<string[]>().default([]),
  jargonBlacklist: jsonb('jargon_blacklist').$type<string[]>().default([]),
  analyzedVoiceSummary: text('analyzed_voice_summary'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Voice writing samples
export const voiceSamples = pgTable('voice_samples', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull().default('Untitled'),
  content: text('content').notNull(),
  sourceType: text('source_type').notNull().default('paste'), // paste, file, url
  metadata: jsonb('metadata').$type<Record<string, string>>().default({}),
  wordCount: integer('word_count').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Content ideas
export const contentIdeas = pgTable('content_ideas', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  pillarId: uuid('pillar_id').references(() => contentPillars.id, { onDelete: 'set null' }),
  notes: text('notes'),
  priority: text('priority').notNull().default('medium'), // high, medium, someday
  sourceUrl: text('source_url'),
  sourceName: text('source_name'),
  sourceType: text('source_type'), // article, newsletter, social, research, other
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Content pieces (posts/articles)
export const contentPieces = pgTable('content_pieces', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull().default(''),
  status: text('status').notNull().default('drafting'), // idea, drafting, review, scheduled, published, archived
  channelId: uuid('channel_id').references(() => channels.id, { onDelete: 'set null' }),
  contentTypeId: uuid('content_type_id').references(() => contentTypes.id, { onDelete: 'set null' }),
  pillarId: uuid('pillar_id').references(() => contentPillars.id, { onDelete: 'set null' }),
  body: text('body').notNull().default(''),
  hook: text('hook'),
  cta: text('cta'),
  plannedDate: text('planned_date'),
  publishedDate: text('published_date'),
  publishedUrl: text('published_url'),
  notes: text('notes'),
  tags: jsonb('tags').$type<string[]>().default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Content metrics / performance data
export const contentMetrics = pgTable('content_metrics', {
  id: uuid('id').defaultRandom().primaryKey(),
  contentPieceId: uuid('content_piece_id').references(() => contentPieces.id, { onDelete: 'cascade' }).notNull(),
  impressions: integer('impressions'),
  reactions: integer('reactions'),
  comments: integer('comments'),
  shares: integer('shares'),
  clicks: integer('clicks'),
  engagementRate: text('engagement_rate'),
  qualityNotes: text('quality_notes'),
  businessOutcome: text('business_outcome'),
  recordedAt: timestamp('recorded_at').defaultNow().notNull(),
});

// Draft version history
export const draftVersions = pgTable('draft_versions', {
  id: uuid('id').defaultRandom().primaryKey(),
  contentPieceId: uuid('content_piece_id').references(() => contentPieces.id, { onDelete: 'cascade' }).notNull(),
  hook: text('hook'),
  body: text('body').notNull(),
  versionNote: text('version_note'),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Weekly plans
export const weeklyPlans = pgTable('weekly_plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  weekStartDate: text('week_start_date').notNull(),
  goals: text('goals'),
  retrospectiveNotes: text('retrospective_notes'),
  lessonsLearned: text('lessons_learned'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Weekly plan slots
export const weeklySlots = pgTable('weekly_slots', {
  id: uuid('id').defaultRandom().primaryKey(),
  weeklyPlanId: uuid('weekly_plan_id').references(() => weeklyPlans.id, { onDelete: 'cascade' }).notNull(),
  day: text('day').notNull(), // monday, tuesday, etc.
  channelId: uuid('channel_id').references(() => channels.id, { onDelete: 'set null' }),
  contentPieceId: uuid('content_piece_id').references(() => contentPieces.id, { onDelete: 'set null' }),
  contentType: text('content_type'),
});

// Monthly goals
export const monthlyGoals = pgTable('monthly_goals', {
  id: uuid('id').defaultRandom().primaryKey(),
  month: integer('month').notNull(),
  year: integer('year').notNull(),
  targetPosts: integer('target_posts').notNull().default(0),
  targetArticles: integer('target_articles').notNull().default(0),
  targetEngagementRate: text('target_engagement_rate').default('0'),
  actualPosts: integer('actual_posts'),
  actualArticles: integer('actual_articles'),
  actualEngagementRate: text('actual_engagement_rate'),
  focusAreas: jsonb('focus_areas').$type<string[]>().default([]),
  keyMessages: jsonb('key_messages').$type<string[]>().default([]),
  monthEndReflection: text('month_end_reflection'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Starter templates (preset configurations)
export const starterTemplates = pgTable('starter_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  templateData: jsonb('template_data').$type<{
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
  }>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
