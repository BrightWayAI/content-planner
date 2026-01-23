import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { useAppStore } from '../store/StoreContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { getChannelColor, getPillarColor } from '../utils/helpers';
import { CHANNELS, PILLARS } from '../utils/constants';

export function Drafts() {
  const { data } = useAppStore();

  const drafts = useMemo(() => {
    return data.contentPieces
      .filter(p => p.status === 'idea' || p.status === 'drafting' || p.status === 'review' || p.status === 'scheduled')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [data.contentPieces]);

  const statusLabel = (status: string) => {
    switch (status) {
      case 'idea': return { text: 'New', className: 'bg-gray-100 text-gray-600' };
      case 'drafting': return { text: 'Writing', className: 'bg-yellow-100 text-yellow-700' };
      case 'review': return { text: 'Review', className: 'bg-orange-100 text-orange-700' };
      case 'scheduled': return { text: 'Ready', className: 'bg-blue-100 text-blue-700' };
      default: return { text: status, className: 'bg-gray-100 text-gray-600' };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Drafts</h1>
          <p className="text-gray-500">{drafts.length} pieces in progress</p>
        </div>
        <Link to="/edit">
          <Button>+ New Draft</Button>
        </Link>
      </div>

      {drafts.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-gray-500 mb-4">No drafts yet</p>
          <Link to="/ideas">
            <Button>Start from an idea</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {drafts.map(piece => {
            const status = statusLabel(piece.status);
            return (
              <Link key={piece.id} to={`/edit/${piece.id}`}>
                <Card className="hover:border-gray-300 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={status.className}>{status.text}</Badge>
                        <Badge className={getChannelColor(piece.channel)}>
                          {CHANNELS[piece.channel].label}
                        </Badge>
                        <Badge className={getPillarColor(piece.pillar)}>
                          {PILLARS[piece.pillar].label}
                        </Badge>
                      </div>
                      <h3 className="font-medium text-gray-900">{piece.title || 'Untitled'}</h3>
                      {piece.hook && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{piece.hook}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        Updated {format(parseISO(piece.updatedAt), 'MMM d, h:mm a')}
                      </p>
                    </div>
                    <span className="text-sm text-blue-600">Edit →</span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
