import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { useAppStore } from '../store/StoreContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input, Select } from '../components/Input';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import type { ContentStatus, Channel, Pillar } from '../types';
import { getStatusColor, getChannelColor, getPillarColor } from '../utils/helpers';
import { CONTENT_STATUSES, CHANNELS, PILLARS } from '../utils/constants';

type ViewMode = 'list' | 'grid';

export function Library() {
  const { data, addContentIdea, promoteIdeaToContent, deleteContentIdea } = useAppStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ContentStatus | 'all'>('all');
  const [channelFilter, setChannelFilter] = useState<Channel | 'all'>('all');
  const [pillarFilter, setPillarFilter] = useState<Pillar | 'all'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showIdeaModal, setShowIdeaModal] = useState(false);
  const [newIdea, setNewIdea] = useState<{ title: string; pillar: Pillar; notes: string; priority: 'high' | 'medium' | 'someday' }>({ title: '', pillar: 'practical_implementation', notes: '', priority: 'medium' });

  const filteredContent = useMemo(() => {
    return data.contentPieces
      .filter(piece => {
        if (search && !piece.title.toLowerCase().includes(search.toLowerCase())) {
          return false;
        }
        if (statusFilter !== 'all' && piece.status !== statusFilter) {
          return false;
        }
        if (channelFilter !== 'all' && piece.channel !== channelFilter) {
          return false;
        }
        if (pillarFilter !== 'all' && piece.pillar !== pillarFilter) {
          return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [data.contentPieces, search, statusFilter, channelFilter, pillarFilter]);

  const handleAddIdea = () => {
    if (!newIdea.title.trim()) return;
    addContentIdea({
      title: newIdea.title,
      pillar: newIdea.pillar,
      notes: newIdea.notes,
      priority: newIdea.priority,
    });
    setNewIdea({ title: '', pillar: 'practical_implementation', notes: '', priority: 'medium' });
    setShowIdeaModal(false);
  };

  const handlePromoteIdea = (ideaId: string) => {
    const piece = promoteIdeaToContent(ideaId);
    if (piece) {
      window.location.href = `/create/${piece.id}`;
    }
  };

  const ideasByPriority = useMemo(() => {
    const grouped = {
      high: data.contentIdeas.filter(i => i.priority === 'high'),
      medium: data.contentIdeas.filter(i => i.priority === 'medium'),
      someday: data.contentIdeas.filter(i => i.priority === 'someday'),
    };
    return grouped;
  }, [data.contentIdeas]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Content Library</h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setShowIdeaModal(true)}>
            + Quick Idea
          </Button>
          <Link to="/create">
            <Button>+ New Content</Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search content..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as ContentStatus | 'all')}
          >
            <option value="all">All Statuses</option>
            {Object.entries(CONTENT_STATUSES).map(([key, { label }]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
          <Select
            value={channelFilter}
            onChange={e => setChannelFilter(e.target.value as Channel | 'all')}
          >
            <option value="all">All Channels</option>
            {Object.entries(CHANNELS).map(([key, { label }]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
          <Select
            value={pillarFilter}
            onChange={e => setPillarFilter(e.target.value as Pillar | 'all')}
          >
            <option value="all">All Pillars</option>
            {Object.entries(PILLARS).map(([key, { label }]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-sm ${
                viewMode === 'list' ? 'bg-gray-100' : 'hover:bg-gray-50'
              }`}
            >
              ≡
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 text-sm ${
                viewMode === 'grid' ? 'bg-gray-100' : 'hover:bg-gray-50'
              }`}
            >
              ⊞
            </button>
          </div>
        </div>
      </Card>

      {/* Content List/Grid */}
      {filteredContent.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-gray-500 mb-4">No content found</p>
          <Link to="/create">
            <Button>Create your first piece</Button>
          </Link>
        </Card>
      ) : viewMode === 'list' ? (
        <Card padding="none">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">
                  Title
                </th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">
                  Status
                </th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">
                  Channel
                </th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">
                  Pillar
                </th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredContent.map(piece => (
                <tr key={piece.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      to={`/create/${piece.id}`}
                      className="text-sm font-medium text-gray-900 hover:text-blue-600"
                    >
                      {piece.title || 'Untitled'}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={getStatusColor(piece.status)}>
                      {CONTENT_STATUSES[piece.status].label}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={getChannelColor(piece.channel)}>
                      {CHANNELS[piece.channel].label}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={getPillarColor(piece.pillar)}>
                      {piece.pillar.replace(/_/g, ' ')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {piece.publishedDate
                      ? format(parseISO(piece.publishedDate), 'MMM d, yyyy')
                      : piece.plannedDate
                      ? format(parseISO(piece.plannedDate), 'MMM d, yyyy')
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filteredContent.map(piece => (
            <Link key={piece.id} to={`/create/${piece.id}`}>
              <Card className="hover:border-gray-300 transition-colors h-full">
                <h3 className="font-medium text-gray-900 mb-2">
                  {piece.title || 'Untitled'}
                </h3>
                <div className="flex flex-wrap gap-1 mb-3">
                  <Badge className={getStatusColor(piece.status)}>
                    {CONTENT_STATUSES[piece.status].label}
                  </Badge>
                  <Badge className={getChannelColor(piece.channel)}>
                    {CHANNELS[piece.channel].label}
                  </Badge>
                </div>
                {piece.hook && (
                  <p className="text-sm text-gray-500 line-clamp-2">{piece.hook}</p>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  Updated {format(parseISO(piece.updatedAt), 'MMM d')}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Ideas Backlog */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Ideas Backlog</h2>
        <div className="grid grid-cols-3 gap-4">
          {(['high', 'medium', 'someday'] as const).map(priority => (
            <Card key={priority}>
              <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">
                {priority === 'high' ? 'High Priority' : priority === 'medium' ? 'Medium Priority' : 'Someday'}
              </h3>
              {ideasByPriority[priority].length === 0 ? (
                <p className="text-sm text-gray-400">No ideas</p>
              ) : (
                <div className="space-y-2">
                  {ideasByPriority[priority].map(idea => (
                    <div
                      key={idea.id}
                      className="p-2 rounded-lg bg-gray-50 hover:bg-gray-100 group"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <Badge className={getPillarColor(idea.pillar)}>
                            {idea.pillar.replace(/_/g, ' ')}
                          </Badge>
                          <p className="text-sm text-gray-700 mt-1">{idea.title}</p>
                          {idea.notes && (
                            <p className="text-xs text-gray-500 mt-1">{idea.notes}</p>
                          )}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handlePromoteIdea(idea.id)}
                            className="text-xs text-blue-600 hover:underline"
                            title="Promote to content"
                          >
                            ↗
                          </button>
                          <button
                            onClick={() => deleteContentIdea(idea.id)}
                            className="text-xs text-red-600 hover:underline"
                            title="Delete"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Add Idea Modal */}
      <Modal
        isOpen={showIdeaModal}
        onClose={() => setShowIdeaModal(false)}
        title="Capture Idea"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowIdeaModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddIdea}>Add Idea</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Idea Title"
            value={newIdea.title}
            onChange={e => setNewIdea(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Brief description of the idea..."
          />
          <Select
            label="Pillar"
            value={newIdea.pillar}
            onChange={e => setNewIdea(prev => ({ ...prev, pillar: e.target.value as Pillar }))}
          >
            {Object.entries(PILLARS).map(([key, { label }]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
          <Select
            label="Priority"
            value={newIdea.priority}
            onChange={e => setNewIdea(prev => ({ ...prev, priority: e.target.value as 'high' | 'medium' | 'someday' }))}
          >
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="someday">Someday</option>
          </Select>
          <Input
            label="Notes (optional)"
            value={newIdea.notes}
            onChange={e => setNewIdea(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Any additional context..."
          />
        </div>
      </Modal>
    </div>
  );
}
