import React, { useState } from 'react';
import { 
  Building2, Phone, Mail, MapPin, FileText, 
  Radio, RefreshCw, CheckCircle2, Crown, Sparkles, 
  Flame, Wine, Share2, Edit3, ChevronDown, ChevronUp,
  Database, ShieldCheck, ExternalLink
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { formatFCFA } from '../utils/formatters';

interface CompanyHeaderBannerProps {
  onOpenCompanyProfile: () => void;
  onOpenShareDirector?: () => void;
  onNavigateToDirectorLive?: () => void;
}

export const CompanyHeaderBanner: React.FC<CompanyHeaderBannerProps> = ({
  onOpenCompanyProfile,
  onOpenShareDirector,
  onNavigateToDirectorLive
}) => {
  const { 
    companyProfile, 
    cloudSyncStatus, 
    pendingSyncCount,
    syncAllDataToCloud,
    payments,
    orders,
    products,
    tables,
    stockMovements
  } = usePOS();

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [isCompact, setIsCompact] = useState<boolean>(false);

  const handleSyncAll = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await syncAllDataToCloud();
      if (res.success) {
        setSyncFeedback(`Synchronisation réussie (${res.syncedCount} éléments envoyés au Suivi Directeur)`);
        setTimeout(() => setSyncFeedback(null), 5000);
      } else {
        setSyncFeedback(`Erreur de synchronisation : ${res.error || 'Vérifiez la connexion internet'}`);
        setTimeout(() => setSyncFeedback(null), 6000);
      }
    } catch (err) {
      setSyncFeedback('Erreur lors de la synchronisation.');
      setTimeout(() => setSyncFeedback(null), 5000);
    } finally {
      setIsSyncing(false);
    }
  };

  const renderLogoIcon = () => {
    switch (companyProfile.logoIcon) {
      case 'sparkles':
        return <Sparkles className="w-5 h-5 text-amber-400" />;
      case 'flame':
        return <Flame className="w-5 h-5 text-amber-400" />;
      case 'wine':
      case 'martini':
        return <Wine className="w-5 h-5 text-amber-400" />;
      case 'crown':
      default:
        return <Crown className="w-5 h-5 text-amber-400" />;
    }
  };

  return (
    <div 
      id="company-top-header-banner"
      className="bg-gradient-to-b from-[#101322] via-[#0d101c] to-[#090b12] border-b border-amber-500/20 text-white shadow-xl select-none transition-all"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3">
        {/* Main Header Container */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
          
          {/* Left Column: Logo & Company Identity */}
          <div className="flex items-start gap-3 sm:gap-4">
            {/* Logo or Branded Icon */}
            <div className="relative shrink-0 mt-0.5">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-purple-600 to-indigo-600 p-0.5 shadow-lg shadow-amber-500/20 flex items-center justify-center">
                <div className="w-full h-full bg-[#0d101d] rounded-[14px] flex items-center justify-center overflow-hidden">
                  {companyProfile.logo ? (
                    <img 
                      src={companyProfile.logo} 
                      alt={companyProfile.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    renderLogoIcon()
                  )}
                </div>
              </div>
              <div 
                className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#090b12] flex items-center justify-center"
                title="Établissement actif"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              </div>
            </div>

            {/* Name, Slogan & Badge */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-xl font-black tracking-tight text-white flex items-center gap-1.5 uppercase">
                  <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 bg-clip-text text-transparent truncate max-w-[280px] sm:max-w-[450px]">
                    {companyProfile.name || 'Établissement'}
                  </span>
                </h1>
                <span className="text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {companyProfile.currency || 'FCFA'}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  CODE: {companyProfile.enterpriseCode || 'CLUBPOS'}
                </span>
                <button
                  type="button"
                  onClick={onOpenCompanyProfile}
                  className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-amber-400 transition-colors cursor-pointer"
                  title="Modifier les coordonnées de l'entreprise"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>

              {companyProfile.slogan && (
                <p className="text-xs sm:text-sm text-gray-300 font-medium italic truncate mt-0.5 max-w-[550px]">
                  « {companyProfile.slogan} »
                </p>
              )}

              {/* Fiscal & Coordinates Grid - Desktop and Tablet */}
              {!isCompact && (
                <div className="flex items-center gap-x-4 gap-y-1 flex-wrap mt-1.5 text-[11px] sm:text-xs text-gray-300">
                  {/* RCCM */}
                  {companyProfile.rccm && (
                    <div className="flex items-center gap-1">
                      <FileText className="w-3 h-3 text-amber-400 shrink-0" />
                      <span className="font-semibold text-gray-400">RCCM :</span>
                      <span className="font-mono text-white">{companyProfile.rccm}</span>
                    </div>
                  )}

                  {/* NIF */}
                  {companyProfile.nif && (
                    <div className="flex items-center gap-1">
                      <FileText className="w-3 h-3 text-amber-400 shrink-0" />
                      <span className="font-semibold text-gray-400">NIF :</span>
                      <span className="font-mono text-white">{companyProfile.nif}</span>
                    </div>
                  )}

                  {/* Téléphone */}
                  {companyProfile.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span className="font-mono text-white">{companyProfile.phone}</span>
                    </div>
                  )}

                  {/* Email */}
                  {companyProfile.email && (
                    <div className="flex items-center gap-1 hidden md:flex">
                      <Mail className="w-3 h-3 text-cyan-400 shrink-0" />
                      <span className="text-gray-300">{companyProfile.email}</span>
                    </div>
                  )}

                  {/* Adresse / Ville */}
                  {(companyProfile.address || companyProfile.cityCountry) && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                      <span className="text-gray-300 truncate max-w-[220px]">
                        {[companyProfile.address, companyProfile.cityCountry].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Live Sync & Director Live Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-white/10">
            
            {/* Live Sync Status Pill */}
            <div className="flex items-center justify-between sm:justify-start gap-2 bg-[#161a2e] px-3 py-1.5 rounded-xl border border-white/10">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse shrink-0" />
                <div className="text-left">
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    Suivi & Live Directeur
                  </div>
                  <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>SYNCHRO CLOUD ACTIVE</span>
                  </div>
                </div>
              </div>

              {pendingSyncCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-black animate-pulse" title="Modifications en cours d'envoi">
                  {pendingSyncCount}
                </span>
              )}
            </div>

            {/* Sync All Button */}
            <button
              type="button"
              id="btn-sync-all-data-director"
              onClick={handleSyncAll}
              disabled={isSyncing}
              title="Transmettre immédiatement tous les produits, tables, commandes, encaissements et stocks vers le Suivi Directeur"
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                isSyncing 
                  ? 'bg-amber-500/30 text-amber-200 border border-amber-500/50 cursor-wait' 
                  : 'bg-gradient-to-r from-amber-500/20 via-cyan-500/20 to-emerald-500/20 hover:from-amber-500/30 hover:to-emerald-500/30 border border-amber-500/40 text-amber-200 hover:text-white'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Synchronisation...' : 'Synchroniser Tout en Direct'}</span>
            </button>

            {/* Quick Link to Director Live */}
            {onNavigateToDirectorLive && (
              <button
                type="button"
                id="btn-quick-goto-director-live"
                onClick={onNavigateToDirectorLive}
                className="px-3 py-2 rounded-xl bg-gradient-to-r from-rose-600/30 to-amber-600/30 hover:from-rose-600/40 hover:to-amber-600/40 border border-rose-500/40 text-rose-200 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                title="Accéder au tableau de bord Live Directeur"
              >
                <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                <span>Live Directeur</span>
              </button>
            )}

            {/* Share Director Link Modal Button */}
            {onOpenShareDirector && (
              <button
                type="button"
                id="btn-quick-share-director-link"
                onClick={onOpenShareDirector}
                className="p-2 rounded-xl bg-[#161a2e] hover:bg-[#1f2440] border border-white/10 text-gray-300 hover:text-white transition-all flex items-center justify-center cursor-pointer"
                title="Partager le lien d'accès en direct pour le Directeur"
              >
                <Share2 className="w-4 h-4 text-amber-400" />
              </button>
            )}

            {/* Toggle compact on mobile */}
            <button
              type="button"
              onClick={() => setIsCompact(!isCompact)}
              className="p-2 rounded-xl bg-[#161a2e] hover:bg-[#1f2440] border border-white/10 text-gray-400 hover:text-white transition-all flex sm:hidden items-center justify-center cursor-pointer"
              title={isCompact ? "Afficher les détails fiscaux et coordonnées" : "Masquer les détails"}
            >
              {isCompact ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>

          </div>

        </div>

        {/* Sync Success or Error Banner Feedback */}
        {syncFeedback && (
          <div className="mt-2 py-1 px-3 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{syncFeedback}</span>
            </div>
            <button
              type="button"
              onClick={() => setSyncFeedback(null)}
              className="text-gray-400 hover:text-white text-xs cursor-pointer ml-2"
            >
              ✕
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
