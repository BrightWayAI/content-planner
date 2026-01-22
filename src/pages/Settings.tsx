import { useState, useRef } from 'react';
import { useAppStore } from '../store/StoreContext';
import { Card, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import { VOICE_GUIDELINES, PILLARS, PUBLISHING_CHECKLIST, QUARTERLY_THEMES } from '../utils/constants';
import { getCurrentQuarter } from '../utils/helpers';

export function Settings() {
  const { exportData, importData, clearAllData, data } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleExport = () => {
    exportData();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const success = importData(text);
      setImportStatus(success ? 'success' : 'error');
      setTimeout(() => setImportStatus('idle'), 3000);
    } catch {
      setImportStatus('error');
      setTimeout(() => setImportStatus('idle'), 3000);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClearData = () => {
    clearAllData();
    setShowClearConfirm(false);
  };

  const currentQuarter = getCurrentQuarter();

  const stats = {
    contentPieces: data.contentPieces.length,
    contentMetrics: data.contentMetrics.length,
    weeklyPlans: data.weeklyPlans.length,
    monthlyGoals: data.monthlyGoals.length,
    contentIdeas: data.contentIdeas.length,
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* Data Management */}
      <Card>
        <CardHeader title="Data Management" />
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Export Data</p>
              <p className="text-sm text-gray-500">
                Download all your data as a JSON file for backup
              </p>
            </div>
            <Button onClick={handleExport}>Export JSON</Button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Import Data</p>
              <p className="text-sm text-gray-500">
                Restore data from a previously exported JSON file
              </p>
              {importStatus === 'success' && (
                <p className="text-sm text-green-600 mt-1">Import successful!</p>
              )}
              {importStatus === 'error' && (
                <p className="text-sm text-red-600 mt-1">Import failed. Check file format.</p>
              )}
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportChange}
                className="hidden"
              />
              <Button variant="secondary" onClick={handleImportClick}>
                Import JSON
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
            <div>
              <p className="font-medium text-red-900">Clear All Data</p>
              <p className="text-sm text-red-700">
                Permanently delete all content, metrics, and settings
              </p>
            </div>
            <Button variant="danger" onClick={() => setShowClearConfirm(true)}>
              Clear Data
            </Button>
          </div>
        </div>
      </Card>

      {/* Current Data Stats */}
      <Card>
        <CardHeader title="Current Data" />
        <div className="grid grid-cols-5 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{stats.contentPieces}</p>
            <p className="text-xs text-gray-500">Content Pieces</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{stats.contentIdeas}</p>
            <p className="text-xs text-gray-500">Ideas</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{stats.contentMetrics}</p>
            <p className="text-xs text-gray-500">Metrics Records</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{stats.weeklyPlans}</p>
            <p className="text-xs text-gray-500">Weekly Plans</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{stats.monthlyGoals}</p>
            <p className="text-xs text-gray-500">Monthly Goals</p>
          </div>
        </div>
      </Card>

      {/* Voice Guidelines */}
      <Card>
        <CardHeader title="Voice Guidelines Reference" />
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-semibold text-green-700 uppercase mb-2">Do Say</h4>
            <ul className="space-y-2">
              {VOICE_GUIDELINES.do.map((item, i) => (
                <li key={i} className="text-sm text-gray-600 p-2 bg-green-50 rounded">
                  "{item}"
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-red-700 uppercase mb-2">Don't Say</h4>
            <ul className="space-y-2">
              {VOICE_GUIDELINES.dont.map((item, i) => (
                <li key={i} className="text-sm text-gray-400 p-2 bg-red-50 rounded line-through">
                  "{item}"
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-6">
          <h4 className="text-sm font-semibold text-gray-700 uppercase mb-2">Core Principles</h4>
          <ul className="grid grid-cols-2 gap-2">
            {VOICE_GUIDELINES.principles.map((item, i) => (
              <li key={i} className="text-sm text-gray-600 p-2 bg-gray-50 rounded">
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6">
          <h4 className="text-sm font-semibold text-gray-700 uppercase mb-2">Quick Reminders</h4>
          <ul className="space-y-1">
            {VOICE_GUIDELINES.reminders.map((item, i) => (
              <li key={i} className="text-sm text-gray-600">• {item}</li>
            ))}
          </ul>
        </div>
      </Card>

      {/* Content Pillars */}
      <Card>
        <CardHeader title="Content Pillars" />
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(PILLARS).map(([key, { label, description, color }]) => (
            <div key={key} className="p-4 rounded-lg border border-gray-200">
              <div className={`w-3 h-3 rounded-full ${color} mb-2`} />
              <h4 className="font-medium text-gray-900">{label}</h4>
              <p className="text-sm text-gray-600 mt-1">{description}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Quarterly Themes */}
      <Card>
        <CardHeader title="Quarterly Themes" />
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(QUARTERLY_THEMES).map(([quarter, { name, topics }]) => (
            <div
              key={quarter}
              className={`p-4 rounded-lg border ${
                quarter === currentQuarter
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-sm font-bold ${
                  quarter === currentQuarter ? 'text-blue-700' : 'text-gray-700'
                }`}>
                  {quarter}
                </span>
                {quarter === currentQuarter && (
                  <span className="text-xs bg-blue-200 text-blue-700 px-2 py-0.5 rounded">
                    Current
                  </span>
                )}
              </div>
              <h4 className="font-medium text-gray-900">{name}</h4>
              <ul className="mt-2 space-y-1">
                {topics.map((topic, i) => (
                  <li key={i} className="text-sm text-gray-600">• {topic}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>

      {/* Publishing Checklist */}
      <Card>
        <CardHeader title="Publishing Checklist" />
        <div className="grid grid-cols-2 gap-2">
          {PUBLISHING_CHECKLIST.map((item, i) => (
            <div key={i} className="flex items-start gap-2 p-2 bg-gray-50 rounded">
              <span className="text-gray-400">☐</span>
              <span className="text-sm text-gray-600">{item}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* About */}
      <Card>
        <CardHeader title="About" />
        <div className="space-y-2 text-sm text-gray-600">
          <p><strong>BrightWay Thought Leadership App</strong></p>
          <p>A tool for planning, creating, and measuring thought leadership content.</p>
          <p className="text-gray-400">Version 1.0.0</p>
        </div>
      </Card>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/50"
              onClick={() => setShowClearConfirm(false)}
            />
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Clear All Data?
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                This will permanently delete all your content, metrics, ideas, weekly plans,
                and monthly goals. This action cannot be undone.
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Consider exporting your data first as a backup.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setShowClearConfirm(false)}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={handleClearData}>
                  Clear All Data
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
