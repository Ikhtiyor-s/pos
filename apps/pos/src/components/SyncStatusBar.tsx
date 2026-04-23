import { useState } from 'react';
import {
  Wifi, WifiOff, RefreshCw, AlertTriangle, CheckCircle2,
  Upload, ChevronDown, ChevronUp, X, ArrowLeftRight,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useOfflineSync } from '../hooks/useOfflineSync';
import type { ConflictRecord } from '../services/sync.service';

// ==========================================
// SYNC STATUS BAR
// App yuqorisida yoki pastida ko'rinadigan sync holati
// ==========================================

export default function SyncStatusBar() {
  const {
    isSyncing,
    isOnline,
    pendingTotalCount,
    conflicts,
    lastSyncAt,
    lastError,
    manualSync,
    resolveConflict,
    clearAllConflicts,
  } = useOfflineSync();

  const [expanded, setExpanded] = useState(false);
  const [syncingManually, setSyncingManually] = useState(false);

  const handleManualSync = async () => {
    if (syncingManually || !isOnline) return;
    setSyncingManually(true);
    await manualSync();
    setSyncingManually(false);
  };

  const isActive = isSyncing || syncingManually;
  const hasConflicts = conflicts.length > 0;
  const hasError = !!lastError && !isActive;

  // Hech qanday holat yo'q → ko'rsatmaymiz (online, 0 pending, 0 conflict)
  if (isOnline && pendingTotalCount === 0 && !hasConflicts && !hasError) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm w-full">
      {/* Main bar */}
      <div
        className={cn(
          'rounded-xl shadow-lg border overflow-hidden transition-all',
          hasConflicts
            ? 'bg-orange-50 border-orange-300'
            : hasError
            ? 'bg-red-50 border-red-300'
            : !isOnline
            ? 'bg-gray-900 border-gray-700'
            : 'bg-white border-blue-200',
        )}
      >
        <div
          className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
          onClick={() => setExpanded(v => !v)}
        >
          {/* Icon */}
          <div className="flex-shrink-0">
            {!isOnline ? (
              <WifiOff className="w-5 h-5 text-gray-300" />
            ) : isActive ? (
              <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
            ) : hasConflicts ? (
              <AlertTriangle className="w-5 h-5 text-orange-500" />
            ) : hasError ? (
              <AlertTriangle className="w-5 h-5 text-red-500" />
            ) : (
              <Upload className="w-5 h-5 text-blue-500" />
            )}
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            {!isOnline ? (
              <>
                <p className="text-sm font-semibold text-white">Offline rejim</p>
                {pendingTotalCount > 0 && (
                  <p className="text-xs text-gray-400">{pendingTotalCount} ta o'zgarish kutmoqda</p>
                )}
              </>
            ) : isActive ? (
              <p className="text-sm font-medium text-blue-700">Serverga yubormoqda...</p>
            ) : hasConflicts ? (
              <>
                <p className="text-sm font-semibold text-orange-700">{conflicts.length} ta konflikt</p>
                <p className="text-xs text-orange-600">Hal qilish talab etiladi</p>
              </>
            ) : hasError ? (
              <>
                <p className="text-sm font-semibold text-red-700">Sync xatosi</p>
                <p className="text-xs text-red-600 truncate">{lastError}</p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-blue-700">{pendingTotalCount} ta kutmoqda</p>
                {lastSyncAt && (
                  <p className="text-xs text-gray-400">
                    Oxirgi sync: {formatRelativeTime(lastSyncAt)}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {isOnline && pendingTotalCount > 0 && !isActive && (
              <button
                onClick={(e) => { e.stopPropagation(); handleManualSync(); }}
                className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-200 transition-colors font-medium"
              >
                Sync
              </button>
            )}
            {(hasConflicts || expanded) && (
              expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronUp className="w-4 h-4 text-gray-400" />
            )}
          </div>
        </div>

        {/* Expanded — conflict resolver */}
        {expanded && hasConflicts && (
          <div className="border-t border-orange-200 bg-orange-50">
            <div className="flex items-center justify-between px-4 py-2">
              <span className="text-xs font-semibold text-orange-700 uppercase tracking-wide">
                Konfliktlar
              </span>
              <button
                onClick={clearAllConflicts}
                className="text-xs text-orange-600 hover:text-orange-800 flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Hammasini bekor qilish
              </button>
            </div>
            <div className="space-y-2 px-4 pb-4 max-h-60 overflow-y-auto">
              {conflicts.map((c) => (
                <ConflictCard
                  key={c.clientOrder.id}
                  conflict={c}
                  onResolve={resolveConflict}
                />
              ))}
            </div>
          </div>
        )}

        {/* Expanded — error detail */}
        {expanded && hasError && (
          <div className="border-t border-red-200 bg-red-50 px-4 py-3">
            <p className="text-xs text-red-600 break-words">{lastError}</p>
            {isOnline && (
              <button
                onClick={handleManualSync}
                className="mt-2 text-xs bg-red-100 text-red-700 px-3 py-1 rounded-lg hover:bg-red-200 transition-colors"
              >
                Qayta urinish
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// CONFLICT CARD
// ==========================================

function ConflictCard({
  conflict,
  onResolve,
}: {
  conflict: ConflictRecord;
  onResolve: (id: string, strategy: 'keep-server' | 'keep-client') => void;
}) {
  return (
    <div className="bg-white border border-orange-200 rounded-xl p-3 text-xs">
      <div className="flex items-start gap-2 mb-2">
        <ArrowLeftRight className="w-3.5 h-3.5 text-orange-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 truncate">
            Buyurtma #{conflict.clientOrder.orderNumber}
          </p>
          <p className="text-gray-500">
            {new Date(conflict.detectedAt).toLocaleTimeString('uz-UZ')} da aniqlandi
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5 mb-2 text-gray-600">
        <div className="bg-blue-50 rounded-lg px-2 py-1">
          <p className="font-medium text-blue-700">Mening versiyam</p>
          <p>Status: {conflict.clientOrder.status}</p>
          <p>Jami: {Number(conflict.clientOrder.total).toLocaleString()}</p>
        </div>
        <div className="bg-green-50 rounded-lg px-2 py-1">
          <p className="font-medium text-green-700">Server versiyasi</p>
          <p>Status: {conflict.serverData?.status || '?'}</p>
          <p>Jami: {Number(conflict.serverData?.total || 0).toLocaleString()}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onResolve(conflict.clientOrder.id, 'keep-server')}
          className="flex-1 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium"
        >
          Serverni saqlash
        </button>
        <button
          onClick={() => onResolve(conflict.clientOrder.id, 'keep-client')}
          className="flex-1 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium"
        >
          Menimni saqlash
        </button>
      </div>
    </div>
  );
}

// ==========================================
// HELPERS
// ==========================================

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'hozirgina';
  if (mins < 60) return `${mins} daqiqa oldin`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} soat oldin`;
  return new Date(isoString).toLocaleDateString('uz-UZ');
}
