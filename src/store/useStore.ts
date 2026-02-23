import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type {
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
} from '@/types';

export interface StoreData {
  config: AppConfig | null;
  pillars: ContentPillar[];
  channels: Channel[];
  contentTypes: ContentType[];
  sources: NewsSource[];
  voiceProfile: VoiceProfile | null;
  voiceSamples: VoiceSample[];
  contentPieces: ContentPiece[];
  contentIdeas: ContentIdea[];
  contentMetrics: ContentMetrics[];
  isLoading: boolean;
  isConfigured: boolean;
}

export function useStore() {
  const [data, setData] = useState<StoreData>({
    config: null,
    pillars: [],
    channels: [],
    contentTypes: [],
    sources: [],
    voiceProfile: null,
    voiceSamples: [],
    contentPieces: [],
    contentIdeas: [],
    contentMetrics: [],
    isLoading: true,
    isConfigured: false,
  });

  // Initial data fetch
  useEffect(() => {
    async function load() {
      try {
        const [configResult, ideas, pieces, metrics, sourcesData, voiceData] = await Promise.all([
          api.config.get(),
          api.ideas.list(),
          api.pieces.list(),
          api.metrics.list(),
          api.sources.list(),
          api.voice.get(),
        ]);

        setData({
          config: configResult.config,
          pillars: configResult.pillars,
          channels: configResult.channels,
          contentTypes: configResult.contentTypes,
          sources: sourcesData,
          voiceProfile: voiceData.profile,
          voiceSamples: voiceData.samples,
          contentPieces: pieces,
          contentIdeas: ideas,
          contentMetrics: metrics,
          isLoading: false,
          isConfigured: !!configResult.config,
        });
      } catch (error) {
        console.error('Failed to load data:', error);
        setData(prev => ({ ...prev, isLoading: false }));
      }
    }
    load();
  }, []);

  // --- Config ---
  const updateConfig = useCallback(async (updates: Partial<AppConfig>) => {
    const updated = await api.config.update(updates);
    setData(prev => ({ ...prev, config: updated }));
    return updated;
  }, []);

  const refreshConfig = useCallback(async () => {
    const result = await api.config.get();
    setData(prev => ({
      ...prev,
      config: result.config,
      pillars: result.pillars,
      channels: result.channels,
      contentTypes: result.contentTypes,
      isConfigured: !!result.config,
    }));
  }, []);

  // --- Pillars ---
  const addPillar = useCallback(async (pillar: Partial<ContentPillar>) => {
    const created = await api.pillars.create(pillar);
    setData(prev => ({ ...prev, pillars: [...prev.pillars, created] }));
    return created;
  }, []);

  const updatePillar = useCallback(async (id: string, updates: Partial<ContentPillar>) => {
    const updated = await api.pillars.update(id, updates);
    setData(prev => ({ ...prev, pillars: prev.pillars.map(p => p.id === id ? updated : p) }));
    return updated;
  }, []);

  const deletePillar = useCallback(async (id: string) => {
    await api.pillars.delete(id);
    setData(prev => ({ ...prev, pillars: prev.pillars.filter(p => p.id !== id) }));
  }, []);

  // --- Channels ---
  const addChannel = useCallback(async (channel: Partial<Channel>) => {
    const created = await api.channels.create(channel);
    setData(prev => ({ ...prev, channels: [...prev.channels, created] }));
    return created;
  }, []);

  const updateChannel = useCallback(async (id: string, updates: Partial<Channel>) => {
    const updated = await api.channels.update(id, updates);
    setData(prev => ({ ...prev, channels: prev.channels.map(c => c.id === id ? updated : c) }));
    return updated;
  }, []);

  const deleteChannel = useCallback(async (id: string) => {
    await api.channels.delete(id);
    setData(prev => ({ ...prev, channels: prev.channels.filter(c => c.id !== id) }));
  }, []);

  // --- Content Types ---
  const addContentType = useCallback(async (ct: Partial<ContentType>) => {
    const created = await api.contentTypes.create(ct);
    setData(prev => ({ ...prev, contentTypes: [...prev.contentTypes, created] }));
    return created;
  }, []);

  const updateContentType = useCallback(async (id: string, updates: Partial<ContentType>) => {
    const updated = await api.contentTypes.update(id, updates);
    setData(prev => ({ ...prev, contentTypes: prev.contentTypes.map(ct => ct.id === id ? updated : ct) }));
    return updated;
  }, []);

  const deleteContentType = useCallback(async (id: string) => {
    await api.contentTypes.delete(id);
    setData(prev => ({ ...prev, contentTypes: prev.contentTypes.filter(ct => ct.id !== id) }));
  }, []);

  // --- Sources ---
  const addSource = useCallback(async (source: Partial<NewsSource>) => {
    const created = await api.sources.create(source);
    setData(prev => ({ ...prev, sources: [...prev.sources, created] }));
    return created;
  }, []);

  const updateSource = useCallback(async (id: string, updates: Partial<NewsSource>) => {
    const updated = await api.sources.update(id, updates);
    setData(prev => ({ ...prev, sources: prev.sources.map(s => s.id === id ? updated : s) }));
    return updated;
  }, []);

  const deleteSource = useCallback(async (id: string) => {
    await api.sources.delete(id);
    setData(prev => ({ ...prev, sources: prev.sources.filter(s => s.id !== id) }));
  }, []);

  // --- Voice ---
  const updateVoiceProfile = useCallback(async (updates: Partial<VoiceProfile>) => {
    const updated = await api.voice.update(updates);
    setData(prev => ({ ...prev, voiceProfile: updated }));
    return updated;
  }, []);

  const addVoiceSample = useCallback(async (sample: { title: string; content: string; sourceType: string }) => {
    const created = await api.voice.addSample(sample);
    setData(prev => ({ ...prev, voiceSamples: [...prev.voiceSamples, created] }));
    return created;
  }, []);

  const addVoiceSampleFromUrl = useCallback(async (url: string, title?: string) => {
    const created = await api.voice.addSampleFromUrl({ url, title });
    setData(prev => ({ ...prev, voiceSamples: [...prev.voiceSamples, created] }));
    return created;
  }, []);

  const deleteVoiceSample = useCallback(async (id: string) => {
    await api.voice.deleteSample(id);
    setData(prev => ({ ...prev, voiceSamples: prev.voiceSamples.filter(s => s.id !== id) }));
  }, []);

  const analyzeVoice = useCallback(async () => {
    const result = await api.voice.analyze();
    setData(prev => ({
      ...prev,
      voiceProfile: prev.voiceProfile
        ? { ...prev.voiceProfile, analyzedVoiceSummary: result.summary }
        : null,
    }));
    return result.summary;
  }, []);

  // --- Content Ideas ---
  const addContentIdea = useCallback(async (idea: Partial<ContentIdea>) => {
    const created = await api.ideas.create(idea);
    setData(prev => ({ ...prev, contentIdeas: [created, ...prev.contentIdeas] }));
    return created;
  }, []);

  const batchAddIdeas = useCallback(async (ideas: Partial<ContentIdea>[]) => {
    const created = await api.ideas.batchCreate(ideas);
    setData(prev => ({ ...prev, contentIdeas: [...created, ...prev.contentIdeas] }));
    return created;
  }, []);

  const updateContentIdea = useCallback(async (id: string, updates: Partial<ContentIdea>) => {
    const updated = await api.ideas.update(id, updates);
    setData(prev => ({ ...prev, contentIdeas: prev.contentIdeas.map(i => i.id === id ? updated : i) }));
    return updated;
  }, []);

  const deleteContentIdea = useCallback(async (id: string) => {
    await api.ideas.delete(id);
    setData(prev => ({ ...prev, contentIdeas: prev.contentIdeas.filter(i => i.id !== id) }));
  }, []);

  const promoteIdeaToContent = useCallback(async (ideaId: string, channelId?: string) => {
    const piece = await api.ideas.promote(ideaId, channelId);
    setData(prev => ({
      ...prev,
      contentIdeas: prev.contentIdeas.filter(i => i.id !== ideaId),
      contentPieces: [piece, ...prev.contentPieces],
    }));
    return piece;
  }, []);

  // --- Content Pieces ---
  const addContentPiece = useCallback(async (piece: Partial<ContentPiece>) => {
    const created = await api.pieces.create(piece);
    setData(prev => ({ ...prev, contentPieces: [created, ...prev.contentPieces] }));
    return created;
  }, []);

  const updateContentPiece = useCallback(async (id: string, updates: Partial<ContentPiece>) => {
    const updated = await api.pieces.update(id, updates);
    setData(prev => ({ ...prev, contentPieces: prev.contentPieces.map(p => p.id === id ? updated : p) }));
    return updated;
  }, []);

  const deleteContentPiece = useCallback(async (id: string) => {
    await api.pieces.delete(id);
    setData(prev => ({
      ...prev,
      contentPieces: prev.contentPieces.filter(p => p.id !== id),
      contentMetrics: prev.contentMetrics.filter(m => m.contentPieceId !== id),
    }));
  }, []);

  const getContentPiece = useCallback((id: string) => {
    return data.contentPieces.find(p => p.id === id);
  }, [data.contentPieces]);

  // --- Metrics ---
  const addContentMetrics = useCallback(async (metrics: Partial<ContentMetrics>) => {
    const created = await api.metrics.create(metrics);
    setData(prev => ({ ...prev, contentMetrics: [created, ...prev.contentMetrics] }));
    return created;
  }, []);

  const updateContentMetrics = useCallback(async (id: string, updates: Partial<ContentMetrics>) => {
    const updated = await api.metrics.update(id, updates);
    setData(prev => ({ ...prev, contentMetrics: prev.contentMetrics.map(m => m.id === id ? updated : m) }));
    return updated;
  }, []);

  const getMetricsForContent = useCallback((contentPieceId: string) => {
    return data.contentMetrics.filter(m => m.contentPieceId === contentPieceId);
  }, [data.contentMetrics]);

  // --- Helpers ---
  const getPillarById = useCallback((id: string | null) => {
    if (!id) return null;
    return data.pillars.find(p => p.id === id) || null;
  }, [data.pillars]);

  const getChannelById = useCallback((id: string | null) => {
    if (!id) return null;
    return data.channels.find(c => c.id === id) || null;
  }, [data.channels]);

  const getContentTypeById = useCallback((id: string | null) => {
    if (!id) return null;
    return data.contentTypes.find(ct => ct.id === id) || null;
  }, [data.contentTypes]);

  return {
    data,
    // Config
    updateConfig,
    refreshConfig,
    // Pillars
    addPillar,
    updatePillar,
    deletePillar,
    // Channels
    addChannel,
    updateChannel,
    deleteChannel,
    // Content Types
    addContentType,
    updateContentType,
    deleteContentType,
    // Sources
    addSource,
    updateSource,
    deleteSource,
    // Voice
    updateVoiceProfile,
    addVoiceSample,
    addVoiceSampleFromUrl,
    deleteVoiceSample,
    analyzeVoice,
    // Content Ideas
    addContentIdea,
    batchAddIdeas,
    updateContentIdea,
    deleteContentIdea,
    promoteIdeaToContent,
    // Content Pieces
    addContentPiece,
    updateContentPiece,
    deleteContentPiece,
    getContentPiece,
    // Metrics
    addContentMetrics,
    updateContentMetrics,
    getMetricsForContent,
    // Helpers
    getPillarById,
    getChannelById,
    getContentTypeById,
  };
}
