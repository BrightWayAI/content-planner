import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, isSameDay, startOfWeek, addDays } from 'date-fns';
import { useAppStore } from '../store/StoreContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { Input, Textarea, Select } from '../components/Input';
import { getChannelColor, getPillarColor } from '../utils/helpers';
import { CHANNELS, PILLARS } from '../utils/constants';
import type { ContentPiece, Pillar, Channel } from '../types';

// Sources to monitor - these are the publications we scan for ideas
const SOURCES = [
  { name: 'Superhuman AI', url: 'https://www.superhuman.ai/', category: 'Newsletter' },
  { name: 'The Rundown AI', url: 'https://www.therundown.ai/', category: 'Newsletter' },
  { name: 'Every', url: 'https://every.to/', category: 'Newsletter' },
  { name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/', category: 'Tech' },
  { name: 'Ars Technica', url: 'https://arstechnica.com/ai/', category: 'Tech' },
  { name: 'VentureBeat AI', url: 'https://venturebeat.com/ai/', category: 'Tech' },
  { name: 'HBR Tech', url: 'https://hbr.org/topic/subject/technology', category: 'Business' },
  { name: 'MIT Tech Review', url: 'https://www.technologyreview.com/topic/artificial-intelligence/', category: 'Research' },
];

type CalendarFilter = 'all' | Pillar | Channel;

export function Home() {
  const { data, addContentIdea, addContentPiece } = useAppStore();
  const [isScanning, setIsScanning] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarFilter, setCalendarFilter] = useState<CalendarFilter>('all');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    title: '',
    pillar: 'practical_implementation' as Pillar,
    channel: 'personal_linkedin' as Channel,
    notes: '',
  });

  // Calendar data
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Filter content for calendar
  const filteredContent = useMemo(() => {
    return data.contentPieces.filter(piece => {
      const hasDate = piece.plannedDate || piece.publishedDate;
      if (!hasDate) return false;

      if (calendarFilter === 'all') return true;

      if (['operational_ai', 'human_ai_collaboration', 'practical_implementation'].includes(calendarFilter)) {
        return piece.pillar === calendarFilter;
      }

      if (['personal_linkedin', 'business_linkedin', 'both'].includes(calendarFilter)) {
        return piece.channel === calendarFilter;
      }

      return true;
    });
  }, [data.contentPieces, calendarFilter]);

  // Get content for a specific date
  const getContentForDate = (date: Date): ContentPiece[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return filteredContent.filter(piece => {
      const pieceDate = (piece.publishedDate || piece.plannedDate || '').split('T')[0];
      return pieceDate === dateStr;
    });
  };

  // Content for selected date
  const selectedDateContent = useMemo(() => {
    if (!selectedDate) return [];
    return getContentForDate(selectedDate);
  }, [selectedDate, filteredContent]);

  // This week's schedule
  const thisWeek = useMemo(() => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => {
      const day = addDays(weekStart, i);
      return {
        date: day,
        content: getContentForDate(day),
      };
    });
  }, [filteredContent]);

  // Scan sources for new ideas
  const handleScanSources = async () => {
    setIsScanning(true);
    try {
      const response = await fetch('/api/generate-ideas', { method: 'POST' });
      if (!response.ok) throw new Error('Failed to scan');

      const result = await response.json();
      if (result.ideas && result.ideas.length > 0) {
        result.ideas.forEach((idea: { title: string; pillar: Pillar; notes: string }) => {
          addContentIdea({
            title: idea.title,
            pillar: idea.pillar,
            notes: idea.notes,
            priority: 'high',
          });
        });
      }
    } catch {
      alert('Could not scan sources. Make sure ANTHROPIC_API_KEY is configured.');
    } finally {
      setIsScanning(false);
    }
  };

  // Schedule new content
  const handleSchedule = () => {
    if (!scheduleForm.title.trim() || !selectedDate) return;

    addContentPiece({
      title: scheduleForm.title,
      status: 'scheduled',
      channel: scheduleForm.channel,
      contentType: 'short_post',
      pillar: scheduleForm.pillar,
      body: scheduleForm.notes,
      plannedDate: format(selectedDate, 'yyyy-MM-dd'),
    });

    setScheduleForm({ title: '', pillar: 'practical_implementation', channel: 'personal_linkedin', notes: '' });
    setShowScheduleModal(false);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      idea: 'bg-gray-400',
      drafting: 'bg-yellow-400',
      review: 'bg-orange-400',
      scheduled: 'bg-blue-400',
      published: 'bg-green-400',
    };
    return colors[status] || 'bg-gray-400';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Content Dashboard</h1>
        <p className="text-gray-500">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {/* Sources Panel - Always visible */}
        <div className="col-span-1 space-y-4">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Sources</h2>
              <Button size="sm" onClick={handleScanSources} disabled={isScanning}>
                {isScanning ? 'Scanning...' : 'Scan All'}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Browse for content inspiration
            </p>
            <div className="space-y-1">
              {SOURCES.map(source => (
                <a
                  key={source.name}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2 rounded hover:bg-gray-50 group"
                >
                  <div>
                    <span className="text-sm text-gray-900 group-hover:text-blue-600">
                      {source.name}
                    </span>
                    <span className="text-xs text-gray-400 ml-2">{source.category}</span>
                  </div>
                  <span className="text-gray-400 group-hover:text-blue-600">→</span>
                </a>
              ))}
            </div>
          </Card>

          {/* This Week Overview */}
          <Card>
            <h3 className="font-semibold text-gray-900 mb-3">This Week</h3>
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
                        <span key={p.id} className={`w-2 h-2 rounded-full ${getStatusColor(p.status)}`} />
                      ))}
                      {content.length > 2 && (
                        <span className="text-xs text-gray-400">+{content.length - 2}</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Calendar - Main area */}
        <div className="col-span-2">
          <Card>
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
                </button>
                <span className="text-lg font-semibold text-gray-900 w-40 text-center">
                  {format(currentMonth, 'MMMM yyyy')}
                </span>
                <button
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <ChevronRightIcon className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <button
                onClick={() => setCurrentMonth(new Date())}
                className="text-sm text-blue-600 hover:underline"
              >
                Today
              </button>
            </div>

            {/* Calendar Filters */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <button
                onClick={() => setCalendarFilter('all')}
                className={`px-2 py-1 rounded text-xs ${
                  calendarFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              {Object.entries(CHANNELS).map(([key, { label }]) => (
                <button
                  key={key}
                  onClick={() => setCalendarFilter(key as Channel)}
                  className={`px-2 py-1 rounded text-xs ${
                    calendarFilter === key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
              {Object.entries(PILLARS).map(([key, { label }]) => (
                <button
                  key={key}
                  onClick={() => setCalendarFilter(key as Pillar)}
                  className={`px-2 py-1 rounded text-xs ${
                    calendarFilter === key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                <div key={day} className="text-xs font-medium text-gray-500 text-center py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
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
                      isToday(day)
                        ? 'border-blue-400 bg-blue-50'
                        : isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50'
                    } ${!isSameMonth(day, currentMonth) ? 'opacity-40' : ''}`}
                  >
                    <span className={`text-xs font-medium ${
                      isToday(day) ? 'text-blue-600' : 'text-gray-700'
                    }`}>
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
                      {dayContent.length > 3 && (
                        <span className="text-xs text-gray-400">+{dayContent.length - 3}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right Panel - Selected Date / Unscheduled */}
        <div className="col-span-1 space-y-4">
          {selectedDate ? (
            <>
              <Card>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">
                    {format(selectedDate, 'EEEE, MMM d')}
                  </h3>
                  <button
                    onClick={() => setSelectedDate(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>

                {selectedDateContent.length === 0 ? (
                  <p className="text-sm text-gray-500 mb-3">Nothing scheduled</p>
                ) : (
                  <div className="space-y-2 mb-3">
                    {selectedDateContent.map(piece => (
                      <Link key={piece.id} to={`/posts?edit=${piece.id}`} className="block">
                        <div className="p-2 rounded border border-gray-100 hover:border-gray-300 transition-colors">
                          <div className="flex items-center gap-1 mb-1">
                            <span className={`w-2 h-2 rounded-full ${getStatusColor(piece.status)}`} />
                            <Badge className={getChannelColor(piece.channel)}>
                              {CHANNELS[piece.channel].label}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium text-gray-900 truncate">{piece.title}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full"
                  onClick={() => setShowScheduleModal(true)}
                >
                  + Schedule Post
                </Button>
              </Card>
            </>
          ) : (
            <Card>
              <h3 className="font-semibold text-gray-900 mb-3">Unscheduled Drafts</h3>
              <p className="text-xs text-gray-500 mb-3">Click a date to schedule</p>
              <div className="space-y-2">
                {data.contentPieces
                  .filter(p => ['drafting', 'review'].includes(p.status) && !p.plannedDate)
                  .slice(0, 5)
                  .map(piece => (
                    <Link key={piece.id} to={`/posts?edit=${piece.id}`}>
                      <div className="p-2 rounded border border-gray-100 hover:border-gray-300 transition-colors">
                        <div className="flex items-center gap-1 mb-1">
                          <span className={`w-2 h-2 rounded-full ${getStatusColor(piece.status)}`} />
                          <Badge className={getPillarColor(piece.pillar)}>
                            {PILLARS[piece.pillar].label}
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
              <Link to="/posts" className="text-sm text-blue-600 hover:underline mt-3 block">
                View all posts →
              </Link>
            </Card>
          )}

          {/* Quick Stats */}
          <Card padding="sm">
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
      <Modal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        title={`Schedule for ${selectedDate ? format(selectedDate, 'MMMM d') : ''}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowScheduleModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSchedule}>Schedule</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Post Title"
            value={scheduleForm.title}
            onChange={e => setScheduleForm(prev => ({ ...prev, title: e.target.value }))}
            placeholder="What will you post about?"
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Channel"
              value={scheduleForm.channel}
              onChange={e => setScheduleForm(prev => ({ ...prev, channel: e.target.value as Channel }))}
            >
              {Object.entries(CHANNELS).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </Select>
            <Select
              label="Pillar"
              value={scheduleForm.pillar}
              onChange={e => setScheduleForm(prev => ({ ...prev, pillar: e.target.value as Pillar }))}
            >
              {Object.entries(PILLARS).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </Select>
          </div>
          <Textarea
            label="Notes (optional)"
            value={scheduleForm.notes}
            onChange={e => setScheduleForm(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Key points, angle, or source..."
            rows={3}
          />
        </div>
      </Modal>
    </div>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}
