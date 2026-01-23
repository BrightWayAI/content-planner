import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { useAppStore } from '../store/StoreContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { Input, Textarea, Select } from '../components/Input';
import { getPillarColor } from '../utils/helpers';
import { PILLARS } from '../utils/constants';
import type { Pillar } from '../types';

export function Ideas() {
  const { data, addContentIdea, deleteContentIdea, promoteIdeaToContent } = useAppStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [filter, setFilter] = useState<'all' | Pillar>('all');
  const [newIdea, setNewIdea] = useState({
    title: '',
    pillar: 'practical_implementation' as Pillar,
    notes: '',
  });

  const filteredIdeas = useMemo(() => {
    return data.contentIdeas
      .filter(idea => filter === 'all' || idea.pillar === filter)
      .sort((a, b) => {
        // High priority first, then by date
        if (a.priority !== b.priority) {
          const order = { high: 0, medium: 1, someday: 2 };
          return order[a.priority] - order[b.priority];
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [data.contentIdeas, filter]);

  const handleAddIdea = () => {
    if (!newIdea.title.trim()) return;
    addContentIdea({
      ...newIdea,
      priority: 'high',
    });
    setNewIdea({ title: '', pillar: 'practical_implementation', notes: '' });
    setShowAddModal(false);
  };

  const handleStartDraft = (ideaId: string) => {
    const piece = promoteIdeaToContent(ideaId);
    if (piece) {
      window.location.href = `/edit/${piece.id}`;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ideas</h1>
          <p className="text-gray-500">{data.contentIdeas.length} ideas available</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>+ Add Idea</Button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-md text-sm ${
            filter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All
        </button>
        {Object.entries(PILLARS).map(([key, { label }]) => (
          <button
            key={key}
            onClick={() => setFilter(key as Pillar)}
            className={`px-3 py-1.5 rounded-md text-sm ${
              filter === key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Ideas List */}
      {filteredIdeas.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-gray-500 mb-4">No ideas yet</p>
          <Button onClick={() => setShowAddModal(true)}>Add your first idea</Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredIdeas.map(idea => (
            <Card key={idea.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={getPillarColor(idea.pillar)}>
                      {PILLARS[idea.pillar].label}
                    </Badge>
                    {idea.priority === 'high' && (
                      <Badge className="bg-red-100 text-red-700">High Priority</Badge>
                    )}
                    <span className="text-xs text-gray-400">
                      {format(parseISO(idea.createdAt), 'MMM d')}
                    </span>
                  </div>
                  <h3 className="font-medium text-gray-900">{idea.title}</h3>
                  {idea.notes && (
                    <p className="text-sm text-gray-500 mt-1">{idea.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => handleStartDraft(idea.id)}>
                    Start Draft
                  </Button>
                  <button
                    onClick={() => deleteContentIdea(idea.id)}
                    className="text-gray-400 hover:text-red-600 text-sm"
                  >
                    ×
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Idea Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Idea"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddIdea}>Add</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="What's the idea?"
            value={newIdea.title}
            onChange={e => setNewIdea(prev => ({ ...prev, title: e.target.value }))}
            placeholder="e.g., Why most AI pilots fail..."
          />
          <Select
            label="Pillar"
            value={newIdea.pillar}
            onChange={e => setNewIdea(prev => ({ ...prev, pillar: e.target.value as Pillar }))}
          >
            {Object.entries(PILLARS).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </Select>
          <Textarea
            label="Notes (optional)"
            value={newIdea.notes}
            onChange={e => setNewIdea(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Any context, angles, or sources..."
            rows={3}
          />
        </div>
      </Modal>
    </div>
  );
}
