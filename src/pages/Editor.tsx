import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/StoreContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { detectJargon, countWords, analyzeHookStrength, getPillarDotColor } from '@/utils/helpers';
import { PUBLISHING_CHECKLIST } from '@/utils/constants';
import { api } from '@/lib/api';
import {
  ArrowLeft, Save, Sparkles, ChevronDown, ChevronUp,
  Loader2, History, RotateCcw, Check, Wand2
} from 'lucide-react';
import type { ContentStatus, DraftVersion, ContentPiece } from '@/types';

const STATUS_FLOW: ContentStatus[] = ['idea', 'drafting', 'review', 'scheduled', 'published'];

const QUICK_REFINEMENTS = [
  { label: 'Make shorter', instruction: 'Make the post significantly shorter while keeping the core message.' },
  { label: 'Strengthen hook', instruction: 'Rewrite the hook to be more attention-grabbing and compelling.' },
  { label: 'Simplify language', instruction: 'Simplify the language. Use shorter words and sentences. Remove any jargon.' },
  { label: 'Add story', instruction: 'Add a brief personal anecdote or story element to make it more engaging.' },
  { label: 'More specific', instruction: 'Add specific numbers, examples, or data to make claims more concrete.' },
  { label: 'Stronger CTA', instruction: 'Improve the ending with a stronger call to action or engaging question.' },
];

export function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, updateContentPiece, deleteContentPiece, getContentPiece } = useAppStore();

  const [title, setTitle] = useState('');
  const [hook, setHook] = useState('');
  const [body, setBody] = useState('');
  const [status, setStatus] = useState<ContentStatus>('drafting');
  const [channelId, setChannelId] = useState('');
  const [pillarId, setPillarId] = useState('');
  const [contentTypeId, setContentTypeId] = useState('');
  const [plannedDate, setPlannedDate] = useState('');
  const [publishedUrl, setPublishedUrl] = useState('');
  const [notes, setNotes] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(true);
  const [customInstruction, setCustomInstruction] = useState('');
  const [lastChanges, setLastChanges] = useState('');

  const [showHistory, setShowHistory] = useState(false);
  const [versions, setVersions] = useState<DraftVersion[]>([]);
  const [checklist, setChecklist] = useState<boolean[]>(new Array(PUBLISHING_CHECKLIST.length).fill(false));

  useEffect(() => {
    if (id && id !== 'new') {
      const piece = getContentPiece(id);
      if (piece) {
        setTitle(piece.title);
        setHook(piece.hook || '');
        setBody(piece.body);
        setStatus(piece.status);
        setChannelId(piece.channelId || '');
        setPillarId(piece.pillarId || '');
        setContentTypeId(piece.contentTypeId || '');
        setPlannedDate(piece.plannedDate?.split('T')[0] || '');
        setPublishedUrl(piece.publishedUrl || '');
        setNotes(piece.notes || '');
      }
    }
  }, [id, getContentPiece]);

  const analysis = useMemo(() => {
    const fullText = `${hook} ${body}`;
    const jargonList = (data.voiceProfile?.jargonBlacklist as string[]) || [];
    return {
      jargon: detectJargon(fullText, jargonList),
      wordCount: countWords(fullText),
      hookAnalysis: analyzeHookStrength(hook),
    };
  }, [hook, body, data.voiceProfile]);

  const channel = data.channels.find(c => c.id === channelId);
  const pillar = data.pillars.find(p => p.id === pillarId);
  const charCount = `${hook}\n\n${body}`.length;
  const maxLength = channel?.maxLength;

  const handleSave = useCallback(async () => {
    if (!id) return;
    setIsSaving(true);
    try {
      await updateContentPiece(id, {
        title, hook, body, status,
        channelId: channelId || null,
        pillarId: pillarId || null,
        contentTypeId: contentTypeId || null,
        plannedDate: plannedDate || null,
        publishedUrl: publishedUrl || null,
        notes: notes || null,
      } as Partial<ContentPiece>);
      await api.versions.create({ contentPieceId: id, hook, body, versionNote: 'Manual save' });
    } finally {
      setIsSaving(false);
    }
  }, [id, title, hook, body, status, channelId, pillarId, contentTypeId, plannedDate, publishedUrl, notes, updateContentPiece]);

  const handleGenerateDraft = async () => {
    if (!title) { alert('Add a title first'); return; }
    setIsGenerating(true);
    try {
      const result = await api.ai.generateDraft({
        title, pillarId: pillarId || undefined, channelId: channelId || undefined, notes: body || notes,
      });
      setHook(result.hook || hook);
      setBody(result.body || body);
      if (status === 'idea') setStatus('drafting');
    } catch {
      alert('AI generation failed. Check your API key.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefine = async (instruction: string) => {
    setIsRefining(true);
    try {
      const result = await api.ai.refineDraft({ hook, body, instruction });
      setHook(result.hook || hook);
      setBody(result.body || body);
      setLastChanges(result.changes || '');
      if (id) {
        await api.versions.create({
          contentPieceId: id, hook: result.hook, body: result.body,
          versionNote: `AI refinement: ${instruction.slice(0, 50)}`,
        });
      }
    } catch {
      alert('Refinement failed.');
    } finally {
      setIsRefining(false);
    }
  };

  const handleStatusChange = async (newStatus: ContentStatus) => {
    setStatus(newStatus);
    if (id) {
      const updates: Partial<ContentPiece> = { status: newStatus };
      if (newStatus === 'published') updates.publishedDate = new Date().toISOString();
      await updateContentPiece(id, updates);
    }
  };

  const loadVersions = async () => {
    if (!id) return;
    const v = await api.versions.list(id);
    setVersions(v);
    setShowHistory(true);
  };

  const revertToVersion = (version: DraftVersion) => {
    setHook(version.hook || '');
    setBody(version.body);
    setShowHistory(false);
  };

  const handleDelete = async () => {
    if (id && confirm('Delete this post?')) {
      await deleteContentPiece(id);
      navigate('/posts');
    }
  };

  const currentStatusIndex = STATUS_FLOW.indexOf(status);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/posts')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" /><span>Back to posts</span>
        </button>
        <div className="flex items-center gap-2">
          {id && <Button variant="ghost" size="sm" className="text-red-600" onClick={handleDelete}>Delete</Button>}
          <Button variant="ghost" size="sm" onClick={loadVersions}>
            <History className="w-4 h-4 mr-1" />History
          </Button>
          <Button variant="outline" onClick={handleSave} disabled={isSaving}>
            <Save className="w-4 h-4 mr-1" />{isSaving ? 'Saving...' : 'Save'}
          </Button>
          {status !== 'published' && (
            <Button onClick={() => handleStatusChange('published')}>
              <Check className="w-4 h-4 mr-1" />Publish
            </Button>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center gap-1 px-1">
        {STATUS_FLOW.map((s, i) => (
          <button
            key={s}
            onClick={() => handleStatusChange(s)}
            className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${
              i <= currentStatusIndex ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Post title..."
            className="w-full text-2xl font-bold text-gray-900 border-0 border-b border-gray-200 pb-2 focus:outline-none focus:border-blue-500 bg-transparent"
          />

          <div className="flex items-center gap-3 flex-wrap">
            <Select value={channelId} onChange={e => setChannelId(e.target.value)} className="text-sm w-auto">
              <option value="">Channel</option>
              {data.channels.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </Select>
            <Select value={pillarId} onChange={e => setPillarId(e.target.value)} className="text-sm w-auto">
              <option value="">Pillar</option>
              {data.pillars.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </Select>
            <Select value={contentTypeId} onChange={e => setContentTypeId(e.target.value)} className="text-sm w-auto">
              <option value="">Type</option>
              {data.contentTypes.map(ct => <option key={ct.id} value={ct.id}>{ct.label}</option>)}
            </Select>
            <Button size="sm" variant="outline" onClick={handleGenerateDraft} disabled={isGenerating}>
              <Sparkles className="w-3.5 h-3.5 mr-1" />{isGenerating ? 'Writing...' : 'AI Draft'}
            </Button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Hook</Label>
              <span className={`text-xs ${analysis.hookAnalysis.score >= 60 ? 'text-green-600' : 'text-yellow-600'}`}>
                {analysis.hookAnalysis.score}% - {analysis.hookAnalysis.feedback}
              </span>
            </div>
            <Textarea value={hook} onChange={e => setHook(e.target.value)} placeholder="Write a compelling first line..." rows={2} className="text-lg" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Body</Label>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>{analysis.wordCount} words</span>
                {maxLength && (
                  <span className={charCount > maxLength ? 'text-red-600' : ''}>{charCount}/{maxLength} chars</span>
                )}
              </div>
            </div>
            <Textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Write your post content..." rows={15} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {['scheduled', 'review'].includes(status) && (
              <div className="space-y-2">
                <Label>Planned Date</Label>
                <Input type="date" value={plannedDate} onChange={e => setPlannedDate(e.target.value)} />
              </div>
            )}
            {status === 'published' && (
              <div className="space-y-2">
                <Label>Published URL</Label>
                <Input type="url" value={publishedUrl} onChange={e => setPublishedUrl(e.target.value)} placeholder="https://linkedin.com/posts/..." />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {/* AI Refinement */}
          <Card>
            <CardHeader className="pb-2 cursor-pointer" onClick={() => setShowAiPanel(!showAiPanel)}>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Wand2 className="w-4 h-4" />AI Refinement
                </CardTitle>
                {showAiPanel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </CardHeader>
            {showAiPanel && (
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-1.5">
                  {QUICK_REFINEMENTS.map(ref => (
                    <Button key={ref.label} size="sm" variant="outline" className="text-xs h-7" onClick={() => handleRefine(ref.instruction)} disabled={isRefining || !body}>
                      {ref.label}
                    </Button>
                  ))}
                </div>
                <Separator />
                <Textarea value={customInstruction} onChange={e => setCustomInstruction(e.target.value)} placeholder="Custom refinement..." rows={2} className="text-xs" />
                <Button size="sm" className="w-full" onClick={() => { handleRefine(customInstruction); setCustomInstruction(''); }} disabled={isRefining || !customInstruction || !body}>
                  {isRefining ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
                  {isRefining ? 'Refining...' : 'Apply'}
                </Button>
                {lastChanges && (
                  <div className="text-xs text-gray-500 bg-gray-50 rounded p-2">
                    <span className="font-medium">Changes:</span> {lastChanges}
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {/* Analysis */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Analysis</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Words</span>
                <span className="font-medium">{analysis.wordCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Hook strength</span>
                <span className={`font-medium ${analysis.hookAnalysis.score >= 60 ? 'text-green-600' : 'text-yellow-600'}`}>{analysis.hookAnalysis.score}%</span>
              </div>
              {analysis.jargon.length > 0 && (
                <div>
                  <span className="text-yellow-600 text-xs">Jargon found:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {analysis.jargon.map(word => (
                      <span key={word} className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">{word}</span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Voice Guide */}
          {data.voiceProfile && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Voice Guide</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {data.voiceProfile.analyzedVoiceSummary && (
                  <p className="text-xs text-gray-600 line-clamp-3">{data.voiceProfile.analyzedVoiceSummary}</p>
                )}
                {(data.voiceProfile.doExamples as string[])?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-green-700 mb-1">Do</p>
                    <ul className="text-xs text-gray-600 space-y-0.5">
                      {(data.voiceProfile.doExamples as string[]).slice(0, 3).map((item, i) => <li key={i}>"{item}"</li>)}
                    </ul>
                  </div>
                )}
                {(data.voiceProfile.dontExamples as string[])?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-red-700 mb-1">Don't</p>
                    <ul className="text-xs text-gray-400 space-y-0.5">
                      {(data.voiceProfile.dontExamples as string[]).slice(0, 3).map((item, i) => <li key={i} className="line-through">"{item}"</li>)}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Publishing Checklist */}
          {['review', 'scheduled'].includes(status) && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Publishing Checklist</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {PUBLISHING_CHECKLIST.map((item, i) => (
                    <label key={i} className="flex items-start gap-2 text-xs cursor-pointer">
                      <input type="checkbox" checked={checklist[i]} onChange={() => setChecklist(prev => { const next = [...prev]; next[i] = !next[i]; return next; })} className="rounded border-gray-300 mt-0.5" />
                      <span className={checklist[i] ? 'text-gray-400 line-through' : 'text-gray-700'}>{item}</span>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {pillar && (
            <Card className="p-3">
              <div className={`w-2 h-2 rounded-full ${getPillarDotColor(pillar)} mb-2`} />
              <h4 className="font-medium text-gray-900 text-sm">{pillar.label}</h4>
              <p className="text-xs text-gray-500 mt-1">{pillar.description}</p>
            </Card>
          )}
        </div>
      </div>

      {/* Version History */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent onClose={() => setShowHistory(false)} className="max-w-md">
          <DialogHeader><DialogTitle>Version History</DialogTitle></DialogHeader>
          <div className="p-6 max-h-96 overflow-y-auto">
            {versions.length === 0 ? (
              <p className="text-sm text-gray-500">No saved versions yet.</p>
            ) : (
              <div className="space-y-3">
                {versions.map(v => (
                  <div key={v.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700">v{v.version}</span>
                      <span className="text-xs text-gray-400">{new Date(v.createdAt).toLocaleString()}</span>
                    </div>
                    {v.versionNote && <p className="text-xs text-gray-500 mb-2">{v.versionNote}</p>}
                    <Button size="sm" variant="outline" onClick={() => revertToVersion(v)}>
                      <RotateCcw className="w-3 h-3 mr-1" />Revert
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
