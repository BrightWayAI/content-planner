import { useState, useMemo } from 'react';
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import { useAppStore } from '@/store/StoreContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getPillarColor } from '@/utils/helpers';
import { CONTENT_STATUSES } from '@/utils/constants';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { BarChart3, TrendingUp, Eye, Heart, Plus } from 'lucide-react';

const CHART_COLORS = ['#3b82f6', '#22c55e', '#a855f7', '#f97316', '#06b6d4', '#ef4444'];

export function Analytics() {
  const { data, addContentMetrics } = useAppStore();
  const [showMetricsDialog, setShowMetricsDialog] = useState(false);
  const [selectedPieceId, setSelectedPieceId] = useState('');
  const [metricsForm, setMetricsForm] = useState({
    impressions: '', reactions: '', comments: '', shares: '', clicks: '', businessOutcome: '',
  });

  const last6Months = useMemo(() => {
    const end = new Date();
    const start = subMonths(end, 5);
    return eachMonthOfInterval({ start, end });
  }, []);

  const publishedContent = useMemo(() => {
    return data.contentPieces.filter(p => p.status === 'published');
  }, [data.contentPieces]);

  // Monthly stats for charts
  const monthlyStats = useMemo(() => {
    return last6Months.map(month => {
      const start = startOfMonth(month);
      const end = endOfMonth(month);
      const monthContent = publishedContent.filter(p => {
        if (!p.publishedDate) return false;
        const date = parseISO(p.publishedDate);
        return date >= start && date <= end;
      });
      const metrics = monthContent.flatMap(p => data.contentMetrics.filter(m => m.contentPieceId === p.id));
      const totalImpressions = metrics.reduce((sum, m) => sum + (m.impressions || 0), 0);
      const totalReactions = metrics.reduce((sum, m) => sum + (m.reactions || 0), 0);
      const totalComments = metrics.reduce((sum, m) => sum + (m.comments || 0), 0);
      const totalShares = metrics.reduce((sum, m) => sum + (m.shares || 0), 0);
      return {
        month: format(month, 'MMM'),
        posts: monthContent.length,
        impressions: totalImpressions,
        reactions: totalReactions,
        comments: totalComments,
        shares: totalShares,
        engagements: totalReactions + totalComments + totalShares,
      };
    });
  }, [last6Months, publishedContent, data.contentMetrics]);

  const overallStats = useMemo(() => {
    const allMetrics = data.contentMetrics;
    const totalImpressions = allMetrics.reduce((sum, m) => sum + (m.impressions || 0), 0);
    const totalReactions = allMetrics.reduce((sum, m) => sum + (m.reactions || 0), 0);
    const totalComments = allMetrics.reduce((sum, m) => sum + (m.comments || 0), 0);
    const totalShares = allMetrics.reduce((sum, m) => sum + (m.shares || 0), 0);
    return {
      totalPosts: publishedContent.length,
      totalImpressions, totalReactions, totalComments, totalShares,
      avgEngagementRate: totalImpressions > 0 ? ((totalReactions + totalComments + totalShares) / totalImpressions) * 100 : 0,
      thisMonth: monthlyStats[monthlyStats.length - 1]?.posts || 0,
    };
  }, [publishedContent, data.contentMetrics, monthlyStats]);

  // Pillar distribution for pie chart
  const pillarDistribution = useMemo(() => {
    return data.pillars.map((pillar, i) => ({
      name: pillar.label,
      value: publishedContent.filter(p => p.pillarId === pillar.id).length,
      color: CHART_COLORS[i % CHART_COLORS.length],
    })).filter(p => p.value > 0);
  }, [data.pillars, publishedContent]);

  // Channel performance
  const channelPerformance = useMemo(() => {
    return data.channels.map(channel => {
      const pieces = publishedContent.filter(p => p.channelId === channel.id);
      const metrics = pieces.flatMap(p => data.contentMetrics.filter(m => m.contentPieceId === p.id));
      const totalImpressions = metrics.reduce((sum, m) => sum + (m.impressions || 0), 0);
      const totalEngagements = metrics.reduce((sum, m) => sum + (m.reactions || 0) + (m.comments || 0) + (m.shares || 0), 0);
      return {
        name: channel.label,
        posts: pieces.length,
        impressions: totalImpressions,
        engagements: totalEngagements,
        rate: totalImpressions > 0 ? (totalEngagements / totalImpressions) * 100 : 0,
      };
    });
  }, [data.channels, publishedContent, data.contentMetrics]);

  // Top posts
  const topPosts = useMemo(() => {
    return publishedContent.map(post => {
      const metrics = data.contentMetrics.filter(m => m.contentPieceId === post.id);
      const totalEngagements = metrics.reduce((sum, m) => sum + (m.reactions || 0) + (m.comments || 0) + (m.shares || 0), 0);
      const totalImpressions = metrics.reduce((sum, m) => sum + (m.impressions || 0), 0);
      return {
        ...post,
        engagements: totalEngagements,
        impressions: totalImpressions,
        engagementRate: totalImpressions > 0 ? (totalEngagements / totalImpressions) * 100 : 0,
      };
    }).sort((a, b) => b.engagements - a.engagements).slice(0, 5);
  }, [publishedContent, data.contentMetrics]);

  // Content pipeline
  const pipeline = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const piece of data.contentPieces) {
      counts[piece.status] = (counts[piece.status] || 0) + 1;
    }
    return Object.entries(CONTENT_STATUSES)
      .filter(([key]) => key !== 'archived')
      .map(([key, val]) => ({ status: key, label: val.label, count: counts[key] || 0, color: val.color }));
  }, [data.contentPieces]);

  // Log metrics
  const handleLogMetrics = async () => {
    if (!selectedPieceId) return;
    await addContentMetrics({
      contentPieceId: selectedPieceId,
      impressions: parseInt(metricsForm.impressions) || undefined,
      reactions: parseInt(metricsForm.reactions) || undefined,
      comments: parseInt(metricsForm.comments) || undefined,
      shares: parseInt(metricsForm.shares) || undefined,
      clicks: parseInt(metricsForm.clicks) || undefined,
      businessOutcome: metricsForm.businessOutcome || undefined,
    });
    setMetricsForm({ impressions: '', reactions: '', comments: '', shares: '', clicks: '', businessOutcome: '' });
    setShowMetricsDialog(false);
  };

  const openLogMetrics = (pieceId?: string) => {
    setSelectedPieceId(pieceId || '');
    setShowMetricsDialog(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-500">Performance insights for your content</p>
        </div>
        <Button onClick={() => openLogMetrics()}>
          <Plus className="w-4 h-4 mr-2" />Log Metrics
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-4 h-4 text-gray-500" />
            <span className="text-xs text-gray-500">Total Published</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{overallStats.totalPosts}</p>
          <p className="text-xs text-gray-400">{overallStats.thisMonth} this month</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Eye className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-gray-500">Total Impressions</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">{overallStats.totalImpressions.toLocaleString()}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Heart className="w-4 h-4 text-green-500" />
            <span className="text-xs text-gray-500">Total Engagements</span>
          </div>
          <p className="text-2xl font-bold text-green-600">
            {(overallStats.totalReactions + overallStats.totalComments + overallStats.totalShares).toLocaleString()}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-gray-500">Avg Engagement Rate</span>
          </div>
          <p className="text-2xl font-bold text-purple-600">{overallStats.avgEngagementRate.toFixed(1)}%</p>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Publishing Cadence */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Publishing Cadence</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <ReTooltip />
                <Bar dataKey="posts" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Engagement Trends */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Engagement Trends</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthlyStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <ReTooltip />
                <Line type="monotone" dataKey="impressions" stroke="#3b82f6" name="Impressions" strokeWidth={2} />
                <Line type="monotone" dataKey="engagements" stroke="#22c55e" name="Engagements" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pillar Distribution */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Pillar Distribution</CardTitle></CardHeader>
          <CardContent>
            {pillarDistribution.length > 0 ? (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width="50%" height={180}>
                  <PieChart>
                    <Pie data={pillarDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                      {pillarDistribution.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <ReTooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {pillarDistribution.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-xs text-gray-700">{item.name}</span>
                      <span className="text-xs font-medium text-gray-900">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No published content yet</p>
            )}
          </CardContent>
        </Card>

        {/* Channel Performance */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Channel Performance</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={channelPerformance} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={100} />
                <ReTooltip />
                <Bar dataKey="engagements" fill="#22c55e" name="Engagements" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Content Pipeline */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Content Pipeline</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            {pipeline.map((stage, i) => (
              <div key={stage.status} className="flex items-center gap-2 flex-1">
                <div className="flex-1 text-center p-3 rounded-lg bg-gray-50">
                  <p className="text-2xl font-bold text-gray-900">{stage.count}</p>
                  <p className="text-xs text-gray-500">{stage.label}</p>
                </div>
                {i < pipeline.length - 1 && <span className="text-gray-300">→</span>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Posts Table */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Top Performing Posts</CardTitle></CardHeader>
        <CardContent>
          {topPosts.length === 0 ? (
            <p className="text-sm text-gray-500">No published posts with metrics yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Pillar</TableHead>
                  <TableHead className="text-right">Impressions</TableHead>
                  <TableHead className="text-right">Engagements</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topPosts.map((post, i) => {
                  const pillar = data.pillars.find(p => p.id === post.pillarId);
                  return (
                    <TableRow key={post.id}>
                      <TableCell className="font-medium text-gray-400">#{i + 1}</TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">{post.title}</TableCell>
                      <TableCell>{pillar && <Badge className={getPillarColor(pillar)}>{pillar.label}</Badge>}</TableCell>
                      <TableCell className="text-right">{post.impressions.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{post.engagements}</TableCell>
                      <TableCell className="text-right font-medium text-purple-600">{post.engagementRate.toFixed(1)}%</TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => openLogMetrics(post.id)}>
                          <Plus className="w-3 h-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Log Metrics Dialog */}
      <Dialog open={showMetricsDialog} onOpenChange={setShowMetricsDialog}>
        <DialogContent onClose={() => setShowMetricsDialog(false)}>
          <DialogHeader><DialogTitle>Log Metrics</DialogTitle></DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <Label>Post</Label>
              <select
                value={selectedPieceId}
                onChange={e => setSelectedPieceId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-gray-300 bg-transparent px-3 py-1 text-sm"
              >
                <option value="">Select a post...</option>
                {publishedContent.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Impressions</Label>
                <Input type="number" value={metricsForm.impressions} onChange={e => setMetricsForm(prev => ({ ...prev, impressions: e.target.value }))} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Reactions</Label>
                <Input type="number" value={metricsForm.reactions} onChange={e => setMetricsForm(prev => ({ ...prev, reactions: e.target.value }))} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Comments</Label>
                <Input type="number" value={metricsForm.comments} onChange={e => setMetricsForm(prev => ({ ...prev, comments: e.target.value }))} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Shares</Label>
                <Input type="number" value={metricsForm.shares} onChange={e => setMetricsForm(prev => ({ ...prev, shares: e.target.value }))} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Clicks</Label>
                <Input type="number" value={metricsForm.clicks} onChange={e => setMetricsForm(prev => ({ ...prev, clicks: e.target.value }))} placeholder="0" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Business Outcome (optional)</Label>
              <Textarea
                value={metricsForm.businessOutcome}
                onChange={e => setMetricsForm(prev => ({ ...prev, businessOutcome: e.target.value }))}
                placeholder="e.g., Generated 2 leads, 1 demo request..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMetricsDialog(false)}>Cancel</Button>
            <Button onClick={handleLogMetrics} disabled={!selectedPieceId}>Log Metrics</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
