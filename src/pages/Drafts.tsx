import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { useAppStore } from '@/store/StoreContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { getPillarColor, getChannelColor, getStatusColor } from '@/utils/helpers';
import { Plus, Search, X, ChevronDown, ChevronRight } from 'lucide-react';
import type { ContentStatus } from '@/types';

export function Drafts() {
  const navigate = useNavigate();
  const { data, deleteContentIdea, addContentPiece, promoteIdeaToContent } = useAppStore();

  const [statusFilter, setStatusFilter] = useState<'all' | ContentStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [ideasExpanded, setIdeasExpanded] = useState(false);

  const stats = useMemo(() => ({
    drafting: data.contentPieces.filter(p => p.status === 'drafting').length,
    review: data.contentPieces.filter(p => p.status === 'review').length,
    scheduled: data.contentPieces.filter(p => p.status === 'scheduled').length,
    published: data.contentPieces.filter(p => p.status === 'published').length,
  }), [data]);

  const contentPieces = useMemo(() => {
    let pieces = [...data.contentPieces];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      pieces = pieces.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.hook?.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'all') {
      pieces = pieces.filter(p => p.status === statusFilter);
    }

    return pieces.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [data.contentPieces, statusFilter, searchQuery]);

  const handleStartDraft = async (ideaId: string) => {
    const defaultChannel = data.channels[0];
    const piece = await promoteIdeaToContent(ideaId, defaultChannel?.id);
    if (piece) navigate(`/editor/${piece.id}`);
  };

  const handleNewDraft = async () => {
    const piece = await addContentPiece({
      title: '',
      status: 'drafting',
      channelId: data.channels[0]?.id,
      pillarId: data.pillars[0]?.id,
      body: '',
    });
    navigate(`/editor/${piece.id}`);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      drafting: 'Drafting', review: 'Review', scheduled: 'Scheduled', published: 'Published',
    };
    return labels[status] || status;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Drafts</h1>
          <p className="text-gray-500">
            {stats.drafting + stats.review} in progress · {stats.scheduled} scheduled · {stats.published} published
          </p>
        </div>
        <Button onClick={handleNewDraft}>
          <Plus className="w-4 h-4 mr-2" />New Draft
        </Button>
      </div>

      {/* Collapsible Ideas Backlog */}
      {data.contentIdeas.length > 0 && (
        <Card>
          <button
            className="w-full flex items-center justify-between p-4 text-left"
            onClick={() => setIdeasExpanded(!ideasExpanded)}
          >
            <div className="flex items-center gap-2">
              {ideasExpanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
              <span className="text-sm font-semibold text-gray-900">Ideas Backlog</span>
              <Badge variant="secondary">{data.contentIdeas.length}</Badge>
            </div>
          </button>
          {ideasExpanded && (
            <CardContent className="pt-0">
              <div className="space-y-1">
                {data.contentIdeas.map(idea => {
                  const pillar = data.pillars.find(p => p.id === idea.pillarId);
                  return (
                    <div key={idea.id} className="flex items-center justify-between p-2.5 rounded hover:bg-gray-50">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="text-sm text-gray-900 truncate">{idea.title}</span>
                        {pillar && <Badge className={`shrink-0 ${getPillarColor(pillar)}`}>{pillar.label}</Badge>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <Button size="sm" variant="outline" onClick={() => handleStartDraft(idea.id)}>Start Draft</Button>
                        <button onClick={() => deleteContentIdea(idea.id)} className="text-gray-400 hover:text-red-600 p-1">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search drafts..."
          className="pl-10"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { key: 'all', label: 'All' },
          { key: 'drafting', label: 'Drafting', count: stats.drafting },
          { key: 'review', label: 'Review', count: stats.review },
          { key: 'scheduled', label: 'Scheduled', count: stats.scheduled },
          { key: 'published', label: 'Published', count: stats.published },
        ].map(filter => (
          <button
            key={filter.key}
            onClick={() => setStatusFilter(filter.key as typeof statusFilter)}
            className={`px-3 py-1.5 rounded text-sm flex items-center gap-1.5 ${
              statusFilter === filter.key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {filter.label}
            {'count' in filter && <span className="text-xs opacity-70">{filter.count}</span>}
          </button>
        ))}
      </div>

      {/* Content pieces list */}
      {contentPieces.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-gray-500 mb-4">{searchQuery ? 'No results found' : 'No content pieces yet'}</p>
            {!searchQuery && (
              <Button onClick={handleNewDraft}>Start a draft</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {contentPieces.map(piece => {
            const pillar = data.pillars.find(p => p.id === piece.pillarId);
            const channel = data.channels.find(c => c.id === piece.channelId);

            return (
              <Link key={piece.id} to={`/editor/${piece.id}`}>
                <Card className="hover:border-gray-300 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={getStatusColor(piece.status)}>{getStatusLabel(piece.status)}</Badge>
                          {channel && <Badge className={getChannelColor(channel)}>{channel.label}</Badge>}
                          {pillar && <Badge className={getPillarColor(pillar)}>{pillar.label}</Badge>}
                          {piece.plannedDate && <span className="text-xs text-gray-400">{format(parseISO(piece.plannedDate), 'MMM d')}</span>}
                        </div>
                        <h3 className="font-medium text-gray-900">{piece.title || 'Untitled'}</h3>
                        {piece.hook && <p className="text-sm text-gray-500 mt-1 line-clamp-1">{piece.hook}</p>}
                        <p className="text-xs text-gray-400 mt-2">Updated {format(parseISO(piece.updatedAt), 'MMM d, h:mm a')}</p>
                      </div>
                      <span className="text-sm text-blue-600">Edit</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
