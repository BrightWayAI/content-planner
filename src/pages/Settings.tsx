import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store/StoreContext';
import { Card, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import { VOICE_GUIDELINES, PILLARS } from '../utils/constants';

export function Settings() {
  const { exportData, importData, clearAllData, data } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [apiStatus, setApiStatus] = useState<'checking' | 'connected' | 'not_configured'>('checking');

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        setApiStatus(data.hasApiKey ? 'connected' : 'not_configured');
      })
      .catch(() => {
        setApiStatus('not_configured');
      });
  }, []);

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

  const stats = {
    contentPieces: data.contentPieces.length,
    contentIdeas: data.contentIdeas.length,
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* AI Configuration */}
      <Card>
        <CardHeader title="AI Generation" />
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Claude API Status</p>
              <p className="text-sm text-gray-500">
                Used for generating ideas and drafts
              </p>
            </div>
            <div className="flex items-center gap-2">
              {apiStatus === 'checking' && (
                <span className="text-sm text-gray-500">Checking...</span>
              )}
              {apiStatus === 'connected' && (
                <span className="text-sm text-green-600 font-medium">✓ Connected</span>
              )}
              {apiStatus === 'not_configured' && (
                <span className="text-sm text-yellow-600 font-medium">Not configured</span>
              )}
            </div>
          </div>

          {apiStatus === 'not_configured' && (
            <div className="p-4 bg-yellow-50 rounded-lg text-sm">
              <p className="font-medium text-yellow-800 mb-2">To enable AI features:</p>
              <ol className="list-decimal list-inside text-yellow-700 space-y-1">
                <li>Get an API key from <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="underline">console.anthropic.com</a></li>
                <li>Add <code className="bg-yellow-100 px-1 rounded">ANTHROPIC_API_KEY</code> to your Railway environment variables</li>
                <li>Redeploy the app</li>
              </ol>
            </div>
          )}

          <div className="text-sm text-gray-500">
            <p className="font-medium text-gray-700 mb-1">Scraped Sources:</p>
            <p>Superhuman, The Deep View, The Rundown AI, Every, TechCrunch, Ars Technica, VentureBeat, HBR</p>
          </div>
        </div>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader title="Data" />
        <div className="space-y-4">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span><strong>{stats.contentPieces}</strong> posts</span>
            <span><strong>{stats.contentIdeas}</strong> ideas</span>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={handleExport}>
              Export
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportChange}
              className="hidden"
            />
            <Button variant="secondary" size="sm" onClick={handleImportClick}>
              Import
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowClearConfirm(true)} className="text-red-600">
              Clear All
            </Button>
          </div>

          {importStatus === 'success' && (
            <p className="text-sm text-green-600">Import successful!</p>
          )}
          {importStatus === 'error' && (
            <p className="text-sm text-red-600">Import failed. Check file format.</p>
          )}
        </div>
      </Card>

      {/* Voice Guide */}
      <Card>
        <CardHeader title="Voice Guide" />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-xs font-semibold text-green-700 uppercase mb-2">Do</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              {VOICE_GUIDELINES.do.map((item, i) => (
                <li key={i} className="text-xs">"{item}"</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-red-700 uppercase mb-2">Don't</h4>
            <ul className="text-sm space-y-1">
              {VOICE_GUIDELINES.dont.map((item, i) => (
                <li key={i} className="text-xs text-gray-400 line-through">"{item}"</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <ul className="text-xs text-gray-600 space-y-1">
            {VOICE_GUIDELINES.reminders.map((item, i) => (
              <li key={i}>• {item}</li>
            ))}
          </ul>
        </div>
      </Card>

      {/* Content Pillars */}
      <Card>
        <CardHeader title="Content Pillars" />
        <div className="space-y-3">
          {Object.entries(PILLARS).map(([key, { label, description, color }]) => (
            <div key={key} className="flex items-start gap-3">
              <div className={`w-2 h-2 rounded-full ${color} mt-1.5`} />
              <div>
                <p className="font-medium text-gray-900 text-sm">{label}</p>
                <p className="text-xs text-gray-500">{description}</p>
              </div>
            </div>
          ))}
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
            <div className="relative bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Clear All Data?
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                This will permanently delete all your content and ideas.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => setShowClearConfirm(false)}>
                  Cancel
                </Button>
                <Button variant="danger" size="sm" onClick={handleClearData}>
                  Clear
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
