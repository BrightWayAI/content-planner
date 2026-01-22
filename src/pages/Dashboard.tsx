import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format, startOfWeek, addDays, parseISO, isToday, isSameDay } from 'date-fns';
import { useAppStore } from '../store/StoreContext';
import { Card, CardHeader } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { getStatusColor, getChannelColor, getPillarColor, getCurrentQuarter, calculateEngagementRate } from '../utils/helpers';
import { CHANNELS, CONTENT_STATUSES, QUARTERLY_THEMES } from '../utils/constants';

export function Dashboard() {
  const { data } = useAppStore();

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });

  const weekDays = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const todaysContent = useMemo(() => {
    return data.contentPieces.filter(piece => {
      const dateStr = piece.plannedDate || piece.publishedDate;
      if (!dateStr) return false;
      return isToday(parseISO(dateStr));
    });
  }, [data.contentPieces]);

  const weeklyContent = useMemo(() => {
    return weekDays.map(day => ({
      date: day,
      content: data.contentPieces.filter(piece => {
        const dateStr = piece.plannedDate || piece.publishedDate;
        if (!dateStr) return false;
        return isSameDay(parseISO(dateStr), day);
      }),
    }));
  }, [data.contentPieces, weekDays]);

  const stats = useMemo(() => {
    const thisMonth = today.getMonth();
    const thisYear = today.getFullYear();

    const monthlyPieces = data.contentPieces.filter(piece => {
      if (piece.status !== 'published') return false;
      const dateStr = piece.publishedDate;
      if (!dateStr) return false;
      const date = parseISO(dateStr);
      return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
    });

    const totalMetrics = data.contentMetrics.filter(m => {
      const piece = data.contentPieces.find(p => p.id === m.contentPieceId);
      if (!piece?.publishedDate) return false;
      const date = parseISO(piece.publishedDate);
      return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
    });

    const avgEngagement = totalMetrics.length > 0
      ? totalMetrics.reduce((sum, m) => sum + calculateEngagementRate(m), 0) / totalMetrics.length
      : 0;

    const inProgress = data.contentPieces.filter(
      p => p.status === 'drafting' || p.status === 'review'
    ).length;

    const scheduled = data.contentPieces.filter(p => p.status === 'scheduled').length;

    return {
      postsThisMonth: monthlyPieces.length,
      avgEngagement: avgEngagement.toFixed(2),
      inProgress,
      scheduled,
    };
  }, [data.contentPieces, data.contentMetrics, today]);

  const recentIdeas = useMemo(() => {
    return [...data.contentIdeas]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [data.contentIdeas]);

  const currentQuarter = getCurrentQuarter();
  const quarterTheme = QUARTERLY_THEMES[currentQuarter];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">{format(today, 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <Link to="/create">
          <Button>+ New Content</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Posts This Month</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.postsThisMonth}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Avg Engagement</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.avgEngagement}%</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500 uppercase tracking-wide">In Progress</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.inProgress}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Scheduled</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.scheduled}</p>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Today's Content */}
        <Card className="col-span-2">
          <CardHeader
            title="Today's Content"
            action={
              <Link to="/calendar" className="text-sm text-blue-600 hover:underline">
                View calendar
              </Link>
            }
          />
          {todaysContent.length === 0 ? (
            <p className="text-sm text-gray-500">No content scheduled for today</p>
          ) : (
            <div className="space-y-3">
              {todaysContent.map(piece => (
                <Link
                  key={piece.id}
                  to={`/create/${piece.id}`}
                  className="block p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{piece.title || 'Untitled'}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge className={getStatusColor(piece.status)}>
                          {CONTENT_STATUSES[piece.status].label}
                        </Badge>
                        <Badge className={getChannelColor(piece.channel)}>
                          {CHANNELS[piece.channel].label}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Quarter Theme */}
        <Card>
          <CardHeader title={`${currentQuarter} Theme`} />
          <p className="font-medium text-gray-900 mb-2">{quarterTheme.name}</p>
          <ul className="space-y-1">
            {quarterTheme.topics.map((topic, i) => (
              <li key={i} className="text-sm text-gray-600">• {topic}</li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Week View */}
      <Card>
        <CardHeader
          title="This Week"
          action={
            <Link to="/weekly" className="text-sm text-blue-600 hover:underline">
              Weekly plan
            </Link>
          }
        />
        <div className="grid grid-cols-5 gap-4">
          {weeklyContent.map(({ date, content }) => (
            <div
              key={date.toISOString()}
              className={`p-3 rounded-lg border ${
                isToday(date) ? 'border-blue-300 bg-blue-50' : 'border-gray-100'
              }`}
            >
              <p className={`text-xs font-medium mb-2 ${isToday(date) ? 'text-blue-700' : 'text-gray-500'}`}>
                {format(date, 'EEE, MMM d')}
              </p>
              {content.length === 0 ? (
                <p className="text-xs text-gray-400">No content</p>
              ) : (
                <div className="space-y-1">
                  {content.map(piece => (
                    <Link
                      key={piece.id}
                      to={`/create/${piece.id}`}
                      className="block text-xs text-gray-700 hover:text-blue-600 truncate"
                    >
                      {piece.title || 'Untitled'}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Recent Ideas */}
      <Card>
        <CardHeader
          title="Recent Ideas"
          action={
            <Link to="/library" className="text-sm text-blue-600 hover:underline">
              View all
            </Link>
          }
        />
        {recentIdeas.length === 0 ? (
          <p className="text-sm text-gray-500">No ideas captured yet</p>
        ) : (
          <div className="space-y-2">
            {recentIdeas.map(idea => (
              <div
                key={idea.id}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-2">
                  <Badge className={getPillarColor(idea.pillar)}>
                    {idea.pillar.replace(/_/g, ' ')}
                  </Badge>
                  <span className="text-sm text-gray-700">{idea.title}</span>
                </div>
                <span className="text-xs text-gray-400">
                  {format(parseISO(idea.createdAt), 'MMM d')}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
