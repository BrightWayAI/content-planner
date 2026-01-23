import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { useAppStore } from '../store/StoreContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { Input, Textarea } from '../components/Input';
import { getChannelColor } from '../utils/helpers';
import { CHANNELS } from '../utils/constants';

export function Published() {
  const { data, addContentMetrics, getMetricsForContent } = useAppStore();
  const [selectedPiece, setSelectedPiece] = useState<string | null>(null);
  const [metrics, setMetrics] = useState({
    impressions: '',
    reactions: '',
    comments: '',
    shares: '',
    notes: '',
  });

  const published = useMemo(() => {
    return data.contentPieces
      .filter(p => p.status === 'published')
      .sort((a, b) => {
        const dateA = a.publishedDate || a.updatedAt;
        const dateB = b.publishedDate || b.updatedAt;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });
  }, [data.contentPieces]);

  const thisWeek = published.filter(p => {
    const date = p.publishedDate || p.updatedAt;
    return Date.now() - new Date(date).getTime() < 7 * 24 * 60 * 60 * 1000;
  }).length;

  const handleSaveMetrics = () => {
    if (!selectedPiece) return;

    const impressions = parseInt(metrics.impressions) || 0;
    const reactions = parseInt(metrics.reactions) || 0;
    const comments = parseInt(metrics.comments) || 0;
    const shares = parseInt(metrics.shares) || 0;

    addContentMetrics({
      contentPieceId: selectedPiece,
      impressions,
      reactions,
      comments,
      shares,
      engagementRate: impressions > 0 ? ((reactions + comments + shares) / impressions) * 100 : 0,
      qualityNotes: metrics.notes || undefined,
    });

    setSelectedPiece(null);
    setMetrics({ impressions: '', reactions: '', comments: '', shares: '', notes: '' });
  };

  const getLatestMetrics = (pieceId: string) => {
    const allMetrics = getMetricsForContent(pieceId);
    return allMetrics.length > 0 ? allMetrics[allMetrics.length - 1] : null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Published</h1>
          <p className="text-gray-500">{published.length} total · {thisWeek} this week</p>
        </div>
      </div>

      {published.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-gray-500 mb-4">No published content yet</p>
          <Link to="/drafts">
            <Button>View drafts</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {published.map(piece => {
            const pieceMetrics = getLatestMetrics(piece.id);
            return (
              <Card key={piece.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={getChannelColor(piece.channel)}>
                        {CHANNELS[piece.channel].label}
                      </Badge>
                      <span className="text-xs text-gray-400">
                        {piece.publishedDate && format(parseISO(piece.publishedDate), 'MMM d, yyyy')}
                      </span>
                    </div>
                    <h3 className="font-medium text-gray-900">{piece.title}</h3>

                    {pieceMetrics && (
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span>{pieceMetrics.impressions?.toLocaleString() || 0} views</span>
                        <span>{pieceMetrics.reactions || 0} reactions</span>
                        <span>{pieceMetrics.comments || 0} comments</span>
                        {pieceMetrics.engagementRate && (
                          <span className="text-green-600">{pieceMetrics.engagementRate.toFixed(2)}% engagement</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {piece.publishedUrl && (
                      <a
                        href={piece.publishedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        View
                      </a>
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setSelectedPiece(piece.id)}
                    >
                      + Metrics
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Metrics Modal */}
      <Modal
        isOpen={!!selectedPiece}
        onClose={() => setSelectedPiece(null)}
        title="Add Metrics"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelectedPiece(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveMetrics}>Save</Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Enter the latest metrics from LinkedIn for this post.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Impressions"
              type="number"
              value={metrics.impressions}
              onChange={e => setMetrics(prev => ({ ...prev, impressions: e.target.value }))}
            />
            <Input
              label="Reactions"
              type="number"
              value={metrics.reactions}
              onChange={e => setMetrics(prev => ({ ...prev, reactions: e.target.value }))}
            />
            <Input
              label="Comments"
              type="number"
              value={metrics.comments}
              onChange={e => setMetrics(prev => ({ ...prev, comments: e.target.value }))}
            />
            <Input
              label="Shares"
              type="number"
              value={metrics.shares}
              onChange={e => setMetrics(prev => ({ ...prev, shares: e.target.value }))}
            />
          </div>
          <Textarea
            label="Notes (optional)"
            value={metrics.notes}
            onChange={e => setMetrics(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Any notable comments or outcomes..."
            rows={2}
          />
        </div>
      </Modal>
    </div>
  );
}
