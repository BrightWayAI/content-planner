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
import type { ContentPiece, ContentIdea, Pillar, Channel } from '../types';

type Tab = 'ideas' | 'drafts' | 'published';

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
  } = useAppStore();

  // Tab state
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<Tab>(
    tabParam === 'drafts' ? 'drafts' : tabParam === 'published' ? 'published' : 'ideas'
  );

  // Ideas state
  const [selectedIdeas, setSelectedIdeas] = useState<Set<string>>(new Set());
  const [showAddIdea, setShowAddIdea] = useState(false);
  const [ideaFilter, setIdeaFilter] = useState<'all' | Pillar>('all');
  const [newIdea, setNewIdea] = useState({
    title: '',
    pillar: 'practical_implementation' as Pillar,
    notes: '',
    sourceUrl: '',
    sourceName: '',
  });

  // Editor state
  const editId = searchParams.get('edit');
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(defaultContent);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Load content for editing
  useEffect(() => {
    if (editId) {
      const piece = getContentPiece(editId);
      if (piece) {
        const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = piece;
        setEditContent(rest);
        setIsEditing(true);
      }
    } else {
      setIsEditing(false);
      setEditContent(defaultContent);
    }
  }, [editId, getContentPiece]);

  // Filtered ideas
  const filteredIdeas = useMemo(() => {
    return data.contentIdeas
      .filter(idea => ideaFilter === 'all' || idea.pillar === ideaFilter)
      .sort((a, b) => {
        const order = { high: 0, medium: 1, someday: 2 };
        if (a.priority !== b.priority) {
          return order[a.priority] - order[b.priority];
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [data.contentIdeas, ideaFilter]);

  // Drafts (all non-published content pieces)
  const drafts = useMemo(() => {
    return data.contentPieces
      .filter(p => ['idea', 'drafting', 'review', 'scheduled'].includes(p.status))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [data.contentPieces]);

  // Published content
  const published = useMemo(() => {
    return data.contentPieces
      .filter(p => p.status === 'published')
      .sort((a, b) => {
        const dateA = a.publishedDate || a.updatedAt;
        const dateB = b.publishedDate || b.updatedAt;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });
  }, [data.contentPieces]);

  // Content analysis for editor
  const analysis = useMemo(() => {
    const fullText = `${editContent.hook || ''} ${editContent.body}`;
    return {
      jargon: detectJargon(fullText),
      wordCount: countWords(fullText),
      hookAnalysis: analyzeHookStrength(editContent.hook || ''),
    };
  }, [editContent.hook, editContent.body]);

  // Handle tab change
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
    setSelectedIdeas(new Set());
  };

  // Handle idea selection
  const toggleIdeaSelection = (ideaId: string) => {
    const newSelection = new Set(selectedIdeas);
    if (newSelection.has(ideaId)) {
      newSelection.delete(ideaId);
    } else {
      newSelection.add(ideaId);
    }
    setSelectedIdeas(newSelection);
  };

  // Start draft from selected ideas
  const handleStartDraft = () => {
    if (selectedIdeas.size === 0) return;

    // Get selected ideas
    const ideas = data.contentIdeas.filter(i => selectedIdeas.has(i.id));

    // Combine ideas into a single draft (or create multiple)
    if (ideas.length === 1) {
      const idea = ideas[0];
      const piece = addContentPiece({
        title: idea.title,
        status: 'drafting',
        channel: 'personal_linkedin',
        contentType: 'short_post',
        pillar: idea.pillar,
        body: idea.notes || '',
        notes: idea.sourceUrl ? `Source: ${idea.sourceUrl}` : undefined,
      });
      deleteContentIdea(idea.id);
      setSearchParams({ edit: piece.id });
    } else {
      // Create multiple drafts
      ideas.forEach(idea => {
        addContentPiece({
          title: idea.title,
          status: 'drafting',
          channel: 'personal_linkedin',
          contentType: 'short_post',
          pillar: idea.pillar,
          body: idea.notes || '',
          notes: idea.sourceUrl ? `Source: ${idea.sourceUrl}` : undefined,
        });
        deleteContentIdea(idea.id);
      });
      setActiveTab('drafts');
      setSearchParams({ tab: 'drafts' });
    }
    setSelectedIdeas(new Set());
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
      if (editId) {
        updateContentPiece(editId, editContent);
      } else {
        const newPiece = addContentPiece(editContent);
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
      }));
    } catch {
      alert('AI generation not configured. Add ANTHROPIC_API_KEY in Settings.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Publish content
  const handlePublish = () => {
    if (editId) {
      updateContentPiece(editId, {
        ...editContent,
        status: 'published',
        publishedDate: new Date().toISOString(),
      });
      setSearchParams({ tab: 'published' });
      setActiveTab('published');
    }
  };

  // Delete content
  const handleDelete = () => {
    if (editId && confirm('Delete this draft?')) {
      deleteContentPiece(editId);
      setSearchParams({ tab: activeTab });
    }
  };

  // Close editor
  const handleCloseEditor = () => {
    setSearchParams({ tab: activeTab });
    setIsEditing(false);
    setEditContent(defaultContent);
  };

  // Status badge
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      idea: 'bg-gray-100 text-gray-600',
      drafting: 'bg-yellow-100 text-yellow-700',
      review: 'bg-orange-100 text-orange-700',
      scheduled: 'bg-blue-100 text-blue-700',
      published: 'bg-green-100 text-green-700',
    };
    const labels: Record<string, string> = {
      idea: 'New',
      drafting: 'Writing',
      review: 'Review',
      scheduled: 'Ready',
      published: 'Published',
    };
    return { style: styles[status] || styles.idea, label: labels[status] || status };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Posts</h1>
          <p className="text-gray-500">
            {data.contentIdeas.length} ideas · {drafts.length} drafts · {published.length} published
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'ideas' && selectedIdeas.size > 0 && (
            <Button onClick={handleStartDraft}>
              Start Draft ({selectedIdeas.size})
            </Button>
          )}
          {activeTab === 'ideas' && (
            <Button variant="secondary" onClick={() => setShowAddIdea(true)}>
              + Add Idea
            </Button>
          )}
          {activeTab === 'drafts' && (
            <Button onClick={() => setSearchParams({ edit: 'new' })}>
              + New Draft
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {(['ideas', 'drafts', 'published'] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            <span className="ml-2 text-xs text-gray-400">
              ({tab === 'ideas' ? data.contentIdeas.length : tab === 'drafts' ? drafts.length : published.length})
            </span>
          </button>
        ))}
      </div>

      {/* Content based on active tab */}
      <div className="grid grid-cols-3 gap-6">
        {/* Main Content */}
        <div className={isEditing ? 'col-span-2' : 'col-span-3'}>
          {/* Ideas Tab */}
          {activeTab === 'ideas' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIdeaFilter('all')}
                  className={`px-3 py-1.5 rounded text-sm ${
                    ideaFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                {Object.entries(PILLARS).map(([key, { label }]) => (
                  <button
                    key={key}
                    onClick={() => setIdeaFilter(key as Pillar)}
                    className={`px-3 py-1.5 rounded text-sm ${
                      ideaFilter === key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Ideas List */}
              {filteredIdeas.length === 0 ? (
                <Card className="text-center py-12">
                  <p className="text-gray-500 mb-4">No ideas yet</p>
                  <Button onClick={() => setShowAddIdea(true)}>Add your first idea</Button>
                </Card>
              ) : (
                <div className="space-y-2">
                  {filteredIdeas.map(idea => (
                    <IdeaCard
                      key={idea.id}
                      idea={idea}
                      isSelected={selectedIdeas.has(idea.id)}
                      onToggle={() => toggleIdeaSelection(idea.id)}
                      onDelete={() => deleteContentIdea(idea.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Drafts Tab */}
          {activeTab === 'drafts' && (
            <div className="space-y-3">
              {drafts.length === 0 ? (
                <Card className="text-center py-12">
                  <p className="text-gray-500 mb-4">No drafts yet</p>
                  <Button onClick={() => handleTabChange('ideas')}>Start from an idea</Button>
                </Card>
              ) : (
                drafts.map(piece => {
                  const status = getStatusBadge(piece.status);
                  return (
                    <Card
                      key={piece.id}
                      className={`cursor-pointer hover:border-gray-300 transition-colors ${
                        editId === piece.id ? 'border-blue-400' : ''
                      }`}
                      onClick={() => setSearchParams({ edit: piece.id, tab: 'drafts' })}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={status.style}>{status.label}</Badge>
                            <Badge className={getChannelColor(piece.channel)}>
                              {CHANNELS[piece.channel].label}
                            </Badge>
                            <Badge className={getPillarColor(piece.pillar)}>
                              {PILLARS[piece.pillar].label}
                            </Badge>
                          </div>
                          <h3 className="font-medium text-gray-900">{piece.title || 'Untitled'}</h3>
                          {piece.hook && (
                            <p className="text-sm text-gray-500 mt-1 line-clamp-1">{piece.hook}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-2">
                            Updated {format(parseISO(piece.updatedAt), 'MMM d, h:mm a')}
                          </p>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          )}

          {/* Published Tab */}
          {activeTab === 'published' && (
            <div className="space-y-3">
              {published.length === 0 ? (
                <Card className="text-center py-12">
                  <p className="text-gray-500">No published content yet</p>
                </Card>
              ) : (
                published.map(piece => (
                  <Card
                    key={piece.id}
                    className={`cursor-pointer hover:border-gray-300 transition-colors ${
                      editId === piece.id ? 'border-blue-400' : ''
                    }`}
                    onClick={() => setSearchParams({ edit: piece.id, tab: 'published' })}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className="bg-green-100 text-green-700">Published</Badge>
                          <Badge className={getChannelColor(piece.channel)}>
                            {CHANNELS[piece.channel].label}
                          </Badge>
                        </div>
                        <h3 className="font-medium text-gray-900">{piece.title}</h3>
                        <p className="text-xs text-gray-400 mt-2">
                          {piece.publishedDate && format(parseISO(piece.publishedDate), 'MMM d, yyyy')}
                        </p>
                      </div>
                      {piece.publishedUrl && (
                        <a
                          href={piece.publishedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                          onClick={e => e.stopPropagation()}
                        >
                          View →
                        </a>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>

        {/* Editor Sidebar */}
        {isEditing && (
          <div className="space-y-4">
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Edit Post</h3>
                <button onClick={handleCloseEditor} className="text-gray-400 hover:text-gray-600">
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <Input
                  label="Title"
                  value={editContent.title}
                  onChange={e => setEditContent(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="What's this post about?"
                />

                <div className="grid grid-cols-2 gap-2">
                  <Select
                    label="Channel"
                    value={editContent.channel}
                    onChange={e => setEditContent(prev => ({ ...prev, channel: e.target.value as Channel }))}
                  >
                    {Object.entries(CHANNELS).map(([key, { label }]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </Select>
                  <Select
                    label="Pillar"
                    value={editContent.pillar}
                    onChange={e => setEditContent(prev => ({ ...prev, pillar: e.target.value as Pillar }))}
                  >
                    {Object.entries(PILLARS).map(([key, { label }]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </Select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium text-gray-700">Hook</label>
                    <span className={`text-xs ${analysis.hookAnalysis.score >= 60 ? 'text-green-600' : 'text-yellow-600'}`}>
                      {analysis.hookAnalysis.score}%
                    </span>
                  </div>
                  <Textarea
                    value={editContent.hook || ''}
                    onChange={e => setEditContent(prev => ({ ...prev, hook: e.target.value }))}
                    placeholder="Write a hook..."
                    rows={2}
                  />
                </div>

                <Textarea
                  label="Body"
                  value={editContent.body}
                  onChange={e => setEditContent(prev => ({ ...prev, body: e.target.value }))}
                  placeholder="Write your post..."
                  rows={8}
                />

                <Input
                  label="Planned Date"
                  type="date"
                  value={editContent.plannedDate?.split('T')[0] || ''}
                  onChange={e => setEditContent(prev => ({ ...prev, plannedDate: e.target.value }))}
                />

                {editContent.status === 'published' && (
                  <Input
                    label="Published URL"
                    type="url"
                    value={editContent.publishedUrl || ''}
                    onChange={e => setEditContent(prev => ({ ...prev, publishedUrl: e.target.value }))}
                    placeholder="https://linkedin.com/posts/..."
                  />
                )}

                {/* Stats */}
                <div className="pt-3 border-t border-gray-100 text-xs text-gray-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Words</span>
                    <span>{analysis.wordCount}</span>
                  </div>
                  {analysis.jargon.length > 0 && (
                    <div className="text-yellow-600">
                      Jargon: {analysis.jargon.join(', ')}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleGenerateDraft}
                    disabled={isGenerating}
                    className="flex-1"
                  >
                    {isGenerating ? 'Writing...' : 'AI Draft'}
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={isSaving} className="flex-1">
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                </div>

                {editContent.status !== 'published' && (
                  <Button size="sm" onClick={handlePublish} className="w-full">
                    Mark Published
                  </Button>
                )}

                {editId && editId !== 'new' && (
                  <Button size="sm" variant="ghost" onClick={handleDelete} className="w-full text-red-600">
                    Delete
                  </Button>
                )}
              </div>
            </Card>

            {/* Voice Tips */}
            <Card padding="sm">
              <h4 className="text-xs font-semibold text-gray-700 mb-2">Voice Tips</h4>
              <ul className="text-xs text-gray-500 space-y-1">
                {VOICE_GUIDELINES.reminders.slice(0, 3).map((tip, i) => (
                  <li key={i}>• {tip}</li>
                ))}
              </ul>
            </Card>
          </div>
        )}
      </div>

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

// Idea Card Component
function IdeaCard({
  idea,
  isSelected,
  onToggle,
  onDelete,
}: {
  idea: ContentIdea;
  isSelected: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <Card
      className={`cursor-pointer transition-colors ${
        isSelected ? 'border-blue-400 bg-blue-50' : 'hover:border-gray-300'
      }`}
      onClick={onToggle}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center ${
          isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
        }`}>
          {isSelected && (
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge className={getPillarColor(idea.pillar)}>
              {PILLARS[idea.pillar].label}
            </Badge>
            {idea.priority === 'high' && (
              <Badge className="bg-red-100 text-red-700">High</Badge>
            )}
            <span className="text-xs text-gray-400">
              {format(parseISO(idea.createdAt), 'MMM d')}
            </span>
          </div>
          <h3 className="font-medium text-gray-900">{idea.title}</h3>
          {idea.notes && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{idea.notes}</p>
          )}
          {idea.sourceUrl && (
            <a
              href={idea.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline mt-1 inline-block"
              onClick={e => e.stopPropagation()}
            >
              {idea.sourceName || 'Source'} →
            </a>
          )}
        </div>
        <button
          onClick={e => {
            e.stopPropagation();
            onDelete();
          }}
          className="text-gray-400 hover:text-red-600 text-sm"
        >
          ×
        </button>
      </div>
    </Card>
  );
}
