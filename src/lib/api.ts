import type {
  FullConfig,
  AppConfig,
  ContentPillar,
  Channel,
  ContentType,
  NewsSource,
  VoiceProfile,
  VoiceSample,
  ContentIdea,
  ContentPiece,
  ContentMetrics,
  DraftVersion,
  WeeklyPlan,
  MonthlyGoals,
  StarterTemplate,
  ScrapeResult,
} from '@/types';

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

// --- Config ---
export const api = {
  config: {
    get: () => request<FullConfig>('/config'),
    getStatus: () => request<{ configured: boolean }>('/config/status'),
    update: (data: Partial<AppConfig>) => request<AppConfig>('/config', { method: 'PUT', body: JSON.stringify(data) }),
    applyTemplate: (templateId: string) => request<{ success: boolean }>('/config/apply-template', { method: 'POST', body: JSON.stringify({ templateId }) }),
  },

  pillars: {
    list: () => request<ContentPillar[]>('/pillars'),
    create: (data: Partial<ContentPillar>) => request<ContentPillar>('/pillars', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<ContentPillar>) => request<ContentPillar>(`/pillars/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<{ success: boolean }>(`/pillars/${id}`, { method: 'DELETE' }),
  },

  channels: {
    list: () => request<Channel[]>('/channels'),
    create: (data: Partial<Channel>) => request<Channel>('/channels', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Channel>) => request<Channel>(`/channels/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<{ success: boolean }>(`/channels/${id}`, { method: 'DELETE' }),
  },

  contentTypes: {
    list: () => request<ContentType[]>('/content-types'),
    create: (data: Partial<ContentType>) => request<ContentType>('/content-types', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<ContentType>) => request<ContentType>(`/content-types/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<{ success: boolean }>(`/content-types/${id}`, { method: 'DELETE' }),
  },

  sources: {
    list: () => request<NewsSource[]>('/sources'),
    create: (data: Partial<NewsSource>) => request<NewsSource>('/sources', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<NewsSource>) => request<NewsSource>(`/sources/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<{ success: boolean }>(`/sources/${id}`, { method: 'DELETE' }),
    test: (id: string) => request<{ headlines: string[] }>(`/sources/${id}/test`, { method: 'POST' }),
    scrape: (sourceIds?: string[]) => request<ScrapeResult[]>('/sources/scrape', { method: 'POST', body: JSON.stringify({ sourceIds }) }),
  },

  voice: {
    get: () => request<{ profile: VoiceProfile | null; samples: VoiceSample[] }>('/voice'),
    update: (data: Partial<VoiceProfile>) => request<VoiceProfile>('/voice', { method: 'PUT', body: JSON.stringify(data) }),
    addSample: (data: { title: string; content: string; sourceType: string; metadata?: Record<string, string> }) =>
      request<VoiceSample>('/voice/samples', { method: 'POST', body: JSON.stringify(data) }),
    addSampleFromUrl: (data: { url: string; title?: string }) =>
      request<VoiceSample>('/voice/samples/from-url', { method: 'POST', body: JSON.stringify(data) }),
    deleteSample: (id: string) => request<{ success: boolean }>(`/voice/samples/${id}`, { method: 'DELETE' }),
    analyze: () => request<{ summary: string }>('/voice/analyze', { method: 'POST' }),
  },

  ideas: {
    list: () => request<ContentIdea[]>('/ideas'),
    create: (data: Partial<ContentIdea>) => request<ContentIdea>('/ideas', { method: 'POST', body: JSON.stringify(data) }),
    batchCreate: (ideas: Partial<ContentIdea>[]) => request<ContentIdea[]>('/ideas/batch', { method: 'POST', body: JSON.stringify({ ideas }) }),
    update: (id: string, data: Partial<ContentIdea>) => request<ContentIdea>(`/ideas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<{ success: boolean }>(`/ideas/${id}`, { method: 'DELETE' }),
    bulkDelete: (ids: string[]) => request<{ success: boolean }>('/ideas', { method: 'DELETE', body: JSON.stringify({ ids }) }),
    promote: (id: string, channelId?: string) => request<ContentPiece>(`/ideas/${id}/promote`, { method: 'POST', body: JSON.stringify({ channelId }) }),
  },

  pieces: {
    list: () => request<ContentPiece[]>('/pieces'),
    get: (id: string) => request<ContentPiece>(`/pieces/${id}`),
    create: (data: Partial<ContentPiece>) => request<ContentPiece>('/pieces', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<ContentPiece>) => request<ContentPiece>(`/pieces/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<{ success: boolean }>(`/pieces/${id}`, { method: 'DELETE' }),
  },

  metrics: {
    list: () => request<ContentMetrics[]>('/metrics'),
    getForPiece: (pieceId: string) => request<ContentMetrics[]>(`/metrics/${pieceId}`),
    create: (data: Partial<ContentMetrics>) => request<ContentMetrics>('/metrics', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<ContentMetrics>) => request<ContentMetrics>(`/metrics/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  },

  versions: {
    list: (pieceId: string) => request<DraftVersion[]>(`/versions/${pieceId}`),
    create: (data: Partial<DraftVersion>) => request<DraftVersion>('/versions', { method: 'POST', body: JSON.stringify(data) }),
  },

  planning: {
    weeklyPlans: () => request<WeeklyPlan[]>('/weekly-plans'),
    weeklyPlan: (weekStartDate: string) => request<WeeklyPlan & { slots: unknown[] }>(`/weekly-plans/${weekStartDate}`),
    createWeeklyPlan: (data: Partial<WeeklyPlan>) => request<WeeklyPlan>('/weekly-plans', { method: 'POST', body: JSON.stringify(data) }),
    updateWeeklyPlan: (id: string, data: Partial<WeeklyPlan>) => request<WeeklyPlan>(`/weekly-plans/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    monthlyGoals: () => request<MonthlyGoals[]>('/monthly-goals'),
    monthlyGoal: (year: number, month: number) => request<MonthlyGoals | null>(`/monthly-goals/${year}/${month}`),
    createMonthlyGoal: (data: Partial<MonthlyGoals>) => request<MonthlyGoals>('/monthly-goals', { method: 'POST', body: JSON.stringify(data) }),
    updateMonthlyGoal: (id: string, data: Partial<MonthlyGoals>) => request<MonthlyGoals>(`/monthly-goals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  },

  templates: {
    list: () => request<StarterTemplate[]>('/templates'),
  },

  ai: {
    generateIdeas: (data: { headlines?: string[]; pillarIds?: string[] }) =>
      request<{ ideas: Array<{ title: string; pillarId: string; notes: string; priority: string }> }>('/ai/generate-ideas', { method: 'POST', body: JSON.stringify(data) }),
    generateDraft: (data: { title: string; pillarId?: string; channelId?: string; notes?: string }) =>
      request<{ hook: string; body: string }>('/ai/generate-draft', { method: 'POST', body: JSON.stringify(data) }),
    refineDraft: (data: { hook?: string; body: string; instruction: string }) =>
      request<{ hook: string; body: string; changes: string }>('/ai/refine-draft', { method: 'POST', body: JSON.stringify(data) }),
  },

  health: () => request<{ status: string; hasApiKey: boolean }>('/health'),
};
