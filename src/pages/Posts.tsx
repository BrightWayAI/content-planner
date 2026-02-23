import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { useAppStore } from '@/store/StoreContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { getPillarColor, getChannelColor, getStatusColor } from '@/utils/helpers';
import { Plus, Lightbulb, Search, X } from 'lucide-react';
import type { ContentStatus } from '@/types';

export function Posts() {
  const navigate = useNavigate();
  const { data, addContentIdea, deleteContentIdea, addContentPiece, promoteIdeaToContent } = useAppStore();

  const [statusFilter, setStatusFilter] = useState<'all' | 'ideas' | ContentStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddIdea, setShowAddIdea] = useState(false);
  const [newIdea, setNewIdea] = useState({ title: '', pillarId: '', notes: '', sourceUrl: '', sourceName: '' });

  const stats = useMemo(() => ({
    ideas: data.contentIdeas.length,
    drafting: data.contentPieces.filter(p => p.status === 'drafting').length,
    review: data.contentPieces.filter(p => p.status === 'review').length,
    scheduled: data.contentPieces.filter(p => p.status === 'scheduled').length,
    published: data.contentPieces.filter(p => p.status === 'published').length,
  }), [data]);

  const allContent = useMemo(() => {
    const ideas = data.contentIdeas.map(idea => ({
      type: 'idea' as const,
      id: idea.id,
      title: idea.title,
      pillarId: idea.pillarId,
      notes: idea.notes,
      sourceUrl: idea.sourceUrl,
      sourceName: idea.sourceName,
      priority: idea.priority,
      createdAt: idea.createdAt,
      status: 'idea' as const,
    }));

    const pieces = data.contentPieces.map(piece => ({
      type: 'piece' as const,
      ...piece,
    }));

    let combined = [...ideas, ...pieces];

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      combined = combined.filter(item =>
        item.title.toLowerCase().includes(q) ||
        (item.type === 'idea' && item.notes?.toLowerCase().includes(q))
      );
    }

    // Status filter
    if (statusFilter === 'ideas') {
      combined = combined.filter(item => item.type === 'idea');
    } else if (statusFilter !== 'all') {
      combined = combined.filter(item => item.type === 'piece' && item.status === statusFilter);
    }

    return combined.sort((a, b) => {
      if (a.type === 'idea' && b.type !== 'idea') return -1;
      if (a.type !== 'idea' && b.type === 'idea') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [data.contentIdeas, data.contentPieces, statusFilter, searchQuery]);

  const handleStartDraft = async (ideaId: string) => {
    const defaultChannel = data.channels[0];
    const piece = await promoteIdeaToContent(ideaId, defaultChannel?.id);
    if (piece) navigate(`/editor/${piece.id}`);
  };

  const handleAddIdea = async () => {
    if (!newIdea.title.trim()) return;
    await addContentIdea({
      title: newIdea.title,
      pillarId: newIdea.pillarId || undefined,
      notes: newIdea.notes,
      priority: 'high',
      sourceUrl: newIdea.sourceUrl || undefined,
      sourceName: newIdea.sourceName || undefined,
    });
    setNewIdea({ title: '', pillarId: '', notes: '', sourceUrl: '', sourceName: '' });
    setShowAddIdea(false);
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

  const getStatusStyle = (status: string) => {
    const styles: Record<string, { label: string }> = {
      idea: { label: 'Idea' },
      drafting: { label: 'Drafting' },
      review: { label: 'Review' },
      scheduled: { label: 'Scheduled' },
      published: { label: 'Published' },
    };
    return styles[status] || styles.idea;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Posts</h1>
          <p className="text-gray-500">
            {stats.ideas} ideas - {stats.drafting + stats.review} drafts - {stats.published} published
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowAddIdea(true)}>
            <Lightbulb className="w-4 h-4 mr-2" />Add Idea
          </Button>
          <Button onClick={handleNewDraft}>
            <Plus className="w-4 h-4 mr-2" />New Draft
          </Button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search posts and ideas..."
            className="pl-10"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {[
            { key: 'all', label: 'All' },
            { key: 'ideas', label: 'Ideas', count: stats.ideas },
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
      </div>

      {/* Content List */}
      {allContent.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-gray-500 mb-4">{searchQuery ? 'No results found' : 'No content yet'}</p>
            {!searchQuery && (
              <div className="flex items-center justify-center gap-2">
                <Button variant="outline" onClick={() => setShowAddIdea(true)}>Add an idea</Button>
                <Button onClick={handleNewDraft}>Start a draft</Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {allContent.map(item => {
            if (item.type === 'idea') {
              const pillar = data.pillars.find(p => p.id === item.pillarId);
              return (
                <Card key={item.id} className="hover:border-gray-300 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary">Idea</Badge>
                          {pillar && <Badge className={getPillarColor(pillar)}>{pillar.label}</Badge>}
                          {item.priority === 'high' && <Badge variant="destructive">High</Badge>}
                          <span className="text-xs text-gray-400">{format(parseISO(item.createdAt), 'MMM d')}</span>
                        </div>
                        <h3 className="font-medium text-gray-900">{item.title}</h3>
                        {item.notes && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.notes}</p>}
                        {item.sourceUrl && (
                          <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-1 inline-block">
                            {item.sourceName || 'Source'}
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => handleStartDraft(item.id)}>Start Draft</Button>
                        <button onClick={() => deleteContentIdea(item.id)} className="text-gray-400 hover:text-red-600 p-1">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            }

            const pillar = data.pillars.find(p => p.id === item.pillarId);
            const channel = data.channels.find(c => c.id === item.channelId);

            return (
              <Link key={item.id} to={`/editor/${item.id}`}>
                <Card className="hover:border-gray-300 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={getStatusColor(item.status)}>{getStatusStyle(item.status).label}</Badge>
                          {channel && <Badge className={getChannelColor(channel)}>{channel.label}</Badge>}
                          {pillar && <Badge className={getPillarColor(pillar)}>{pillar.label}</Badge>}
                          {item.plannedDate && <span className="text-xs text-gray-400">{format(parseISO(item.plannedDate), 'MMM d')}</span>}
                        </div>
                        <h3 className="font-medium text-gray-900">{item.title || 'Untitled'}</h3>
                        {item.hook && <p className="text-sm text-gray-500 mt-1 line-clamp-1">{item.hook}</p>}
                        <p className="text-xs text-gray-400 mt-2">Updated {format(parseISO(item.updatedAt), 'MMM d, h:mm a')}</p>
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

      {/* Add Idea Modal */}
      <Dialog open={showAddIdea} onOpenChange={setShowAddIdea}>
        <DialogContent onClose={() => setShowAddIdea(false)}>
          <DialogHeader>
            <DialogTitle>Add Idea</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <Label>What's the idea?</Label>
              <Input value={newIdea.title} onChange={e => setNewIdea(prev => ({ ...prev, title: e.target.value }))} placeholder="e.g., Why most AI pilots fail..." />
            </div>
            <div className="space-y-2">
              <Label>Pillar</Label>
              <Select value={newIdea.pillarId} onChange={e => setNewIdea(prev => ({ ...prev, pillarId: e.target.value }))}>
                <option value="">Select pillar</option>
                {data.pillars.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea value={newIdea.notes} onChange={e => setNewIdea(prev => ({ ...prev, notes: e.target.value }))} placeholder="Any context, angles, or key points..." rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Source URL (optional)</Label>
              <Input type="url" value={newIdea.sourceUrl} onChange={e => setNewIdea(prev => ({ ...prev, sourceUrl: e.target.value }))} placeholder="https://..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddIdea(false)}>Cancel</Button>
            <Button onClick={handleAddIdea}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
