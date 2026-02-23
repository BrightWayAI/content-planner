import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, isSameDay } from 'date-fns';
import { useAppStore } from '@/store/StoreContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { getPillarColor, getChannelColor } from '@/utils/helpers';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ContentPiece } from '@/types';

export function Schedule() {
  const { data, addContentPiece } = useAppStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarFilter, setCalendarFilter] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ title: '', pillarId: '', channelId: '', notes: '' });

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
      if (data.pillars.some(p => p.id === calendarFilter)) return piece.pillarId === calendarFilter;
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

  const getStatusDotColor = (status: string) => {
    const colors: Record<string, string> = {
      idea: 'bg-gray-400', drafting: 'bg-yellow-400', review: 'bg-orange-400',
      scheduled: 'bg-blue-400', published: 'bg-green-400',
    };
    return colors[status] || 'bg-gray-400';
  };

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
        <p className="text-gray-500">Plan and schedule your content calendar</p>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {/* Calendar — col-span-3 */}
        <div className="col-span-3">
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
                  <div key={`empty-${i}`} className="h-28 bg-gray-50 rounded" />
                ))}
                {calendarDays.map(day => {
                  const dayContent = getContentForDate(day);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(isSelected ? null : day)}
                      className={`h-28 p-1.5 rounded border transition-colors text-left flex flex-col ${
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

        {/* Right Panel — col-span-1 */}
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
                    .slice(0, 8)
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
              </CardContent>
            </Card>
          )}
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
