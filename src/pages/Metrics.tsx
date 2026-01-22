import { useState, useMemo } from 'react';
import { format, parseISO, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import { useAppStore } from '../store/StoreContext';
import { Card, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import { Input, Select, Textarea } from '../components/Input';
import { Modal } from '../components/Modal';
import { Badge } from '../components/Badge';
import { calculateEngagementRate } from '../utils/helpers';
import { CONTENT_STATUSES, CHANNELS, PILLARS } from '../utils/constants';

const COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#6B7280'];

export function Metrics() {
  const { data, addContentMetrics, updateMonthlyGoals, addMonthlyGoals, getMonthlyGoals } = useAppStore();

  const [showMetricsModal, setShowMetricsModal] = useState(false);
  const [selectedContentId, setSelectedContentId] = useState('');
  const [newMetrics, setNewMetrics] = useState({
    impressions: '',
    reactions: '',
    comments: '',
    shares: '',
    clicks: '',
    qualityNotes: '',
    businessOutcome: '',
  });

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const monthlyGoals = getMonthlyGoals(currentMonth, currentYear);

  const [goals, setGoals] = useState({
    targetPosts: monthlyGoals?.targetPosts?.toString() || '12',
    targetArticles: monthlyGoals?.targetArticles?.toString() || '2',
    targetEngagementRate: monthlyGoals?.targetEngagementRate?.toString() || '3',
  });

  const publishedContent = useMemo(() => {
    return data.contentPieces.filter(p => p.status === 'published');
  }, [data.contentPieces]);

  const monthlyStats = useMemo(() => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);

    const thisMonthContent = data.contentPieces.filter(piece => {
      if (piece.status !== 'published' || !piece.publishedDate) return false;
      const date = parseISO(piece.publishedDate);
      return isWithinInterval(date, { start, end });
    });

    const thisMonthMetrics = data.contentMetrics.filter(m => {
      const piece = data.contentPieces.find(p => p.id === m.contentPieceId);
      if (!piece?.publishedDate) return false;
      const date = parseISO(piece.publishedDate);
      return isWithinInterval(date, { start, end });
    });

    const totalImpressions = thisMonthMetrics.reduce((sum, m) => sum + (m.impressions || 0), 0);
    const totalEngagements = thisMonthMetrics.reduce(
      (sum, m) => sum + (m.reactions || 0) + (m.comments || 0) + (m.shares || 0),
      0
    );
    const avgEngagement =
      thisMonthMetrics.length > 0
        ? thisMonthMetrics.reduce((sum, m) => sum + calculateEngagementRate(m), 0) / thisMonthMetrics.length
        : 0;

    const articles = thisMonthContent.filter(
      p => p.contentType === 'long_article' || p.contentType === 'case_study'
    ).length;

    return {
      posts: thisMonthContent.length,
      articles,
      totalImpressions,
      totalEngagements,
      avgEngagement,
    };
  }, [data.contentPieces, data.contentMetrics]);

  const engagementOverTime = useMemo(() => {
    const months: { name: string; engagement: number; posts: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);

      const monthMetrics = data.contentMetrics.filter(m => {
        const piece = data.contentPieces.find(p => p.id === m.contentPieceId);
        if (!piece?.publishedDate) return false;
        const pDate = parseISO(piece.publishedDate);
        return isWithinInterval(pDate, { start, end });
      });

      const monthPosts = data.contentPieces.filter(piece => {
        if (piece.status !== 'published' || !piece.publishedDate) return false;
        const pDate = parseISO(piece.publishedDate);
        return isWithinInterval(pDate, { start, end });
      }).length;

      const avgEng =
        monthMetrics.length > 0
          ? monthMetrics.reduce((sum, m) => sum + calculateEngagementRate(m), 0) / monthMetrics.length
          : 0;

      months.push({
        name: format(date, 'MMM'),
        engagement: parseFloat(avgEng.toFixed(2)),
        posts: monthPosts,
      });
    }

    return months;
  }, [data.contentPieces, data.contentMetrics]);

  const contentByStatus = useMemo(() => {
    const counts: { name: string; value: number; color: string }[] = [];

    Object.entries(CONTENT_STATUSES).forEach(([key, { label }]) => {
      const count = data.contentPieces.filter(p => p.status === key).length;
      if (count > 0) {
        counts.push({
          name: label,
          value: count,
          color: COLORS[counts.length % COLORS.length],
        });
      }
    });

    return counts;
  }, [data.contentPieces]);

  const contentByChannel = useMemo(() => {
    return Object.entries(CHANNELS).map(([key, { label }]) => ({
      name: label,
      count: data.contentPieces.filter(p => p.channel === key && p.status === 'published').length,
    }));
  }, [data.contentPieces]);

  const contentByPillar = useMemo(() => {
    return Object.entries(PILLARS).map(([key, { label }]) => ({
      name: label,
      count: data.contentPieces.filter(p => p.pillar === key && p.status === 'published').length,
    }));
  }, [data.contentPieces]);

  const topPerforming = useMemo(() => {
    return data.contentMetrics
      .map(m => {
        const piece = data.contentPieces.find(p => p.id === m.contentPieceId);
        return { metrics: m, piece };
      })
      .filter(item => item.piece)
      .sort((a, b) => calculateEngagementRate(b.metrics) - calculateEngagementRate(a.metrics))
      .slice(0, 5);
  }, [data.contentMetrics, data.contentPieces]);

  const handleAddMetrics = () => {
    if (!selectedContentId) return;

    const impressions = parseInt(newMetrics.impressions) || undefined;
    const reactions = parseInt(newMetrics.reactions) || undefined;
    const comments = parseInt(newMetrics.comments) || undefined;
    const shares = parseInt(newMetrics.shares) || undefined;
    const clicks = parseInt(newMetrics.clicks) || undefined;

    addContentMetrics({
      contentPieceId: selectedContentId,
      impressions,
      reactions,
      comments,
      shares,
      clicks,
      engagementRate:
        impressions && impressions > 0
          ? (((reactions || 0) + (comments || 0) + (shares || 0)) / impressions) * 100
          : undefined,
      qualityNotes: newMetrics.qualityNotes || undefined,
      businessOutcome: newMetrics.businessOutcome || undefined,
    });

    setNewMetrics({
      impressions: '',
      reactions: '',
      comments: '',
      shares: '',
      clicks: '',
      qualityNotes: '',
      businessOutcome: '',
    });
    setSelectedContentId('');
    setShowMetricsModal(false);
  };

  const handleSaveGoals = () => {
    const goalData = {
      month: currentMonth,
      year: currentYear,
      targetPosts: parseInt(goals.targetPosts) || 12,
      targetArticles: parseInt(goals.targetArticles) || 2,
      targetEngagementRate: parseFloat(goals.targetEngagementRate) || 3,
      actualPosts: monthlyStats.posts,
      actualArticles: monthlyStats.articles,
      actualEngagementRate: monthlyStats.avgEngagement,
    };

    if (monthlyGoals) {
      updateMonthlyGoals(monthlyGoals.id, goalData);
    } else {
      addMonthlyGoals(goalData);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Metrics Dashboard</h1>
        <Button onClick={() => setShowMetricsModal(true)}>+ Add Metrics</Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Posts This Month</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {monthlyStats.posts}
            <span className="text-sm font-normal text-gray-400">
              /{goals.targetPosts}
            </span>
          </p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Articles</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {monthlyStats.articles}
            <span className="text-sm font-normal text-gray-400">
              /{goals.targetArticles}
            </span>
          </p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Impressions</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {monthlyStats.totalImpressions.toLocaleString()}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Engagements</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {monthlyStats.totalEngagements.toLocaleString()}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Avg Engagement</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {monthlyStats.avgEngagement.toFixed(2)}%
            <span className="text-sm font-normal text-gray-400">
              /{goals.targetEngagementRate}%
            </span>
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Engagement Over Time */}
        <Card>
          <CardHeader title="Engagement Over Time" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={engagementOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="engagement"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6' }}
                  name="Engagement %"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Content by Status */}
        <Card>
          <CardHeader title="Content by Status" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={contentByStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {contentByStatus.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              {contentByStatus.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-1 text-xs">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span>{entry.name}: {entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Posts by Channel */}
        <Card>
          <CardHeader title="Posts by Channel" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={contentByChannel}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#9CA3AF" />
                <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                <Tooltip />
                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Posts by Pillar */}
        <Card>
          <CardHeader title="Posts by Pillar" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={contentByPillar} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} stroke="#9CA3AF" width={120} />
                <Tooltip />
                <Bar dataKey="count" fill="#10B981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Top Performing Content */}
      <Card>
        <CardHeader title="Top Performing Content" />
        {topPerforming.length === 0 ? (
          <p className="text-sm text-gray-500">No metrics recorded yet</p>
        ) : (
          <div className="space-y-3">
            {topPerforming.map(({ metrics, piece }) => (
              <div
                key={metrics.id}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
              >
                <div>
                  <p className="font-medium text-gray-900">{piece!.title || 'Untitled'}</p>
                  <div className="flex gap-4 mt-1 text-xs text-gray-500">
                    <span>{metrics.impressions?.toLocaleString() || 0} impressions</span>
                    <span>{metrics.reactions || 0} reactions</span>
                    <span>{metrics.comments || 0} comments</span>
                    <span>{metrics.shares || 0} shares</span>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-700">
                  {calculateEngagementRate(metrics).toFixed(2)}% engagement
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Monthly Goals */}
      <Card>
        <CardHeader title={`${format(new Date(), 'MMMM yyyy')} Goals`} />
        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Target Posts"
            type="number"
            value={goals.targetPosts}
            onChange={e => setGoals(prev => ({ ...prev, targetPosts: e.target.value }))}
          />
          <Input
            label="Target Articles"
            type="number"
            value={goals.targetArticles}
            onChange={e => setGoals(prev => ({ ...prev, targetArticles: e.target.value }))}
          />
          <Input
            label="Target Engagement %"
            type="number"
            step="0.1"
            value={goals.targetEngagementRate}
            onChange={e => setGoals(prev => ({ ...prev, targetEngagementRate: e.target.value }))}
          />
        </div>
        <div className="mt-4">
          <Button size="sm" onClick={handleSaveGoals}>
            Save Goals
          </Button>
        </div>
      </Card>

      {/* Add Metrics Modal */}
      <Modal
        isOpen={showMetricsModal}
        onClose={() => setShowMetricsModal(false)}
        title="Add Metrics"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowMetricsModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMetrics} disabled={!selectedContentId}>
              Add Metrics
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Content Piece"
            value={selectedContentId}
            onChange={e => setSelectedContentId(e.target.value)}
          >
            <option value="">Select content...</option>
            {publishedContent.map(piece => (
              <option key={piece.id} value={piece.id}>
                {piece.title || 'Untitled'} ({piece.publishedDate ? format(parseISO(piece.publishedDate), 'MMM d') : 'No date'})
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Impressions"
              type="number"
              value={newMetrics.impressions}
              onChange={e => setNewMetrics(prev => ({ ...prev, impressions: e.target.value }))}
            />
            <Input
              label="Reactions"
              type="number"
              value={newMetrics.reactions}
              onChange={e => setNewMetrics(prev => ({ ...prev, reactions: e.target.value }))}
            />
            <Input
              label="Comments"
              type="number"
              value={newMetrics.comments}
              onChange={e => setNewMetrics(prev => ({ ...prev, comments: e.target.value }))}
            />
            <Input
              label="Shares"
              type="number"
              value={newMetrics.shares}
              onChange={e => setNewMetrics(prev => ({ ...prev, shares: e.target.value }))}
            />
            <Input
              label="Clicks"
              type="number"
              value={newMetrics.clicks}
              onChange={e => setNewMetrics(prev => ({ ...prev, clicks: e.target.value }))}
            />
          </div>

          <Textarea
            label="Quality Notes"
            value={newMetrics.qualityNotes}
            onChange={e => setNewMetrics(prev => ({ ...prev, qualityNotes: e.target.value }))}
            placeholder="Comment quality, who engaged, etc."
            rows={2}
          />

          <Textarea
            label="Business Outcome"
            value={newMetrics.businessOutcome}
            onChange={e => setNewMetrics(prev => ({ ...prev, businessOutcome: e.target.value }))}
            placeholder="Any leads, conversations, opportunities..."
            rows={2}
          />
        </div>
      </Modal>
    </div>
  );
}
