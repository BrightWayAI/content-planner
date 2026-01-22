import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format, startOfWeek, addDays, addWeeks, subWeeks, parseISO, isSameDay } from 'date-fns';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { useAppStore } from '../store/StoreContext';
import { Card, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import { Textarea } from '../components/Input';
import { Badge } from '../components/Badge';
import type { ContentPiece, DayOfWeek, Channel } from '../types';
import { getChannelColor, getStatusColor } from '../utils/helpers';
import { CHANNELS, CONTENT_STATUSES } from '../utils/constants';

const DAYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

function DraggableContent({ piece }: { piece: ContentPiece }) {
  return (
    <div className="p-2 bg-white rounded border border-gray-200 shadow-sm cursor-grab">
      <p className="text-sm font-medium text-gray-900 truncate">
        {piece.title || 'Untitled'}
      </p>
      <div className="flex gap-1 mt-1">
        <Badge className={getChannelColor(piece.channel)}>
          {CHANNELS[piece.channel].label.split(' ')[0]}
        </Badge>
      </div>
    </div>
  );
}

function DroppableSlot({
  day,
  channel,
  content,
  isOver,
}: {
  day: DayOfWeek;
  channel: Channel;
  content: ContentPiece[];
  isOver: boolean;
}) {
  return (
    <div
      className={`min-h-[80px] p-2 rounded-lg border-2 border-dashed transition-colors ${
        isOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50'
      }`}
      data-droppable={`${day}-${channel}`}
    >
      {content.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4">Drop content here</p>
      ) : (
        <div className="space-y-2">
          {content.map(piece => (
            <Link key={piece.id} to={`/create/${piece.id}`}>
              <div className="p-2 bg-white rounded border border-gray-200 hover:border-gray-300 transition-colors">
                <p className="text-xs font-medium text-gray-900 truncate">
                  {piece.title || 'Untitled'}
                </p>
                <Badge className={`${getStatusColor(piece.status)} text-[10px] mt-1`}>
                  {CONTENT_STATUSES[piece.status].label}
                </Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function WeeklyPlan() {
  const {
    data,
    getWeeklyPlan,
    addWeeklyPlan,
    updateWeeklyPlan,
    updateContentPiece,
  } = useAppStore();

  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [goals, setGoals] = useState('');
  const [retrospective, setRetrospective] = useState('');
  const [lessons, setLessons] = useState('');

  const weekStartDate = format(currentWeekStart, 'yyyy-MM-dd');
  const weekPlan = getWeeklyPlan(weekStartDate);

  useEffect(() => {
    if (weekPlan) {
      setGoals(weekPlan.goals || '');
      setRetrospective(weekPlan.retrospectiveNotes || '');
      setLessons(weekPlan.lessonsLearned || '');
    } else {
      setGoals('');
      setRetrospective('');
      setLessons('');
    }
  }, [weekPlan]);

  const weekDays = useMemo(() => {
    return DAYS.map((day, index) => ({
      day,
      date: addDays(currentWeekStart, index),
    }));
  }, [currentWeekStart]);

  const contentByDayAndChannel = useMemo(() => {
    const map = new Map<string, ContentPiece[]>();

    DAYS.forEach(day => {
      (['personal_linkedin', 'business_linkedin'] as Channel[]).forEach(channel => {
        map.set(`${day}-${channel}`, []);
      });
    });

    data.contentPieces.forEach(piece => {
      const dateStr = piece.plannedDate || piece.publishedDate;
      if (!dateStr) return;

      const pieceDate = parseISO(dateStr);
      const dayIndex = weekDays.findIndex(wd => isSameDay(wd.date, pieceDate));

      if (dayIndex === -1) return;

      const day = DAYS[dayIndex];
      const channel = piece.channel === 'both' ? 'personal_linkedin' : piece.channel;
      const key = `${day}-${channel}`;

      const existing = map.get(key) || [];
      map.set(key, [...existing, piece]);
    });

    return map;
  }, [data.contentPieces, weekDays]);

  const unscheduledContent = useMemo(() => {
    return data.contentPieces.filter(
      piece =>
        !piece.plannedDate &&
        !piece.publishedDate &&
        piece.status !== 'archived' &&
        piece.status !== 'published'
    );
  }, [data.contentPieces]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const pieceId = active.id as string;
    const dropTarget = over.id as string;

    if (!dropTarget.includes('-')) return;

    const [dayStr, channel] = dropTarget.split('-') as [DayOfWeek, Channel];
    const dayIndex = DAYS.indexOf(dayStr);

    if (dayIndex === -1) return;

    const targetDate = format(addDays(currentWeekStart, dayIndex), 'yyyy-MM-dd');

    updateContentPiece(pieceId, {
      plannedDate: targetDate,
      channel: channel as Channel,
    });
  };

  const handleSaveNotes = () => {
    if (weekPlan) {
      updateWeeklyPlan(weekPlan.id, {
        goals,
        retrospectiveNotes: retrospective,
        lessonsLearned: lessons,
      });
    } else {
      addWeeklyPlan({
        weekStartDate,
        slots: [],
        goals,
        retrospectiveNotes: retrospective,
        lessonsLearned: lessons,
      });
    }
  };

  const goToPreviousWeek = () => setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  const goToNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  const goToCurrentWeek = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const activePiece = activeId ? data.contentPieces.find(p => p.id === activeId) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Weekly Plan</h1>
        <Link to="/create">
          <Button>+ New Content</Button>
        </Link>
      </div>

      {/* Week Navigation */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={goToPreviousWeek}>
              ← Prev
            </Button>
            <h2 className="text-lg font-semibold text-gray-900 min-w-[240px] text-center">
              Week of {format(currentWeekStart, 'MMMM d, yyyy')}
            </h2>
            <Button variant="ghost" size="sm" onClick={goToNextWeek}>
              Next →
            </Button>
          </div>
          <Button variant="secondary" size="sm" onClick={goToCurrentWeek}>
            This Week
          </Button>
        </div>
      </Card>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-4 gap-6">
          {/* Weekly Calendar */}
          <div className="col-span-3">
            <Card padding="none">
              <div className="grid grid-cols-5 border-b border-gray-200">
                {weekDays.map(({ day, date }) => (
                  <div
                    key={day}
                    className="p-3 text-center border-r border-gray-200 last:border-r-0"
                  >
                    <p className="text-sm font-medium text-gray-900 capitalize">{day}</p>
                    <p className="text-xs text-gray-500">{format(date, 'MMM d')}</p>
                  </div>
                ))}
              </div>

              {/* Personal LinkedIn Row */}
              <div className="border-b border-gray-200">
                <div className="px-3 py-2 bg-orange-50 border-b border-gray-100">
                  <p className="text-xs font-medium text-orange-700">Personal LinkedIn</p>
                </div>
                <div className="grid grid-cols-5">
                  {DAYS.map(day => {
                    const key = `${day}-personal_linkedin`;
                    const content = contentByDayAndChannel.get(key) || [];
                    return (
                      <div
                        key={key}
                        id={key}
                        className="p-2 border-r border-gray-100 last:border-r-0 min-h-[100px]"
                      >
                        <DroppableSlot
                          day={day}
                          channel="personal_linkedin"
                          content={content}
                          isOver={false}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Business LinkedIn Row */}
              <div>
                <div className="px-3 py-2 bg-cyan-50 border-b border-gray-100">
                  <p className="text-xs font-medium text-cyan-700">BrightWay Business</p>
                </div>
                <div className="grid grid-cols-5">
                  {DAYS.map(day => {
                    const key = `${day}-business_linkedin`;
                    const content = contentByDayAndChannel.get(key) || [];
                    return (
                      <div
                        key={key}
                        id={key}
                        className="p-2 border-r border-gray-100 last:border-r-0 min-h-[100px]"
                      >
                        <DroppableSlot
                          day={day}
                          channel="business_linkedin"
                          content={content}
                          isOver={false}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Unscheduled Content */}
            <Card>
              <CardHeader title="Unscheduled" />
              {unscheduledContent.length === 0 ? (
                <p className="text-sm text-gray-500">All content is scheduled</p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {unscheduledContent.map(piece => (
                    <div
                      key={piece.id}
                      id={piece.id}
                      className="cursor-grab"
                    >
                      <DraggableContent piece={piece} />
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Weekly Goals */}
            <Card>
              <CardHeader title="Weekly Goals" />
              <Textarea
                value={goals}
                onChange={e => setGoals(e.target.value)}
                placeholder="What do you want to accomplish this week?"
                rows={3}
              />
            </Card>

            {/* Retrospective */}
            <Card>
              <CardHeader title="End-of-Week Retrospective" />
              <div className="space-y-3">
                <Textarea
                  value={retrospective}
                  onChange={e => setRetrospective(e.target.value)}
                  placeholder="How did the week go? What worked?"
                  rows={3}
                />
                <Textarea
                  value={lessons}
                  onChange={e => setLessons(e.target.value)}
                  placeholder="Lessons learned? What to try next week?"
                  rows={3}
                />
              </div>
              <div className="mt-3">
                <Button size="sm" onClick={handleSaveNotes}>
                  Save Notes
                </Button>
              </div>
            </Card>
          </div>
        </div>

        <DragOverlay>
          {activePiece ? <DraggableContent piece={activePiece} /> : null}
        </DragOverlay>
      </DndContext>

      {/* Content Mix Reminder */}
      <Card className="bg-blue-50 border-blue-100">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">
          Healthy Week Content Mix
        </h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• 1 substantial insight or framework piece</li>
          <li>• 1 practical how-to or tool tip</li>
          <li>• 1 observation or commentary on industry news</li>
          <li>• 1 engagement piece (question, poll, or discussion starter)</li>
        </ul>
      </Card>
    </div>
  );
}
