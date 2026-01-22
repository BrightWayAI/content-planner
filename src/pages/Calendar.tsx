import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns';
import { useAppStore } from '../store/StoreContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { getChannelColor, getStatusColor } from '../utils/helpers';
import { CHANNELS, CONTENT_STATUSES } from '../utils/constants';

export function Calendar() {
  const { data } = useAppStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days: Date[] = [];
    let day = calendarStart;

    while (day <= calendarEnd) {
      days.push(day);
      day = addDays(day, 1);
    }

    return days;
  }, [currentDate]);

  const contentByDate = useMemo(() => {
    const map = new Map<string, typeof data.contentPieces>();

    data.contentPieces.forEach(piece => {
      const dateStr = piece.plannedDate || piece.publishedDate;
      if (!dateStr) return;

      const dateKey = dateStr.split('T')[0];
      const existing = map.get(dateKey) || [];
      map.set(dateKey, [...existing, piece]);
    });

    return map;
  }, [data.contentPieces]);

  const selectedDateContent = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return contentByDate.get(dateKey) || [];
  }, [selectedDate, contentByDate]);

  const goToPreviousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
        <Link to="/create">
          <Button>+ New Content</Button>
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="col-span-2" padding="none">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={goToPreviousMonth}>
                ←
              </Button>
              <h2 className="text-lg font-semibold text-gray-900 min-w-[180px] text-center">
                {format(currentDate, 'MMMM yyyy')}
              </h2>
              <Button variant="ghost" size="sm" onClick={goToNextMonth}>
                →
              </Button>
            </div>
            <Button variant="secondary" size="sm" onClick={goToToday}>
              Today
            </Button>
          </div>

          <div className="p-4">
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map(day => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const dayContent = contentByDate.get(dateKey) || [];
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isTodayDate = isToday(day);

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={`min-h-[80px] p-1 text-left rounded-lg border transition-colors ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : isTodayDate
                        ? 'border-blue-200 bg-blue-50/50'
                        : 'border-gray-100 hover:border-gray-200'
                    } ${!isCurrentMonth ? 'opacity-40' : ''}`}
                  >
                    <div
                      className={`text-sm font-medium mb-1 ${
                        isTodayDate
                          ? 'text-blue-600'
                          : isCurrentMonth
                          ? 'text-gray-900'
                          : 'text-gray-400'
                      }`}
                    >
                      {format(day, 'd')}
                    </div>
                    {dayContent.slice(0, 2).map(piece => (
                      <div
                        key={piece.id}
                        className={`text-xs px-1 py-0.5 rounded mb-0.5 truncate ${getChannelColor(piece.channel)}`}
                      >
                        {piece.title || 'Untitled'}
                      </div>
                    ))}
                    {dayContent.length > 2 && (
                      <div className="text-xs text-gray-500 px-1">
                        +{dayContent.length - 2} more
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Selected Date Details */}
        <Card>
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            {selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : 'Select a date'}
          </h3>

          {selectedDate && (
            <>
              {selectedDateContent.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500 mb-4">No content on this date</p>
                  <Link to={`/create?date=${format(selectedDate, 'yyyy-MM-dd')}`}>
                    <Button size="sm">+ Add content</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDateContent.map(piece => (
                    <Link
                      key={piece.id}
                      to={`/create/${piece.id}`}
                      className="block p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <p className="font-medium text-gray-900 mb-2">
                        {piece.title || 'Untitled'}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        <Badge className={getStatusColor(piece.status)}>
                          {CONTENT_STATUSES[piece.status].label}
                        </Badge>
                        <Badge className={getChannelColor(piece.channel)}>
                          {CHANNELS[piece.channel].label}
                        </Badge>
                      </div>
                      {piece.hook && (
                        <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                          {piece.hook}
                        </p>
                      )}
                    </Link>
                  ))}
                  <div className="pt-2">
                    <Link to={`/create?date=${format(selectedDate, 'yyyy-MM-dd')}`}>
                      <Button variant="secondary" size="sm" className="w-full">
                        + Add more
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm text-gray-600">
        <span className="font-medium">Channels:</span>
        {Object.entries(CHANNELS).map(([key, { label, color }]) => (
          <div key={key} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded ${color}`} />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
