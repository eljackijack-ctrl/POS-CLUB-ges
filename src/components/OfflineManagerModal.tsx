import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Wifi, WifiOff, Download, HardDrive, 
  Smartphone, ShieldCheck, RefreshCw, CheckCircle2, 
  Layers, Database, Wine, Sparkles, HelpCircle,
  Laptop, Tablet, ArrowRight, Printer, AlertTriangle,
  Puzzle, Monitor, ExternalLink, FileCode, Check, Copy,
  Globe, Zap, Ban, CheckCheck, CloudUpload, Clock,
  AlertCircle, ChevronDown, ChevronUp, Trash2, Filter,
  Search, ArrowUpRight, CheckCircle, RefreshCcw
} from 'lucide-react';
import { offlineSyncManager, OfflineStatusState } from '../services/offlineSync';
import { usePOS } from '../context/POSContext';
import { formatFCFA, formatDateTime, formatFullDateTime } from '../utils/formatters';
import { downloadExtensionZip } from '../utils/extensionPackager';
import { SyncTransactionLog, SyncLogType, SyncLogStatus } from '../types';
import confetti from 'canvas-confetti';

interface OfflineManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'WEB_APP' | 'SYNC_LOGS' | 'EXTENSION' | 'OFFLINE_STATUS';
}

export const OfflineManagerModal: React.FC<OfflineManagerModalProps> = ({ 
  isOpen, 
  onClose,
  initialTab = 'SYNC_LOGS'
}) => {
  const { 
    tables, 
    orders, 
    products, 
    users, 
    payments, 
    companyProfile,
    exportFullBackupJSON,
    syncLogs,
    pendingSyncCount,
    pendingSyncAmountFCFA,
    isSyncingQueue,
    processSyncQueue,
    retrySingleSyncLog,
    clearSyncedLogs,
    clearAllLogs,
    exportSyncLogsJSON,
    cloudSyncStatus
  } = usePOS();

  const [offlineState, setOfflineState] = useState<OfflineStatusState>(offlineSyncManager.getState());
  const [isRefreshingCache, setIsRefreshingCache] = useState<boolean>(false);
  const [isDownloadingExtension, setIsDownloadingExtension] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'WEB_APP' | 'SYNC_LOGS' | 'EXTENSION' | 'OFFLINE_STATUS'>(initialTab);
  const [installStatusMsg, setInstallStatusMsg] = useState<string | null>(null);
  const [copiedStep, setCopiedStep] = useState<string | null>(null);
  
  // Sync Log filters & inspection state
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'SYNCED' | 'FAILED'>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [retryingLogId, setRetryingLogId] = useState<string | null>(null);
  const [syncFeedbackMsg, setSyncFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  useEffect(() => {
    const unsubscribe = offlineSyncManager.subscribe((state) => {
      setOfflineState(state);
    });
    offlineSyncManager.calculateStorageSizes();
    return () => unsubscribe();
  }, []);

  // Filtered Sync Logs
  const filteredLogs = useMemo(() => {
    return syncLogs.filter(log => {
      // Status filter
      if (statusFilter === 'PENDING') {
        if (log.status !== 'PENDING' && log.status !== 'FAILED' && log.status !== 'SYNCING') return false;
      } else if (statusFilter === 'SYNCED') {
        if (log.status !== 'SYNCED') return false;
      } else if (statusFilter === 'FAILED') {
        if (log.status !== 'FAILED') return false;
      }

      // Type filter
      if (typeFilter !== 'ALL' && log.type !== typeFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const refMatch = log.reference?.toLowerCase().includes(query);
        const detailsMatch = log.details?.toLowerCase().includes(query);
        const typeMatch = log.type?.toLowerCase().includes(query);
        const idMatch = log.id?.toLowerCase().includes(query);
        if (!refMatch && !detailsMatch && !typeMatch && !idMatch) return false;
      }

      return true;
    });
  }, [syncLogs, statusFilter, typeFilter, searchQuery]);

  const syncedCount = useMemo(() => {
    return syncLogs.filter(l => l.status === 'SYNCED').length;
  }, [syncLogs]);

  const failedCount = useMemo(() => {
    return syncLogs.filter(l => l.status === 'FAILED').length;
  }, [syncLogs]);

  if (!isOpen) return null;

  const handleInstallApp = async () => {
    const res = await offlineSyncManager.promptPWAInstall();
    if (res === 'accepted') {
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
      setInstallStatusMsg('Raccourci Web ajouté avec succès à votre écran d\'accueil !');
    } else if (res === 'dismissed') {
      setInstallStatusMsg('Action annulée.');
    } else {
      setInstallStatusMsg('Ajout rapide : ouvrez le menu de votre navigateur (⋮ sur Android ou Partager sur iOS) puis appuyez sur "Ajouter à l\'écran d\'accueil". Zéro fichier APK requis !');
    }
  };

  const handleDownloadExtension = async () => {
    try {
      setIsDownloadingExtension(true);
      await downloadExtensionZip();
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      setInstallStatusMsg('Package Extension (.zip) téléchargé ! Vous pouvez l\'ajouter à votre navigateur Chrome / Edge en 30 secondes.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setInstallStatusMsg(`Erreur : ${msg}`);
    } finally {
      setIsDownloadingExtension(false);
    }
  };

  const handleRefreshCache = async () => {
    setIsRefreshingCache(true);
    await offlineSyncManager.forceRefreshCache();
    setIsRefreshingCache(false);
  };

  const handleProcessQueue = async () => {
    setSyncFeedbackMsg({ text: 'Synchronisation de la file d\'attente vers le Cloud en cours...', type: 'info' });
    const res = await processSyncQueue();
    if (res.failed === 0) {
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.5 } });
      setSyncFeedbackMsg({ 
        text: `Succès : ${res.success} transaction(s) synchronisée(s) avec succès vers le serveur Firestore !`, 
        type: 'success' 
      });
    } else {
      setSyncFeedbackMsg({ 
        text: `${res.success} synchronisée(s), ${res.failed} échec(s). Vérifiez la connexion Internet.`, 
        type: 'error' 
      });
    }
    setTimeout(() => setSyncFeedbackMsg(null), 6000);
  };

  const handleRetrySingle = async (logId: string) => {
    setRetryingLogId(logId);
    const success = await retrySingleSyncLog(logId);
    setRetryingLogId(null);
    if (success) {
      setSyncFeedbackMsg({ text: 'Opération renvoyée et confirmée par le serveur !', type: 'success' });
    } else {
      setSyncFeedbackMsg({ text: 'Échec de la transmission. L\'opération reste en file d\'attente locale.', type: 'error' });
    }
    setTimeout(() => setSyncFeedbackMsg(null), 4000);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(id);
    setTimeout(() => setCopiedStep(null), 2500);
  };

  const isOnline = offlineState.isOnline;

  const getTypeBadge = (type: SyncLogType) => {
    switch (type) {
      case 'PAYMENT':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Encaissement / Ticket</span>;
      case 'ORDER':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">Commande Bar</span>;
      case 'STOCK_MOVEMENT':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">Mouvement Stock</span>;
      case 'SECTION_CLOSING':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/30">Clôture Section</span>;
      case 'PRODUCT_UPDATE':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500/20 text-blue-300 border border-blue-500/30">Catalogue Article</span>;
      case 'TABLE_UPDATE':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Table / Carré</span>;
      case 'DAILY_BACKUP':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">Sauvegarde Jour</span>;
      case 'SETTINGS':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-gray-500/20 text-gray-300 border border-gray-500/30">Configuration</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-gray-500/20 text-gray-300">Donnée</span>;
    }
  };

  const getStatusBadge = (status: SyncLogStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <Clock className="w-3 h-3 text-amber-400 animate-pulse" />
            <span>En attente</span>
          </span>
        );
      case 'SYNCING':
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
            <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin" />
            <span>Envoi...</span>
          </span>
        );
      case 'SYNCED':
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Synchronisé</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40">
            <AlertCircle className="w-3 h-3 text-rose-400" />
            <span>Échec d'envoi</span>
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#101322] border border-white/15 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl text-white flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-white/10 bg-[#171b2d] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-purple-600 to-indigo-600 p-[1.5px] shadow-md shadow-amber-500/20 shrink-0">
              <div className="w-full h-full bg-[#101322] rounded-[14px] flex items-center justify-center overflow-hidden">
                <img
                  src="/clubpos-logo.png"
                  alt="ClubPOS Logo"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Gestionnaire Hors-ligne & Synchronisation Cloud</span>
                {pendingSyncCount > 0 ? (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 animate-pulse">
                    <Clock className="w-3 h-3 text-amber-400" />
                    {pendingSyncCount} en attente
                  </span>
                ) : (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                    <CheckCheck className="w-3 h-3 text-emerald-400" />
                    À jour
                  </span>
                )}
              </h2>
              <p className="text-xs text-gray-400">
                Supervision des écritures locales, suivi des envois serveur Firestore et résilience autonome
              </p>
            </div>
          </div>

          <button
            id="close-offline-modal"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 sm:gap-2 px-5 sm:px-6 pt-3 border-b border-white/10 bg-[#131626] shrink-0 overflow-x-auto scrollbar-thin">
          <button
            id="tab-sync-logs"
            onClick={() => setActiveTab('SYNC_LOGS')}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'SYNC_LOGS'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <CloudUpload className="w-4 h-4 text-amber-400" />
            <span>Logs & File de Synchronisation</span>
            {pendingSyncCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-500 text-black">
                {pendingSyncCount}
              </span>
            )}
          </button>

          <button
            id="tab-offline-status"
            onClick={() => setActiveTab('OFFLINE_STATUS')}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'OFFLINE_STATUS'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <HardDrive className="w-4 h-4 text-cyan-400" />
            <span>Diagnostic Données & Cache</span>
          </button>

          <button
            id="tab-web-app"
            onClick={() => setActiveTab('WEB_APP')}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'WEB_APP'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Globe className="w-4 h-4 text-emerald-400" />
            <span>Accès Web Sans APK</span>
          </button>

          <button
            id="tab-extension"
            onClick={() => setActiveTab('EXTENSION')}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'EXTENSION'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Puzzle className="w-4 h-4 text-purple-400" />
            <span>Extension Navigateur (.ZIP)</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          
          {/* TAB: SYNC LOGS & QUEUE ENGINE */}
          {activeTab === 'SYNC_LOGS' && (
            <div className="space-y-4">
              
              {/* Top Queue Overview Banner */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#171b2d] via-[#141829] to-[#121524] border border-white/10 space-y-4 shadow-lg">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
                      <span className="text-xs font-black uppercase tracking-wider text-gray-400">
                        État Réseau : {isOnline ? '🟢 En Ligne (Cloud Connecté)' : '⚡ Hors-ligne (Stockage Local)'}
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-white">
                      File d'attente des transactions & écritures
                    </h3>
                    <p className="text-xs text-gray-300 max-w-xl">
                      Chaque encaissement, commande, réassort de stock ou clôture est immédiatement inscrit dans le journal local pour garantir zéro perte de données avant transfert vers Firestore.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      id="btn-process-sync-queue"
                      onClick={handleProcessQueue}
                      disabled={isSyncingQueue || !isOnline}
                      className={`px-4 py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer ${
                        !isOnline
                          ? 'bg-white/10 text-gray-400 cursor-not-allowed border border-white/5'
                          : isSyncingQueue
                          ? 'bg-amber-500/50 text-black cursor-wait'
                          : 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black shadow-amber-500/20'
                      }`}
                    >
                      <RefreshCw className={`w-4 h-4 ${isSyncingQueue ? 'animate-spin' : ''}`} />
                      <span>{isSyncingQueue ? 'Envoi en cours...' : 'Synchroniser tout maintenant'}</span>
                    </button>

                    <button
                      id="btn-export-sync-logs"
                      onClick={exportSyncLogsJSON}
                      className="px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center gap-1.5 border border-white/10 cursor-pointer transition-all active:scale-95"
                      title="Télécharger le journal au format JSON"
                    >
                      <Download className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Exporter JSON</span>
                    </button>

                    {syncedCount > 0 && (
                      <button
                        onClick={clearSyncedLogs}
                        className="px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-rose-300 font-bold text-xs flex items-center gap-1.5 border border-white/5 cursor-pointer transition-all"
                        title="Supprimer les transactions déjà confirmées par le serveur"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Purger validés</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Feedback Notification Banner */}
                {syncFeedbackMsg && (
                  <div className={`p-3 rounded-xl text-xs flex items-center gap-2 border animate-in fade-in ${
                    syncFeedbackMsg.type === 'success'
                      ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40'
                      : syncFeedbackMsg.type === 'error'
                      ? 'bg-rose-500/20 text-rose-200 border-rose-500/40'
                      : 'bg-amber-500/20 text-amber-200 border-amber-500/40'
                  }`}>
                    {syncFeedbackMsg.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                    <span className="font-semibold">{syncFeedbackMsg.text}</span>
                  </div>
                )}

                {/* 4 Summary Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
                    <div className="text-[10px] text-gray-400 uppercase font-semibold">En attente / File</div>
                    <div className="text-base font-black text-amber-400 flex items-center gap-1.5">
                      <span>{pendingSyncCount}</span>
                      <span className="text-[10px] font-normal text-gray-400">opérations</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
                    <div className="text-[10px] text-gray-400 uppercase font-semibold">Volume CA en attente</div>
                    <div className="text-base font-black text-emerald-400">
                      {formatFCFA(pendingSyncAmountFCFA)}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
                    <div className="text-[10px] text-gray-400 uppercase font-semibold">Confirmés Serveur</div>
                    <div className="text-base font-black text-cyan-400">
                      {syncedCount} <span className="text-[10px] font-normal text-gray-400">logs</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-0.5">
                    <div className="text-[10px] text-gray-400 uppercase font-semibold">Échecs / À réémettre</div>
                    <div className={`text-base font-black ${failedCount > 0 ? 'text-rose-400' : 'text-gray-400'}`}>
                      {failedCount}
                    </div>
                  </div>
                </div>
              </div>

              {/* Filters Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                
                {/* Search Box */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher par référence, table, serveur ou ID..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#141829] border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Status & Type Selectors */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center bg-[#141829] p-1 rounded-xl border border-white/10">
                    <button
                      onClick={() => setStatusFilter('ALL')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        statusFilter === 'ALL' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Tous ({syncLogs.length})
                    </button>
                    <button
                      onClick={() => setStatusFilter('PENDING')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        statusFilter === 'PENDING' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      En attente ({pendingSyncCount})
                    </button>
                    <button
                      onClick={() => setStatusFilter('SYNCED')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        statusFilter === 'SYNCED' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Validés ({syncedCount})
                    </button>
                  </div>

                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="bg-[#141829] border border-white/10 text-xs text-gray-300 rounded-xl px-2.5 py-2 focus:outline-none focus:border-amber-400"
                  >
                    <option value="ALL">Tous les types</option>
                    <option value="PAYMENT">Encaissements</option>
                    <option value="ORDER">Commandes Bar</option>
                    <option value="STOCK_MOVEMENT">Mouvements Stock</option>
                    <option value="SECTION_CLOSING">Clôtures Section</option>
                    <option value="PRODUCT_UPDATE">Articles</option>
                    <option value="TABLE_UPDATE">Tables</option>
                    <option value="DAILY_BACKUP">Sauvegardes</option>
                  </select>
                </div>
              </div>

              {/* Transaction Logs Stream List */}
              <div className="space-y-2.5">
                {filteredLogs.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl bg-[#141829] border border-white/5 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white">
                        {searchQuery || statusFilter !== 'ALL' || typeFilter !== 'ALL'
                          ? 'Aucun log ne correspond aux critères de filtre'
                          : 'Aucune transaction en attente dans la file'}
                      </h4>
                      <p className="text-xs text-gray-400 max-w-md mx-auto">
                        Toutes les opérations enregistrées sur cette caisse sont synchronisées avec le serveur Cloud. En cas de coupure réseau, les prochaines ventes apparaîtront automatiquement ici.
                      </p>
                    </div>
                  </div>
                ) : (
                  filteredLogs.map((log) => {
                    const isExpanded = expandedLogId === log.id;
                    const isRetrying = retryingLogId === log.id;

                    return (
                      <div 
                        key={log.id}
                        className={`rounded-2xl border transition-all ${
                          log.status === 'FAILED'
                            ? 'bg-[#1a1217] border-rose-500/30'
                            : log.status === 'PENDING' || log.status === 'SYNCING'
                            ? 'bg-[#19191e] border-amber-500/30'
                            : 'bg-[#141829] border-white/5 hover:border-white/15'
                        }`}
                      >
                        <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              {getStatusBadge(log.status)}
                              {getTypeBadge(log.type)}
                              <span className="text-[11px] font-mono text-gray-400 font-medium">
                                {formatDateTime(log.createdAt)}
                              </span>
                              {log.retryCount > 0 && (
                                <span className="text-[10px] text-gray-400 bg-white/5 px-1.5 py-0.2 rounded border border-white/5">
                                  {log.retryCount} essai(s)
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <h4 className="text-xs sm:text-sm font-black text-white truncate">
                                {log.reference}
                              </h4>
                              {log.amountFCFA !== undefined && log.amountFCFA > 0 && (
                                <span className="text-xs font-extrabold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md shrink-0">
                                  {formatFCFA(log.amountFCFA)}
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-gray-300 truncate">
                              {log.details}
                            </p>

                            {log.errorMessage && (
                              <div className="text-[11px] text-rose-300 bg-rose-950/40 px-2.5 py-1 rounded-lg border border-rose-500/30 flex items-center gap-1.5 mt-1">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                <span className="truncate">{log.errorMessage}</span>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons for Log */}
                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            {(log.status === 'PENDING' || log.status === 'FAILED') && (
                              <button
                                onClick={() => handleRetrySingle(log.id)}
                                disabled={isRetrying || !isOnline}
                                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                                  !isOnline
                                    ? 'bg-white/5 text-gray-500 cursor-not-allowed'
                                    : 'bg-amber-500 hover:bg-amber-400 text-black shadow active:scale-95'
                                }`}
                                title="Renvoyer cette transaction au serveur"
                              >
                                <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                                <span>{isRetrying ? 'Envoi...' : 'Renvoyer'}</span>
                              </button>
                            )}

                            <button
                              onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                              className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs flex items-center gap-1 border border-white/5 transition-all cursor-pointer"
                              title="Inspecter le payload JSON"
                            >
                              <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                              <span>{isExpanded ? 'Fermer' : 'Détail'}</span>
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          </div>

                        </div>

                        {/* Collapsible JSON payload inspector */}
                        {isExpanded && (
                          <div className="px-4 pb-4 pt-1 border-t border-white/5 bg-black/40 text-xs space-y-2">
                            <div className="flex items-center justify-between text-[11px] text-gray-400 pt-2">
                              <span>Identifiant unique : <strong className="font-mono text-gray-300">{log.id}</strong></span>
                              <span>Dernier essai : <strong className="text-gray-300">{log.lastAttemptAt ? formatFullDateTime(log.lastAttemptAt) : 'N/A'}</strong></span>
                            </div>
                            <div className="bg-[#0b0d17] p-3 rounded-xl border border-white/10 font-mono text-[11px] text-emerald-300 overflow-x-auto max-h-56 scrollbar-thin">
                              <pre>{JSON.stringify(log.payload, null, 2)}</pre>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

            </div>
          )}

          {/* TAB 1: PURE WEB APP - NO APK */}
          {activeTab === 'WEB_APP' && (
            <div className="space-y-5">
              
              {/* Highlight Card: No APK, Pure Web */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-[#131626] to-[#131626] border border-emerald-500/30 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-[11px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" />
                      <span>Technologie Web Pure & Instantanée</span>
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-white">
                      Aucun fichier APK ni Store à installer
                    </h3>
                    <p className="text-xs text-gray-300 max-w-xl">
                      ClubPOS s'exécute directement dans votre navigateur web (Google Chrome, Safari, Microsoft Edge, Firefox, Brave). 
                      Vos données sont automatiquement synchronisées en Cloud et sécurisées en cache local pour le mode hors-ligne.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                    <button
                      onClick={() => copyToClipboard(window.location.href, 'app_url')}
                      className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center justify-center gap-2 border border-white/10 cursor-pointer transition-all active:scale-95"
                    >
                      {copiedStep === 'app_url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
                      <span>{copiedStep === 'app_url' ? 'Lien Web Copié !' : 'Copier l\'adresse Web'}</span>
                    </button>

                    <button
                      id="btn-trigger-pwa-install"
                      onClick={handleInstallApp}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer active:scale-95 transition-all"
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>Ajouter le raccourci Web</span>
                    </button>
                  </div>
                </div>

                {installStatusMsg && (
                  <div className="p-3 rounded-xl bg-black/50 border border-emerald-500/40 text-xs text-emerald-200 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{installStatusMsg}</span>
                  </div>
                )}
              </div>

              {/* Zero APK Guarantees */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-[#141829] border border-white/10 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                    <Ban className="w-4 h-4 text-amber-400" />
                    <span>Pas d'APK / Zéro Fichier Lourd</span>
                  </div>
                  <p className="text-xs text-gray-300">
                    Ne sature pas la mémoire de vos téléphones ou tablettes. Pas de mises à jour manuelles complexes.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#141829] border border-white/10 space-y-2">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
                    <Globe className="w-4 h-4 text-cyan-400" />
                    <span>Universel Tous Écrans</span>
                  </div>
                  <p className="text-xs text-gray-300">
                    Fonctionne sur téléphones Android, iPhone, iPad, tablettes tactiles, PC de caisse Windows et Mac.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#141829] border border-white/10 space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Hors-ligne Automatique</span>
                  </div>
                  <p className="text-xs text-gray-300">
                    Grâce au Service Worker Web standard, la caisse continue d'encaisser même en coupure de réseau.
                  </p>
                </div>
              </div>

              {/* Usage on All Devices */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-gray-400 tracking-wider">
                  Comment ouvrir ClubPOS sur vos appareils :
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  
                  {/* Smartphone Android */}
                  <div className="p-4 rounded-2xl bg-[#141829] border border-white/10 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                      <Smartphone className="w-4 h-4" />
                      <span>Smartphone & Tablette Android</span>
                    </div>
                    <ol className="text-xs text-gray-300 space-y-1.5 list-decimal list-inside">
                      <li>Ouvrez le lien dans <strong>Google Chrome</strong>.</li>
                      <li>Appuyez sur le menu (les 3 points ⋮).</li>
                      <li>Sélectionnez <strong>"Ajouter à l'écran d'accueil"</strong> pour créer un raccourci immédiat.</li>
                    </ol>
                  </div>

                  {/* iPhone & iPad */}
                  <div className="p-4 rounded-2xl bg-[#141829] border border-white/10 space-y-2">
                    <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
                      <Tablet className="w-4 h-4" />
                      <span>iPhone & iPad (Apple)</span>
                    </div>
                    <ol className="text-xs text-gray-300 space-y-1.5 list-decimal list-inside">
                      <li>Ouvrez le lien dans <strong>Safari</strong>.</li>
                      <li>Touchez l'icône de partage <strong>(carré avec flèche ↑)</strong>.</li>
                      <li>Appuyez sur <strong>"Sur l'écran d'accueil"</strong>.</li>
                    </ol>
                  </div>

                  {/* PC & Mac */}
                  <div className="p-4 rounded-2xl bg-[#141829] border border-white/10 space-y-2">
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                      <Laptop className="w-4 h-4" />
                      <span>PC Windows / Mac / Linux</span>
                    </div>
                    <ol className="text-xs text-gray-300 space-y-1.5 list-decimal list-inside">
                      <li>Ouvrez votre navigateur web habituel.</li>
                      <li>Mettez la page en <strong>Favoris</strong> (Ctrl+D / Cmd+D).</li>
                      <li>Appuyez sur <strong>F11</strong> pour passer en plein écran caisse.</li>
                    </ol>
                  </div>

                </div>
              </div>

            </div>
          )}

          {/* TAB 2: BROWSER EXTENSION (Chrome / Edge) */}
          {activeTab === 'EXTENSION' && (
            <div className="space-y-5">
              
              {/* Hero Banner */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-purple-500/10 to-[#131626] border border-amber-500/30 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <Puzzle className="w-3.5 h-3.5" />
                      <span>Extension de Navigateur Optionnelle (Manifest V3)</span>
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-white mt-1">
                      Accédez à la caisse depuis la barre d'outils de votre navigateur
                    </h3>
                    <p className="text-xs text-gray-300 max-w-xl mt-1">
                      Pour les ordinateurs de caisse ou les postes de régie : permet d'ouvrir la caisse en fenêtre autonome ou en volet latéral d'un simple clic.
                    </p>
                  </div>

                  <button
                    id="btn-download-extension-zip"
                    onClick={handleDownloadExtension}
                    disabled={isDownloadingExtension}
                    className="px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isDownloadingExtension ? 'Génération...' : 'Télécharger l\'Extension (.ZIP)'}</span>
                  </button>
                </div>

                {installStatusMsg && (
                  <div className="p-3 rounded-xl bg-black/50 border border-amber-500/40 text-xs text-amber-200 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{installStatusMsg}</span>
                  </div>
                )}
              </div>

              {/* 3 Step Guide */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-400">
                  Comment charger l'extension dans Chrome ou Edge :
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  
                  {/* Step 1 */}
                  <div className="p-4 rounded-2xl bg-[#141829] border border-white/10 flex flex-col justify-between space-y-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-black flex items-center justify-center">1</span>
                        <h5 className="text-xs font-bold text-white">Extraire le ZIP</h5>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        Téléchargez le fichier <strong>.zip</strong> ci-dessus et décompressez-le dans un dossier de votre ordinateur.
                      </p>
                    </div>
                    <div className="text-[11px] text-amber-300 font-mono bg-black/40 px-2 py-1 rounded border border-white/5">
                      ClubPOS_Extension/
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="p-4 rounded-2xl bg-[#141829] border border-white/10 flex flex-col justify-between space-y-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-black flex items-center justify-center">2</span>
                        <h5 className="text-xs font-bold text-white">Ouvrir Extensions</h5>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        Dans votre navigateur, accédez à la page des extensions :
                      </p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-mono bg-black/40 px-2 py-1 rounded border border-white/5">
                        <span>chrome://extensions</span>
                        <button 
                          onClick={() => copyToClipboard('chrome://extensions', 'chrome')}
                          className="text-gray-400 hover:text-white"
                          title="Copier"
                        >
                          {copiedStep === 'chrome' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-mono bg-black/40 px-2 py-1 rounded border border-white/5">
                        <span>edge://extensions</span>
                        <button 
                          onClick={() => copyToClipboard('edge://extensions', 'edge')}
                          className="text-gray-400 hover:text-white"
                          title="Copier"
                        >
                          {copiedStep === 'edge' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="p-4 rounded-2xl bg-[#141829] border border-white/10 flex flex-col justify-between space-y-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-black flex items-center justify-center">3</span>
                        <h5 className="text-xs font-bold text-white">Charger l'extension</h5>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        Activez le <strong>Mode développeur</strong>, puis cliquez sur <strong>"Charger l'extension non empaquetée"</strong> et sélectionnez le dossier extrait.
                      </p>
                    </div>
                    <div className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Prêt à l'emploi</span>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          )}

          {/* TAB 3: OFFLINE STATUS & LOCAL STORAGE */}
          {activeTab === 'OFFLINE_STATUS' && (
            <div className="space-y-5">
              
              {/* Main Status Hero */}
              <div className={`p-4 rounded-2xl border ${
                isOnline
                  ? 'bg-gradient-to-r from-emerald-500/10 via-[#131626] to-[#131626] border-emerald-500/30'
                  : 'bg-gradient-to-r from-amber-500/15 via-[#131626] to-[#131626] border-amber-500/40'
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Connectivité & Résilience Web
                    </div>
                    <div className="text-lg font-black text-white flex items-center gap-2">
                      <span>{isOnline ? '🟢 En Ligne (Synchronisation Firestore Active)' : '⚡ 100% Hors-ligne Actif'}</span>
                    </div>
                    <p className="text-xs text-gray-300">
                      Toutes vos commandes, encaissements FCFA, stocks et impressions thermiques fonctionnent de manière totalement autonome en mémoire web locale.
                    </p>
                  </div>
                  
                  <div className="p-3 rounded-2xl bg-black/40 border border-white/10 text-center shrink-0">
                    <div className="text-xs text-gray-400 font-bold">Service Worker</div>
                    <div className="text-xs font-black text-emerald-400 mt-0.5 flex items-center gap-1 justify-center">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Actif</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Local Storage Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-[#141829] border border-white/5 space-y-1">
                  <div className="text-[11px] text-gray-400 font-semibold uppercase">Tables & Carrés</div>
                  <div className="text-lg font-black text-amber-400">{tables.length} tables</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#141829] border border-white/5 space-y-1">
                  <div className="text-[11px] text-gray-400 font-semibold uppercase">Articles en Stock</div>
                  <div className="text-lg font-black text-cyan-400">{products.length} réf.</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#141829] border border-white/5 space-y-1">
                  <div className="text-[11px] text-gray-400 font-semibold uppercase">Transactions</div>
                  <div className="text-lg font-black text-emerald-400">{payments.length} reçus</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#141829] border border-white/5 space-y-1">
                  <div className="text-[11px] text-gray-400 font-semibold uppercase">Mémoire Locale</div>
                  <div className="text-lg font-black text-purple-400">{offlineState.localStorageSizeKB} KB</div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex flex-wrap gap-2.5">
                <button
                  onClick={exportFullBackupJSON}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-2 cursor-pointer shadow transition-all active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  <span>Exporter Sauvegarde Locale (.JSON)</span>
                </button>

                <button
                  onClick={handleRefreshCache}
                  disabled={isRefreshingCache}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-gray-200 font-bold text-xs flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshingCache ? 'animate-spin text-amber-400' : ''}`} />
                  <span>Forcer la synchronisation du Cache</span>
                </button>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
