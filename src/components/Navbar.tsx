import React, { useState, useEffect } from 'react';
import { 
  Wine, Users, Coffee, Package, BarChart3, 
  Volume2, VolumeX, Printer, FileCode, Shield, 
  Sparkles, KeyRound, UserPlus, Building2, Bluetooth,
  Wifi, WifiOff, Download, Settings2, History, Receipt, Database,
  Puzzle, Globe, Laptop, Radio, Share2, HardDrive
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { UserRole } from '../types';
import { offlineSyncManager, OfflineStatusState } from '../services/offlineSync';

export type AppTabType = 'TABLES' | 'ORDER' | 'KDS_BAR' | 'STOCK' | 'TRANSACTIONS' | 'REPORTS' | 'ARCHITECTURE' | 'DIRECTOR_LIVE';

interface NavbarProps {
  currentTab: AppTabType;
  setCurrentTab: (tab: AppTabType) => void;
  onOpenAuth: () => void;
  onOpenPrinterModal: () => void;
  onOpenStartupProfile: () => void;
  onOpenCompanyProfile: () => void;
  onOpenPrinterSettings: () => void;
  onOpenOfflineModal: () => void;
  onOpenShareDirector: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  onOpenAuth,
  onOpenPrinterModal,
  onOpenStartupProfile,
  onOpenCompanyProfile,
  onOpenPrinterSettings,
  onOpenOfflineModal,
  onOpenShareDirector
}) => {
  const { 
    currentUser, 
    orders, 
    isSoundEnabled, 
    toggleSound, 
    printerConfig,
    companyProfile,
    products,
    payments,
    cloudSyncStatus,
    pendingSyncCount,
    deviceSignature,
    setShowDeviceStationModal,
    setShowEnterpriseModal,
    setShowDiskBackupModal,
    diskBackupFiles,
    diskBackupConfig
  } = usePOS();

  const [offlineState, setOfflineState] = useState<OfflineStatusState>(offlineSyncManager.getState());

  useEffect(() => {
    const unsub = offlineSyncManager.subscribe(setOfflineState);
    return () => unsub();
  }, []);

  // Calculate pending items for Barman KDS badge
  const pendingOrdersCount = orders.filter(o => o.status === 'PREPARATION' || o.status === 'ACTIVE').length;
  const lowStockCount = products.filter(p => p.currentStock <= p.minStockThreshold).length;

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'SERVEUR':
        return { label: 'Serveur', bg: 'bg-blue-500/20 text-blue-300 border-blue-500/40' };
      case 'BARMAN':
        return { label: 'Barman', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
      case 'MANAGER':
        return { label: 'Manager / Caisse', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
      case 'ADMIN':
        return { label: 'Direction', bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40' };
    }
  };

  const badge = getRoleBadge(currentUser.role);

  return (
    <header className="sticky top-0 z-40 bg-[#0c0e17]/95 backdrop-blur-md border-b border-white/10 text-white select-none shadow-xl">
      {/* Top Header Row: Brand & Quick System Tools */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-2.5 pb-2 border-b border-white/5">
        <div className="flex items-center justify-between gap-2">
          
          {/* Brand & Nightclub Title */}
          <div className="flex items-center gap-3">
            <button 
              id="brand-home-btn"
              onClick={() => setCurrentTab('TABLES')}
              className="flex items-center gap-2.5 group text-left cursor-pointer"
            >
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-amber-500 via-purple-600 to-indigo-600 p-[1.5px] shadow-lg shadow-amber-500/20 shrink-0">
                <div className="w-full h-full bg-[#0c0e17] rounded-[10px] flex items-center justify-center overflow-hidden">
                  <img
                    src={companyProfile.logo || "/clubpos-logo.png"}
                    alt="ClubPOS Logo"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      // Fallback to svg/icon if image loading error
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black tracking-wider text-base sm:text-lg bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 bg-clip-text text-transparent truncate max-w-[170px] sm:max-w-[260px]">
                    {companyProfile.name || 'CLUB POS'}
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    FCFA
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 hidden sm:block truncate max-w-[280px]">
                  {companyProfile.slogan || 'Caisse, Bar & Tables • Nightclub POS'}
                </p>
              </div>
            </button>
          </div>

          {/* Quick Tools & Active Staff Badge */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            
            {/* Cloud Firestore Database Indicator */}
            <button
              id="btn-cloud-db-status"
              onClick={onOpenOfflineModal}
              title={
                cloudSyncStatus === 'CONNECTED'
                  ? `Base de données Cloud Firestore connectée (${pendingSyncCount} en attente)`
                  : "Base de données Cloud en cours de synchronisation"
              }
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold bg-[#161926] border-cyan-500/30 text-cyan-300 hover:border-cyan-400 cursor-pointer transition-all"
            >
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden lg:inline">Cloud Firestore</span>
              {pendingSyncCount > 0 ? (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-500 text-black animate-pulse">
                  {pendingSyncCount}
                </span>
              ) : (
                <span className={`w-2 h-2 rounded-full ${cloudSyncStatus === 'CONNECTED' ? 'bg-cyan-400 shadow-sm shadow-cyan-400 animate-pulse' : 'bg-amber-400'}`} />
              )}
            </button>

            {/* 100% Web App & Offline Hub Button */}
            <button
              id="btn-open-install-extension-hub"
              onClick={onOpenOfflineModal}
              title="Application 100% Web (Zéro APK requis) - Mode Hors-ligne & Accès Universel"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-all bg-gradient-to-r from-emerald-500/15 via-[#161926] to-[#161926] border-emerald-500/40 text-emerald-300 hover:border-emerald-400 hover:bg-emerald-500/20 shadow-sm"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">
                App Web
              </span>
              <span className="text-[10px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                100% Web
              </span>
              {offlineState.isOnline ? (
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" title="En ligne & Cache prêt" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" title="100% Hors-ligne" />
              )}
            </button>

            {/* Device Station & MAC/IP Identification Quick Button */}
            <button
              id="btn-device-station-config"
              onClick={() => setShowDeviceStationModal(true)}
              title={`Identification Terminal • MAC: ${deviceSignature?.macAddress || 'N/A'} • IP: ${deviceSignature?.ipAddress || 'N/A'}`}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#161926] border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 text-xs font-bold cursor-pointer transition-all shadow-sm"
            >
              <Laptop className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden xl:inline font-mono text-[11px]">
                {deviceSignature?.macAddress ? `${deviceSignature.macAddress.substring(0, 8)}...` : 'Station'}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" title="Station Active & Identifiée" />
            </button>

            {/* Multi-Enterprise & Sharing Selector Button */}
            <button
              id="btn-enterprise-switcher"
              onClick={() => setShowEnterpriseModal(true)}
              title={`Établissement actif : ${companyProfile.name} (Code: ${companyProfile.enterpriseCode || 'CLUBPOS'}) • Cliquez pour partager ou créer un nouvel établissement`}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-900/30 via-[#161926] to-[#161926] border border-purple-500/40 hover:border-purple-400 text-purple-300 text-xs font-bold cursor-pointer transition-all shadow-sm"
            >
              <Building2 className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden xl:inline truncate max-w-[130px]">
                {companyProfile.name}
              </span>
              <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-200 font-mono text-[10px] border border-purple-500/30">
                {companyProfile.enterpriseCode || 'CLUBPOS'}
              </span>
            </button>

            {/* Company Profile Quick Button */}
            <button
              id="btn-company-profile"
              onClick={onOpenCompanyProfile}
              title="Profil & Identité Entreprise (En-tête Facture)"
              className="p-2 rounded-lg bg-[#161926] border border-amber-500/30 text-amber-300 hover:text-amber-200 hover:bg-amber-500/10 transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold"
            >
              <Building2 className="w-4 h-4 text-amber-400" />
              <span className="hidden xl:inline">Profil Entreprise</span>
            </button>

            {/* Bluetooth Thermal Printer Status */}
            <button
              id="btn-printer-status"
              onClick={onOpenPrinterSettings}
              title="Configurer l'imprimante Bluetooth ESC/POS"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#161926] border border-cyan-500/30 hover:border-cyan-400/60 text-gray-200 hover:text-white text-xs font-medium cursor-pointer transition-all"
            >
              <Bluetooth className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline font-mono">{printerConfig.paperWidth}mm</span>
              <span className={`w-2 h-2 rounded-full ${printerConfig.isConnected ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-rose-400'}`} />
            </button>

            {/* Local Disk .JSON Backup Folder Button */}
            <button
              id="btn-nav-disk-backup"
              onClick={() => setShowDiskBackupModal(true)}
              title={`Dossier de Sauvegarde Automatique .JSON • Fréquence: ${diskBackupConfig.intervalMinutes === 1 ? 'Chaque minute (60s)' : `${diskBackupConfig.intervalMinutes} min`} • ${diskBackupFiles.length} fichier(s)`}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#161926] border border-cyan-500/30 hover:border-cyan-400/60 text-cyan-300 hover:text-white text-xs font-semibold cursor-pointer transition-all"
            >
              <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden xl:inline">Dossier .JSON</span>
              {diskBackupConfig.autoBackupEnabled && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse" title="Sauvegarde automatique active chaque minute" />
              )}
              {diskBackupFiles.length > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono font-bold">
                  {diskBackupFiles.length}
                </span>
              )}
            </button>

            {/* Sound Toggle */}
            <button
              id="btn-toggle-sound"
              onClick={toggleSound}
              title={isSoundEnabled ? "Son activé (Bip & Cloche Bar)" : "Son désactivé"}
              className="p-2 rounded-lg bg-[#161926] border border-white/10 text-gray-300 hover:text-white hover:border-white/20 transition-all cursor-pointer hidden sm:block"
            >
              {isSoundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-gray-500" />}
            </button>

            {/* Share Director Live Link Button */}
            <button
              id="btn-nav-share-director"
              onClick={onOpenShareDirector}
              title="Partager le lien d'accès en direct pour le Directeur (Smartphone & Web)"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-amber-600/20 hover:from-amber-500/30 hover:to-rose-500/30 border border-amber-500/40 text-amber-300 hover:text-white text-xs font-black cursor-pointer transition-all shadow-sm group"
            >
              <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse group-hover:scale-110 transition-transform" />
              <span className="hidden lg:inline">Suivi Directeur</span>
              <Share2 className="w-3 h-3 text-amber-400" />
            </button>

            {/* User Profile / PIN Switcher & Add Profile */}
            <div className="flex items-center gap-1.5">
              <button
                id="btn-switch-user-pin"
                onClick={onOpenAuth}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl bg-[#161926] border border-white/10 hover:border-amber-500/40 transition-all cursor-pointer group"
                title="Changer de session PIN"
              >
                <div 
                  className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs text-white shadow"
                  style={{ backgroundColor: currentUser.avatarColor }}
                >
                  {currentUser.name.charAt(0)}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-semibold text-white group-hover:text-amber-300 transition-colors flex items-center gap-1">
                    {currentUser.name}
                    <KeyRound className="w-3 h-3 text-gray-400" />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`text-[9px] font-bold px-1 py-0.2 rounded border ${badge.bg}`}>
                      {badge.label}
                    </span>
                  </div>
                </div>
              </button>

              <button
                id="btn-open-startup-profiles"
                onClick={onOpenStartupProfile}
                title="Régler toutes les options au démarrage & profils staff"
                className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-sm"
              >
                <Settings2 className="w-4 h-4 text-amber-400" />
                <span className="hidden md:inline">Options Démarrage</span>
              </button>
            </div>

          </div>

        </div>
      </div>

      {/* Dedicated Navigation Bar: Moved slightly down with enhanced spacing & badges */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2">
        <nav className="flex items-center justify-between sm:justify-start gap-1 sm:gap-2 bg-[#121524] p-1.5 rounded-2xl border border-white/10 overflow-x-auto scrollbar-thin shadow-inner">
          <button
            id="nav-tab-tables"
            onClick={() => setCurrentTab('TABLES')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              currentTab === 'TABLES'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30 scale-[1.02]'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Salle & Tables</span>
          </button>

          <button
            id="nav-tab-bar"
            onClick={() => setCurrentTab('KDS_BAR')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all relative cursor-pointer whitespace-nowrap ${
              currentTab === 'KDS_BAR'
                ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/30 scale-[1.02]'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Coffee className="w-4 h-4" />
            <span>Écran Barman (KDS)</span>
            {pendingOrdersCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse shadow">
                {pendingOrdersCount}
              </span>
            )}
          </button>

          <button
            id="nav-tab-stock"
            onClick={() => setCurrentTab('STOCK')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              currentTab === 'STOCK'
                ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30 scale-[1.02]'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Stock & Cave</span>
            {lowStockCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            )}
          </button>

          <button
            id="nav-tab-transactions"
            onClick={() => setCurrentTab('TRANSACTIONS')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              currentTab === 'TRANSACTIONS'
                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 scale-[1.02]'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Receipt className="w-4 h-4 text-indigo-300" />
            <span>Historique Ventes</span>
            {payments && payments.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-indigo-950 text-indigo-200 border border-indigo-400/40">
                {payments.length}
              </span>
            )}
          </button>

          <button
            id="nav-tab-reports"
            onClick={() => setCurrentTab('REPORTS')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              currentTab === 'REPORTS'
                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 scale-[1.02]'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Rapports & Z</span>
          </button>

          <button
            id="nav-tab-director-live"
            onClick={() => setCurrentTab('DIRECTOR_LIVE')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              currentTab === 'DIRECTOR_LIVE'
                ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/30 scale-[1.02] font-black'
                : 'text-amber-300 hover:text-white hover:bg-amber-500/10 border border-amber-500/30'
            }`}
          >
            <Radio className="w-4 h-4 text-rose-400 animate-pulse" />
            <span>Directeur Live</span>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-rose-500 text-white animate-pulse">
              DIRECT
            </span>
          </button>

          <button
            id="nav-tab-architecture"
            onClick={() => setCurrentTab('ARCHITECTURE')}
            className={`hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              currentTab === 'ARCHITECTURE'
                ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/30 scale-[1.02]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>APK & Docs</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
