import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, parseISO, addMonths, subMonths, isSameDay } from 'date-fns';
import { useAppStore } from '../store/StoreContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { getChannelColor, getPillarColor } from '../utils/helpers';
import { CHANNELS, PILLARS } from '../utils/constants';
import type { ContentPiece, Pillar, Channel } from '../types';

type CalendarFilter = 'all' | Pillar | Channel;

export function Home() {
  const { data, addContentIdea } = useAppStore();
  const [isScanning, setIsScanning] = useState(false);
  const [scannedHeadlines, setScannedHeadlines] = useState<Array<{ source: string; title: string; url?: string }>>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarFilter, setCalendarFilter] = useState<CalendarFilter>('all');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

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

      // Check if filter is a pillar
      if (['operational_ai', 'human_ai_collaboration', 'practical_implementation'].includes(calendarFilter)) {
        return piece.pillar === calendarFilter;
      }

      // Check if filter is a channel
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

  // Stats
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = data.contentPieces.filter(p => {
      const date = p.publishedDate || p.plannedDate;
      if (!date) return false;
      const d = parseISO(date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    return {
      totalIdeas: data.contentIdeas.length,
      draftsInProgress: data.contentPieces.filter(p => ['idea', 'drafting', 'review'].includes(p.status)).length,
      scheduledThisMonth: thisMonth.filter(p => p.status === 'scheduled').length,
      publishedThisMonth: thisMonth.filter(p => p.status === 'published').length,
    };
  }, [data]);

  // Scan sources for new ideas
  const handleScanSources = async () => {
    setIsScanning(true);
    setScannedHeadlines([]);

    try {
      const response = await fetch('/api/generate-ideas', { method: 'POST' });
      if (!response.ok) throw new Error('Failed to scan');

      const result = await response.json();
      if (result.ideas && result.ideas.length > 0) {
        // Add ideas to the store
        result.ideas.forEach((idea: { title: string; pillar: Pillar; notes: string }) => {
          addContentIdea({
            title: idea.title,
            pillar: idea.pillar,
            notes: idea.notes,
            priority: 'high',
          });
        });

        // Show what was found
        setScannedHeadlines(result.ideas.map((i: { title: string }) => ({
          source: 'AI Generated',
          title: i.title,
        })));
      }
    } catch {
      alert('Could not scan sources. Make sure ANTHROPIC_API_KEY is configured.');
    } finally {
      setIsScanning(false);
    }
  };

  const getStatusDot = (status: string) => {
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Content Dashboard</h1>
          <p className="text-gray-500">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <Button onClick={handleScanSources} disabled={isScanning}>
          {isScanning ? 'Scanning...' : 'Scan Sources'}
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card padding="sm">
          <p className="text-2xl font-bold text-blue-600">{stats.totalIdeas}</p>
          <p className="text-xs text-gray-500">Ideas</p>
        </Card>
        <Card padding="sm">
          <p className="text-2xl font-bold text-yellow-600">{stats.draftsInProgress}</p>
          <p className="text-xs text-gray-500">In Progress</p>
        </Card>
        <Card padding="sm">
          <p className="text-2xl font-bold text-blue-600">{stats.scheduledThisMonth}</p>
          <p className="text-xs text-gray-500">Scheduled</p>
        </Card>
        <Card padding="sm">
          <p className="text-2xl font-bold text-green-600">{stats.publishedThisMonth}</p>
          <p className="text-xs text-gray-500">Published</p>
        </Card>
      </div>

      {/* Scanned Headlines */}
      {scannedHeadlines.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">New Ideas Added</h2>
            <button
              onClick={() => setScannedHeadlines([])}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Dismiss
            </button>
          </div>
          <div className="space-y-2">
            {scannedHeadlines.map((headline, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 bg-green-400 rounded-full" />
                <span className="text-gray-700">{headline.title}</span>
              </div>
            ))}
          </div>
          <Link to="/posts" className="text-sm text-blue-600 hover:underline mt-3 block">
            View all ideas →
          </Link>
        </Card>
      )}

      {/* Calendar Section */}
      <div className="grid grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="col-span-2">
          <Card>
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Content Calendar</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
                </button>
                <span className="text-sm font-medium text-gray-700 w-32 text-center">
                  {format(currentMonth, 'MMMM yyyy')}
                </span>
                <button
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <ChevronRightIcon className="w-5 h-5 text-gray-600" />
                </button>
              </div>
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
              <span className="text-xs text-gray-400">|</span>
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
              <span className="text-xs text-gray-400">|</span>
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
              {/* Empty cells for days before month start */}
              {Array.from({ length: (calendarDays[0].getDay() + 6) % 7 }).map((_, i) => (
                <div key={`empty-${i}`} className="h-20 bg-gray-50 rounded" />
              ))}

              {/* Calendar Days */}
              {calendarDays.map(day => {
                const dayContent = getContentForDate(day);
                const isSelected = selectedDate && isSameDay(day, selectedDate);

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(isSelected ? null : day)}
                    className={`h-20 p-1 rounded border transition-colors text-left ${
                      isToday(day)
                        ? 'border-blue-400 bg-blue-50'
                        : isSelected
                        ? 'border-gray-400 bg-gray-100'
                        : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50'
                    } ${!isSameMonth(day, currentMonth) ? 'opacity-50' : ''}`}
                  >
                    <span className={`text-xs font-medium ${
                      isToday(day) ? 'text-blue-600' : 'text-gray-700'
                    }`}>
                      {format(day, 'd')}
                    </span>
                    {dayContent.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {dayContent.slice(0, 2).map(piece => (
                          <div
                            key={piece.id}
                            className="flex items-center gap-1"
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(piece.status)}`} />
                            <span className="text-xs text-gray-600 truncate">{piece.title.slice(0, 15)}</span>
                          </div>
                        ))}
                        {dayContent.length > 2 && (
                          <span className="text-xs text-gray-400">+{dayContent.length - 2} more</span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Selected Date / Quick Actions */}
        <div className="space-y-4">
          {selectedDate ? (
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">
                  {format(selectedDate, 'MMMM d, yyyy')}
                </h3>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              {selectedDateContent.length === 0 ? (
                <p className="text-sm text-gray-500">No content scheduled</p>
              ) : (
                <div className="space-y-3">
                  {selectedDateContent.map(piece => (
                    <Link key={piece.id} to={`/posts?edit=${piece.id}`} className="block">
                      <div className="p-2 rounded border border-gray-100 hover:border-gray-300 transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={getChannelColor(piece.channel)}>
                            {CHANNELS[piece.channel].label}
                          </Badge>
                          <Badge className={getPillarColor(piece.pillar)}>
                            {PILLARS[piece.pillar].label}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium text-gray-900">{piece.title}</p>
                        <p className="text-xs text-gray-500 mt-1 capitalize">{piece.status}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              <Link
                to={`/posts?schedule=${format(selectedDate, 'yyyy-MM-dd')}`}
                className="text-sm text-blue-600 hover:underline mt-3 block"
              >
                + Schedule content for this day
              </Link>
            </Card>
          ) : (
            <Card>
              <h3 className="font-semibold text-gray-900 mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <Link to="/posts" className="block">
                  <Button variant="secondary" size="sm" className="w-full justify-start">
                    View Ideas
                  </Button>
                </Link>
                <Link to="/posts?tab=drafts" className="block">
                  <Button variant="secondary" size="sm" className="w-full justify-start">
                    Continue Drafts
                  </Button>
                </Link>
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full justify-start"
                  onClick={handleScanSources}
                  disabled={isScanning}
                >
                  {isScanning ? 'Scanning...' : 'Scan for Ideas'}
                </Button>
              </div>
            </Card>
          )}

          {/* Recent Activity */}
          <Card>
            <h3 className="font-semibold text-gray-900 mb-3">Recent Activity</h3>
            <div className="space-y-2">
              {data.contentPieces
                .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                .slice(0, 5)
                .map(piece => (
                  <Link key={piece.id} to={`/posts?edit=${piece.id}`} className="block">
                    <div className="flex items-center gap-2 text-sm hover:bg-gray-50 p-1 rounded">
                      <span className={`w-2 h-2 rounded-full ${getStatusDot(piece.status)}`} />
                      <span className="text-gray-700 truncate flex-1">{piece.title || 'Untitled'}</span>
                      <span className="text-xs text-gray-400">
                        {format(parseISO(piece.updatedAt), 'MMM d')}
                      </span>
                    </div>
                  </Link>
                ))}
            </div>
          </Card>
        </div>
      </div>
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
