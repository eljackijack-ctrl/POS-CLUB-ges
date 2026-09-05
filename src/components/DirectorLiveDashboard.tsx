import React, { useState, useEffect, useMemo } from 'react';
import { 
  Radio, TrendingUp, DollarSign, Receipt, Users, Clock, 
  Smartphone, Share2, Download, RefreshCw, ShieldCheck, 
  AlertTriangle, Flame, Wine, ChevronRight, ArrowUpRight, 
  Sparkles, CheckCircle2, Building2, Bell, BellOff, Filter,
  Layers, BarChart3, PieChart, ShoppingBag, Eye, EyeOff, LogOut,
  ExternalLink, Printer, Search, Calendar, Zap, SmartphoneNfc,
  Package, Check, ArrowDownRight, RotateCcw, AlertCircle,
  KeyRound, Lock, Unlock, Key, Delete
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { Payment, Product, PaymentMethod } from '../types';
import { PRODUCT_CATEGORIES } from '../data/initialData';
import { formatFCFA } from '../utils/formatters';
import { exportDailyZReportPDF } from '../utils/pdfGenerator';
import { ShareDirectorModal } from './ShareDirectorModal';
import { ResetSalesHistoryModal } from './ResetSalesHistoryModal';
import { ThermalReceiptModal } from './ThermalReceiptModal';
import { ChangeDirectorPasswordModal } from './ChangeDirectorPasswordModal';

interface PaymentMethodInfo {
  label: string;
  count: number;
  totalFCFA: number;
  color: string;
  badgeColor: string;
}

interface DirectorLiveDashboardProps {
  onBackToPOS?: () => void;
  isStandalone?: boolean;
}

export const DirectorLiveDashboard: React.FC<DirectorLiveDashboardProps> = ({
  onBackToPOS,
  isStandalone = false
}) => {
  const { 
    currentUser,
    setCurrentUser,
    verifyDirectorPin,
    getDirectorUser,
    payments, 
    products, 
    categories,
    companyProfile, 
    shiftStartTime,
    getDailyReport,
    soundManager
  } = usePOS();

  // Authentication Lock state: If user is ADMIN, already unlocked; otherwise check URL or lock
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    if (currentUser.role === 'ADMIN') return true;
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const pinParam = urlParams.get('pin');
      if (pinParam && verifyDirectorPin(pinParam)) {
        return true;
      }
    }
    return false;
  });

  const [pinEntry, setPinEntry] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [showPinMask, setShowPinMask] = useState<boolean>(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState<boolean>(false);

  // The 2 exclusive Live Director tabs: Sales History & Stock
  const [activeTab, setActiveTab] = useState<'SALES_HISTORY' | 'LIVE_STOCK'>('SALES_HISTORY');
  const [timeFilter, setTimeFilter] = useState<'SHIFT' | 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH' | 'ALL'>('SHIFT');
  
  // Stock category filter
  const [selectedStockCategory, setSelectedStockCategory] = useState<string>('ALL');
  const [stockSearchQuery, setStockSearchQuery] = useState<string>('');
  const [stockFilterType, setStockFilterType] = useState<'ALL' | 'LOW' | 'IN_STOCK'>('ALL');

  // Modals
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<Payment | null>(null);

  // Live Sound & Clock
  const [liveSound, setLiveSound] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<string>(new Date().toLocaleTimeString('fr-FR'));
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [lastPaymentCount, setLastPaymentCount] = useState<number>(payments.length);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('fr-FR'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Detect incoming new payments in real-time and trigger live sound indicator
  useEffect(() => {
    if (payments.length > lastPaymentCount) {
      if (liveSound && soundManager) {
        soundManager.playCashRegister();
      }
      setLastPaymentCount(payments.length);
    }
  }, [payments.length, lastPaymentCount, liveSound, soundManager]);

  // Filtered Payments based on timeframe
  const filteredPayments = useMemo(() => {
    const now = new Date();
    const shiftStart = new Date(shiftStartTime);

    return payments.filter(p => {
      const pDate = new Date(p.timestamp);

      if (timeFilter === 'SHIFT') {
        return pDate >= shiftStart;
      }
      if (timeFilter === 'TODAY') {
        return pDate.toDateString() === now.toDateString();
      }
      if (timeFilter === 'YESTERDAY') {
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        return pDate.toDateString() === yesterday.toDateString();
      }
      if (timeFilter === 'WEEK') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return pDate >= sevenDaysAgo;
      }
      if (timeFilter === 'MONTH') {
        return pDate.getMonth() === now.getMonth() && pDate.getFullYear() === now.getFullYear();
      }
      return true; // ALL
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [payments, timeFilter, shiftStartTime]);

  // Key Financial KPIs
  const totalRevenueFCFA = useMemo(() => {
    return filteredPayments.reduce((sum, p) => sum + p.totalPaidFCFA, 0);
  }, [filteredPayments]);

  const totalTransactionsCount = filteredPayments.length;

  const averageTicketFCFA = useMemo(() => {
    if (totalTransactionsCount === 0) return 0;
    return Math.round(totalRevenueFCFA / totalTransactionsCount);
  }, [totalRevenueFCFA, totalTransactionsCount]);

  // Payment Breakdown
  const paymentBreakdown = useMemo(() => {
    const methods: Record<string, { label: string; count: number; totalFCFA: number; color: string; badgeColor: string }> = {
      ESPECES: { label: 'Espèces (Cash)', count: 0, totalFCFA: 0, color: 'bg-emerald-500', badgeColor: 'text-emerald-400' },
      CARTE_BANCAIRE: { label: 'Carte Bancaire (TPE)', count: 0, totalFCFA: 0, color: 'bg-blue-500', badgeColor: 'text-blue-400' },
      WAVE: { label: 'Wave Mobile Money', count: 0, totalFCFA: 0, color: 'bg-cyan-500', badgeColor: 'text-cyan-400' },
      ORANGE_MONEY: { label: 'Orange Money', count: 0, totalFCFA: 0, color: 'bg-amber-500', badgeColor: 'text-amber-400' },
      MTN_MOMO: { label: 'MTN MoMo', count: 0, totalFCFA: 0, color: 'bg-yellow-500', badgeColor: 'text-yellow-400' },
      TMONEY: { label: 'T-Money', count: 0, totalFCFA: 0, color: 'bg-indigo-500', badgeColor: 'text-indigo-400' },
      FLOOZ: { label: 'Moov Flooz', count: 0, totalFCFA: 0, color: 'bg-purple-500', badgeColor: 'text-purple-400' }
    };

    filteredPayments.forEach(p => {
      const key = p.paymentMethod || 'ESPECES';
      if (methods[key]) {
        methods[key].count += 1;
        methods[key].totalFCFA += p.totalPaidFCFA;
      }
    });

    return methods;
  }, [filteredPayments]);

  const cashTotalFCFA = paymentBreakdown.ESPECES?.totalFCFA || 0;
  const digitalTotalFCFA = totalRevenueFCFA - cashTotalFCFA;

  // Stock Metrics
  const totalStockBottles = useMemo(() => {
    return products.reduce((acc, p) => acc + p.currentStock, 0);
  }, [products]);

  const totalStockValueFCFA = useMemo(() => {
    return products.reduce((acc, p) => acc + (p.currentStock * p.priceFCFA), 0);
  }, [products]);

  const lowStockProducts = useMemo(() => {
    return products.filter(p => p.currentStock <= p.minStockThreshold).sort((a, b) => a.currentStock - b.currentStock);
  }, [products]);

  // Filtered Products for Live Stock Tab
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Category filter
      if (selectedStockCategory !== 'ALL' && p.category !== selectedStockCategory) {
        return false;
      }
      // Status filter
      if (stockFilterType === 'LOW' && p.currentStock > p.minStockThreshold) {
        return false;
      }
      if (stockFilterType === 'IN_STOCK' && p.currentStock <= p.minStockThreshold) {
        return false;
      }
      // Search query
      if (stockSearchQuery.trim()) {
        const q = stockSearchQuery.toLowerCase();
        return p.name.toLowerCase().includes(q) || (p.categoryName || p.category).toLowerCase().includes(q);
      }
      return true;
    }).sort((a, b) => {
      // Prioritize low stock items first
      if (a.currentStock <= a.minStockThreshold && b.currentStock > b.minStockThreshold) return -1;
      if (b.currentStock <= b.minStockThreshold && a.currentStock > a.minStockThreshold) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [products, selectedStockCategory, stockFilterType, stockSearchQuery]);

  // Handle Export PDF
  const handleExportPDF = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const report = getDailyReport(todayStr);
    exportDailyZReportPDF(report, companyProfile, todayStr);
  };

  const getMethodLabel = (method: PaymentMethod) => {
    switch (method) {
      case 'ESPECES': return 'Espèces';
      case 'CARTE_BANCAIRE': return 'Carte Bancaire';
      case 'WAVE': return 'Wave';
      case 'ORANGE_MONEY': return 'Orange Money';
      case 'MTN_MOMO': return 'MTN MoMo';
      case 'TMONEY': return 'T-Money';
      case 'FLOOZ': return 'Flooz';
      default: return 'Paiement';
    }
  };

  const handleUnlockWithPin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pinEntry) {
      setPinError('Veuillez saisir votre mot de passe.');
      soundManager?.playAlert();
      return;
    }
    if (verifyDirectorPin(pinEntry)) {
      setIsUnlocked(true);
      setPinError(null);
      setPinEntry('');
      soundManager?.playSuccessTone();
      const adminUser = getDirectorUser();
      if (adminUser && currentUser.role !== 'ADMIN') {
        setCurrentUser(adminUser);
      }
    } else {
      setPinError('Mot de passe incorrect. Accès refusé.');
      soundManager?.playAlert();
      setPinEntry('');
    }
  };

  const handleKeypadPress = (d: string) => {
    setPinError(null);
    if (pinEntry.length < 12) {
      setPinEntry(prev => prev + d);
    }
  };

  const handleKeypadBackspace = () => {
    setPinError(null);
    setPinEntry(prev => prev.slice(0, -1));
  };

  return (
    <div className="min-h-screen bg-[#070911] text-gray-100 flex flex-col font-sans pb-16">
      
      {/* Top Directrice / Director Executive Header */}
      <header className="sticky top-0 z-40 bg-[#0d101c]/95 backdrop-blur-md border-b border-amber-500/30 px-4 sm:px-6 py-3.5 shadow-xl shadow-black/60">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3.5">
          
          {/* Brand & Live Pulse */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 p-0.5 shadow-lg shadow-amber-500/20 shrink-0">
              <div className="w-full h-full bg-[#0d101c] rounded-[14px] flex items-center justify-center">
                <Radio className="w-6 h-6 text-amber-400 animate-pulse" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Vue Directrice en Direct
                </span>
                
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>SYNCHRO CLOUD LIVE</span>
                </span>

                <span className="text-xs font-mono font-bold text-gray-400">
                  {currentTime}
                </span>
              </div>

              <h1 className="text-base sm:text-lg font-black text-white flex items-center gap-2 mt-0.5">
                <span>{companyProfile.name || 'Club VIP & Lounge'}</span>
                {companyProfile.city && (
                  <span className="text-xs text-gray-400 font-normal">({companyProfile.city})</span>
                )}
              </h1>
            </div>
          </div>

          {/* Action Buttons & Quick Tools */}
          <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
            
            {/* Live Sound Alert Toggle */}
            <button
              type="button"
              onClick={() => setLiveSound(!liveSound)}
              title={liveSound ? 'Son des encaissements activé' : 'Son coupé'}
              className={`p-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                liveSound 
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' 
                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
              }`}
            >
              {liveSound ? <Bell className="w-4 h-4 text-amber-400" /> : <BellOff className="w-4 h-4 text-gray-400" />}
              <span className="hidden sm:inline">Bip Vente</span>
            </button>

            {/* Change Director Password Button */}
            <button
              type="button"
              id="btn-director-change-password-top"
              onClick={() => setIsChangePasswordModalOpen(true)}
              className="px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 hover:text-white font-bold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
              title="Modifier le mot de passe confidentiel / code PIN Direction"
            >
              <KeyRound className="w-4 h-4 text-amber-400" />
              <span>Mot de Passe</span>
            </button>

            {/* Share Director Link Button */}
            <button
              type="button"
              id="btn-share-director-top"
              onClick={() => setIsShareModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
            >
              <Share2 className="w-4 h-4" />
              <span>Partager le Lien Directrice</span>
            </button>

            {/* Export PDF Button */}
            <button
              type="button"
              onClick={handleExportPDF}
              className="px-3 py-2 rounded-xl bg-[#151a2d] border border-white/15 hover:border-white/30 text-gray-200 hover:text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Rapport Z (PDF)</span>
            </button>

            {/* Reset Sales Button (Director Exclusive) */}
            <button
              type="button"
              id="btn-director-reset-sales"
              onClick={() => setIsResetModalOpen(true)}
              className="px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 hover:text-rose-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Réinitialiser l'historique des ventes et des transactions (0 FCFA)"
            >
              <RotateCcw className="w-4 h-4 text-rose-400" />
              <span>Réinitialiser Ventes</span>
            </button>

            {/* Back to POS Button (if embedded) */}
            {onBackToPOS && (
              <button
                type="button"
                onClick={onBackToPOS}
                className="px-3 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Retour Caisse</span>
              </button>
            )}

          </div>

        </div>
      </header>

      {/* Main Container or Lock Screen */}
      {!isUnlocked ? (
        <main className="max-w-md mx-auto px-4 py-12 w-full flex-1 flex flex-col items-center justify-center animate-in fade-in duration-200">
          <div className="w-full bg-[#0e1222] border border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-amber-950/30 text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 p-0.5 mx-auto shadow-xl shadow-amber-500/20">
              <div className="w-full h-full bg-[#0e1222] rounded-[14px] flex items-center justify-center">
                <Lock className="w-8 h-8 text-amber-400" />
              </div>
            </div>

            <div>
              <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                Espace Protégé Direction
              </span>
              <h2 className="text-xl font-black text-white mt-2">
                Accès Sécurisé Directrice
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Veuillez saisir le mot de passe confidentiel de la Direction pour consulter les ventes et les stocks en direct.
              </p>
            </div>

            {pinError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-2 text-left">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{pinError}</span>
              </div>
            )}

            <form onSubmit={handleUnlockWithPin} className="space-y-4">
              <div className="relative">
                <input
                  type={showPinMask ? 'text' : 'password'}
                  id="input-director-dashboard-unlock-pin"
                  value={pinEntry}
                  autoFocus
                  onChange={(e) => {
                    setPinEntry(e.target.value);
                    setPinError(null);
                  }}
                  placeholder="Mot de passe Direction..."
                  className="w-full bg-[#080a14] border border-amber-500/40 rounded-xl px-4 py-3 text-base text-white font-mono tracking-widest focus:outline-none focus:border-amber-400 shadow-md shadow-amber-500/10 pl-11 pr-11 text-center"
                />
                <Lock className="w-5 h-5 text-amber-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <button
                  type="button"
                  onClick={() => setShowPinMask(!showPinMask)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1"
                >
                  {showPinMask ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Touch Numeric Keypad */}
              <div className="grid grid-cols-3 gap-2 bg-[#090b14] p-3 rounded-2xl border border-white/10">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleKeypadPress(d)}
                    className="py-3 rounded-xl bg-[#141828] hover:bg-amber-500/20 active:bg-amber-500 border border-white/5 hover:border-amber-500/30 text-white hover:text-amber-300 active:text-black font-bold font-mono text-base transition-all cursor-pointer"
                  >
                    {d}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleKeypadBackspace}
                  className="py-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 text-xs font-bold flex items-center justify-center cursor-pointer"
                >
                  <Delete className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadPress('0')}
                  className="py-3 rounded-xl bg-[#141828] hover:bg-amber-500/20 active:bg-amber-500 border border-white/5 hover:border-amber-500/30 text-white hover:text-amber-300 active:text-black font-bold font-mono text-base transition-all cursor-pointer"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={() => handleUnlockWithPin()}
                  className="py-3 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 text-xs font-black flex items-center justify-center gap-1 cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  <Check className="w-4 h-4" />
                  <span>Valider</span>
                </button>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                {onBackToPOS && (
                  <button
                    type="button"
                    onClick={onBackToPOS}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-300 transition-colors"
                  >
                    Retour Caisse
                  </button>
                )}

                <button
                  type="submit"
                  disabled={!pinEntry}
                  className={`flex-1 px-5 py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    pinEntry
                      ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/25'
                      : 'bg-white/10 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Unlock className="w-4 h-4" />
                  <span>Déverrouiller le Tableau de Bord</span>
                </button>
              </div>
            </form>
          </div>
        </main>
      ) : (
        /* Main Container */
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full space-y-6">
        
        {/* TWO PRIMARY TABS FOR DIRECTRICE: VENTES LIVE & STOCK LIVE */}
        <div className="grid grid-cols-2 gap-3 p-1.5 bg-[#101424] rounded-2xl border border-white/10 shadow-lg">
          <button
            type="button"
            id="tab-director-sales-history"
            onClick={() => setActiveTab('SALES_HISTORY')}
            className={`py-3.5 px-4 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2.5 cursor-pointer ${
              activeTab === 'SALES_HISTORY'
                ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-rose-500 text-slate-950 shadow-lg shadow-amber-500/25 scale-[1.01]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Receipt className="w-4 h-4 sm:w-5 sm:h-5" />
            <div className="text-left sm:text-center">
              <span className="block font-black">Historique des Ventes (Live)</span>
              <span className={`text-[10px] hidden sm:block ${activeTab === 'SALES_HISTORY' ? 'text-slate-950 font-bold opacity-90' : 'text-gray-400'}`}>
                {filteredPayments.length} transaction(s) • {formatFCFA(totalRevenueFCFA)}
              </span>
            </div>
          </button>

          <button
            type="button"
            id="tab-director-live-stock"
            onClick={() => setActiveTab('LIVE_STOCK')}
            className={`py-3.5 px-4 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2.5 cursor-pointer ${
              activeTab === 'LIVE_STOCK'
                ? 'bg-gradient-to-r from-purple-500 via-indigo-600 to-cyan-500 text-white shadow-lg shadow-purple-500/25 scale-[1.01]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Package className="w-4 h-4 sm:w-5 sm:h-5" />
            <div className="text-left sm:text-center">
              <div className="flex items-center gap-1.5 justify-center">
                <span className="font-black">État du Stock (Live)</span>
                {lowStockProducts.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
                )}
              </div>
              <span className={`text-[10px] hidden sm:block ${activeTab === 'LIVE_STOCK' ? 'text-purple-100 font-bold' : 'text-gray-400'}`}>
                {totalStockBottles} bouteilles en cave • {lowStockProducts.length} alerte(s)
              </span>
            </div>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: HISTORIQUE DES VENTES EN LIVE */}
        {/* ========================================================================= */}
        {activeTab === 'SALES_HISTORY' && (
          <div className="space-y-6">
            
            {/* Timeframe Filter Bar */}
            <div className="flex items-center justify-between gap-3 flex-wrap bg-[#101424] p-2 sm:p-2.5 rounded-2xl border border-white/10">
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                <span className="text-xs font-bold text-gray-400 px-2 flex items-center gap-1 shrink-0">
                  <Filter className="w-3.5 h-3.5 text-amber-400" />
                  Période :
                </span>

                <button
                  type="button"
                  onClick={() => setTimeFilter('SHIFT')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    timeFilter === 'SHIFT'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                      : 'bg-white/5 hover:bg-white/10 text-gray-300'
                  }`}
                >
                  Service en cours
                </button>

                <button
                  type="button"
                  onClick={() => setTimeFilter('TODAY')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    timeFilter === 'TODAY'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                      : 'bg-white/5 hover:bg-white/10 text-gray-300'
                  }`}
                >
                  Aujourd'hui
                </button>

                <button
                  type="button"
                  onClick={() => setTimeFilter('YESTERDAY')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    timeFilter === 'YESTERDAY'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                      : 'bg-white/5 hover:bg-white/10 text-gray-300'
                  }`}
                >
                  Hier
                </button>

                <button
                  type="button"
                  onClick={() => setTimeFilter('WEEK')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    timeFilter === 'WEEK'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                      : 'bg-white/5 hover:bg-white/10 text-gray-300'
                  }`}
                >
                  7 Jours
                </button>

                <button
                  type="button"
                  onClick={() => setTimeFilter('MONTH')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    timeFilter === 'MONTH'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                      : 'bg-white/5 hover:bg-white/10 text-gray-300'
                  }`}
                >
                  Mois
                </button>

                <button
                  type="button"
                  onClick={() => setTimeFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    timeFilter === 'ALL'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                      : 'bg-white/5 hover:bg-white/10 text-gray-300'
                  }`}
                >
                  Tout
                </button>
              </div>

              <div className="text-[11px] text-gray-400 font-mono flex items-center gap-1.5 shrink-0 px-2">
                <span>Début Service :</span>
                <span className="text-amber-300 font-bold">
                  {new Date(shiftStartTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            {/* Top 4 Financial KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card 1: Chiffre d'Affaires Total */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#171c30] via-[#121626] to-[#0c0e1a] border border-amber-500/40 p-5 shadow-2xl shadow-amber-950/20 group">
                <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all pointer-events-none" />
                <div className="flex items-center justify-between text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4" />
                    Chiffre d'Affaires Encaissé
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black border border-emerald-500/30">
                    LIVE
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white tracking-tight font-mono">
                  {formatFCFA(totalRevenueFCFA)}
                </div>
                <div className="text-xs text-gray-400 mt-2 flex items-center justify-between">
                  <span>{totalTransactionsCount} vente(s) validée(s)</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                    <TrendingUp className="w-3.5 h-3.5" />
                    100% Réel
                  </span>
                </div>
              </div>

              {/* Card 2: Nombre de Transactions */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1a1728] via-[#141220] to-[#0d0b16] border border-purple-500/40 p-5 shadow-2xl shadow-purple-950/20 group">
                <div className="absolute top-0 right-0 w-28 h-28 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all pointer-events-none" />
                <div className="flex items-center justify-between text-xs font-bold text-purple-400 uppercase tracking-wider mb-2">
                  <span className="flex items-center gap-1.5">
                    <Receipt className="w-4 h-4" />
                    Tickets de Caisse
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-black border border-purple-500/30">
                    Volume
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-purple-100 tracking-tight font-mono">
                  {totalTransactionsCount}
                </div>
                <div className="text-xs text-gray-400 mt-2 flex items-center justify-between">
                  <span>Additions encaissées</span>
                  <span className="text-purple-300 font-bold">Total Ventes</span>
                </div>
              </div>

              {/* Card 3: Ticket Moyen */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#121c24] via-[#0e161c] to-[#0a0f14] border border-cyan-500/40 p-5 shadow-2xl shadow-cyan-950/20 group">
                <div className="absolute top-0 right-0 w-28 h-28 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all pointer-events-none" />
                <div className="flex items-center justify-between text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2">
                  <span className="flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4" />
                    Panier / Ticket Moyen
                  </span>
                  <span className="text-[10px] text-cyan-300 font-bold font-mono">
                    Moyenne
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-cyan-100 tracking-tight font-mono">
                  {formatFCFA(averageTicketFCFA)}
                </div>
                <div className="text-xs text-gray-400 mt-2 flex items-center justify-between">
                  <span>Par addition clôturée</span>
                  <span className="text-cyan-300 font-bold">Rentabilité</span>
                </div>
              </div>

              {/* Card 4: Espèces vs Digital */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#181a17] via-[#121412] to-[#0c0d0c] border border-emerald-500/40 p-5 shadow-2xl shadow-emerald-950/20 group">
                <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all pointer-events-none" />
                <div className="flex items-center justify-between text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
                  <span className="flex items-center gap-1.5">
                    <Zap className="w-4 h-4" />
                    Espèces en Caisse
                  </span>
                  <span className="text-[10px] text-emerald-300 font-bold font-mono">
                    Cash Direct
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-100 tracking-tight font-mono">
                  {formatFCFA(cashTotalFCFA)}
                </div>
                <div className="text-xs text-gray-400 mt-2 flex items-center justify-between">
                  <span>Mobile/CB: {formatFCFA(digitalTotalFCFA)}</span>
                  <span className="text-emerald-400 font-bold">Coffre</span>
                </div>
              </div>

            </div>

            {/* Payment Methods Breakdown */}
            <div className="bg-[#101422] border border-white/10 rounded-3xl p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-amber-400" />
                  Répartition des Encaissements par Mode de Règlement
                </h3>
                <span className="text-xs text-gray-400 font-mono font-bold">
                  Total : {formatFCFA(totalRevenueFCFA)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {(Object.entries(paymentBreakdown) as [string, PaymentMethodInfo][])
                  .filter(([_, info]) => info.count > 0 || totalRevenueFCFA === 0)
                  .map(([key, info]) => {
                    const percentage = totalRevenueFCFA > 0 ? ((info.totalFCFA / totalRevenueFCFA) * 100) : 0;
                    return (
                      <div key={key} className="p-3.5 rounded-2xl bg-[#0a0d16] border border-white/5 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className={`font-bold flex items-center gap-1.5 ${info.badgeColor}`}>
                            <span className={`w-2.5 h-2.5 rounded-full ${info.color}`} />
                            {info.label}
                          </span>
                          <span className="font-mono font-black text-white">
                            {formatFCFA(info.totalFCFA)}
                          </span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`${info.color} h-full rounded-full transition-all`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-400">
                          <span>{info.count} paiement(s)</span>
                          <span>{percentage.toFixed(1)}%</span>
                        </div>
                      </div>
                    );
                })}
              </div>
            </div>

            {/* Real-time Sales Feed & Search */}
            <div className="bg-[#101422] border border-white/10 rounded-3xl p-5 space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
                    Flux Chronologique de Toutes les Ventes
                  </h3>
                  <p className="text-xs text-gray-400">
                    Cliquez sur une vente pour afficher le ticket thermique complet.
                  </p>
                </div>

                <div className="relative w-full sm:w-72">
                  <input
                    type="text"
                    placeholder="Rechercher ticket, table, serveur, montant..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#0a0d16] border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 pl-8"
                  />
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {filteredPayments.length === 0 ? (
                <div className="p-12 text-center text-xs text-gray-500 rounded-2xl bg-[#090b14] border border-white/5 space-y-2">
                  <Receipt className="w-8 h-8 text-gray-600 mx-auto" />
                  <p>Aucune transaction enregistrée pour cette période.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredPayments
                    .filter(p => {
                      if (!searchQuery) return true;
                      const q = searchQuery.toLowerCase();
                      return (
                        p.tableId.toLowerCase().includes(q) ||
                        (p.tableName && p.tableName.toLowerCase().includes(q)) ||
                        (p.serverName && p.serverName.toLowerCase().includes(q)) ||
                        p.id.toLowerCase().includes(q) ||
                        p.paymentMethod.toLowerCase().includes(q) ||
                        p.totalPaidFCFA.toString().includes(q)
                      );
                    })
                    .map((payment, idx) => {
                      const items = payment.itemsSnapshot || [];
                      return (
                        <div 
                          key={payment.id}
                          onClick={() => setSelectedPaymentForReceipt(payment)}
                          className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-3 cursor-pointer ${
                            idx === 0 
                              ? 'bg-gradient-to-r from-emerald-950/40 via-[#101920] to-[#0c0f18] border-emerald-500/40 shadow-lg hover:border-emerald-400' 
                              : 'bg-[#0a0d16] border-white/5 hover:border-amber-500/40 hover:bg-[#0f1322]'
                          }`}
                        >
                          <div className="flex items-start sm:items-center gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 font-mono font-bold text-xs">
                              #{payment.tableId}
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-black text-white">
                                  {payment.tableName || `Table #${payment.tableId}`}
                                </span>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-gray-300">
                                  Ticket #{payment.id.substring(0, 8)}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                                  {getMethodLabel(payment.paymentMethod)}
                                </span>
                              </div>

                              <div className="text-[11px] text-gray-400 flex items-center gap-2 flex-wrap">
                                <span>Serveur : <strong className="text-gray-200">{payment.serverName || 'Caisse'}</strong></span>
                                <span>•</span>
                                <span>Heure : <strong className="text-amber-300 font-mono">{new Date(payment.timestamp).toLocaleTimeString('fr-FR')}</strong></span>
                                {items.length > 0 && (
                                  <>
                                    <span>•</span>
                                    <span>{items.reduce((s, i) => s + i.quantity, 0)} bouteille(s)</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-right w-full md:w-auto flex md:flex-col justify-between items-center md:items-end border-t md:border-t-0 pt-2 md:pt-0 border-white/5">
                            <div className="text-base sm:text-lg font-black text-emerald-400 font-mono">
                              {formatFCFA(payment.totalPaidFCFA)}
                            </div>
                            <div className="text-[10px] text-gray-400 font-mono flex items-center gap-1">
                              <span>{new Date(payment.timestamp).toLocaleDateString('fr-FR')}</span>
                              <Eye className="w-3 h-3 text-amber-400 ml-1" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: GESTION & ÉTAT DU STOCK EN DIRECT */}
        {/* ========================================================================= */}
        {activeTab === 'LIVE_STOCK' && (
          <div className="space-y-6">
            
            {/* Top 4 Stock KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Total Stock Volume */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1e1730] via-[#151224] to-[#0d0a18] border border-purple-500/40 p-5 shadow-2xl shadow-purple-950/20 group">
                <div className="absolute top-0 right-0 w-28 h-28 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all pointer-events-none" />
                <div className="flex items-center justify-between text-xs font-bold text-purple-400 uppercase tracking-wider mb-2">
                  <span className="flex items-center gap-1.5">
                    <Package className="w-4 h-4" />
                    Bouteilles Restantes
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-black border border-purple-500/30">
                    LIVE
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-purple-100 tracking-tight font-mono">
                  {totalStockBottles} btl
                </div>
                <div className="text-xs text-gray-400 mt-2 flex items-center justify-between">
                  <span>En cave & présentoirs</span>
                  <span className="text-purple-300 font-bold">Total Réel</span>
                </div>
              </div>

              {/* References Count */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#121c24] via-[#0e161c] to-[#0a0f14] border border-cyan-500/40 p-5 shadow-2xl shadow-cyan-950/20 group">
                <div className="absolute top-0 right-0 w-28 h-28 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all pointer-events-none" />
                <div className="flex items-center justify-between text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2">
                  <span className="flex items-center gap-1.5">
                    <Wine className="w-4 h-4" />
                    Références Boissons
                  </span>
                  <span className="text-[10px] text-cyan-300 font-bold font-mono">
                    Catalogue
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-cyan-100 tracking-tight font-mono">
                  {products.length}
                </div>
                <div className="text-xs text-gray-400 mt-2 flex items-center justify-between">
                  <span>Champagnes, Vins & Softs</span>
                  <span className="text-cyan-300 font-bold">Actives</span>
                </div>
              </div>

              {/* Total Stock Valuation */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#171c30] via-[#121626] to-[#0c0e1a] border border-amber-500/40 p-5 shadow-2xl shadow-amber-950/20 group">
                <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all pointer-events-none" />
                <div className="flex items-center justify-between text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4" />
                    Valeur Marchande Stock
                  </span>
                  <span className="text-[10px] text-amber-300 font-bold font-mono">
                    Prix Vente
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-amber-200 tracking-tight font-mono">
                  {formatFCFA(totalStockValueFCFA)}
                </div>
                <div className="text-xs text-gray-400 mt-2 flex items-center justify-between">
                  <span>Potentiel commercial</span>
                  <span className="text-amber-400 font-bold">Actifs</span>
                </div>
              </div>

              {/* Stock Alerts */}
              <div className={`relative overflow-hidden rounded-3xl border p-5 shadow-2xl group ${
                lowStockProducts.length > 0
                  ? 'bg-gradient-to-br from-[#291316] via-[#1e0e11] to-[#12080a] border-rose-500/50 shadow-rose-950/30'
                  : 'bg-gradient-to-br from-[#142318] via-[#0e1911] to-[#080f0a] border-emerald-500/40 shadow-emerald-950/20'
              }`}>
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider mb-2">
                  <span className={`flex items-center gap-1.5 ${lowStockProducts.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    <AlertTriangle className="w-4 h-4" />
                    Alertes Réassort
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                    lowStockProducts.length > 0 ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  }`}>
                    {lowStockProducts.length > 0 ? 'CRITIQUE' : 'OPTIMAL'}
                  </span>
                </div>
                <div className={`text-2xl sm:text-3xl font-black tracking-tight font-mono ${
                  lowStockProducts.length > 0 ? 'text-rose-200' : 'text-emerald-200'
                }`}>
                  {lowStockProducts.length}
                </div>
                <div className="text-xs text-gray-400 mt-2 flex items-center justify-between">
                  <span>Sous le seuil d'alerte</span>
                  <span className={lowStockProducts.length > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                    {lowStockProducts.length > 0 ? 'À réapprovisionner' : 'Stock sain'}
                  </span>
                </div>
              </div>

            </div>

            {/* Critical Stock Alerts Banner (if any) */}
            {lowStockProducts.length > 0 && (
              <div className="bg-gradient-to-r from-rose-950/40 via-[#181119] to-[#120f18] border border-rose-500/40 rounded-3xl p-5 space-y-3 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-rose-400 animate-bounce" />
                    <h3 className="text-sm font-black text-white">
                      Alertes Réassort Immédiat ({lowStockProducts.length} référence(s) sous le seuil critique)
                    </h3>
                  </div>
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                    Surveillance Directrice
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-1">
                  {lowStockProducts.map(p => (
                    <div 
                      key={p.id}
                      className="p-3 rounded-2xl bg-rose-950/30 border border-rose-500/30 flex items-center justify-between gap-2"
                    >
                      <div className="space-y-0.5 truncate">
                        <div className="text-xs font-bold text-white truncate">{p.name}</div>
                        <div className="text-[10px] text-gray-400">{p.categoryName || p.category}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-black text-rose-400 font-mono">{p.currentStock} btl</div>
                        <div className="text-[9px] text-gray-400">Min: {p.minStockThreshold}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Full Stock Inventory Table with Filters */}
            <div className="bg-[#101422] border border-white/10 rounded-3xl p-5 space-y-4 shadow-xl">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <Package className="w-5 h-5 text-purple-400" />
                    Inventaire du Stock de Bouteilles en Temps Réel
                  </h3>
                  <p className="text-xs text-gray-400">
                    Consultez les quantités exactes en cave et bar, la valeur marchande et les seuils d'alerte.
                  </p>
                </div>

                {/* Filters & Search Input */}
                <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
                  
                  {/* Status Toggle Filter */}
                  <div className="flex items-center bg-[#0a0d16] p-1 rounded-xl border border-white/10 text-xs">
                    <button
                      type="button"
                      onClick={() => setStockFilterType('ALL')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        stockFilterType === 'ALL' ? 'bg-purple-500 text-white' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Tous
                    </button>
                    <button
                      type="button"
                      onClick={() => setStockFilterType('LOW')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        stockFilterType === 'LOW' ? 'bg-rose-500 text-white' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <span>Alertes</span>
                      {lowStockProducts.length > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-300" />
                      )}
                    </button>
                  </div>

                  {/* Category Filter */}
                  <select
                    value={selectedStockCategory}
                    onChange={(e) => setSelectedStockCategory(e.target.value)}
                    className="bg-[#0a0d16] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
                  >
                    <option value="ALL">Toutes les catégories</option>
                    {(categories || PRODUCT_CATEGORIES).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>

                  {/* Search Input */}
                  <div className="relative w-full sm:w-60">
                    <input
                      type="text"
                      placeholder="Filtrer une bouteille..."
                      value={stockSearchQuery}
                      onChange={(e) => setStockSearchQuery(e.target.value)}
                      className="w-full bg-[#0a0d16] border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 pl-8"
                    />
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>

                </div>
              </div>

              {/* Table */}
              {filteredProducts.length === 0 ? (
                <div className="p-12 text-center text-xs text-gray-500 rounded-2xl bg-[#090b14] border border-white/5 space-y-2">
                  <Package className="w-8 h-8 text-gray-600 mx-auto" />
                  <p>Aucune bouteille trouvée avec ces critères.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-gray-400 font-bold">
                        <th className="pb-3 px-3">Bouteille / Boisson</th>
                        <th className="pb-3 px-3">Catégorie</th>
                        <th className="pb-3 px-3 text-center">Quantité en Stock</th>
                        <th className="pb-3 px-3 text-center">Seuil Alerte</th>
                        <th className="pb-3 px-3 text-center">Statut</th>
                        <th className="pb-3 px-3 text-right">Prix Unitaire</th>
                        <th className="pb-3 px-3 text-right">Valeur Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredProducts.map(p => {
                        const isLow = p.currentStock <= p.minStockThreshold;
                        const isOut = p.currentStock === 0;
                        const stockValue = p.currentStock * p.priceFCFA;

                        return (
                          <tr key={p.id} className="hover:bg-white/5 transition-colors">
                            <td className="py-3.5 px-3">
                              <div className="font-bold text-white flex items-center gap-2">
                                <Wine className={`w-3.5 h-3.5 ${isLow ? 'text-rose-400' : 'text-purple-400'}`} />
                                <span>{p.name}</span>
                              </div>
                              {p.volume && (
                                <span className="text-[10px] text-gray-500">{p.volume}</span>
                              )}
                            </td>
                            <td className="py-3.5 px-3 text-gray-400">
                              {p.categoryName || p.category}
                            </td>
                            <td className="py-3.5 px-3 text-center">
                              <span className={`font-mono font-black text-sm px-2.5 py-1 rounded-xl ${
                                isOut 
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' 
                                  : isLow 
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                                  : 'bg-white/10 text-emerald-300'
                              }`}>
                                {p.currentStock} btl
                              </span>
                            </td>
                            <td className="py-3.5 px-3 text-center font-mono text-gray-400">
                              {p.minStockThreshold} btl
                            </td>
                            <td className="py-3.5 px-3 text-center">
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                                isOut 
                                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' 
                                  : isLow 
                                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' 
                                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              }`}>
                                {isOut ? 'RUPTURE' : isLow ? 'STOCK BAS' : 'OPTIMAL'}
                              </span>
                            </td>
                            <td className="py-3.5 px-3 text-right font-mono font-bold text-gray-300">
                              {formatFCFA(p.priceFCFA)}
                            </td>
                            <td className="py-3.5 px-3 text-right font-mono font-black text-purple-300">
                              {formatFCFA(stockValue)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

      </main>
      )}

      {/* Change Director Password Modal */}
      <ChangeDirectorPasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
      />

      {/* Share Director Modal */}
      <ShareDirectorModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />

      {/* Reset Sales History Modal (Director) */}
      <ResetSalesHistoryModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
      />

      {/* Thermal Receipt Modal Preview when clicking on a sale */}
      {selectedPaymentForReceipt && (
        <ThermalReceiptModal
          payment={selectedPaymentForReceipt}
          isOpen={!!selectedPaymentForReceipt}
          onClose={() => setSelectedPaymentForReceipt(null)}
        />
      )}

    </div>
  );
};
