import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { useAppStore } from '../store/StoreContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input, Textarea, Select } from '../components/Input';
import { Badge } from '../components/Badge';
import type { ContentPiece, ContentStatus, Channel, ContentType, Pillar } from '../types';
import {
  detectJargon,
  countWords,
  estimateReadingLevel,
  analyzeHookStrength,
} from '../utils/helpers';
import {
  PILLARS,
  CHANNELS,
  CONTENT_TYPES,
  CONTENT_STATUSES,
  VOICE_GUIDELINES,
  PUBLISHING_CHECKLIST,
} from '../utils/constants';

const defaultContent: Omit<ContentPiece, 'id' | 'createdAt' | 'updatedAt'> = {
  title: '',
  status: 'idea',
  channel: 'personal_linkedin',
  contentType: 'short_post',
  pillar: 'practical_implementation',
  body: '',
  hook: '',
  cta: '',
  notes: '',
  tags: [],
};

export function ContentEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { getContentPiece, addContentPiece, updateContentPiece, deleteContentPiece } = useAppStore();

  const [content, setContent] = useState<Omit<ContentPiece, 'id' | 'createdAt' | 'updatedAt'>>(defaultContent);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'voice' | 'checklist'>('voice');

  const isEditing = !!id;

  useEffect(() => {
    if (id) {
      const piece = getContentPiece(id);
      if (piece) {
        const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = piece;
        setContent(rest);
      } else {
        navigate('/library');
      }
    } else {
      const dateParam = searchParams.get('date');
      if (dateParam) {
        setContent(prev => ({ ...prev, plannedDate: dateParam }));
      }
    }
  }, [id, getContentPiece, navigate, searchParams]);

  const analysis = useMemo(() => {
    const fullText = `${content.hook || ''} ${content.body}`;
    const jargon = detectJargon(fullText);
    const wordCount = countWords(fullText);
    const readingLevel = estimateReadingLevel(fullText);
    const hookAnalysis = analyzeHookStrength(content.hook || '');

    return {
      jargon,
      wordCount,
      readingLevel,
      hookAnalysis,
    };
  }, [content.hook, content.body]);

  const handleChange = (
    field: keyof typeof content,
    value: string | string[]
  ) => {
    setContent(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (isEditing && id) {
        updateContentPiece(id, content);
      } else {
        const newPiece = addContentPiece(content);
        navigate(`/create/${newPiece.id}`, { replace: true });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (id) {
      deleteContentPiece(id);
      navigate('/library');
    }
  };

  const handlePublish = () => {
    const now = new Date().toISOString();
    setContent(prev => ({
      ...prev,
      status: 'published',
      publishedDate: now,
    }));
    if (isEditing && id) {
      updateContentPiece(id, {
        status: 'published',
        publishedDate: now,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Edit Content' : 'Create Content'}
          </h1>
          {isEditing && (
            <p className="text-sm text-gray-500">
              Last updated: {format(new Date(), 'MMM d, yyyy h:mm a')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isEditing && (
            <Button
              variant="danger"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete
            </Button>
          )}
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
          {content.status !== 'published' && (
            <Button variant="primary" onClick={handlePublish}>
              Mark Published
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main Editor */}
        <div className="col-span-2 space-y-4">
          <Card>
            <div className="space-y-4">
              <Input
                label="Title"
                value={content.title}
                onChange={e => handleChange('title', e.target.value)}
                placeholder="Give your content a working title..."
              />

              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Channel"
                  value={content.channel}
                  onChange={e => handleChange('channel', e.target.value as Channel)}
                >
                  {Object.entries(CHANNELS).map(([key, { label }]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </Select>

                <Select
                  label="Content Type"
                  value={content.contentType}
                  onChange={e => handleChange('contentType', e.target.value as ContentType)}
                >
                  {Object.entries(CONTENT_TYPES).map(([key, { label }]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Pillar"
                  value={content.pillar}
                  onChange={e => handleChange('pillar', e.target.value as Pillar)}
                >
                  {Object.entries(PILLARS).map(([key, { label }]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </Select>

                <Select
                  label="Status"
                  value={content.status}
                  onChange={e => handleChange('status', e.target.value as ContentStatus)}
                >
                  {Object.entries(CONTENT_STATUSES).map(([key, { label }]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Planned Date"
                  type="date"
                  value={content.plannedDate?.split('T')[0] || ''}
                  onChange={e => handleChange('plannedDate', e.target.value)}
                />

                <Input
                  label="Published URL"
                  type="url"
                  value={content.publishedUrl || ''}
                  onChange={e => handleChange('publishedUrl', e.target.value)}
                  placeholder="https://linkedin.com/..."
                />
              </div>
            </div>
          </Card>

          <Card>
            <Textarea
              label="Hook (Opening Line)"
              value={content.hook || ''}
              onChange={e => handleChange('hook', e.target.value)}
              placeholder="Write a compelling opening that grabs attention..."
              rows={2}
            />
            <div className="mt-2 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Strength:</span>
                <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      analysis.hookAnalysis.score >= 70
                        ? 'bg-green-500'
                        : analysis.hookAnalysis.score >= 50
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${analysis.hookAnalysis.score}%` }}
                  />
                </div>
                <span className="text-xs text-gray-600">{analysis.hookAnalysis.score}%</span>
              </div>
              <span className="text-xs text-gray-500">{analysis.hookAnalysis.feedback}</span>
            </div>
          </Card>

          <Card>
            <Textarea
              label="Body"
              value={content.body}
              onChange={e => handleChange('body', e.target.value)}
              placeholder="Write your content here..."
              rows={12}
              className="font-mono text-sm"
            />
            <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
              <span>{analysis.wordCount} words</span>
              <span>Reading level: {analysis.readingLevel}</span>
            </div>
          </Card>

          <Card>
            <Textarea
              label="Call to Action (Optional)"
              value={content.cta || ''}
              onChange={e => handleChange('cta', e.target.value)}
              placeholder="What do you want readers to do next?"
              rows={2}
            />
          </Card>

          <Card>
            <Textarea
              label="Notes (Internal)"
              value={content.notes || ''}
              onChange={e => handleChange('notes', e.target.value)}
              placeholder="Any internal notes, reminders, or context..."
              rows={3}
            />
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Jargon Detector */}
          {analysis.jargon.length > 0 && (
            <Card className="border-yellow-200 bg-yellow-50">
              <h3 className="text-sm font-semibold text-yellow-800 mb-2">
                Jargon Detected
              </h3>
              <p className="text-xs text-yellow-700 mb-2">
                Consider replacing these words with plain language:
              </p>
              <div className="flex flex-wrap gap-1">
                {analysis.jargon.map(word => (
                  <Badge key={word} className="bg-yellow-200 text-yellow-800">
                    {word}
                  </Badge>
                ))}
              </div>
            </Card>
          )}

          {/* Pillar Context */}
          <Card>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              {PILLARS[content.pillar].label}
            </h3>
            <p className="text-sm text-gray-600">
              {PILLARS[content.pillar].description}
            </p>
          </Card>

          {/* Guidelines Tabs */}
          <Card padding="none">
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('voice')}
                className={`flex-1 px-4 py-2 text-sm font-medium ${
                  activeTab === 'voice'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Voice Guide
              </button>
              <button
                onClick={() => setActiveTab('checklist')}
                className={`flex-1 px-4 py-2 text-sm font-medium ${
                  activeTab === 'checklist'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Checklist
              </button>
            </div>

            <div className="p-4">
              {activeTab === 'voice' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold text-green-700 uppercase mb-1">
                      Do
                    </h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {VOICE_GUIDELINES.do.map((item, i) => (
                        <li key={i} className="text-xs">"{item}"</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-red-700 uppercase mb-1">
                      Don't
                    </h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {VOICE_GUIDELINES.dont.map((item, i) => (
                        <li key={i} className="text-xs text-gray-400">"{item}"</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-gray-700 uppercase mb-1">
                      Reminders
                    </h4>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {VOICE_GUIDELINES.reminders.map((item, i) => (
                        <li key={i}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {activeTab === 'checklist' && (
                <div className="space-y-2">
                  {PUBLISHING_CHECKLIST.map((item, i) => (
                    <label key={i} className="flex items-start gap-2 text-xs text-gray-600">
                      <input type="checkbox" className="mt-0.5" />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Quick Stats */}
          <Card>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Analysis</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Word count</span>
                <span className="font-medium">{analysis.wordCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Reading level</span>
                <span className="font-medium">{analysis.readingLevel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Hook strength</span>
                <span className="font-medium">{analysis.hookAnalysis.score}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Jargon found</span>
                <span className={`font-medium ${analysis.jargon.length > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {analysis.jargon.length}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/50"
              onClick={() => setShowDeleteConfirm(false)}
            />
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Delete Content?
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                This action cannot be undone. This will permanently delete this
                content piece and any associated metrics.
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </Button>
                <Button variant="danger" onClick={handleDelete}>
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
