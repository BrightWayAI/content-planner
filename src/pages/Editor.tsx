import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore } from '../store/StoreContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input, Textarea, Select } from '../components/Input';
import { Badge } from '../components/Badge';
import type { ContentPiece, Channel, Pillar } from '../types';
import { detectJargon, countWords, analyzeHookStrength } from '../utils/helpers';
import { PILLARS, CHANNELS, VOICE_GUIDELINES } from '../utils/constants';

const defaultContent: Omit<ContentPiece, 'id' | 'createdAt' | 'updatedAt'> = {
  title: '',
  status: 'drafting',
  channel: 'personal_linkedin',
  contentType: 'short_post',
  pillar: 'practical_implementation',
  body: '',
  hook: '',
};

export function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    getContentPiece,
    addContentPiece,
    updateContentPiece,
    deleteContentPiece,
    data,
  } = useAppStore();

  const [content, setContent] = useState(defaultContent);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const isEditing = !!id;

  useEffect(() => {
    if (id) {
      const piece = getContentPiece(id);
      if (piece) {
        const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = piece;
        setContent(rest);
      } else {
        navigate('/drafts');
      }
    } else {
      // Check if starting from an idea
      const ideaId = searchParams.get('idea');
      if (ideaId) {
        const idea = data.contentIdeas.find(i => i.id === ideaId);
        if (idea) {
          setContent(prev => ({
            ...prev,
            title: idea.title,
            pillar: idea.pillar,
            body: idea.notes || '',
          }));
        }
      }
    }
  }, [id, getContentPiece, navigate, searchParams, data.contentIdeas]);

  const analysis = useMemo(() => {
    const fullText = `${content.hook || ''} ${content.body}`;
    return {
      jargon: detectJargon(fullText),
      wordCount: countWords(fullText),
      hookAnalysis: analyzeHookStrength(content.hook || ''),
    };
  }, [content.hook, content.body]);

  const handleSave = () => {
    setIsSaving(true);
    try {
      if (isEditing && id) {
        updateContentPiece(id, content);
      } else {
        const newPiece = addContentPiece(content);
        navigate(`/edit/${newPiece.id}`, { replace: true });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = () => {
    const now = new Date().toISOString();
    if (isEditing && id) {
      updateContentPiece(id, {
        ...content,
        status: 'published',
        publishedDate: now,
      });
      navigate('/published');
    }
  };

  const handleDelete = () => {
    if (id && confirm('Delete this draft?')) {
      deleteContentPiece(id);
      navigate('/drafts');
    }
  };

  const handleGenerateDraft = async () => {
    if (!content.title) {
      alert('Add a title first');
      return;
    }
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: content.title,
          pillar: content.pillar,
          channel: content.channel,
          notes: content.body,
        }),
      });
      if (!response.ok) throw new Error('Failed');
      const data = await response.json();
      setContent(prev => ({
        ...prev,
        hook: data.hook || prev.hook,
        body: data.body || prev.body,
      }));
    } catch {
      alert('AI generation not configured. Add ANTHROPIC_API_KEY in Settings.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          ← Back
        </Button>
        <div className="flex items-center gap-2">
          {isEditing && (
            <Button variant="ghost" onClick={handleDelete} className="text-red-600">
              Delete
            </Button>
          )}
          <Button variant="secondary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Draft'}
          </Button>
          {isEditing && content.status !== 'published' && (
            <Button onClick={handlePublish}>
              Mark Published
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main Editor */}
        <div className="col-span-2 space-y-4">
          <Input
            value={content.title}
            onChange={e => setContent(prev => ({ ...prev, title: e.target.value }))}
            placeholder="What's this post about?"
            className="text-xl font-semibold border-0 border-b rounded-none px-0 focus:ring-0"
          />

          <div className="flex items-center gap-3">
            <Select
              value={content.channel}
              onChange={e => setContent(prev => ({ ...prev, channel: e.target.value as Channel }))}
              className="w-auto"
            >
              {Object.entries(CHANNELS).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </Select>
            <Select
              value={content.pillar}
              onChange={e => setContent(prev => ({ ...prev, pillar: e.target.value as Pillar }))}
              className="w-auto"
            >
              {Object.entries(PILLARS).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </Select>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleGenerateDraft}
              disabled={isGenerating}
            >
              {isGenerating ? 'Writing...' : '✨ AI Draft'}
            </Button>
          </div>

          <Card padding="none">
            <div className="p-4 border-b border-gray-100">
              <Textarea
                value={content.hook || ''}
                onChange={e => setContent(prev => ({ ...prev, hook: e.target.value }))}
                placeholder="Write a hook that grabs attention..."
                rows={2}
                className="border-0 p-0 focus:ring-0 resize-none text-lg"
              />
              <div className="flex items-center gap-3 mt-2 text-xs">
                <span className={analysis.hookAnalysis.score >= 60 ? 'text-green-600' : 'text-yellow-600'}>
                  Hook: {analysis.hookAnalysis.score}%
                </span>
                <span className="text-gray-400">{analysis.hookAnalysis.feedback}</span>
              </div>
            </div>
            <Textarea
              value={content.body}
              onChange={e => setContent(prev => ({ ...prev, body: e.target.value }))}
              placeholder="Write your post..."
              rows={15}
              className="border-0 p-4 focus:ring-0 resize-none"
            />
          </Card>

          {content.status === 'published' && (
            <Input
              label="Published URL"
              type="url"
              value={content.publishedUrl || ''}
              onChange={e => setContent(prev => ({ ...prev, publishedUrl: e.target.value }))}
              placeholder="https://linkedin.com/posts/..."
            />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Jargon Alert */}
          {analysis.jargon.length > 0 && (
            <Card className="bg-yellow-50 border-yellow-200">
              <h3 className="text-sm font-semibold text-yellow-800 mb-2">Jargon Alert</h3>
              <div className="flex flex-wrap gap-1">
                {analysis.jargon.map(word => (
                  <Badge key={word} className="bg-yellow-200 text-yellow-800">{word}</Badge>
                ))}
              </div>
              <p className="text-xs text-yellow-700 mt-2">Use plain language instead</p>
            </Card>
          )}

          {/* Stats */}
          <Card>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Stats</h3>
            <div className="space-y-2 text-sm">
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
              <div className="flex justify-between">
                <span className="text-gray-500">Jargon found</span>
                <span className={`font-medium ${analysis.jargon.length > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {analysis.jargon.length}
                </span>
              </div>
            </div>
          </Card>

          {/* Voice Tips */}
          <Card>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Voice Tips</h3>
            <ul className="text-xs text-gray-600 space-y-1">
              {VOICE_GUIDELINES.reminders.slice(0, 3).map((tip, i) => (
                <li key={i}>• {tip}</li>
              ))}
            </ul>
          </Card>

          {/* Pillar Context */}
          <Card>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">
              {PILLARS[content.pillar].label}
            </h3>
            <p className="text-xs text-gray-500">
              {PILLARS[content.pillar].description}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
