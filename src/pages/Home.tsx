import { useState } from 'react';
import { useAppStore } from '@/store/StoreContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { getPillarColor } from '@/utils/helpers';
import { Loader2, Check, ExternalLink, Sparkles } from 'lucide-react';
import type { ScrapeResult } from '@/types';
import { api } from '@/lib/api';

type IdeaFlowStep = 'idle' | 'select-sources' | 'scanning' | 'review-headlines' | 'generating' | 'review-ideas';

export function Home() {
  const { data, batchAddIdeas } = useAppStore();

  const [ideaStep, setIdeaStep] = useState<IdeaFlowStep>('idle');
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [scanResults, setScanResults] = useState<ScrapeResult[]>([]);
  const [scanProgress, setScanProgress] = useState<Record<string, 'pending' | 'scanning' | 'done'>>({});
  const [selectedHeadlines, setSelectedHeadlines] = useState<string[]>([]);
  const [generatedIdeas, setGeneratedIdeas] = useState<Array<{ title: string; pillarId: string; notes: string; priority: string }>>([]);
  const [acceptedIdeas, setAcceptedIdeas] = useState<Set<number>>(new Set());

  const startIdeaFlow = () => {
    setSelectedSourceIds(data.sources.filter(s => s.isActive).map(s => s.id));
    setIdeaStep('select-sources');
    setScanResults([]);
    setSelectedHeadlines([]);
    setGeneratedIdeas([]);
    setAcceptedIdeas(new Set());
  };

  const handleScan = async () => {
    setIdeaStep('scanning');
    const progress: Record<string, 'pending' | 'scanning' | 'done'> = {};
    selectedSourceIds.forEach(id => { progress[id] = 'pending'; });
    setScanProgress(progress);

    try {
      selectedSourceIds.forEach(id => { progress[id] = 'scanning'; });
      setScanProgress({ ...progress });

      const results = await api.sources.scrape(selectedSourceIds);
      setScanResults(results);

      selectedSourceIds.forEach(id => { progress[id] = 'done'; });
      setScanProgress({ ...progress });

      setIdeaStep('review-headlines');
    } catch {
      setIdeaStep('select-sources');
    }
  };

  const handleGenerateIdeas = async () => {
    setIdeaStep('generating');
    try {
      const result = await api.ai.generateIdeas({ headlines: selectedHeadlines });
      setGeneratedIdeas(result.ideas);
      setIdeaStep('review-ideas');
    } catch {
      alert('AI generation failed. Check your API key.');
      setIdeaStep('review-headlines');
    }
  };

  const handleAcceptIdeas = async () => {
    const toCreate = generatedIdeas
      .filter((_, i) => acceptedIdeas.has(i))
      .map(idea => ({
        title: idea.title,
        pillarId: idea.pillarId,
        notes: idea.notes,
        priority: idea.priority,
      }));

    if (toCreate.length > 0) {
      await batchAddIdeas(toCreate);
    }
    setIdeaStep('idle');
  };

  const toggleHeadline = (headline: string) => {
    setSelectedHeadlines(prev =>
      prev.includes(headline) ? prev.filter(h => h !== headline) : [...prev, headline]
    );
  };

  const toggleAllSources = (selectAll: boolean) => {
    setSelectedSourceIds(selectAll ? data.sources.map(s => s.id) : []);
  };

  const allHeadlines = scanResults.flatMap(r => r.headlines);

  const toggleAllHeadlines = (selectAll: boolean) => {
    setSelectedHeadlines(selectAll ? allHeadlines : []);
  };

  const toggleAllIdeas = (selectAll: boolean) => {
    setAcceptedIdeas(selectAll ? new Set(generatedIdeas.map((_, i) => i)) : new Set());
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Headlines & Ideas</h1>
        <p className="text-gray-500">Monitor news sources and generate content ideas</p>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {/* Left column — Sources inventory */}
        <div className="col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Sources ({data.sources.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {data.sources.map(source => (
                  <a
                    key={source.id}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 rounded hover:bg-gray-50 group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm text-gray-700 group-hover:text-blue-600 truncate">{source.name}</span>
                      <Badge variant="secondary" className="text-[10px] shrink-0">{source.category}</Badge>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-600 shrink-0" />
                  </a>
                ))}
                {data.sources.length === 0 && (
                  <p className="text-sm text-gray-500">No sources configured. Add them in Settings.</p>
                )}
              </div>
              <Separator className="my-3" />
              <Button size="sm" className="w-full" onClick={startIdeaFlow}>
                <Sparkles className="w-4 h-4 mr-2" />
                Scan Sources
              </Button>
            </CardContent>
          </Card>

          <Card className="p-4">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div>
                <p className="text-xl font-bold text-gray-900">{data.contentIdeas.length}</p>
                <p className="text-xs text-gray-500">Ideas</p>
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">
                  {data.contentPieces.filter(p => ['drafting', 'review'].includes(p.status)).length}
                </p>
                <p className="text-xs text-gray-500">Drafts</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Right column — Idea generation flow */}
        <div className="col-span-3">
          {ideaStep === 'idle' && (
            <Card className="flex flex-col items-center justify-center py-16">
              <CardContent className="text-center">
                <Sparkles className="w-10 h-10 text-gray-300 mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Generate Ideas from Headlines</h2>
                <p className="text-gray-500 mb-6 max-w-md">
                  Scan your configured news sources, pick interesting headlines, and let AI generate content ideas tailored to your pillars.
                </p>
                <Button size="lg" onClick={startIdeaFlow}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Start Scanning
                </Button>
              </CardContent>
            </Card>
          )}

          {ideaStep === 'select-sources' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Select Sources to Scan</CardTitle>
                  <div className="flex items-center gap-2">
                    <button className="text-sm text-blue-600 hover:underline" onClick={() => toggleAllSources(true)}>Select all</button>
                    <span className="text-gray-300">|</span>
                    <button className="text-sm text-blue-600 hover:underline" onClick={() => toggleAllSources(false)}>Deselect all</button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 mb-6">
                  {data.sources.map(source => (
                    <label key={source.id} className="flex items-center gap-3 p-2.5 rounded hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedSourceIds.includes(source.id)}
                        onChange={() => {
                          setSelectedSourceIds(prev =>
                            prev.includes(source.id) ? prev.filter(id => id !== source.id) : [...prev, source.id]
                          );
                        }}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-900">{source.name}</span>
                      <Badge variant="secondary" className="text-xs">{source.category}</Badge>
                      {!source.isActive && <Badge variant="secondary" className="text-xs text-yellow-600">Inactive</Badge>}
                    </label>
                  ))}
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setIdeaStep('idle')}>Cancel</Button>
                  <Button className="flex-1" onClick={handleScan} disabled={selectedSourceIds.length === 0}>
                    Scan {selectedSourceIds.length} Sources
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {ideaStep === 'scanning' && (
            <Card>
              <CardHeader>
                <CardTitle>Scanning Sources...</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.sources.filter(s => selectedSourceIds.includes(s.id)).map(source => (
                    <div key={source.id} className="flex items-center gap-3 p-3 rounded bg-gray-50">
                      {scanProgress[source.id] === 'done' ? (
                        <Check className="w-5 h-5 text-green-500" />
                      ) : (
                        <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                      )}
                      <span className="text-sm text-gray-900">{source.name}</span>
                      <Badge variant="secondary" className="text-xs">{source.category}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {ideaStep === 'review-headlines' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Review Headlines</CardTitle>
                  <div className="flex items-center gap-2">
                    <button className="text-sm text-blue-600 hover:underline" onClick={() => toggleAllHeadlines(true)}>Select all</button>
                    <span className="text-gray-300">|</span>
                    <button className="text-sm text-blue-600 hover:underline" onClick={() => toggleAllHeadlines(false)}>Deselect all</button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6 mb-6">
                  {scanResults.map(result => (
                    <div key={result.source}>
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">{result.source} ({result.headlines.length})</h3>
                      <div className="space-y-1">
                        {result.headlines.map((headline, i) => (
                          <label key={i} className="flex items-start gap-3 p-2.5 rounded hover:bg-gray-50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedHeadlines.includes(headline)}
                              onChange={() => toggleHeadline(headline)}
                              className="rounded border-gray-300 mt-0.5"
                            />
                            <span className="text-sm text-gray-900">{headline}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="sticky bottom-0 bg-white border-t pt-4 flex items-center justify-between">
                  <span className="text-sm text-gray-500">{selectedHeadlines.length} headlines selected</span>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setIdeaStep('idle')}>Cancel</Button>
                    <Button onClick={handleGenerateIdeas} disabled={selectedHeadlines.length === 0}>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Ideas from {selectedHeadlines.length} Headlines
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {ideaStep === 'generating' && (
            <Card className="flex flex-col items-center justify-center py-16">
              <CardContent className="text-center">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Generating Ideas...</h2>
                <p className="text-gray-500">AI is analyzing headlines and creating content ideas</p>
              </CardContent>
            </Card>
          )}

          {ideaStep === 'review-ideas' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Review Generated Ideas</CardTitle>
                  <div className="flex items-center gap-2">
                    <button className="text-sm text-blue-600 hover:underline" onClick={() => toggleAllIdeas(true)}>Accept all</button>
                    <span className="text-gray-300">|</span>
                    <button className="text-sm text-blue-600 hover:underline" onClick={() => toggleAllIdeas(false)}>Reject all</button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-6">
                  {generatedIdeas.map((idea, i) => {
                    const pillar = data.pillars.find(p => p.id === idea.pillarId);
                    return (
                      <label
                        key={i}
                        className={`block p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                          acceptedIdeas.has(i) ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={acceptedIdeas.has(i)}
                            onChange={() => {
                              setAcceptedIdeas(prev => {
                                const next = new Set(prev);
                                if (next.has(i)) next.delete(i); else next.add(i);
                                return next;
                              });
                            }}
                            className="rounded border-gray-300 mt-1"
                          />
                          <div className="flex-1">
                            <h3 className="text-sm font-semibold text-gray-900 mb-1">{idea.title}</h3>
                            <div className="flex items-center gap-2 mb-2">
                              {pillar && <Badge className={getPillarColor(pillar)}>{pillar.label}</Badge>}
                              {idea.priority === 'high' && <Badge variant="destructive">High Priority</Badge>}
                            </div>
                            {idea.notes && <p className="text-sm text-gray-600">{idea.notes}</p>}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <div className="sticky bottom-0 bg-white border-t pt-4 flex items-center justify-between">
                  <span className="text-sm text-gray-500">{acceptedIdeas.size} of {generatedIdeas.length} ideas accepted</span>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setIdeaStep('idle')}>Cancel</Button>
                    <Button onClick={handleAcceptIdeas} disabled={acceptedIdeas.size === 0}>
                      Accept {acceptedIdeas.size} Ideas
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
