import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type {
  AppData,
  ContentPiece,
  ContentMetrics,
  WeeklyPlan,
  MonthlyGoals,
  ContentIdea,
} from '../types';
import { SEED_IDEAS } from './seedData';

const STORAGE_KEY = 'brightway-thought-leadership';
const SEEDED_KEY = 'brightway-seeded';

const getInitialData = (): AppData => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      // Check if we should seed ideas (first time or empty)
      const hasSeeded = localStorage.getItem(SEEDED_KEY);
      if (!hasSeeded && data.contentIdeas.length === 0) {
        data.contentIdeas = SEED_IDEAS;
        localStorage.setItem(SEEDED_KEY, 'true');
      }
      return data;
    }
  } catch (e) {
    console.error('Failed to load data from localStorage:', e);
  }
  // First time - seed with ideas
  localStorage.setItem(SEEDED_KEY, 'true');
  return {
    contentPieces: [],
    contentMetrics: [],
    weeklyPlans: [],
    monthlyGoals: [],
    contentIdeas: SEED_IDEAS,
  };
};

export function useStore() {
  const [data, setData] = useState<AppData>(getInitialData);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save data to localStorage:', e);
    }
  }, [data]);

  // Content Pieces
  const addContentPiece = useCallback((piece: Omit<ContentPiece, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newPiece: ContentPiece = {
      ...piece,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };
    setData(prev => ({
      ...prev,
      contentPieces: [...prev.contentPieces, newPiece],
    }));
    return newPiece;
  }, []);

  const updateContentPiece = useCallback((id: string, updates: Partial<ContentPiece>) => {
    setData(prev => ({
      ...prev,
      contentPieces: prev.contentPieces.map(piece =>
        piece.id === id
          ? { ...piece, ...updates, updatedAt: new Date().toISOString() }
          : piece
      ),
    }));
  }, []);

  const deleteContentPiece = useCallback((id: string) => {
    setData(prev => ({
      ...prev,
      contentPieces: prev.contentPieces.filter(piece => piece.id !== id),
      contentMetrics: prev.contentMetrics.filter(m => m.contentPieceId !== id),
    }));
  }, []);

  const getContentPiece = useCallback((id: string) => {
    return data.contentPieces.find(piece => piece.id === id);
  }, [data.contentPieces]);

  // Content Metrics
  const addContentMetrics = useCallback((metrics: Omit<ContentMetrics, 'id' | 'recordedAt'>) => {
    const newMetrics: ContentMetrics = {
      ...metrics,
      id: uuidv4(),
      recordedAt: new Date().toISOString(),
    };
    setData(prev => ({
      ...prev,
      contentMetrics: [...prev.contentMetrics, newMetrics],
    }));
    return newMetrics;
  }, []);

  const updateContentMetrics = useCallback((id: string, updates: Partial<ContentMetrics>) => {
    setData(prev => ({
      ...prev,
      contentMetrics: prev.contentMetrics.map(m =>
        m.id === id ? { ...m, ...updates } : m
      ),
    }));
  }, []);

  const getMetricsForContent = useCallback((contentPieceId: string) => {
    return data.contentMetrics.filter(m => m.contentPieceId === contentPieceId);
  }, [data.contentMetrics]);

  // Weekly Plans
  const addWeeklyPlan = useCallback((plan: Omit<WeeklyPlan, 'id'>) => {
    const newPlan: WeeklyPlan = {
      ...plan,
      id: uuidv4(),
    };
    setData(prev => ({
      ...prev,
      weeklyPlans: [...prev.weeklyPlans, newPlan],
    }));
    return newPlan;
  }, []);

  const updateWeeklyPlan = useCallback((id: string, updates: Partial<WeeklyPlan>) => {
    setData(prev => ({
      ...prev,
      weeklyPlans: prev.weeklyPlans.map(plan =>
        plan.id === id ? { ...plan, ...updates } : plan
      ),
    }));
  }, []);

  const getWeeklyPlan = useCallback((weekStartDate: string) => {
    return data.weeklyPlans.find(plan => plan.weekStartDate === weekStartDate);
  }, [data.weeklyPlans]);

  // Monthly Goals
  const addMonthlyGoals = useCallback((goals: Omit<MonthlyGoals, 'id'>) => {
    const newGoals: MonthlyGoals = {
      ...goals,
      id: uuidv4(),
    };
    setData(prev => ({
      ...prev,
      monthlyGoals: [...prev.monthlyGoals, newGoals],
    }));
    return newGoals;
  }, []);

  const updateMonthlyGoals = useCallback((id: string, updates: Partial<MonthlyGoals>) => {
    setData(prev => ({
      ...prev,
      monthlyGoals: prev.monthlyGoals.map(g =>
        g.id === id ? { ...g, ...updates } : g
      ),
    }));
  }, []);

  const getMonthlyGoals = useCallback((month: number, year: number) => {
    return data.monthlyGoals.find(g => g.month === month && g.year === year);
  }, [data.monthlyGoals]);

  // Content Ideas
  const addContentIdea = useCallback((idea: Omit<ContentIdea, 'id' | 'createdAt'>) => {
    const newIdea: ContentIdea = {
      ...idea,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };
    setData(prev => ({
      ...prev,
      contentIdeas: [...prev.contentIdeas, newIdea],
    }));
    return newIdea;
  }, []);

  const updateContentIdea = useCallback((id: string, updates: Partial<ContentIdea>) => {
    setData(prev => ({
      ...prev,
      contentIdeas: prev.contentIdeas.map(idea =>
        idea.id === id ? { ...idea, ...updates } : idea
      ),
    }));
  }, []);

  const deleteContentIdea = useCallback((id: string) => {
    setData(prev => ({
      ...prev,
      contentIdeas: prev.contentIdeas.filter(idea => idea.id !== id),
    }));
  }, []);

  const promoteIdeaToContent = useCallback((ideaId: string) => {
    const idea = data.contentIdeas.find(i => i.id === ideaId);
    if (!idea) return null;

    const piece = addContentPiece({
      title: idea.title,
      status: 'idea',
      channel: 'personal_linkedin',
      contentType: 'short_post',
      pillar: idea.pillar,
      body: idea.notes || '',
    });

    deleteContentIdea(ideaId);
    return piece;
  }, [data.contentIdeas, addContentPiece, deleteContentIdea]);

  // Export/Import
  const exportData = useCallback(() => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brightway-thought-leadership-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data]);

  const importData = useCallback((jsonString: string) => {
    try {
      const imported = JSON.parse(jsonString) as AppData;
      if (
        !imported.contentPieces ||
        !imported.contentMetrics ||
        !imported.weeklyPlans ||
        !imported.monthlyGoals ||
        !imported.contentIdeas
      ) {
        throw new Error('Invalid data format');
      }
      setData(imported);
      return true;
    } catch (e) {
      console.error('Failed to import data:', e);
      return false;
    }
  }, []);

  const clearAllData = useCallback(() => {
    setData({
      contentPieces: [],
      contentMetrics: [],
      weeklyPlans: [],
      monthlyGoals: [],
      contentIdeas: [],
    });
  }, []);

  return {
    data,
    // Content Pieces
    addContentPiece,
    updateContentPiece,
    deleteContentPiece,
    getContentPiece,
    // Content Metrics
    addContentMetrics,
    updateContentMetrics,
    getMetricsForContent,
    // Weekly Plans
    addWeeklyPlan,
    updateWeeklyPlan,
    getWeeklyPlan,
    // Monthly Goals
    addMonthlyGoals,
    updateMonthlyGoals,
    getMonthlyGoals,
    // Content Ideas
    addContentIdea,
    updateContentIdea,
    deleteContentIdea,
    promoteIdeaToContent,
    // Export/Import
    exportData,
    importData,
    clearAllData,
  };
}
