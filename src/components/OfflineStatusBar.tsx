import React, { useState, useEffect } from 'react';
import { 
  Wifi, WifiOff, Download, Database, ShieldCheck, 
  RefreshCw, CheckCircle2, Sparkles, Smartphone, HardDrive,
  CloudUpload, Clock, ArrowRight
} from 'lucide-react';
import { offlineSyncManager, OfflineStatusState } from '../services/offlineSync';
import { usePOS } from '../context/POSContext';
import { formatFCFA } from '../utils/formatters';

interface OfflineStatusBarProps {
  onOpenOfflineModal: (tab?: 'WEB_APP' | 'SYNC_LOGS' | 'EXTENSION' | 'OFFLINE_STATUS') => void;
}

export const OfflineStatusBar: React.FC<OfflineStatusBarProps> = ({ onOpenOfflineModal }) => {
  const { 
    pendingSyncCount, 
    pendingSyncAmountFCFA, 
    processSyncQueue, 
    isSyncingQueue 
  } = usePOS();
  
  const [offlineState, setOfflineState] = useState<OfflineStatusState>(offlineSyncManager.getState());
  const [showOfflineBanner, setShowOfflineBanner] = useState<boolean>(true);
  const [showSyncBanner, setShowSyncBanner] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = offlineSyncManager.subscribe((newState) => {
      setOfflineState(newState);
    });
    return () => unsubscribe();
  }, []);

  const isOffline = !offlineState.isOnline;

  const handleQuickSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await processSyncQueue();
  };

  return (
    <div className="w-full shrink-0">
      {/* 1. Offline Alert Strip if disconnected */}
      {isOffline && showOfflineBanner && (
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 text-black px-4 py-2 text-xs font-bold flex items-center justify-between shadow-lg shadow-amber-500/20 animate-in fade-in duration-300">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 animate-bounce shrink-0" />
            <span>
              <strong>Mode Hors-ligne Actif :</strong> Aucune connexion Internet détectée. Caisse 100% autonome en local.
              {pendingSyncCount > 0 && (
                <span className="ml-1 bg-black/80 text-amber-300 px-1.5 py-0.5 rounded font-black text-[11px]">
                  {pendingSyncCount} opération(s) en file d'attente ({formatFCFA(pendingSyncAmountFCFA)})
                </span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onOpenOfflineModal('SYNC_LOGS')}
              className="px-2.5 py-1 rounded-lg bg-black text-amber-300 hover:bg-black/80 text-[11px] font-black transition-all cursor-pointer flex items-center gap-1"
            >
              <Clock className="w-3 h-3" />
              <span>Logs & File ({pendingSyncCount})</span>
            </button>
            <button
              onClick={() => setShowOfflineBanner(false)}
              className="text-black/80 hover:text-black font-black text-xs px-1"
              title="Masquer le bandeau"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 2. Pending Sync Strip if online with pending transactions */}
      {!isOffline && pendingSyncCount > 0 && showSyncBanner && (
        <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-amber-950/80 border-b border-amber-500/30 text-amber-200 px-4 py-1.5 text-xs font-medium flex items-center justify-between shadow-sm animate-in fade-in duration-300">
          <div className="flex items-center gap-2">
            <CloudUpload className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
            <span>
              <strong className="text-white">{pendingSyncCount} transaction(s) en attente d'envoi Cloud</strong> 
              {pendingSyncAmountFCFA > 0 && ` • Volume: ${formatFCFA(pendingSyncAmountFCFA)}`}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleQuickSync}
              disabled={isSyncingQueue}
              className="px-2.5 py-0.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-black text-[11px] flex items-center gap-1 shadow transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncingQueue ? 'animate-spin' : ''}`} />
              <span>{isSyncingQueue ? 'Envoi...' : 'Synchroniser'}</span>
            </button>

            <button
              onClick={() => onOpenOfflineModal('SYNC_LOGS')}
              className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/15 text-white font-bold text-[11px] transition-all cursor-pointer"
            >
              Voir les logs
            </button>

            <button
              onClick={() => setShowSyncBanner(false)}
              className="text-gray-400 hover:text-white font-bold text-xs px-1"
              title="Masquer"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
