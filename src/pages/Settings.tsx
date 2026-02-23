import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/store/StoreContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import {
  Plus, Trash2, Edit2, Upload, FileText,
  Loader2, Sparkles, Globe, TestTube
} from 'lucide-react';
import type { ContentPillar, Channel, ContentType, NewsSource, StarterTemplate } from '@/types';

export function Settings() {
  const {
    data, updateConfig, refreshConfig,
    addPillar, updatePillar, deletePillar,
    addChannel, updateChannel, deleteChannel,
    addContentType, updateContentType, deleteContentType,
    addSource, updateSource, deleteSource,
    updateVoiceProfile, addVoiceSample, addVoiceSampleFromUrl, deleteVoiceSample, analyzeVoice,
  } = useAppStore();

  const [tab, setTab] = useState('general');
  const [apiStatus, setApiStatus] = useState<'checking' | 'connected' | 'not_configured'>('checking');

  // General
  const [brandName, setBrandName] = useState(data.config?.brandName || '');
  const [tagline, setTagline] = useState(data.config?.tagline || '');

  // Editing states
  const [editingPillar, setEditingPillar] = useState<Partial<ContentPillar> & { isNew?: boolean } | null>(null);
  const [editingChannel, setEditingChannel] = useState<Partial<Channel> & { isNew?: boolean } | null>(null);
  const [editingContentType, setEditingContentType] = useState<Partial<ContentType> & { isNew?: boolean } | null>(null);
  const [editingSource, setEditingSource] = useState<Partial<NewsSource> & { isNew?: boolean } | null>(null);
  const [testingScrape, setTestingScrape] = useState<string | null>(null);
  const [scrapeResult, setScrapeResult] = useState<string[]>([]);

  // Voice
  const [showAddSample, setShowAddSample] = useState(false);
  const [sampleTab, setSampleTab] = useState<'paste' | 'upload' | 'url'>('paste');
  const [sampleTitle, setSampleTitle] = useState('');
  const [sampleContent, setSampleContent] = useState('');
  const [sampleUrl, setSampleUrl] = useState('');
  const [isAddingSample, setIsAddingSample] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Templates
  const [templates, setTemplates] = useState<StarterTemplate[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);

  useEffect(() => {
    api.health().then(h => setApiStatus(h.hasApiKey ? 'connected' : 'not_configured')).catch(() => setApiStatus('not_configured'));
  }, []);

  useEffect(() => {
    setBrandName(data.config?.brandName || '');
    setTagline(data.config?.tagline || '');
  }, [data.config]);

  const handleSaveGeneral = async () => {
    await updateConfig({ brandName, tagline });
  };

  // --- Pillar CRUD ---
  const handleSavePillar = async () => {
    if (!editingPillar || !editingPillar.label) return;
    if (editingPillar.isNew) {
      await addPillar({
        slug: editingPillar.slug || editingPillar.label.toLowerCase().replace(/\s+/g, '_'),
        label: editingPillar.label,
        description: editingPillar.description || '',
        color: editingPillar.color || 'bg-blue-500',
        sortOrder: data.pillars.length,
      });
    } else if (editingPillar.id) {
      await updatePillar(editingPillar.id, editingPillar);
    }
    setEditingPillar(null);
  };

  // --- Channel CRUD ---
  const handleSaveChannel = async () => {
    if (!editingChannel || !editingChannel.label) return;
    if (editingChannel.isNew) {
      await addChannel({
        slug: editingChannel.slug || editingChannel.label.toLowerCase().replace(/\s+/g, '_'),
        label: editingChannel.label,
        platform: editingChannel.platform || 'linkedin',
        color: editingChannel.color || 'bg-orange-500',
        maxLength: editingChannel.maxLength,
      });
    } else if (editingChannel.id) {
      await updateChannel(editingChannel.id, editingChannel);
    }
    setEditingChannel(null);
  };

  // --- Content Type CRUD ---
  const handleSaveContentType = async () => {
    if (!editingContentType || !editingContentType.label) return;
    if (editingContentType.isNew) {
      await addContentType({
        slug: editingContentType.slug || editingContentType.label.toLowerCase().replace(/\s+/g, '_'),
        label: editingContentType.label,
      });
    } else if (editingContentType.id) {
      await updateContentType(editingContentType.id, editingContentType);
    }
    setEditingContentType(null);
  };

  // --- Source CRUD ---
  const handleSaveSource = async () => {
    if (!editingSource || !editingSource.name || !editingSource.url) return;
    if (editingSource.isNew) {
      await addSource({
        name: editingSource.name,
        url: editingSource.url,
        cssSelector: editingSource.cssSelector || 'article h2, article h3',
        category: editingSource.category || 'General',
      });
    } else if (editingSource.id) {
      await updateSource(editingSource.id, editingSource);
    }
    setEditingSource(null);
  };

  const handleTestScrape = async (id: string) => {
    setTestingScrape(id);
    setScrapeResult([]);
    try {
      const result = await api.sources.test(id);
      setScrapeResult(result.headlines);
    } catch {
      setScrapeResult(['Error: Could not scrape this source']);
    } finally {
      setTestingScrape(null);
    }
  };

  // --- Voice ---
  const handleAddSample = async () => {
    setIsAddingSample(true);
    try {
      if (sampleTab === 'paste') {
        await addVoiceSample({ title: sampleTitle || 'Pasted sample', content: sampleContent, sourceType: 'paste' });
      } else if (sampleTab === 'url') {
        await addVoiceSampleFromUrl(sampleUrl, sampleTitle);
      }
      setSampleTitle(''); setSampleContent(''); setSampleUrl('');
      setShowAddSample(false);
    } catch (err) {
      alert('Failed to add sample');
    } finally {
      setIsAddingSample(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsAddingSample(true);
    try {
      const text = await file.text();
      await addVoiceSample({ title: file.name, content: text, sourceType: 'file' });
      setShowAddSample(false);
    } catch {
      alert('Failed to process file');
    } finally {
      setIsAddingSample(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAnalyzeVoice = async () => {
    setIsAnalyzing(true);
    try {
      await analyzeVoice();
    } catch {
      alert('Voice analysis failed. Check API key.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Templates
  const loadTemplates = async () => {
    const tpls = await api.templates.list();
    setTemplates(tpls);
    setShowTemplates(true);
  };

  const applyTemplate = async (templateId: string) => {
    if (!confirm('This will replace all your current configuration. Continue?')) return;
    await api.config.applyTemplate(templateId);
    await refreshConfig();
    setShowTemplates(false);
    window.location.reload();
  };

  const PILLAR_COLORS = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-cyan-500', 'bg-red-500', 'bg-yellow-500', 'bg-pink-500'];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="pillars">Pillars</TabsTrigger>
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="types">Types</TabsTrigger>
          <TabsTrigger value="sources">Sources</TabsTrigger>
          <TabsTrigger value="voice">Voice</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
        </TabsList>

        {/* General */}
        <TabsContent value="general">
          <Card>
            <CardHeader><CardTitle>General Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Brand Name</Label>
                <Input value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="Your brand name" />
              </div>
              <div className="space-y-2">
                <Label>Tagline</Label>
                <Input value={tagline} onChange={e => setTagline(e.target.value)} placeholder="Content Planner" />
              </div>
              <Button onClick={handleSaveGeneral}>Save</Button>

              <Separator />

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Claude API Status</p>
                  <p className="text-sm text-gray-500">Used for generating ideas and drafts</p>
                </div>
                {apiStatus === 'checking' && <span className="text-sm text-gray-500">Checking...</span>}
                {apiStatus === 'connected' && <span className="text-sm text-green-600 font-medium">Connected</span>}
                {apiStatus === 'not_configured' && <span className="text-sm text-yellow-600 font-medium">Not configured</span>}
              </div>

              <Button variant="outline" onClick={loadTemplates}>Apply Template</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pillars */}
        <TabsContent value="pillars">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Content Pillars</CardTitle>
                <Button size="sm" onClick={() => setEditingPillar({ isNew: true, label: '', slug: '', description: '', color: 'bg-blue-500' })}>
                  <Plus className="w-4 h-4 mr-1" />Add Pillar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Color</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.pillars.map(pillar => (
                    <TableRow key={pillar.id}>
                      <TableCell><div className={`w-4 h-4 rounded-full ${pillar.color}`} /></TableCell>
                      <TableCell className="font-medium">{pillar.label}</TableCell>
                      <TableCell className="text-gray-500 text-sm max-w-[300px] truncate">{pillar.description}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setEditingPillar(pillar)}><Edit2 className="w-3 h-3" /></Button>
                          <Button size="sm" variant="ghost" className="text-red-600" onClick={() => { if (confirm('Delete?')) deletePillar(pillar.id); }}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Edit Pillar Dialog */}
          <Dialog open={!!editingPillar} onOpenChange={() => setEditingPillar(null)}>
            <DialogContent onClose={() => setEditingPillar(null)}>
              <DialogHeader><DialogTitle>{editingPillar?.isNew ? 'Add' : 'Edit'} Pillar</DialogTitle></DialogHeader>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label>Label</Label>
                  <Input value={editingPillar?.label || ''} onChange={e => setEditingPillar(prev => prev ? { ...prev, label: e.target.value } : null)} />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={editingPillar?.description || ''} onChange={e => setEditingPillar(prev => prev ? { ...prev, description: e.target.value } : null)} rows={2} />
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <div className="flex gap-2 flex-wrap">
                    {PILLAR_COLORS.map(color => (
                      <button key={color} onClick={() => setEditingPillar(prev => prev ? { ...prev, color } : null)}
                        className={`w-8 h-8 rounded-full ${color} ${editingPillar?.color === color ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingPillar(null)}>Cancel</Button>
                <Button onClick={handleSavePillar}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Channels */}
        <TabsContent value="channels">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Channels</CardTitle>
                <Button size="sm" onClick={() => setEditingChannel({ isNew: true, label: '', slug: '', platform: 'linkedin', color: 'bg-orange-500' })}>
                  <Plus className="w-4 h-4 mr-1" />Add Channel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Label</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Max Length</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.channels.map(ch => (
                    <TableRow key={ch.id}>
                      <TableCell className="font-medium">{ch.label}</TableCell>
                      <TableCell><Badge variant="secondary">{ch.platform}</Badge></TableCell>
                      <TableCell>{ch.maxLength || '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setEditingChannel(ch)}><Edit2 className="w-3 h-3" /></Button>
                          <Button size="sm" variant="ghost" className="text-red-600" onClick={() => { if (confirm('Delete?')) deleteChannel(ch.id); }}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Dialog open={!!editingChannel} onOpenChange={() => setEditingChannel(null)}>
            <DialogContent onClose={() => setEditingChannel(null)}>
              <DialogHeader><DialogTitle>{editingChannel?.isNew ? 'Add' : 'Edit'} Channel</DialogTitle></DialogHeader>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label>Label</Label>
                  <Input value={editingChannel?.label || ''} onChange={e => setEditingChannel(prev => prev ? { ...prev, label: e.target.value } : null)} />
                </div>
                <div className="space-y-2">
                  <Label>Platform</Label>
                  <select className="flex h-9 w-full rounded-md border border-gray-300 bg-transparent px-3 text-sm" value={editingChannel?.platform || 'linkedin'} onChange={e => setEditingChannel(prev => prev ? { ...prev, platform: e.target.value } : null)}>
                    <option value="linkedin">LinkedIn</option>
                    <option value="twitter">X / Twitter</option>
                    <option value="blog">Blog</option>
                    <option value="email">Email / Newsletter</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Character Limit (optional)</Label>
                  <Input type="number" value={editingChannel?.maxLength || ''} onChange={e => setEditingChannel(prev => prev ? { ...prev, maxLength: parseInt(e.target.value) || null } : null)} placeholder="3000" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingChannel(null)}>Cancel</Button>
                <Button onClick={handleSaveChannel}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Content Types */}
        <TabsContent value="types">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Content Types</CardTitle>
                <Button size="sm" onClick={() => setEditingContentType({ isNew: true, label: '', slug: '' })}>
                  <Plus className="w-4 h-4 mr-1" />Add Type
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Label</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.contentTypes.map(ct => (
                    <TableRow key={ct.id}>
                      <TableCell className="font-medium">{ct.label}</TableCell>
                      <TableCell className="text-gray-500">{ct.slug}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setEditingContentType(ct)}><Edit2 className="w-3 h-3" /></Button>
                          <Button size="sm" variant="ghost" className="text-red-600" onClick={() => { if (confirm('Delete?')) deleteContentType(ct.id); }}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Dialog open={!!editingContentType} onOpenChange={() => setEditingContentType(null)}>
            <DialogContent onClose={() => setEditingContentType(null)}>
              <DialogHeader><DialogTitle>{editingContentType?.isNew ? 'Add' : 'Edit'} Content Type</DialogTitle></DialogHeader>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label>Label</Label>
                  <Input value={editingContentType?.label || ''} onChange={e => setEditingContentType(prev => prev ? { ...prev, label: e.target.value } : null)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingContentType(null)}>Cancel</Button>
                <Button onClick={handleSaveContentType}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Sources */}
        <TabsContent value="sources">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>News Sources</CardTitle>
                <Button size="sm" onClick={() => setEditingSource({ isNew: true, name: '', url: '', cssSelector: 'article h2, article h3', category: 'General' })}>
                  <Plus className="w-4 h-4 mr-1" />Add Source
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.sources.map(source => (
                    <TableRow key={source.id}>
                      <TableCell className="font-medium">{source.name}</TableCell>
                      <TableCell><Badge variant="secondary">{source.category}</Badge></TableCell>
                      <TableCell className="text-gray-500 text-xs max-w-[200px] truncate">{source.url}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => handleTestScrape(source.id)} disabled={testingScrape === source.id}>
                            {testingScrape === source.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <TestTube className="w-3 h-3" />}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingSource(source)}><Edit2 className="w-3 h-3" /></Button>
                          <Button size="sm" variant="ghost" className="text-red-600" onClick={() => { if (confirm('Delete?')) deleteSource(source.id); }}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {scrapeResult.length > 0 && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs font-medium text-gray-700 mb-2">Test Results ({scrapeResult.length} headlines)</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {scrapeResult.map((h, i) => <p key={i} className="text-xs text-gray-600">{h}</p>)}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Dialog open={!!editingSource} onOpenChange={() => setEditingSource(null)}>
            <DialogContent onClose={() => setEditingSource(null)}>
              <DialogHeader><DialogTitle>{editingSource?.isNew ? 'Add' : 'Edit'} Source</DialogTitle></DialogHeader>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={editingSource?.name || ''} onChange={e => setEditingSource(prev => prev ? { ...prev, name: e.target.value } : null)} />
                </div>
                <div className="space-y-2">
                  <Label>URL</Label>
                  <Input value={editingSource?.url || ''} onChange={e => setEditingSource(prev => prev ? { ...prev, url: e.target.value } : null)} placeholder="https://..." />
                </div>
                <div className="space-y-2">
                  <Label>CSS Selector</Label>
                  <Input value={editingSource?.cssSelector || ''} onChange={e => setEditingSource(prev => prev ? { ...prev, cssSelector: e.target.value } : null)} placeholder="article h2, article h3" />
                  <p className="text-xs text-gray-500">CSS selector to extract headlines from the page</p>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input value={editingSource?.category || ''} onChange={e => setEditingSource(prev => prev ? { ...prev, category: e.target.value } : null)} placeholder="e.g., Newsletter, Tech, Business" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingSource(null)}>Cancel</Button>
                <Button onClick={handleSaveSource}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Voice */}
        <TabsContent value="voice">
          <div className="space-y-6">
            {/* Voice Samples */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Writing Samples</CardTitle>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={handleAnalyzeVoice} disabled={isAnalyzing || data.voiceSamples.length === 0}>
                      {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Sparkles className="w-4 h-4 mr-1" />}
                      {isAnalyzing ? 'Analyzing...' : 'Analyze Voice'}
                    </Button>
                    <Button size="sm" onClick={() => setShowAddSample(true)}>
                      <Plus className="w-4 h-4 mr-1" />Add Sample
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {data.voiceSamples.length === 0 ? (
                  <p className="text-sm text-gray-500">No writing samples yet. Add samples to analyze your voice.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Words</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.voiceSamples.map(sample => (
                        <TableRow key={sample.id}>
                          <TableCell className="font-medium">{sample.title}</TableCell>
                          <TableCell><Badge variant="secondary">{sample.sourceType}</Badge></TableCell>
                          <TableCell>{sample.wordCount}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="ghost" className="text-red-600" onClick={() => deleteVoiceSample(sample.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Voice Analysis Result */}
            {data.voiceProfile?.analyzedVoiceSummary && (
              <Card>
                <CardHeader><CardTitle>AI Voice Analysis</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{data.voiceProfile.analyzedVoiceSummary}</p>
                </CardContent>
              </Card>
            )}

            {/* Voice Guidelines */}
            <Card>
              <CardHeader><CardTitle>Voice Guidelines</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-green-700">Do Examples</Label>
                    <Textarea
                      value={(data.voiceProfile?.doExamples as string[] || []).join('\n')}
                      onChange={e => {
                        const examples = e.target.value.split('\n').filter(Boolean);
                        if (data.voiceProfile) {
                          updateVoiceProfile({ doExamples: examples });
                        }
                      }}
                      rows={4}
                      placeholder="One example per line..."
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label className="text-red-700">Don't Examples</Label>
                    <Textarea
                      value={(data.voiceProfile?.dontExamples as string[] || []).join('\n')}
                      onChange={e => {
                        const examples = e.target.value.split('\n').filter(Boolean);
                        if (data.voiceProfile) {
                          updateVoiceProfile({ dontExamples: examples });
                        }
                      }}
                      rows={4}
                      placeholder="One example per line..."
                      className="mt-2"
                    />
                  </div>
                </div>
                <div>
                  <Label>Principles</Label>
                  <Textarea
                    value={(data.voiceProfile?.principles as string[] || []).join('\n')}
                    onChange={e => {
                      const principles = e.target.value.split('\n').filter(Boolean);
                      if (data.voiceProfile) {
                        updateVoiceProfile({ principles });
                      }
                    }}
                    rows={3}
                    placeholder="One principle per line..."
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>Jargon Blacklist</Label>
                  <Textarea
                    value={(data.voiceProfile?.jargonBlacklist as string[] || []).join(', ')}
                    onChange={e => {
                      const jargon = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                      if (data.voiceProfile) {
                        updateVoiceProfile({ jargonBlacklist: jargon });
                      }
                    }}
                    rows={2}
                    placeholder="comma, separated, words..."
                    className="mt-2"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Add Sample Dialog */}
          <Dialog open={showAddSample} onOpenChange={setShowAddSample}>
            <DialogContent onClose={() => setShowAddSample(false)}>
              <DialogHeader><DialogTitle>Add Writing Sample</DialogTitle></DialogHeader>
              <div className="p-6 space-y-4">
                <div className="flex gap-2">
                  <Button size="sm" variant={sampleTab === 'paste' ? 'default' : 'outline'} onClick={() => setSampleTab('paste')}>
                    <FileText className="w-3 h-3 mr-1" />Paste
                  </Button>
                  <Button size="sm" variant={sampleTab === 'upload' ? 'default' : 'outline'} onClick={() => setSampleTab('upload')}>
                    <Upload className="w-3 h-3 mr-1" />Upload
                  </Button>
                  <Button size="sm" variant={sampleTab === 'url' ? 'default' : 'outline'} onClick={() => setSampleTab('url')}>
                    <Globe className="w-3 h-3 mr-1" />URL
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={sampleTitle} onChange={e => setSampleTitle(e.target.value)} placeholder="Sample title..." />
                </div>

                {sampleTab === 'paste' && (
                  <div className="space-y-2">
                    <Label>Content</Label>
                    <Textarea value={sampleContent} onChange={e => setSampleContent(e.target.value)} rows={8} placeholder="Paste your writing sample here..." />
                  </div>
                )}

                {sampleTab === 'upload' && (
                  <div className="space-y-2">
                    <Label>File (.txt, .docx)</Label>
                    <input ref={fileInputRef} type="file" accept=".txt,.docx" onChange={handleFileUpload} className="text-sm" />
                  </div>
                )}

                {sampleTab === 'url' && (
                  <div className="space-y-2">
                    <Label>Article URL</Label>
                    <Input value={sampleUrl} onChange={e => setSampleUrl(e.target.value)} placeholder="https://..." />
                    <p className="text-xs text-gray-500">We'll scrape the article text from this URL</p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddSample(false)}>Cancel</Button>
                <Button onClick={handleAddSample} disabled={isAddingSample}>
                  {isAddingSample ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  Add Sample
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Data */}
        <TabsContent value="data">
          <Card>
            <CardHeader><CardTitle>Data Management</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span><strong>{data.contentPieces.length}</strong> posts</span>
                <span><strong>{data.contentIdeas.length}</strong> ideas</span>
                <span><strong>{data.voiceSamples.length}</strong> voice samples</span>
              </div>
              <p className="text-sm text-gray-500">Data is stored in a Postgres database and persists across sessions.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Templates Dialog */}
      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent onClose={() => setShowTemplates(false)}>
          <DialogHeader><DialogTitle>Apply Template</DialogTitle></DialogHeader>
          <div className="p-6 space-y-3">
            <p className="text-sm text-gray-500">Choose a preset configuration. This will replace your current pillars, channels, sources, and voice settings.</p>
            {templates.map(tpl => (
              <button
                key={tpl.id}
                onClick={() => applyTemplate(tpl.id)}
                className="w-full text-left p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <p className="font-medium text-gray-900">{tpl.name}</p>
                {tpl.description && <p className="text-sm text-gray-500 mt-1">{tpl.description}</p>}
              </button>
            ))}
            <button
              onClick={() => setShowTemplates(false)}
              className="w-full text-left p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
            >
              <p className="font-medium text-gray-900">Start from scratch</p>
              <p className="text-sm text-gray-500 mt-1">Keep current settings</p>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
