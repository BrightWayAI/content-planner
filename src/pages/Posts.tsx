import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { useAppStore } from '../store/StoreContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { Input, Textarea, Select } from '../components/Input';
import { getChannelColor, getPillarColor, detectJargon, countWords, analyzeHookStrength } from '../utils/helpers';
import { CHANNELS, PILLARS, VOICE_GUIDELINES } from '../utils/constants';
import type { ContentPiece, Pillar, Channel, ContentStatus } from '../types';

type View = 'list' | 'editor';

const defaultContent: Omit<ContentPiece, 'id' | 'createdAt' | 'updatedAt'> = {
  title: '',
  status: 'drafting',
  channel: 'personal_linkedin',
  contentType: 'short_post',
  pillar: 'practical_implementation',
  body: '',
  hook: '',
};

export function Posts() {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    data,
    addContentIdea,
    deleteContentIdea,
    addContentPiece,
    updateContentPiece,
    deleteContentPiece,
    getContentPiece,
    promoteIdeaToContent,
  } = useAppStore();

  // View state
  const editId = searchParams.get('edit');
  const [view, setView] = useState<View>(editId ? 'editor' : 'list');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ideas' | ContentStatus>('all');

  // Editor state
  const [editContent, setEditContent] = useState(defaultContent);
  const [currentPieceId, setCurrentPieceId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAddIdea, setShowAddIdea] = useState(false);
  const [newIdea, setNewIdea] = useState({
    title: '',
    pillar: 'practical_implementation' as Pillar,
    notes: '',
    sourceUrl: '',
    sourceName: '',
  });

  // Load content for editing
  useEffect(() => {
    if (editId && editId !== 'new') {
      const piece = getContentPiece(editId);
      if (piece) {
        const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = piece;
        setEditContent(rest);
        setCurrentPieceId(editId);
        setView('editor');
      }
    } else if (editId === 'new') {
      setEditContent(defaultContent);
      setCurrentPieceId(null);
      setView('editor');
    }
  }, [editId, getContentPiece]);

  // Combined content list (ideas + content pieces)
  const allContent = useMemo(() => {
    const ideas = data.contentIdeas.map(idea => ({
      type: 'idea' as const,
      id: idea.id,
      title: idea.title,
      pillar: idea.pillar,
      notes: idea.notes,
      sourceUrl: idea.sourceUrl,
      sourceName: idea.sourceName,
      priority: idea.priority,
      createdAt: idea.createdAt,
      status: 'idea' as const,
    }));

    const pieces = data.contentPieces.map(piece => ({
      type: 'piece' as const,
      ...piece,
    }));

    const combined = [...ideas, ...pieces];

    // Filter
    if (statusFilter === 'ideas') {
      return combined.filter(item => item.type === 'idea');
    } else if (statusFilter !== 'all') {
      return combined.filter(item => item.type === 'piece' && item.status === statusFilter);
    }

    // Sort: ideas first, then by date
    return combined.sort((a, b) => {
      if (a.type === 'idea' && b.type !== 'idea') return -1;
      if (a.type !== 'idea' && b.type === 'idea') return 1;
      const dateA = a.type === 'idea' ? a.createdAt : (a as ContentPiece & { type: 'piece' }).updatedAt;
      const dateB = b.type === 'idea' ? b.createdAt : (b as ContentPiece & { type: 'piece' }).updatedAt;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  }, [data.contentIdeas, data.contentPieces, statusFilter]);

  // Stats
  const stats = useMemo(() => ({
    ideas: data.contentIdeas.length,
    drafting: data.contentPieces.filter(p => p.status === 'drafting').length,
    review: data.contentPieces.filter(p => p.status === 'review').length,
    scheduled: data.contentPieces.filter(p => p.status === 'scheduled').length,
    published: data.contentPieces.filter(p => p.status === 'published').length,
  }), [data]);

  // Content analysis for editor
  const analysis = useMemo(() => {
    const fullText = `${editContent.hook || ''} ${editContent.body}`;
    return {
      jargon: detectJargon(fullText),
      wordCount: countWords(fullText),
      hookAnalysis: analyzeHookStrength(editContent.hook || ''),
    };
  }, [editContent.hook, editContent.body]);

  // Start draft from idea
  const handleStartDraft = (ideaId: string) => {
    const piece = promoteIdeaToContent(ideaId);
    if (piece) {
      setSearchParams({ edit: piece.id });
    }
  };

  // Add new idea
  const handleAddIdea = () => {
    if (!newIdea.title.trim()) return;
    addContentIdea({
      title: newIdea.title,
      pillar: newIdea.pillar,
      notes: newIdea.notes,
      priority: 'high',
      sourceUrl: newIdea.sourceUrl || undefined,
      sourceName: newIdea.sourceName || undefined,
    });
    setNewIdea({ title: '', pillar: 'practical_implementation', notes: '', sourceUrl: '', sourceName: '' });
    setShowAddIdea(false);
  };

  // Save draft
  const handleSave = () => {
    setIsSaving(true);
    try {
      if (currentPieceId) {
        updateContentPiece(currentPieceId, editContent);
      } else {
        const newPiece = addContentPiece(editContent);
        setCurrentPieceId(newPiece.id);
        setSearchParams({ edit: newPiece.id });
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Generate AI draft
  const handleGenerateDraft = async () => {
    if (!editContent.title) {
      alert('Add a title first');
      return;
    }
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editContent.title,
          pillar: editContent.pillar,
          channel: editContent.channel,
          notes: editContent.body,
        }),
      });
      if (!response.ok) throw new Error('Failed');
      const result = await response.json();
      setEditContent(prev => ({
        ...prev,
        hook: result.hook || prev.hook,
        body: result.body || prev.body,
        status: 'drafting',
      }));
    } catch {
      alert('AI generation not configured. Add ANTHROPIC_API_KEY in Settings.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Update status
  const handleStatusChange = (newStatus: ContentStatus) => {
    if (currentPieceId) {
      const updates: Partial<ContentPiece> = { status: newStatus };
      if (newStatus === 'published') {
        updates.publishedDate = new Date().toISOString();
      }
      updateContentPiece(currentPieceId, updates);
      setEditContent(prev => ({ ...prev, ...updates }));
    }
  };

  // Delete
  const handleDelete = () => {
    if (currentPieceId && confirm('Delete this post?')) {
      deleteContentPiece(currentPieceId);
      setSearchParams({});
      setView('list');
      setEditContent(defaultContent);
      setCurrentPieceId(null);
    }
  };

  // Back to list
  const handleBackToList = () => {
    setSearchParams({});
    setView('list');
    setEditContent(defaultContent);
    setCurrentPieceId(null);
  };

  // New draft
  const handleNewDraft = () => {
    setEditContent(defaultContent);
    setCurrentPieceId(null);
    setSearchParams({ edit: 'new' });
    setView('editor');
  };

  // Status badge
  const getStatusStyle = (status: string) => {
    const styles: Record<string, { bg: string; text: string; label: string }> = {
      idea: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Idea' },
      drafting: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Drafting' },
      review: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Review' },
      scheduled: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Scheduled' },
      published: { bg: 'bg-green-100', text: 'text-green-700', label: 'Published' },
    };
    return styles[status] || styles.idea;
  };

  // Editor View
  if (view === 'editor') {
    return (
      <div className="space-y-6">
        {/* Editor Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleBackToList}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <span>←</span>
            <span>Back to posts</span>
          </button>
          <div className="flex items-center gap-2">
            {currentPieceId && (
              <button
                onClick={handleDelete}
                className="text-sm text-red-600 hover:text-red-700 px-3 py-1"
              >
                Delete
              </button>
            )}
            <Button variant="secondary" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            {editContent.status !== 'published' && (
              <Button onClick={() => handleStatusChange('published')}>
                Mark Published
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Main Editor */}
          <div className="col-span-2 space-y-4">
            {/* Title */}
            <input
              type="text"
              value={editContent.title}
              onChange={e => setEditContent(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Post title..."
              className="w-full text-2xl font-bold text-gray-900 border-0 border-b border-gray-200 pb-2 focus:outline-none focus:border-blue-500"
            />

            {/* Meta */}
            <div className="flex items-center gap-3">
              <Select
                value={editContent.channel}
                onChange={e => setEditContent(prev => ({ ...prev, channel: e.target.value as Channel }))}
                className="text-sm"
              >
                {Object.entries(CHANNELS).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </Select>
              <Select
                value={editContent.pillar}
                onChange={e => setEditContent(prev => ({ ...prev, pillar: e.target.value as Pillar }))}
                className="text-sm"
              >
                {Object.entries(PILLARS).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </Select>
              <Select
                value={editContent.status}
                onChange={e => handleStatusChange(e.target.value as ContentStatus)}
                className="text-sm"
              >
                <option value="drafting">Drafting</option>
                <option value="review">Review</option>
                <option value="scheduled">Scheduled</option>
                <option value="published">Published</option>
              </Select>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleGenerateDraft}
                disabled={isGenerating}
              >
                {isGenerating ? 'Writing...' : 'AI Draft'}
              </Button>
            </div>

            {/* Hook */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Hook</label>
                <span className={`text-xs ${analysis.hookAnalysis.score >= 60 ? 'text-green-600' : 'text-yellow-600'}`}>
                  {analysis.hookAnalysis.score}% - {analysis.hookAnalysis.feedback}
                </span>
              </div>
              <textarea
                value={editContent.hook || ''}
                onChange={e => setEditContent(prev => ({ ...prev, hook: e.target.value }))}
                placeholder="Write a compelling first line..."
                rows={2}
                className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-lg"
              />
            </div>

            {/* Body */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Body</label>
              <textarea
                value={editContent.body}
                onChange={e => setEditContent(prev => ({ ...prev, body: e.target.value }))}
                placeholder="Write your post content..."
                rows={15}
                className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Schedule */}
            {['scheduled', 'review'].includes(editContent.status) && (
              <Input
                label="Planned Date"
                type="date"
                value={editContent.plannedDate?.split('T')[0] || ''}
                onChange={e => setEditContent(prev => ({ ...prev, plannedDate: e.target.value }))}
              />
            )}

            {/* Published URL */}
            {editContent.status === 'published' && (
              <Input
                label="Published URL"
                type="url"
                value={editContent.publishedUrl || ''}
                onChange={e => setEditContent(prev => ({ ...prev, publishedUrl: e.target.value }))}
                placeholder="https://linkedin.com/posts/..."
              />
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Stats */}
            <Card>
              <h3 className="font-semibold text-gray-900 mb-3">Analysis</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Words</span>
                  <span className="font-medium">{analysis.wordCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Hook strength</span>
                  <span className={`font-medium ${analysis.hookAnalysis.score >= 60 ? 'text-green-600' : 'text-yellow-600'}`}>
                    {analysis.hookAnalysis.score}%
                  </span>
                </div>
                {analysis.jargon.length > 0 && (
                  <div>
                    <span className="text-yellow-600 text-xs">Jargon found:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {analysis.jargon.map(word => (
                        <span key={word} className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Voice Tips */}
            <Card>
              <h3 className="font-semibold text-gray-900 mb-3">Voice Guide</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-xs font-medium text-green-700 mb-1">Do</p>
                  <ul className="text-xs text-gray-600 space-y-0.5">
                    {VOICE_GUIDELINES.do.slice(0, 3).map((item, i) => (
                      <li key={i}>"{item}"</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-medium text-red-700 mb-1">Don't</p>
                  <ul className="text-xs text-gray-400 space-y-0.5">
                    {VOICE_GUIDELINES.dont.slice(0, 3).map((item, i) => (
                      <li key={i} className="line-through">"{item}"</li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>

            {/* Pillar Info */}
            <Card padding="sm">
              <div className={`w-2 h-2 rounded-full ${PILLARS[editContent.pillar].color} mb-2`} />
              <h4 className="font-medium text-gray-900 text-sm">{PILLARS[editContent.pillar].label}</h4>
              <p className="text-xs text-gray-500 mt-1">{PILLARS[editContent.pillar].description}</p>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // List View
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Posts</h1>
          <p className="text-gray-500">
            {stats.ideas} ideas · {stats.drafting + stats.review} drafts · {stats.published} published
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setShowAddIdea(true)}>
            + Add Idea
          </Button>
          <Button onClick={handleNewDraft}>
            + New Draft
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 rounded text-sm ${
            statusFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setStatusFilter('ideas')}
          className={`px-3 py-1.5 rounded text-sm flex items-center gap-1.5 ${
            statusFilter === 'ideas' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Ideas <span className="text-xs opacity-70">{stats.ideas}</span>
        </button>
        <button
          onClick={() => setStatusFilter('drafting')}
          className={`px-3 py-1.5 rounded text-sm flex items-center gap-1.5 ${
            statusFilter === 'drafting' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Drafting <span className="text-xs opacity-70">{stats.drafting}</span>
        </button>
        <button
          onClick={() => setStatusFilter('review')}
          className={`px-3 py-1.5 rounded text-sm flex items-center gap-1.5 ${
            statusFilter === 'review' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Review <span className="text-xs opacity-70">{stats.review}</span>
        </button>
        <button
          onClick={() => setStatusFilter('scheduled')}
          className={`px-3 py-1.5 rounded text-sm flex items-center gap-1.5 ${
            statusFilter === 'scheduled' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Scheduled <span className="text-xs opacity-70">{stats.scheduled}</span>
        </button>
        <button
          onClick={() => setStatusFilter('published')}
          className={`px-3 py-1.5 rounded text-sm flex items-center gap-1.5 ${
            statusFilter === 'published' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Published <span className="text-xs opacity-70">{stats.published}</span>
        </button>
      </div>

      {/* Content List */}
      {allContent.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-gray-500 mb-4">No content yet</p>
          <div className="flex items-center justify-center gap-2">
            <Button variant="secondary" onClick={() => setShowAddIdea(true)}>
              Add an idea
            </Button>
            <Button onClick={handleNewDraft}>
              Start a draft
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {allContent.map(item => {
            if (item.type === 'idea') {
              return (
                <Card key={item.id} className="hover:border-gray-300 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="bg-gray-100 text-gray-600">Idea</Badge>
                        <Badge className={getPillarColor(item.pillar)}>
                          {PILLARS[item.pillar].label}
                        </Badge>
                        {item.priority === 'high' && (
                          <Badge className="bg-red-100 text-red-700">High</Badge>
                        )}
                        <span className="text-xs text-gray-400">
                          {format(parseISO(item.createdAt), 'MMM d')}
                        </span>
                      </div>
                      <h3 className="font-medium text-gray-900">{item.title}</h3>
                      {item.notes && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.notes}</p>
                      )}
                      {item.sourceUrl && (
                        <a
                          href={item.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                        >
                          {item.sourceName || 'Source'} →
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={() => handleStartDraft(item.id)}>
                        Start Draft
                      </Button>
                      <button
                        onClick={() => deleteContentIdea(item.id)}
                        className="text-gray-400 hover:text-red-600 p-1"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </Card>
              );
            }

            const piece = item as ContentPiece & { type: 'piece' };
            const statusStyle = getStatusStyle(piece.status);

            return (
              <Card
                key={piece.id}
                className="hover:border-gray-300 transition-colors cursor-pointer"
                onClick={() => setSearchParams({ edit: piece.id })}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={`${statusStyle.bg} ${statusStyle.text}`}>
                        {statusStyle.label}
                      </Badge>
                      <Badge className={getChannelColor(piece.channel)}>
                        {CHANNELS[piece.channel].label}
                      </Badge>
                      <Badge className={getPillarColor(piece.pillar)}>
                        {PILLARS[piece.pillar].label}
                      </Badge>
                      {piece.plannedDate && (
                        <span className="text-xs text-gray-400">
                          {format(parseISO(piece.plannedDate), 'MMM d')}
                        </span>
                      )}
                    </div>
                    <h3 className="font-medium text-gray-900">{piece.title || 'Untitled'}</h3>
                    {piece.hook && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-1">{piece.hook}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      Updated {format(parseISO(piece.updatedAt), 'MMM d, h:mm a')}
                    </p>
                  </div>
                  <span className="text-sm text-blue-600">Edit →</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Idea Modal */}
      <Modal
        isOpen={showAddIdea}
        onClose={() => setShowAddIdea(false)}
        title="Add Idea"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddIdea(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddIdea}>Add</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="What's the idea?"
            value={newIdea.title}
            onChange={e => setNewIdea(prev => ({ ...prev, title: e.target.value }))}
            placeholder="e.g., Why most AI pilots fail..."
          />
          <Select
            label="Pillar"
            value={newIdea.pillar}
            onChange={e => setNewIdea(prev => ({ ...prev, pillar: e.target.value as Pillar }))}
          >
            {Object.entries(PILLARS).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </Select>
          <Textarea
            label="Notes (optional)"
            value={newIdea.notes}
            onChange={e => setNewIdea(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Any context, angles, or key points..."
            rows={3}
          />
          <Input
            label="Source URL (optional)"
            type="url"
            value={newIdea.sourceUrl}
            onChange={e => setNewIdea(prev => ({ ...prev, sourceUrl: e.target.value }))}
            placeholder="https://..."
          />
          <Input
            label="Source Name (optional)"
            value={newIdea.sourceName}
            onChange={e => setNewIdea(prev => ({ ...prev, sourceName: e.target.value }))}
            placeholder="e.g., TechCrunch, HBR, etc."
          />
        </div>
      </Modal>
    </div>
  );
}
