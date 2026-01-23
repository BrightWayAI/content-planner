import { useMemo } from 'react';
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import { useAppStore } from '../store/StoreContext';
import { Card, CardHeader } from '../components/Card';
import { Badge } from '../components/Badge';
import { getPillarColor, getChannelColor } from '../utils/helpers';
import { PILLARS, CHANNELS } from '../utils/constants';

export function Analytics() {
  const { data } = useAppStore();

  // Get last 6 months for trend analysis
  const last6Months = useMemo(() => {
    const end = new Date();
    const start = subMonths(end, 5);
    return eachMonthOfInterval({ start, end });
  }, []);

  // Published content with metrics
  const publishedContent = useMemo(() => {
    return data.contentPieces.filter(p => p.status === 'published');
  }, [data.contentPieces]);

  // Monthly stats
  const monthlyStats = useMemo(() => {
    return last6Months.map(month => {
      const start = startOfMonth(month);
      const end = endOfMonth(month);

      const monthContent = publishedContent.filter(p => {
        if (!p.publishedDate) return false;
        const date = parseISO(p.publishedDate);
        return date >= start && date <= end;
      });

      const metrics = monthContent.flatMap(p =>
        data.contentMetrics.filter(m => m.contentPieceId === p.id)
      );

      const totalImpressions = metrics.reduce((sum, m) => sum + (m.impressions || 0), 0);
      const totalEngagements = metrics.reduce(
        (sum, m) => sum + (m.reactions || 0) + (m.comments || 0) + (m.shares || 0),
        0
      );

      return {
        month: format(month, 'MMM yyyy'),
        shortMonth: format(month, 'MMM'),
        posts: monthContent.length,
        impressions: totalImpressions,
        engagements: totalEngagements,
        engagementRate: totalImpressions > 0 ? (totalEngagements / totalImpressions) * 100 : 0,
      };
    });
  }, [last6Months, publishedContent, data.contentMetrics]);

  // Overall stats
  const overallStats = useMemo(() => {
    const allMetrics = data.contentMetrics;
    const totalImpressions = allMetrics.reduce((sum, m) => sum + (m.impressions || 0), 0);
    const totalReactions = allMetrics.reduce((sum, m) => sum + (m.reactions || 0), 0);
    const totalComments = allMetrics.reduce((sum, m) => sum + (m.comments || 0), 0);
    const totalShares = allMetrics.reduce((sum, m) => sum + (m.shares || 0), 0);

    return {
      totalPosts: publishedContent.length,
      totalImpressions,
      totalReactions,
      totalComments,
      totalShares,
      avgEngagementRate:
        totalImpressions > 0
          ? ((totalReactions + totalComments + totalShares) / totalImpressions) * 100
          : 0,
    };
  }, [publishedContent, data.contentMetrics]);

  // Content by pillar
  const contentByPillar = useMemo(() => {
    const pillars = Object.keys(PILLARS) as Array<keyof typeof PILLARS>;
    return pillars.map(pillar => ({
      pillar,
      label: PILLARS[pillar].label,
      count: publishedContent.filter(p => p.pillar === pillar).length,
      ideas: data.contentIdeas.filter(i => i.pillar === pillar).length,
    }));
  }, [publishedContent, data.contentIdeas]);

  // Content by channel
  const contentByChannel = useMemo(() => {
    const channels = Object.keys(CHANNELS) as Array<keyof typeof CHANNELS>;
    return channels.map(channel => ({
      channel,
      label: CHANNELS[channel].label,
      count: publishedContent.filter(p => p.channel === channel).length,
    }));
  }, [publishedContent]);

  // Top performing posts
  const topPosts = useMemo(() => {
    return publishedContent
      .map(post => {
        const metrics = data.contentMetrics.filter(m => m.contentPieceId === post.id);
        const totalEngagements = metrics.reduce(
          (sum, m) => sum + (m.reactions || 0) + (m.comments || 0) + (m.shares || 0),
          0
        );
        const totalImpressions = metrics.reduce((sum, m) => sum + (m.impressions || 0), 0);
        return {
          ...post,
          engagements: totalEngagements,
          impressions: totalImpressions,
          engagementRate: totalImpressions > 0 ? (totalEngagements / totalImpressions) * 100 : 0,
        };
      })
      .sort((a, b) => b.engagements - a.engagements)
      .slice(0, 5);
  }, [publishedContent, data.contentMetrics]);

  // Simple bar chart component
  const maxPosts = Math.max(...monthlyStats.map(m => m.posts), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500">Performance insights for your content</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card padding="sm">
          <p className="text-2xl font-bold text-gray-900">{overallStats.totalPosts}</p>
          <p className="text-xs text-gray-500">Total Published</p>
        </Card>
        <Card padding="sm">
          <p className="text-2xl font-bold text-blue-600">
            {overallStats.totalImpressions.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500">Total Impressions</p>
        </Card>
        <Card padding="sm">
          <p className="text-2xl font-bold text-green-600">
            {(overallStats.totalReactions + overallStats.totalComments + overallStats.totalShares).toLocaleString()}
          </p>
          <p className="text-xs text-gray-500">Total Engagements</p>
        </Card>
        <Card padding="sm">
          <p className="text-2xl font-bold text-purple-600">
            {overallStats.avgEngagementRate.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500">Avg Engagement Rate</p>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <Card>
          <CardHeader title="Publishing Trend" />
          <div className="h-48 flex items-end gap-2">
            {monthlyStats.map((month, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-blue-500 rounded-t transition-all"
                  style={{ height: `${(month.posts / maxPosts) * 100}%`, minHeight: month.posts > 0 ? '4px' : '0' }}
                />
                <span className="text-xs text-gray-500">{month.shortMonth}</span>
                <span className="text-xs font-medium text-gray-700">{month.posts}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Content Distribution */}
        <Card>
          <CardHeader title="Content Distribution" />
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">By Pillar</p>
              <div className="space-y-2">
                {contentByPillar.map(item => (
                  <div key={item.pillar} className="flex items-center gap-2">
                    <Badge className={getPillarColor(item.pillar)}>{item.label}</Badge>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{
                          width: `${overallStats.totalPosts > 0 ? (item.count / overallStats.totalPosts) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-600 w-8 text-right">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">By Channel</p>
              <div className="space-y-2">
                {contentByChannel.map(item => (
                  <div key={item.channel} className="flex items-center gap-2">
                    <Badge className={getChannelColor(item.channel)}>{item.label}</Badge>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-500 rounded-full"
                        style={{
                          width: `${overallStats.totalPosts > 0 ? (item.count / overallStats.totalPosts) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-600 w-8 text-right">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Top Performing Posts */}
      <Card>
        <CardHeader title="Top Performing Posts" />
        {topPosts.length === 0 ? (
          <p className="text-sm text-gray-500">No published posts with metrics yet</p>
        ) : (
          <div className="space-y-3">
            {topPosts.map((post, i) => (
              <div key={post.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                <span className="text-lg font-bold text-gray-300 w-6">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 truncate">{post.title}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={getPillarColor(post.pillar)}>{PILLARS[post.pillar].label}</Badge>
                    <span className="text-xs text-gray-500">
                      {post.publishedDate && format(parseISO(post.publishedDate), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{post.engagements}</p>
                  <p className="text-xs text-gray-500">engagements</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{post.impressions.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">impressions</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-purple-600">{post.engagementRate.toFixed(1)}%</p>
                  <p className="text-xs text-gray-500">rate</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Ideas Pipeline */}
      <Card>
        <CardHeader title="Ideas Pipeline" />
        <div className="grid grid-cols-3 gap-4">
          {contentByPillar.map(item => (
            <div key={item.pillar} className="text-center p-4 bg-gray-50 rounded-lg">
              <Badge className={getPillarColor(item.pillar)}>{item.label}</Badge>
              <p className="text-2xl font-bold text-gray-900 mt-2">{item.ideas}</p>
              <p className="text-xs text-gray-500">ideas in backlog</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Engagement Breakdown */}
      {overallStats.totalImpressions > 0 && (
        <Card>
          <CardHeader title="Engagement Breakdown" />
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{overallStats.totalReactions}</p>
              <p className="text-xs text-blue-600">Reactions</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{overallStats.totalComments}</p>
              <p className="text-xs text-green-600">Comments</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">{overallStats.totalShares}</p>
              <p className="text-xs text-purple-600">Shares</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
