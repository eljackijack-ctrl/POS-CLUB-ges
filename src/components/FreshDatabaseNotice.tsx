import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Database, PackagePlus, Building2, 
  CheckCircle2, ArrowRight, X, Info, Wine, 
  HelpCircle, ChevronRight, AlertCircle, RefreshCw
} from 'lucide-react';
import { usePOS } from '../context/POSContext';

interface FreshDatabaseNoticeProps {
  onNavigateToStock: () => void;
  onOpenCompanyProfile: () => void;
  onStartFirstOrder?: () => void;
}

export const FreshDatabaseNotice: React.FC<FreshDatabaseNoticeProps> = ({
  onNavigateToStock,
  onOpenCompanyProfile,
  onStartFirstOrder
}) => {
  const { 
    products, 
    payments, 
    orders, 
    stockMovements, 
    companyProfile, 
    tables,
    currentUser
  } = usePOS();

  const totalStockUnits = products.reduce((acc, p) => acc + (p.currentStock || 0), 0);
  const isFresh = payments.length === 0 && orders.length === 0 && totalStockUnits === 0 && stockMovements.length === 0;

  const [isBannerDismissed, setIsBannerDismissed] = useState<boolean>(false);
  const [showToast, setShowToast] = useState<boolean>(false);

  // Trigger toast on mount when database is completely empty
  useEffect(() => {
    if (isFresh) {
      const timer = setTimeout(() => {
        setShowToast(true);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isFresh]);

  if (!isFresh) {
    return null;
  }

  return (
    <>
      {/* 1. VISUAL DASHBOARD BANNER */}
      {!isBannerDismissed ? (
        <div 
          id="fresh-database-banner"
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950/70 via-[#111c24] to-[#131625] border border-emerald-500/40 p-4 sm:p-5 shadow-xl shadow-emerald-950/30 text-gray-200 transition-all animate-fadeIn"
        >
          {/* Subtle glowing background accents */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Left Content info */}
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Base de données vierge & prête
                </span>

                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/5 text-gray-300 border border-white/10">
                  <Database className="w-3 h-3 text-cyan-400" />
                  Initialisation à 0 (0 vente / 0 stock)
                </span>
              </div>

              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
                <span>Prêt pour votre première utilisation, {currentUser.name} !</span>
              </h2>

              <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                Toutes les ventes, commandes et stocks démarrent à <strong>zéro</strong>. 
                Configurez les détails de votre établissement et saisissez vos approvisionnements de boissons pour démarrer le service.
              </p>
            </div>

            {/* Right Action buttons */}
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              
              <button
                id="btn-fresh-guide-stock"
                onClick={onNavigateToStock}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
              >
                <PackagePlus className="w-4 h-4" />
                <span>Approvisionner le stock</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <button
                id="btn-fresh-guide-company"
                onClick={onOpenCompanyProfile}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs border border-white/20 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
              >
                <Building2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Profil Établissement</span>
              </button>

              <button
                id="btn-dismiss-fresh-banner"
                onClick={() => setIsBannerDismissed(true)}
                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Masquer la bannière"
                aria-label="Masquer la bannière"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mini 3-Step Setup Roadmap */}
          <div className="mt-4 pt-3.5 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div 
              onClick={onOpenCompanyProfile}
              className="flex items-center gap-2.5 p-2 rounded-xl bg-black/20 hover:bg-black/40 border border-white/5 cursor-pointer transition-colors"
            >
              <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0">
                1
              </div>
              <div className="min-w-0">
                <div className="font-bold text-white text-[11px] truncate">Nom & Ticket Caisse</div>
                <div className="text-[10px] text-gray-400 truncate">{companyProfile.name || 'À personnaliser'}</div>
              </div>
            </div>

            <div 
              onClick={onNavigateToStock}
              className="flex items-center gap-2.5 p-2 rounded-xl bg-black/20 hover:bg-black/40 border border-white/5 cursor-pointer transition-colors"
            >
              <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                2
              </div>
              <div className="min-w-0">
                <div className="font-bold text-white text-[11px] truncate">Entrée de Stock Initial</div>
                <div className="text-[10px] text-gray-400 truncate">0 bouteille en réserve</div>
              </div>
            </div>

            <div 
              onClick={onStartFirstOrder}
              className="flex items-center gap-2.5 p-2 rounded-xl bg-black/20 hover:bg-black/40 border border-white/5 cursor-pointer transition-colors"
            >
              <div className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs shrink-0">
                3
              </div>
              <div className="min-w-0">
                <div className="font-bold text-white text-[11px] truncate">Prendre les Commandes</div>
                <div className="text-[10px] text-gray-400 truncate">{tables.length} tables prêtes</div>
              </div>
            </div>
          </div>

        </div>
      ) : (
        /* Reduced Recall Pill when user dismissed banner */
        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold">Base de données vierge (compteurs à 0)</span>
          </div>
          <button
            onClick={() => setIsBannerDismissed(false)}
            className="text-[11px] text-emerald-300 hover:text-white underline font-bold cursor-pointer"
          >
            Réafficher le guide
          </button>
        </div>
      )}

      {/* 2. POPUP TOAST NOTIFICATION */}
      {showToast && (
        <div 
          id="fresh-database-toast"
          className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-[#131b25] border border-emerald-500/50 rounded-2xl p-4 shadow-2xl shadow-black/80 text-white animate-bounce-short transition-all"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
              <Sparkles className="w-5 h-5" />
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-black uppercase text-emerald-400 tracking-wider">
                  Info Serveur & Bar
                </span>
                <button
                  onClick={() => setShowToast(false)}
                  className="text-gray-400 hover:text-white transition-colors cursor-pointer p-0.5"
                  title="Fermer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <h4 className="text-sm font-bold text-white">
                Base vierge & prête à l'emploi
              </h4>
              <p className="text-xs text-gray-300 leading-relaxed">
                Les stocks et ventes sont à zéro. Cliquez ci-dessous pour saisir les entrées de stock ou personnaliser le club.
              </p>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => {
                    setShowToast(false);
                    onNavigateToStock();
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                >
                  <PackagePlus className="w-3.5 h-3.5" />
                  <span>Approvisionner</span>
                </button>

                <button
                  onClick={() => setShowToast(false)}
                  className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-gray-300 font-semibold text-xs cursor-pointer transition-colors"
                >
                  J'ai compris
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
