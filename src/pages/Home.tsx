import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, isSameDay, startOfWeek, addDays } from 'date-fns';
import { useAppStore } from '@/store/StoreContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { getPillarColor, getChannelColor } from '@/utils/helpers';
import { api } from '@/lib/api';
import { ChevronLeft, ChevronRight, Loader2, Check, ExternalLink, Sparkles } from 'lucide-react';
import type { ContentPiece, ScrapeResult } from '@/types';

type IdeaFlowStep = 'idle' | 'select-sources' | 'scanning' | 'review-headlines' | 'generating' | 'review-ideas';

export function Home() {
  const { data, addContentPiece, batchAddIdeas } = useAppStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarFilter, setCalendarFilter] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ title: '', pillarId: '', channelId: '', notes: '' });

  // Idea generation flow state
  const [ideaStep, setIdeaStep] = useState<IdeaFlowStep>('idle');
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [scanResults, setScanResults] = useState<ScrapeResult[]>([]);
  const [scanProgress, setScanProgress] = useState<Record<string, 'pending' | 'scanning' | 'done'>>({});
  const [selectedHeadlines, setSelectedHeadlines] = useState<string[]>([]);
  const [generatedIdeas, setGeneratedIdeas] = useState<Array<{ title: string; pillarId: string; notes: string; priority: string }>>([]);
  const [acceptedIdeas, setAcceptedIdeas] = useState<Set<number>>(new Set());

  // Calendar data
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const filteredContent = useMemo(() => {
    return data.contentPieces.filter(piece => {
      const hasDate = piece.plannedDate || piece.publishedDate;
      if (!hasDate) return false;
      if (calendarFilter === 'all') return true;
      // Check if it's a pillar ID
      if (data.pillars.some(p => p.id === calendarFilter)) return piece.pillarId === calendarFilter;
      // Check if it's a channel ID
      if (data.channels.some(c => c.id === calendarFilter)) return piece.channelId === calendarFilter;
      return true;
    });
  }, [data.contentPieces, calendarFilter, data.pillars, data.channels]);

  const getContentForDate = (date: Date): ContentPiece[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return filteredContent.filter(piece => {
      const pieceDate = (piece.publishedDate || piece.plannedDate || '').split('T')[0];
      return pieceDate === dateStr;
    });
  };

  const selectedDateContent = useMemo(() => {
    if (!selectedDate) return [];
    return getContentForDate(selectedDate);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, filteredContent]);

  const thisWeek = useMemo(() => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => {
      const day = addDays(weekStart, i);
      return { date: day, content: getContentForDate(day) };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredContent]);

  // === Idea Generation Flow ===
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
      // Set all to scanning
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

  // Schedule
  const handleSchedule = async () => {
    if (!scheduleForm.title.trim() || !selectedDate) return;
    await addContentPiece({
      title: scheduleForm.title,
      status: 'scheduled',
      channelId: scheduleForm.channelId || undefined,
      pillarId: scheduleForm.pillarId || undefined,
      body: scheduleForm.notes,
      plannedDate: format(selectedDate, 'yyyy-MM-dd'),
    });
    setScheduleForm({ title: '', pillarId: '', channelId: '', notes: '' });
    setShowScheduleModal(false);
  };

  const getStatusDotColor = (status: string) => {
    const colors: Record<string, string> = {
      idea: 'bg-gray-400', drafting: 'bg-yellow-400', review: 'bg-orange-400',
      scheduled: 'bg-blue-400', published: 'bg-green-400',
    };
    return colors[status] || 'bg-gray-400';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Content Dashboard</h1>
        <p className="text-gray-500">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {/* Left Panel - Sources & Idea Generation */}
        <div className="col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Idea Generation</CardTitle>
            </CardHeader>
            <CardContent>
              {ideaStep === 'idle' && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500">Scan news sources and generate AI-powered content ideas.</p>
                  <Button size="sm" className="w-full" onClick={startIdeaFlow}>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Ideas
                  </Button>
                  <Separator />
                  <p className="text-xs font-medium text-gray-700">Sources ({data.sources.length})</p>
                  <div className="space-y-1">
                    {data.sources.slice(0, 6).map(source => (
                      <a
                        key={source.id}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-1.5 rounded hover:bg-gray-50 group text-xs"
                      >
                        <span className="text-gray-700 group-hover:text-blue-600">{source.name}</span>
                        <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-blue-600" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {ideaStep === 'select-sources' && (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-gray-700">Select sources to scan</p>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {data.sources.map(source => (
                      <label key={source.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-50 text-xs cursor-pointer">
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
                        <span className="text-gray-700">{source.name}</span>
                        <span className="text-gray-400 ml-auto">{source.category}</span>
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setIdeaStep('idle')}>Cancel</Button>
                    <Button size="sm" className="flex-1" onClick={handleScan} disabled={selectedSourceIds.length === 0}>
                      Scan {selectedSourceIds.length} Sources
                    </Button>
                  </div>
                </div>
              )}

              {ideaStep === 'scanning' && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-700">Scanning sources...</p>
                  {data.sources.filter(s => selectedSourceIds.includes(s.id)).map(source => (
                    <div key={source.id} className="flex items-center gap-2 text-xs p-1.5">
                      {scanProgress[source.id] === 'done' ? (
                        <Check className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                      )}
                      <span className="text-gray-700">{source.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {ideaStep === 'review-headlines' && (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-gray-700">Select interesting headlines</p>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {scanResults.map(result => (
                      <div key={result.source}>
                        <p className="text-xs font-medium text-gray-500 mb-1">{result.source} ({result.headlines.length})</p>
                        {result.headlines.slice(0, 5).map((headline, i) => (
                          <label key={i} className="flex items-start gap-2 p-1 text-xs cursor-pointer hover:bg-gray-50 rounded">
                            <input
                              type="checkbox"
                              checked={selectedHeadlines.includes(headline)}
                              onChange={() => toggleHeadline(headline)}
                              className="rounded border-gray-300 mt-0.5"
                            />
                            <span className="text-gray-700 line-clamp-2">{headline}</span>
                          </label>
                        ))}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setIdeaStep('idle')}>Cancel</Button>
                    <Button size="sm" className="flex-1" onClick={handleGenerateIdeas} disabled={selectedHeadlines.length === 0}>
                      <Sparkles className="w-3.5 h-3.5 mr-1" />
                      Generate from {selectedHeadlines.length}
                    </Button>
                  </div>
                </div>
              )}

              {ideaStep === 'generating' && (
                <div className="flex flex-col items-center py-6 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                  <p className="text-xs text-gray-500">AI generating ideas...</p>
                </div>
              )}

              {ideaStep === 'review-ideas' && (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-gray-700">Review generated ideas</p>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {generatedIdeas.map((idea, i) => {
                      const pillar = data.pillars.find(p => p.id === idea.pillarId);
                      return (
                        <label
                          key={i}
                          className={`block p-2 rounded border cursor-pointer transition-colors ${
                            acceptedIdeas.has(i) ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start gap-2">
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
                              className="rounded border-gray-300 mt-0.5"
                            />
                            <div>
                              <p className="text-xs font-medium text-gray-900">{idea.title}</p>
                              {pillar && <Badge variant="secondary" className="mt-1 text-[10px]">{pillar.label}</Badge>}
                              {idea.notes && <p className="text-[10px] text-gray-500 mt-1">{idea.notes}</p>}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setIdeaStep('idle')}>Cancel</Button>
                    <Button size="sm" className="flex-1" onClick={handleAcceptIdeas} disabled={acceptedIdeas.size === 0}>
                      Accept {acceptedIdeas.size} Ideas
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">This Week</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {thisWeek.map(({ date, content }) => (
                  <div
                    key={date.toISOString()}
                    className={`flex items-center justify-between p-2 rounded text-sm ${
                      isToday(date) ? 'bg-blue-50' : ''
                    }`}
                  >
                    <span className={`font-medium ${isToday(date) ? 'text-blue-600' : 'text-gray-700'}`}>
                      {format(date, 'EEE d')}
                    </span>
                    {content.length > 0 ? (
                      <div className="flex items-center gap-1">
                        {content.slice(0, 2).map(p => (
                          <span key={p.id} className={`w-2 h-2 rounded-full ${getStatusDotColor(p.status)}`} />
                        ))}
                        {content.length > 2 && <span className="text-xs text-gray-400">+{content.length - 2}</span>}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Calendar */}
        <div className="col-span-2">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <span className="text-lg font-semibold text-gray-900 w-40 text-center">
                    {format(currentMonth, 'MMMM yyyy')}
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
                <button onClick={() => setCurrentMonth(new Date())} className="text-sm text-blue-600 hover:underline">Today</button>
              </div>

              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <button
                  onClick={() => setCalendarFilter('all')}
                  className={`px-2 py-1 rounded text-xs ${calendarFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >All</button>
                {data.channels.map(channel => (
                  <button
                    key={channel.id}
                    onClick={() => setCalendarFilter(channel.id)}
                    className={`px-2 py-1 rounded text-xs ${calendarFilter === channel.id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >{channel.label}</button>
                ))}
                {data.pillars.map(pillar => (
                  <button
                    key={pillar.id}
                    onClick={() => setCalendarFilter(pillar.id)}
                    className={`px-2 py-1 rounded text-xs ${calendarFilter === pillar.id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >{pillar.label}</button>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1 mb-1">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                  <div key={day} className="text-xs font-medium text-gray-500 text-center py-1">{day}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: (calendarDays[0].getDay() + 6) % 7 }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-24 bg-gray-50 rounded" />
                ))}
                {calendarDays.map(day => {
                  const dayContent = getContentForDate(day);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(isSelected ? null : day)}
                      className={`h-24 p-1.5 rounded border transition-colors text-left flex flex-col ${
                        isToday(day) ? 'border-blue-400 bg-blue-50' :
                        isSelected ? 'border-blue-500 bg-blue-50' :
                        'border-gray-100 hover:border-gray-300 hover:bg-gray-50'
                      } ${!isSameMonth(day, currentMonth) ? 'opacity-40' : ''}`}
                    >
                      <span className={`text-xs font-medium ${isToday(day) ? 'text-blue-600' : 'text-gray-700'}`}>
                        {format(day, 'd')}
                      </span>
                      <div className="flex-1 mt-1 overflow-hidden">
                        {dayContent.slice(0, 3).map(piece => (
                          <div
                            key={piece.id}
                            className={`text-xs px-1 py-0.5 rounded mb-0.5 truncate ${
                              piece.status === 'published' ? 'bg-green-100 text-green-700' :
                              piece.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {piece.title.slice(0, 20)}
                          </div>
                        ))}
                        {dayContent.length > 3 && <span className="text-xs text-gray-400">+{dayContent.length - 3}</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel */}
        <div className="col-span-1 space-y-4">
          {selectedDate ? (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{format(selectedDate, 'EEEE, MMM d')}</CardTitle>
                  <button onClick={() => setSelectedDate(null)} className="text-gray-400 hover:text-gray-600">x</button>
                </div>
              </CardHeader>
              <CardContent>
                {selectedDateContent.length === 0 ? (
                  <p className="text-sm text-gray-500 mb-3">Nothing scheduled</p>
                ) : (
                  <div className="space-y-2 mb-3">
                    {selectedDateContent.map(piece => (
                      <Link key={piece.id} to={`/editor/${piece.id}`} className="block">
                        <div className="p-2 rounded border border-gray-100 hover:border-gray-300 transition-colors">
                          <div className="flex items-center gap-1 mb-1">
                            <span className={`w-2 h-2 rounded-full ${getStatusDotColor(piece.status)}`} />
                            <Badge variant="secondary" className={getChannelColor(data.channels.find(c => c.id === piece.channelId))}>
                              {data.channels.find(c => c.id === piece.channelId)?.label || 'No channel'}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium text-gray-900 truncate">{piece.title}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
                <Button size="sm" variant="outline" className="w-full" onClick={() => setShowScheduleModal(true)}>
                  + Schedule Post
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Unscheduled Drafts</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-500 mb-3">Click a date to schedule</p>
                <div className="space-y-2">
                  {data.contentPieces
                    .filter(p => ['drafting', 'review'].includes(p.status) && !p.plannedDate)
                    .slice(0, 5)
                    .map(piece => (
                      <Link key={piece.id} to={`/editor/${piece.id}`}>
                        <div className="p-2 rounded border border-gray-100 hover:border-gray-300 transition-colors">
                          <div className="flex items-center gap-1 mb-1">
                            <span className={`w-2 h-2 rounded-full ${getStatusDotColor(piece.status)}`} />
                            <Badge variant="secondary" className={getPillarColor(data.pillars.find(p => p.id === piece.pillarId))}>
                              {data.pillars.find(p => p.id === piece.pillarId)?.label || 'No pillar'}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-900 truncate">{piece.title || 'Untitled'}</p>
                        </div>
                      </Link>
                    ))}
                  {data.contentPieces.filter(p => ['drafting', 'review'].includes(p.status) && !p.plannedDate).length === 0 && (
                    <p className="text-sm text-gray-500">No unscheduled drafts</p>
                  )}
                </div>
                <Link to="/posts" className="text-sm text-blue-600 hover:underline mt-3 block">View all posts</Link>
              </CardContent>
            </Card>
          )}

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
      </div>

      {/* Schedule Modal */}
      <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
        <DialogContent onClose={() => setShowScheduleModal(false)}>
          <DialogHeader>
            <DialogTitle>Schedule for {selectedDate ? format(selectedDate, 'MMMM d') : ''}</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <Label>Post Title</Label>
              <Input
                value={scheduleForm.title}
                onChange={e => setScheduleForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="What will you post about?"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Channel</Label>
                <Select value={scheduleForm.channelId} onChange={e => setScheduleForm(prev => ({ ...prev, channelId: e.target.value }))}>
                  <option value="">Select channel</option>
                  {data.channels.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Pillar</Label>
                <Select value={scheduleForm.pillarId} onChange={e => setScheduleForm(prev => ({ ...prev, pillarId: e.target.value }))}>
                  <option value="">Select pillar</option>
                  {data.pillars.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={scheduleForm.notes}
                onChange={e => setScheduleForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Key points, angle, or source..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScheduleModal(false)}>Cancel</Button>
            <Button onClick={handleSchedule}>Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
