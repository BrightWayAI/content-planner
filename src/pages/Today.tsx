import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useAppStore } from '../store/StoreContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { getChannelColor, getPillarColor } from '../utils/helpers';
import { CHANNELS, PILLARS } from '../utils/constants';

export function Today() {
  const { data } = useAppStore();
  const [isGenerating, setIsGenerating] = useState(false);

  const todaysDrafts = useMemo(() => {
    return data.contentPieces
      .filter(p => p.status === 'drafting' || p.status === 'review')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 3);
  }, [data.contentPieces]);

  const freshIdeas = useMemo(() => {
    return data.contentIdeas
      .filter(i => i.priority === 'high')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [data.contentIdeas]);

  const recentlyPublished = useMemo(() => {
    return data.contentPieces
      .filter(p => p.status === 'published')
      .sort((a, b) => new Date(b.publishedDate || b.updatedAt).getTime() - new Date(a.publishedDate || a.updatedAt).getTime())
      .slice(0, 3);
  }, [data.contentPieces]);

  const stats = useMemo(() => {
    const thisWeek = data.contentPieces.filter(p => {
      if (p.status !== 'published' || !p.publishedDate) return false;
      const diff = Date.now() - new Date(p.publishedDate).getTime();
      return diff < 7 * 24 * 60 * 60 * 1000;
    }).length;

    return {
      draftsInProgress: data.contentPieces.filter(p => p.status === 'drafting' || p.status === 'review').length,
      publishedThisWeek: thisWeek,
      ideasAvailable: data.contentIdeas.length,
    };
  }, [data.contentPieces, data.contentIdeas]);

  const handleGenerateIdeas = async () => {
    setIsGenerating(true);
    // This will call the API endpoint
    try {
      const response = await fetch('/api/generate-ideas', { method: 'POST' });
      if (!response.ok) throw new Error('Failed to generate');
      // Reload to see new ideas
      window.location.reload();
    } catch {
      alert('AI generation not configured yet. Add ANTHROPIC_API_KEY in Settings.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {format(new Date(), 'EEEE, MMMM d')}
        </h1>
        <p className="text-gray-500 mt-1">
          {stats.draftsInProgress} drafts in progress · {stats.publishedThisWeek} published this week
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Link to="/ideas">
          <Card className="hover:border-blue-200 transition-colors cursor-pointer">
            <p className="text-3xl font-bold text-blue-600">{stats.ideasAvailable}</p>
            <p className="text-sm text-gray-500">Ideas ready</p>
          </Card>
        </Link>
        <Link to="/drafts">
          <Card className="hover:border-yellow-200 transition-colors cursor-pointer">
            <p className="text-3xl font-bold text-yellow-600">{stats.draftsInProgress}</p>
            <p className="text-sm text-gray-500">In progress</p>
          </Card>
        </Link>
        <Link to="/published">
          <Card className="hover:border-green-200 transition-colors cursor-pointer">
            <p className="text-3xl font-bold text-green-600">{stats.publishedThisWeek}</p>
            <p className="text-sm text-gray-500">This week</p>
          </Card>
        </Link>
      </div>

      {/* Fresh Ideas from AI */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Fresh Ideas</h2>
          <Button
            size="sm"
            onClick={handleGenerateIdeas}
            disabled={isGenerating}
          >
            {isGenerating ? 'Generating...' : '✨ Generate More'}
          </Button>
        </div>

        {freshIdeas.length === 0 ? (
          <Card className="text-center py-8">
            <p className="text-gray-500 mb-4">No ideas yet. Generate some or check the Ideas page.</p>
            <Button onClick={handleGenerateIdeas} disabled={isGenerating}>
              {isGenerating ? 'Generating...' : '✨ Generate Ideas from Today\'s News'}
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {freshIdeas.map(idea => (
              <Card key={idea.id} className="hover:border-gray-300 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={getPillarColor(idea.pillar)}>
                        {PILLARS[idea.pillar].label}
                      </Badge>
                    </div>
                    <h3 className="font-medium text-gray-900">{idea.title}</h3>
                    {idea.notes && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{idea.notes}</p>
                    )}
                  </div>
                  <Link to={`/edit?idea=${idea.id}`}>
                    <Button size="sm">Start Draft</Button>
                  </Link>
                </div>
              </Card>
            ))}
            <Link to="/ideas" className="block text-center text-sm text-blue-600 hover:underline py-2">
              View all {data.contentIdeas.length} ideas →
            </Link>
          </div>
        )}
      </div>

      {/* Current Drafts */}
      {todaysDrafts.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Continue Working</h2>
            <Link to="/drafts" className="text-sm text-blue-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {todaysDrafts.map(piece => (
              <Link key={piece.id} to={`/edit/${piece.id}`}>
                <Card className="hover:border-gray-300 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{piece.title || 'Untitled'}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={getChannelColor(piece.channel)}>
                          {CHANNELS[piece.channel].label}
                        </Badge>
                        <span className="text-xs text-gray-400">
                          Updated {format(new Date(piece.updatedAt), 'MMM d')}
                        </span>
                      </div>
                    </div>
                    <span className="text-sm text-blue-600">Continue →</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recently Published */}
      {recentlyPublished.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recently Published</h2>
            <Link to="/published" className="text-sm text-blue-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {recentlyPublished.map(piece => (
              <Card key={piece.id} padding="sm">
                <h3 className="text-sm font-medium text-gray-900 line-clamp-2">{piece.title}</h3>
                <p className="text-xs text-gray-400 mt-1">
                  {piece.publishedDate && format(new Date(piece.publishedDate), 'MMM d')}
                </p>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
