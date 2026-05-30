'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import {
  Download,
  Upload,
  HardDrive,
  Trash2,
  FileJson,
  AlertTriangle,
  CheckCircle,
  X,
  Database,
  ListChecks,
  Clock,
  CalendarDays,
} from 'lucide-react';
import {
  exportAllData,
  importAllData,
  getStorageSize,
  getWatchList,
  getContinueWatching,
  getActivityLog,
  type ExportData,
} from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// ─── Helpers ────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// ─── Component ──────────────────────────────────────────────────────

export default function ExportImportSection() {
  const [importPreview, setImportPreview] = useState<ExportData | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [confirmClearType, setConfirmClearType] = useState<string | null>(null);
  const [importJsonString, setImportJsonString] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Storage stats
  const storageSize = useMemo(() => getStorageSize(), []);
  const watchListCount = useMemo(() => getWatchList().length, []);
  const continueWatchingCount = useMemo(() => getContinueWatching().length, []);
  const activityLogCount = useMemo(() => getActivityLog().length, []);

  // ─── Export Handler ──────────────────────────────────────────────
  const handleExport = useCallback(() => {
    try {
      const jsonStr = exportAllData();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ar-stream-backup-${formatDate(new Date())}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      // Handle error silently
    }
  }, []);

  // ─── Import Handler ──────────────────────────────────────────────
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportSuccess(null);
    setImportPreview(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonString = event.target?.result as string;
        setImportJsonString(jsonString);

        const data = JSON.parse(jsonString) as Partial<ExportData>;

        // Basic validation
        if (!data.version || !data.exportedAt) {
          setImportError('Invalid backup file: missing version or timestamp.');
          return;
        }

        setImportPreview({
          version: data.version || 'unknown',
          exportedAt: data.exportedAt || 0,
          watchlist: Array.isArray(data.watchlist) ? data.watchlist : [],
          continueWatching: Array.isArray(data.continueWatching) ? data.continueWatching : [],
          activityLog: Array.isArray(data.activityLog) ? data.activityLog : [],
          theme: data.theme || 'dark',
          colorTheme: data.colorTheme || 'default',
        });
      } catch {
        setImportError('Invalid JSON file. Please check the file and try again.');
      }
    };
    reader.readAsText(file);

    // Reset input so the same file can be re-selected
    e.target.value = '';
  }, []);

  const handleConfirmImport = useCallback(() => {
    if (!importJsonString) return;

    const result = importAllData(importJsonString);
    if (result.success) {
      setImportSuccess(result.message);
      setImportPreview(null);
      setImportJsonString(null);
    } else {
      setImportError(result.message);
    }

    // Auto-dismiss after 5s
    setTimeout(() => {
      setImportSuccess(null);
      setImportError(null);
    }, 5000);
  }, [importJsonString]);

  const handleCancelImport = useCallback(() => {
    setImportPreview(null);
    setImportJsonString(null);
    setImportError(null);
  }, []);

  // ─── Clear Handler ───────────────────────────────────────────────
  const handleClearData = useCallback((type: string) => {
    if (confirmClearType === type) {
      try {
        if (typeof window !== 'undefined') {
          const keyMap: Record<string, string> = {
            'watchlist': 'ar-stream-watchlist',
            'continue-watching': 'ar-stream-continue-watching',
            'activity-log': 'ar-stream-activity-log',
            'favorites': 'ar-stream-favorites',
          };
          const key = keyMap[type];
          if (key) {
            localStorage.removeItem(key);
          }
        }
      } catch {
        // Storage unavailable
      }
      setConfirmClearType(null);
      // Reload to reflect changes
      window.location.reload();
    } else {
      setConfirmClearType(type);
      setTimeout(() => setConfirmClearType(null), 3000);
    }
  }, [confirmClearType]);

  // ─── Data type items ─────────────────────────────────────────────
  const dataTypes = [
    {
      key: 'watchlist',
      label: 'Watchlist',
      icon: ListChecks,
      count: watchListCount,
      color: 'text-ars',
    },
    {
      key: 'continue-watching',
      label: 'Continue Watching',
      icon: Clock,
      count: continueWatchingCount,
      color: 'text-emerald-500',
    },
    {
      key: 'activity-log',
      label: 'Activity Log',
      icon: CalendarDays,
      count: activityLogCount,
      color: 'text-violet-500',
    },
  ];

  return (
    <div className="w-full fade-in space-y-6">
      {/* Header */}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-ars/10 flex items-center justify-center">
            <Database className="size-5 text-ars" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">Data Management</h2>
            <p className="text-sm text-muted-foreground">Export, import, and manage your data</p>
          </div>
        </div>
      </div>

      {/* Storage Overview */}
      <div className="px-4 sm:px-6 lg:px-8">
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <HardDrive className="size-4 text-ars" />
              Storage Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 mb-4">
              <div className="size-12 rounded-lg bg-ars/10 flex items-center justify-center">
                <HardDrive className="size-6 text-ars" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{storageSize.formatted}</p>
                <p className="text-xs text-muted-foreground">Total storage used</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {dataTypes.map(dt => {
                const Icon = dt.icon;
                return (
                  <div key={dt.key} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/30">
                    <Icon className={`h-4 w-4 ${dt.color}`} />
                    <div>
                      <p className="text-sm font-medium text-foreground">{dt.count}</p>
                      <p className="text-[10px] text-muted-foreground">{dt.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export Section */}
      <div className="px-4 sm:px-6 lg:px-8">
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Download className="size-4 text-emerald-500" />
              Export Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Download all your data as a JSON file. This includes your watchlist, continue watching history, activity log, and preferences.
            </p>
            <Button onClick={handleExport} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
              <Download className="h-4 w-4" />
              Export All Data
            </Button>
            <p className="text-[10px] text-muted-foreground mt-2">
              File will be named: ar-stream-backup-{formatDate(new Date())}.json
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Import Section */}
      <div className="px-4 sm:px-6 lg:px-8">
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Upload className="size-4 text-ars" />
              Import Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!importPreview ? (
              <div>
                <p className="text-sm text-muted-foreground mb-4">
                  Import a previously exported JSON backup file. This will replace your current data.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Select Backup File
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Preview */}
                <div className="p-4 rounded-lg bg-muted/30 border border-border/30 space-y-3">
                  <div className="flex items-center gap-2">
                    <FileJson className="h-5 w-5 text-ars" />
                    <span className="text-sm font-semibold text-foreground">Import Preview</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="text-center p-2 rounded bg-background/50">
                      <p className="text-lg font-bold text-foreground">{importPreview.watchlist.length}</p>
                      <p className="text-[10px] text-muted-foreground">Watchlist Items</p>
                    </div>
                    <div className="text-center p-2 rounded bg-background/50">
                      <p className="text-lg font-bold text-foreground">{importPreview.continueWatching.length}</p>
                      <p className="text-[10px] text-muted-foreground">History Items</p>
                    </div>
                    <div className="text-center p-2 rounded bg-background/50">
                      <p className="text-lg font-bold text-foreground">{importPreview.activityLog.length}</p>
                      <p className="text-[10px] text-muted-foreground">Activity Entries</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Version: {importPreview.version}</span>
                    <span>Exported: {new Date(importPreview.exportedAt).toLocaleDateString()}</span>
                    <span>Theme: {importPreview.theme}</span>
                  </div>
                </div>

                {/* Warning */}
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-amber-600 dark:text-amber-400">This will replace your current data</p>
                    <p className="text-[10px] text-amber-600/70 dark:text-amber-400/70">All existing watchlist, history, and activity data will be overwritten.</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <Button onClick={handleConfirmImport} className="gap-2 bg-ars hover:bg-ars/90 text-ars-foreground">
                    <CheckCircle className="h-4 w-4" />
                    Confirm Import
                  </Button>
                  <Button variant="outline" onClick={handleCancelImport} className="gap-2">
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Error message */}
            {importError && (
              <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-600 dark:text-red-400">{importError}</p>
              </div>
            )}

            {/* Success message */}
            {importSuccess && (
              <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-600 dark:text-emerald-400">{importSuccess}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Data Management / Clear Section */}
      <div className="px-4 sm:px-6 lg:px-8">
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Trash2 className="size-4 text-red-500" />
              Clear Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Permanently delete specific types of data. This action cannot be undone.
            </p>

            <div className="space-y-2">
              {dataTypes.map(dt => {
                const Icon = dt.icon;
                const isConfirming = confirmClearType === dt.key;
                return (
                  <div key={dt.key} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30">
                    <div className="flex items-center gap-3">
                      <Icon className={`h-4 w-4 ${dt.color}`} />
                      <div>
                        <p className="text-sm font-medium text-foreground">{dt.label}</p>
                        <p className="text-[10px] text-muted-foreground">{dt.count} items</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleClearData(dt.key)}
                      className={`gap-1.5 text-xs ${
                        isConfirming
                          ? 'border-red-500 text-red-500 hover:bg-red-500/10'
                          : 'text-muted-foreground hover:text-red-500'
                      }`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {isConfirming ? 'Confirm?' : 'Clear'}
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
