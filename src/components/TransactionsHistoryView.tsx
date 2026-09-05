import React, { useState, useMemo } from 'react';
import { 
  History, Search, Filter, Printer, Bluetooth, Download, 
  Eye, CheckCircle2, AlertCircle, Calendar, Clock, DollarSign, 
  CreditCard, Smartphone, Banknote, Users, Sparkles, ChevronDown, 
  ChevronUp, RotateCcw, Copy, Check, FileSpreadsheet, ArrowUpDown,
  Tag, ShieldCheck, Wine, Coffee, Package, SlidersHorizontal,
  TrendingUp, BarChart3, ArrowRight, ArrowUpRight, CalendarDays,
  Flame, HelpCircle, Layers
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { Payment, PaymentMethod, TableZone } from '../types';
import { formatFCFA, formatDateTime, formatDateShort, formatFullDateTime, soundManager } from '../utils/formatters';
import { printViaWebBluetooth, ESCPOSReceiptData, generateTextReceipt } from '../utils/escpos';
import { exportReceiptPDF } from '../utils/pdfGenerator';
import { ZONE_LABELS } from '../data/initialData';
import { ThermalReceiptModal } from './ThermalReceiptModal';
import { ResetSalesHistoryModal } from './ResetSalesHistoryModal';

type DateFilterType = 'ALL' | 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'LAST_MONTH' | 'CUSTOM';
type SortOrderType = 'DATE_DESC' | 'DATE_ASC' | 'AMOUNT_DESC' | 'AMOUNT_ASC';
type HistoryViewTab = 'TICKETS' | 'DAILY' | 'MONTHLY';

const PAYMENT_METHOD_CONFIG: Record<PaymentMethod, { label: string; icon: React.ReactNode; badge: string; color: string }> = {
  ESPECES: { label: 'Espèces', icon: <Banknote className="w-3.5 h-3.5" />, badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', color: '#10B981' },
  CARTE_BANCAIRE: { label: 'Carte / TPE', icon: <CreditCard className="w-3.5 h-3.5" />, badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30', color: '#3B82F6' },
  WAVE: { label: 'Wave Mobile', icon: <Smartphone className="w-3.5 h-3.5" />, badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30', color: '#06B6D4' },
  TMONEY: { label: 'TMoney', icon: <Smartphone className="w-3.5 h-3.5" />, badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', color: '#EAB308' },
  FLOOZ: { label: 'Flooz', icon: <Smartphone className="w-3.5 h-3.5" />, badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30', color: '#6366F1' },
  ORANGE_MONEY: { label: 'Orange Money', icon: <Smartphone className="w-3.5 h-3.5" />, badge: 'bg-orange-500/20 text-orange-300 border-orange-500/30', color: '#F97316' },
  MTN_MOMO: { label: 'MTN MoMo', icon: <Smartphone className="w-3.5 h-3.5" />, badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30', color: '#F59E0B' },
};

const formatMonthLabel = (yearMonthStr: string) => {
  const parts = yearMonthStr.split('-');
  if (parts.length !== 2) return yearMonthStr;
  const year = parts[0];
  const month = parts[1];
  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  const idx = parseInt(month, 10) - 1;
  return `${monthNames[idx] || month} ${year}`;
};

const formatDateNice = (dateStr: string) => {
  try {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
};

export const TransactionsHistoryView: React.FC = () => {
  const { 
    payments, 
    companyProfile, 
    printerConfig, 
    setShowPrinterSettingsModal 
  } = usePOS();

  // Active Tab View: Detailed Tickets / Daily Sales / Monthly Sales
  const [activeTab, setActiveTab] = useState<HistoryViewTab>('TICKETS');

  // Search and Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | 'ALL'>('ALL');
  const [selectedZone, setSelectedZone] = useState<TableZone | 'ALL'>('ALL');
  const [dateFilter, setDateFilter] = useState<DateFilterType>('ALL');
  const [customDate, setCustomDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [sortOrder, setSortOrder] = useState<SortOrderType>('DATE_DESC');
  const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(null);

  // Receipt Modal preview state
  const [previewPayment, setPreviewPayment] = useState<Payment | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);

  // Bluetooth Direct Quick Print status
  const [printingPaymentId, setPrintingPaymentId] = useState<string | null>(null);
  const [printFeedback, setPrintFeedback] = useState<{ id: string; success: boolean; message: string } | null>(null);

  // General Date calculations for global KPIs
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const currentMonthStr = useMemo(() => new Date().toISOString().substring(0, 7), []);
  
  const lastMonthStr = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().substring(0, 7);
  }, []);

  // 1. LIVE TODAY SALES STATS (Ventes Journalières du Jour)
  const todaySalesStats = useMemo(() => {
    const todayList = payments.filter(p => p.timestamp.startsWith(todayStr));
    const total = todayList.reduce((s, p) => s + p.totalPaidFCFA, 0);
    const count = todayList.length;
    const avgBasket = count > 0 ? Math.round(total / count) : 0;
    const discounts = todayList.reduce((s, p) => s + (p.discountFCFA || 0), 0);
    const cashTotal = todayList.filter(p => p.paymentMethod === 'ESPECES').reduce((s, p) => s + p.totalPaidFCFA, 0);
    const mobileTotal = todayList.filter(p => p.paymentMethod !== 'ESPECES' && p.paymentMethod !== 'CARTE_BANCAIRE').reduce((s, p) => s + p.totalPaidFCFA, 0);
    const cardTotal = todayList.filter(p => p.paymentMethod === 'CARTE_BANCAIRE').reduce((s, p) => s + p.totalPaidFCFA, 0);

    return { total, count, avgBasket, discounts, cashTotal, mobileTotal, cardTotal };
  }, [payments, todayStr]);

  // 2. LIVE MONTHLY SALES STATS (Ventes Mensuelles du Mois en cours)
  const currentMonthSalesStats = useMemo(() => {
    const monthList = payments.filter(p => p.timestamp.startsWith(currentMonthStr));
    const total = monthList.reduce((s, p) => s + p.totalPaidFCFA, 0);
    const count = monthList.length;
    const avgBasket = count > 0 ? Math.round(total / count) : 0;
    const discounts = monthList.reduce((s, p) => s + (p.discountFCFA || 0), 0);
    
    // Count distinct active days in the month
    const activeDaysSet = new Set(monthList.map(p => p.timestamp.split('T')[0]));
    const activeDaysCount = activeDaysSet.size || 1;
    const dailyAvg = Math.round(total / activeDaysCount);

    return { total, count, avgBasket, discounts, activeDaysCount, dailyAvg };
  }, [payments, currentMonthStr]);

  // 3. DAILY SALES BREAKDOWN (Liste agrégée par Jour)
  const dailyBreakdown = useMemo(() => {
    const map = new Map<string, {
      date: string;
      totalRevenue: number;
      totalBrut: number;
      totalDiscounts: number;
      count: number;
      cashTotal: number;
      mobileTotal: number;
      cardTotal: number;
      serverCounts: Record<string, number>;
      zoneCounts: Record<string, number>;
      itemsCount: number;
    }>();

    payments.forEach(p => {
      const dateKey = p.timestamp.split('T')[0];
      if (!map.has(dateKey)) {
        map.set(dateKey, {
          date: dateKey,
          totalRevenue: 0,
          totalBrut: 0,
          totalDiscounts: 0,
          count: 0,
          cashTotal: 0,
          mobileTotal: 0,
          cardTotal: 0,
          serverCounts: {},
          zoneCounts: {},
          itemsCount: 0
        });
      }

      const entry = map.get(dateKey)!;
      entry.totalRevenue += p.totalPaidFCFA;
      entry.totalBrut += p.subTotalFCFA;
      entry.totalDiscounts += (p.discountFCFA || 0);
      entry.count += 1;
      entry.itemsCount += p.itemsSnapshot.reduce((s, i) => s + i.quantity, 0);

      if (p.paymentMethod === 'ESPECES') {
        entry.cashTotal += p.totalPaidFCFA;
      } else if (p.paymentMethod === 'CARTE_BANCAIRE') {
        entry.cardTotal += p.totalPaidFCFA;
      } else {
        entry.mobileTotal += p.totalPaidFCFA;
      }

      entry.serverCounts[p.serverName] = (entry.serverCounts[p.serverName] || 0) + 1;
      const zoneKey = p.tableZone || 'Club';
      entry.zoneCounts[zoneKey] = (entry.zoneCounts[zoneKey] || 0) + 1;
    });

    return Array.from(map.values())
      .map(entry => {
        // Top Server
        let topServer = '-';
        let maxServerCount = 0;
        Object.entries(entry.serverCounts).forEach(([srv, c]) => {
          if (c > maxServerCount) {
            maxServerCount = c;
            topServer = srv;
          }
        });

        // Top Zone
        let topZone = '-';
        let maxZoneCount = 0;
        Object.entries(entry.zoneCounts).forEach(([zn, c]) => {
          if (c > maxZoneCount) {
            maxZoneCount = c;
            topZone = zn;
          }
        });

        const avgBasket = entry.count > 0 ? Math.round(entry.totalRevenue / entry.count) : 0;

        return {
          ...entry,
          avgBasket,
          topServer,
          topZone,
          formattedDate: formatDateNice(entry.date),
          isToday: entry.date === todayStr
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [payments, todayStr]);

  // 4. MONTHLY SALES BREAKDOWN (Liste agrégée par Mois)
  const monthlyBreakdown = useMemo(() => {
    const map = new Map<string, {
      monthKey: string;
      totalRevenue: number;
      totalBrut: number;
      totalDiscounts: number;
      count: number;
      activeDays: Set<string>;
      cashTotal: number;
      mobileTotal: number;
      cardTotal: number;
      itemsCount: number;
    }>();

    payments.forEach(p => {
      const monthKey = p.timestamp.substring(0, 7);
      const dateKey = p.timestamp.split('T')[0];
      if (!map.has(monthKey)) {
        map.set(monthKey, {
          monthKey,
          totalRevenue: 0,
          totalBrut: 0,
          totalDiscounts: 0,
          count: 0,
          activeDays: new Set(),
          cashTotal: 0,
          mobileTotal: 0,
          cardTotal: 0,
          itemsCount: 0
        });
      }

      const entry = map.get(monthKey)!;
      entry.totalRevenue += p.totalPaidFCFA;
      entry.totalBrut += p.subTotalFCFA;
      entry.totalDiscounts += (p.discountFCFA || 0);
      entry.count += 1;
      entry.activeDays.add(dateKey);
      entry.itemsCount += p.itemsSnapshot.reduce((s, i) => s + i.quantity, 0);

      if (p.paymentMethod === 'ESPECES') {
        entry.cashTotal += p.totalPaidFCFA;
      } else if (p.paymentMethod === 'CARTE_BANCAIRE') {
        entry.cardTotal += p.totalPaidFCFA;
      } else {
        entry.mobileTotal += p.totalPaidFCFA;
      }
    });

    return Array.from(map.values())
      .map(entry => {
        const activeDaysCount = entry.activeDays.size || 1;
        const avgBasket = entry.count > 0 ? Math.round(entry.totalRevenue / entry.count) : 0;
        const dailyAvg = Math.round(entry.totalRevenue / activeDaysCount);

        return {
          monthKey: entry.monthKey,
          monthLabel: formatMonthLabel(entry.monthKey),
          totalRevenue: entry.totalRevenue,
          totalBrut: entry.totalBrut,
          totalDiscounts: entry.totalDiscounts,
          count: entry.count,
          activeDaysCount,
          avgBasket,
          dailyAvg,
          cashTotal: entry.cashTotal,
          mobileTotal: entry.mobileTotal,
          cardTotal: entry.cardTotal,
          itemsCount: entry.itemsCount,
          isCurrentMonth: entry.monthKey === currentMonthStr
        };
      })
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [payments, currentMonthStr]);

  // Filter Payments for detailed list
  const filteredPayments = useMemo(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return payments.filter((payment) => {
      const paymentDate = payment.timestamp.split('T')[0];

      // Date Filtering
      if (dateFilter === 'TODAY' && paymentDate !== todayStr) return false;
      if (dateFilter === 'YESTERDAY' && paymentDate !== yesterdayStr) return false;
      if (dateFilter === 'LAST_7_DAYS') {
        const pDate = new Date(payment.timestamp);
        if (pDate < sevenDaysAgo) return false;
      }
      if (dateFilter === 'THIS_MONTH' && !paymentDate.startsWith(currentMonthStr)) return false;
      if (dateFilter === 'LAST_MONTH' && !paymentDate.startsWith(lastMonthStr)) return false;
      if (dateFilter === 'CUSTOM' && paymentDate !== customDate) return false;

      // Method Filtering
      if (selectedMethod !== 'ALL' && payment.paymentMethod !== selectedMethod) return false;

      // Zone Filtering
      if (selectedZone !== 'ALL') {
        const isMatchingZone = payment.tableName.toUpperCase().includes(selectedZone.replace('_', ' ')) ||
          (selectedZone === 'CARRE_PREMIUM' && payment.tableName.includes('Carré')) ||
          (selectedZone === 'VIP_1' && payment.tableName.includes('VIP 1')) ||
          (selectedZone === 'VIP_2' && payment.tableName.includes('VIP 2')) ||
          (selectedZone === 'PISTE' && payment.tableName.includes('Piste')) ||
          (selectedZone === 'COMPTOIR_BAR' && payment.tableName.includes('Bar')) ||
          (selectedZone === 'TERRASSE' && payment.tableName.includes('Terrasse'));
        
        if (!isMatchingZone) return false;
      }

      // Search query (ID, Table, Server, Cashier, Item Name, Reference)
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchesId = payment.id.toLowerCase().includes(query) || (payment.orderId && payment.orderId.toLowerCase().includes(query));
        const matchesTable = payment.tableName.toLowerCase().includes(query);
        const matchesServer = payment.serverName.toLowerCase().includes(query);
        const matchesCashier = payment.cashierName.toLowerCase().includes(query);
        const matchesRef = payment.transactionReference?.toLowerCase().includes(query);
        const matchesItem = payment.itemsSnapshot.some(item => 
          item.productName.toLowerCase().includes(query) || item.category.toLowerCase().includes(query)
        );

        if (!matchesId && !matchesTable && !matchesServer && !matchesCashier && !matchesRef && !matchesItem) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortOrder === 'DATE_DESC') {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      }
      if (sortOrder === 'DATE_ASC') {
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      }
      if (sortOrder === 'AMOUNT_DESC') {
        return b.totalPaidFCFA - a.totalPaidFCFA;
      }
      if (sortOrder === 'AMOUNT_ASC') {
        return a.totalPaidFCFA - b.totalPaidFCFA;
      }
      return 0;
    });
  }, [payments, searchTerm, selectedMethod, selectedZone, dateFilter, customDate, sortOrder, todayStr, currentMonthStr, lastMonthStr]);

  // Aggregate Metrics for Current Filtered List
  const metrics = useMemo(() => {
    const totalRevenue = filteredPayments.reduce((sum, p) => sum + p.totalPaidFCFA, 0);
    const totalDiscounts = filteredPayments.reduce((sum, p) => sum + (p.discountFCFA || 0), 0);
    const count = filteredPayments.length;
    const averageBasket = count > 0 ? Math.round(totalRevenue / count) : 0;

    const methodCounts: Record<string, { count: number; total: number }> = {};
    filteredPayments.forEach(p => {
      if (!methodCounts[p.paymentMethod]) {
        methodCounts[p.paymentMethod] = { count: 0, total: 0 };
      }
      methodCounts[p.paymentMethod].count += 1;
      methodCounts[p.paymentMethod].total += p.totalPaidFCFA;
    });

    return {
      totalRevenue,
      totalDiscounts,
      count,
      averageBasket,
      methodCounts
    };
  }, [filteredPayments]);

  // Quick Switch: Jump to a specific date from daily breakdown
  const handleFilterToDay = (dateStr: string) => {
    setCustomDate(dateStr);
    setDateFilter('CUSTOM');
    setActiveTab('TICKETS');
    soundManager.playClick();
  };

  // Quick Switch: Jump to a specific month from monthly breakdown
  const handleFilterToMonth = (monthKey: string) => {
    if (monthKey === currentMonthStr) {
      setDateFilter('THIS_MONTH');
    } else if (monthKey === lastMonthStr) {
      setDateFilter('LAST_MONTH');
    } else {
      // Set to all or custom day in that month
      setDateFilter('ALL');
    }
    setActiveTab('TICKETS');
    soundManager.playClick();
  };

  // Quick 1-Click Bluetooth Direct Reprint
  const handleQuickBluetoothReprint = async (payment: Payment) => {
    setPrintingPaymentId(payment.id);
    setPrintFeedback(null);

    const receiptData: ESCPOSReceiptData = {
      companyProfile,
      payment,
      paperWidth: printerConfig.paperWidth,
      copyLabel: 'DUPLICATA (RÉIMPRESSION TICKET)'
    };

    try {
      const result = await printViaWebBluetooth(receiptData, printerConfig.scanOptions);
      setPrintingPaymentId(null);
      if (result.success) {
        setPrintFeedback({
          id: payment.id,
          success: true,
          message: `Ticket ${payment.id} réimprimé avec succès via Bluetooth !`
        });
      } else {
        setPrintFeedback({
          id: payment.id,
          success: false,
          message: result.message || 'Impossible de joindre l’imprimante Bluetooth.'
        });
      }
    } catch (err: unknown) {
      setPrintingPaymentId(null);
      const msg = err instanceof Error ? err.message : String(err);
      setPrintFeedback({
        id: payment.id,
        success: false,
        message: `Erreur d'impression : ${msg}`
      });
    }

    setTimeout(() => {
      setPrintFeedback(null);
    }, 5000);
  };

  // Open Full Receipt Modal
  const handleOpenReceiptPreview = (payment: Payment) => {
    setPreviewPayment(payment);
    setIsReceiptModalOpen(true);
  };

  // Direct PDF Download
  const handleExportReceiptPDF = (payment: Payment) => {
    try {
      exportReceiptPDF(payment, companyProfile);
      soundManager.playSuccessTone();
      setPrintFeedback({
        id: payment.id,
        success: true,
        message: `Facture ${payment.id} enregistrée en PDF avec succès !`
      });
      setTimeout(() => setPrintFeedback(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setPrintFeedback({
        id: payment.id,
        success: false,
        message: `Erreur PDF : ${msg}`
      });
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filteredPayments.length === 0) return;

    const totalNet = filteredPayments.reduce((s, p) => s + p.totalPaidFCFA, 0);
    const totalBrut = filteredPayments.reduce((s, p) => s + p.subTotalFCFA, 0);
    const totalRemises = filteredPayments.reduce((s, p) => s + (p.discountFCFA || 0), 0);
    const totalArticlesCount = filteredPayments.reduce((s, p) => s + p.itemsSnapshot.reduce((is, i) => is + i.quantity, 0), 0);

    const csvLines: string[] = [];

    csvLines.push(`HISTORIQUE DES VENTES & TRANSACTIONS;${companyProfile.name.replace(/;/g, ' ')}`);
    csvLines.push(`DATE D'EXTRACTION;${formatFullDateTime(new Date().toISOString())}`);
    csvLines.push(`FILTRE PÉRIODE;${dateFilter === 'CUSTOM' ? `Personnalisé (${customDate})` : dateFilter}`);
    csvLines.push(`VENTES JOURNALIÈRES (AUJOURD'HUI);${todaySalesStats.total} FCFA (${todaySalesStats.count} factures)`);
    csvLines.push(`VENTES MENSUELLES (MOIS EN COURS);${currentMonthSalesStats.total} FCFA (${currentMonthSalesStats.count} factures)`);
    csvLines.push(`TOTAL NET SÉLECTION;${totalNet} FCFA`);
    csvLines.push('');

    csvLines.push('=== DÉTAIL DES TRANSACTIONS ===');
    const headers = [
      'N° Facture', 'Date', 'Heure', 'Table', 'Zone', 
      'Serveur', 'Caissier', 'Mode de Paiement', 'Réf', 
      'Articles', 'Sous-Total Brut (FCFA)', 'Remise (FCFA)', 'Total Net Payé (FCFA)'
    ];
    csvLines.push(headers.join(';'));

    filteredPayments.forEach(p => {
      const pDate = formatDateShort(p.timestamp);
      const pTime = formatDateTime(p.timestamp);
      const zoneName = ZONE_LABELS[p.tableZone] || p.tableZone || 'Club';
      const methodName = PAYMENT_METHOD_CONFIG[p.paymentMethod]?.label || p.paymentMethod;
      const itemsDetail = (p.itemsSnapshot || [])
        .map(i => `${i.quantity}x ${i.productName} (${i.totalPriceFCFA} FCFA)`)
        .join(' | ')
        .replace(/"/g, '""');

      csvLines.push([
        `"${p.id}"`,
        `"${pDate}"`,
        `"${pTime}"`,
        `"${p.tableName.replace(/"/g, '""')}"`,
        `"${zoneName.replace(/"/g, '""')}"`,
        `"${p.serverName.replace(/"/g, '""')}"`,
        `"${p.cashierName.replace(/"/g, '""')}"`,
        `"${methodName}"`,
        `"${(p.transactionReference || '-').replace(/"/g, '""')}"`,
        `"${itemsDetail}"`,
        p.subTotalFCFA,
        p.discountFCFA || 0,
        p.totalPaidFCFA
      ].join(';'));
    });

    const csvContent = '\uFEFF' + csvLines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ventes_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    soundManager.playSuccessTone();
  };

  return (
    <div className="space-y-6">
      
      {/* View Header & Real-Time Daily/Monthly Synthesis Banner */}
      <div className="bg-[#121524] border border-white/10 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-500/10 via-purple-600/5 to-transparent rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10 shrink-0">
                <History className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white flex flex-wrap items-center gap-2">
                  <span>Historique des Ventes & Transactions</span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {payments.length} factures enregistrées
                  </span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Historique 100% conservé
                  </span>
                </h1>
                <p className="text-xs text-gray-400 mt-0.5">
                  Suivi direct des ventes journalières, mensuelles et réimpression instantanée des tickets de caisse via Bluetooth ESC/POS.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions Header */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="btn-director-reset-sales-history"
              onClick={() => setIsResetModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer active:scale-95 shadow-sm"
              title="Réinitialiser l'historique des ventes et transactions (0 FCFA)"
            >
              <RotateCcw className="w-4 h-4 text-rose-400" />
              <span>Réinitialiser Ventes (Directeur)</span>
            </button>

            <button
              id="btn-export-transactions-csv"
              onClick={handleExportCSV}
              disabled={filteredPayments.length === 0}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Exporter CSV</span>
            </button>

            <button
              id="btn-open-printer-settings"
              onClick={() => setShowPrinterSettingsModal(true)}
              className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              <Bluetooth className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Imprimante :</span>
              <span className="font-mono text-[11px]">{printerConfig.paperWidth}mm ({printerConfig.bluetoothDeviceName || 'BT ESC/POS'})</span>
            </button>
          </div>
        </div>

        {/* Real-time Sales KPI Cards: Daily & Monthly Highlight */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10">
          
          {/* Card 1: VENTES DU JOUR (JOURNALIÈRES) */}
          <div 
            onClick={() => {
              setDateFilter('TODAY');
              setActiveTab('TICKETS');
            }}
            className="bg-gradient-to-br from-amber-500/15 via-[#181c2f] to-[#181c2f] p-4 rounded-2xl border border-amber-500/30 hover:border-amber-400/60 transition-all cursor-pointer group shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                Ventes Aujourd'hui
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Journalier
              </span>
            </div>
            <span className="text-xl sm:text-2xl font-black text-amber-400 mt-2 block tracking-tight">
              {formatFCFA(todaySalesStats.total)}
            </span>
            <div className="flex items-center justify-between text-xs text-gray-400 mt-1.5 pt-1.5 border-t border-white/5">
              <span>{todaySalesStats.count} ticket{todaySalesStats.count > 1 ? 's' : ''}</span>
              <span className="text-gray-300 font-semibold">Panier: {formatFCFA(todaySalesStats.avgBasket)}</span>
            </div>
          </div>

          {/* Card 2: VENTES DU MOIS (MENSUELLES) */}
          <div 
            onClick={() => {
              setDateFilter('THIS_MONTH');
              setActiveTab('TICKETS');
            }}
            className="bg-gradient-to-br from-purple-500/15 via-[#181c2f] to-[#181c2f] p-4 rounded-2xl border border-purple-500/30 hover:border-purple-400/60 transition-all cursor-pointer group shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
                Ventes du Mois ({formatMonthLabel(currentMonthStr)})
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Mensuel
              </span>
            </div>
            <span className="text-xl sm:text-2xl font-black text-purple-300 mt-2 block tracking-tight">
              {formatFCFA(currentMonthSalesStats.total)}
            </span>
            <div className="flex items-center justify-between text-xs text-gray-400 mt-1.5 pt-1.5 border-t border-white/5">
              <span>{currentMonthSalesStats.count} transaction{currentMonthSalesStats.count > 1 ? 's' : ''}</span>
              <span className="text-gray-300 font-semibold">Moy/Jour: {formatFCFA(currentMonthSalesStats.dailyAvg)}</span>
            </div>
          </div>

          {/* Card 3: PANIER MOYEN & PERFORMANCE */}
          <div className="bg-[#181c2f]/90 p-4 rounded-2xl border border-white/5 space-y-1">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              Panier Moyen (Période)
            </span>
            <span className="text-xl sm:text-2xl font-black text-emerald-400 block tracking-tight">
              {formatFCFA(metrics.averageBasket)}
            </span>
            <div className="flex items-center justify-between text-xs text-gray-400 pt-1.5 border-t border-white/5">
              <span>Remises: <strong className="text-purple-300">{formatFCFA(metrics.totalDiscounts)}</strong></span>
              <span>{metrics.count} reçus</span>
            </div>
          </div>

          {/* Card 4: CHIFFRE TOTAL FILTRÉ */}
          <div className="bg-[#181c2f]/90 p-4 rounded-2xl border border-white/5 space-y-1">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-cyan-400" />
              Total Période Sélectionnée
            </span>
            <span className="text-xl sm:text-2xl font-black text-cyan-400 block tracking-tight">
              {formatFCFA(metrics.totalRevenue)}
            </span>
            <div className="flex items-center justify-between text-xs text-gray-400 pt-1.5 border-t border-white/5">
              <span className="truncate">Filtre: {dateFilter}</span>
              <span className="text-white font-bold">{filteredPayments.length} factures</span>
            </div>
          </div>

        </div>

        {/* TAB NAVIGATION SWITCHER: Tickets vs Daily vs Monthly */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-white/10 overflow-x-auto">
          <button
            onClick={() => setActiveTab('TICKETS')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'TICKETS'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                : 'bg-[#181c2f] text-gray-300 hover:bg-white/10 border border-white/5'
            }`}
          >
            <History className="w-4 h-4" />
            <span>1. Factures Détaillées ({filteredPayments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('DAILY')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'DAILY'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                : 'bg-[#181c2f] text-gray-300 hover:bg-white/10 border border-white/5'
            }`}
          >
            <Calendar className="w-4 h-4 text-amber-400" />
            <span>2. Synthèse Ventes Journalières ({dailyBreakdown.length} jours)</span>
          </button>

          <button
            onClick={() => setActiveTab('MONTHLY')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'MONTHLY'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                : 'bg-[#181c2f] text-gray-300 hover:bg-white/10 border border-white/5'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-purple-400" />
            <span>3. Synthèse Ventes Mensuelles ({monthlyBreakdown.length} mois)</span>
          </button>
        </div>

      </div>

      {/* Global Bluetooth Print Feedback Toast */}
      {printFeedback && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 animate-in slide-in-from-top-3 duration-300 ${
          printFeedback.success 
            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200' 
            : 'bg-rose-500/15 border-rose-500/40 text-rose-200'
        }`}>
          <div className="flex items-center gap-2.5">
            {printFeedback.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span className="text-xs sm:text-sm font-semibold">{printFeedback.message}</span>
          </div>
          <button 
            onClick={() => setPrintFeedback(null)}
            className="text-xs font-bold px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: DETAILED TICKETS LIST WITH SEARCH & FILTERS                        */}
      {/* ========================================================================= */}
      {activeTab === 'TICKETS' && (
        <div className="space-y-4">
          
          {/* Filtering & Search Bar Control Panel */}
          <div className="bg-[#121524] border border-white/10 rounded-2xl p-4 space-y-4 shadow-lg">
            
            {/* Search input and Quick Date filter */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              
              {/* Search bar */}
              <div className="md:col-span-6 relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="input-search-transactions"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Rechercher par N° Facture, Table, Serveur, Caissier, Article, Réf..."
                  className="w-full pl-10 pr-4 py-2.5 bg-[#181c2f] border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-colors"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Quick Date Selector Buttons */}
              <div className="md:col-span-6 flex flex-wrap items-center gap-1.5 overflow-x-auto">
                <button
                  onClick={() => setDateFilter('ALL')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    dateFilter === 'ALL'
                      ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                      : 'bg-[#181c2f] text-gray-300 hover:bg-white/5 border border-white/5'
                  }`}
                >
                  Toutes dates
                </button>

                <button
                  onClick={() => setDateFilter('TODAY')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                    dateFilter === 'TODAY'
                      ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                      : 'bg-[#181c2f] text-gray-300 hover:bg-white/5 border border-white/5'
                  }`}
                >
                  <Calendar className="w-3 h-3" />
                  <span>Aujourd'hui</span>
                  <span className="text-[10px] opacity-80">({formatFCFA(todaySalesStats.total)})</span>
                </button>

                <button
                  onClick={() => setDateFilter('YESTERDAY')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    dateFilter === 'YESTERDAY'
                      ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                      : 'bg-[#181c2f] text-gray-300 hover:bg-white/5 border border-white/5'
                  }`}
                >
                  Hier
                </button>

                <button
                  onClick={() => setDateFilter('LAST_7_DAYS')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    dateFilter === 'LAST_7_DAYS'
                      ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                      : 'bg-[#181c2f] text-gray-300 hover:bg-white/5 border border-white/5'
                  }`}
                >
                  7 jours
                </button>

                <button
                  onClick={() => setDateFilter('THIS_MONTH')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                    dateFilter === 'THIS_MONTH'
                      ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                      : 'bg-[#181c2f] text-gray-300 hover:bg-white/5 border border-white/5'
                  }`}
                >
                  <BarChart3 className="w-3 h-3" />
                  <span>Ce mois</span>
                  <span className="text-[10px] opacity-80">({formatFCFA(currentMonthSalesStats.total)})</span>
                </button>

                <div className="flex items-center gap-1">
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => {
                      setCustomDate(e.target.value);
                      setDateFilter('CUSTOM');
                    }}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold bg-[#181c2f] border text-white transition-colors cursor-pointer ${
                      dateFilter === 'CUSTOM' ? 'border-amber-500 text-amber-300' : 'border-white/10'
                    }`}
                  />
                </div>
              </div>

            </div>

            {/* Secondary Filter Row: Payment Method, Zone & Sort */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-white/5">
              
              {/* Payment Method filter */}
              <div>
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">
                  Moyen de Règlement
                </label>
                <select
                  id="select-payment-method-filter"
                  value={selectedMethod}
                  onChange={(e) => setSelectedMethod(e.target.value as PaymentMethod | 'ALL')}
                  className="w-full px-3 py-2 bg-[#181c2f] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500/50 cursor-pointer"
                >
                  <option value="ALL">Tous les modes de paiement</option>
                  <option value="ESPECES">💵 Espèces (Cash)</option>
                  <option value="WAVE">📲 Wave Mobile Money</option>
                  <option value="TMONEY">🟡 TMoney (Togo / WA)</option>
                  <option value="FLOOZ">🔵 Flooz (Moov)</option>
                  <option value="ORANGE_MONEY">🟠 Orange Money</option>
                  <option value="MTN_MOMO">🟡 MTN MoMo</option>
                  <option value="CARTE_BANCAIRE">💳 Carte Bancaire / TPE</option>
                </select>
              </div>

              {/* Zone filter */}
              <div>
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">
                  Zone / Emplacement
                </label>
                <select
                  id="select-zone-filter"
                  value={selectedZone}
                  onChange={(e) => setSelectedZone(e.target.value as TableZone | 'ALL')}
                  className="w-full px-3 py-2 bg-[#181c2f] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500/50 cursor-pointer"
                >
                  <option value="ALL">Toutes les zones de la boîte</option>
                  <option value="CARRE_PREMIUM">👑 Carré Premium / Or</option>
                  <option value="VIP_1">🟣 Salons VIP 1</option>
                  <option value="VIP_2">🟣 Mezzanine VIP 2</option>
                  <option value="PISTE">🔵 Piste Centrale</option>
                  <option value="COMPTOIR_BAR">🟢 Comptoir Bar</option>
                  <option value="TERRASSE">🔷 Terrasse Lounge</option>
                </select>
              </div>

              {/* Sorting */}
              <div>
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">
                  Ordre d'Affichage
                </label>
                <select
                  id="select-sort-order"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as SortOrderType)}
                  className="w-full px-3 py-2 bg-[#181c2f] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500/50 cursor-pointer"
                >
                  <option value="DATE_DESC">⏳ Plus récent en premier (Défaut)</option>
                  <option value="DATE_ASC">⏰ Plus ancien en premier</option>
                  <option value="AMOUNT_DESC">💰 Montant le plus élevé (VIP Top)</option>
                  <option value="AMOUNT_ASC">📉 Montant le plus bas</option>
                </select>
              </div>

            </div>

          </div>

          {/* Transactions List */}
          <div className="space-y-3">
            {filteredPayments.length === 0 ? (
              <div className="bg-[#121524] border border-white/10 rounded-3xl p-12 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-white/5 text-gray-400 flex items-center justify-center mx-auto">
                  <Search className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-white">Aucune transaction trouvée</h3>
                <p className="text-xs text-gray-400 max-w-md mx-auto">
                  Aucune vente ne correspond à vos critères de recherche ou de filtre actuels. Essayez de réinitialiser la période ou les filtres de recherche.
                </p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedMethod('ALL');
                    setSelectedZone('ALL');
                    setDateFilter('ALL');
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-colors cursor-pointer"
                >
                  Réinitialiser tous les filtres
                </button>
              </div>
            ) : (
              filteredPayments.map((payment) => {
                const isExpanded = expandedPaymentId === payment.id;
                const methodInfo = PAYMENT_METHOD_CONFIG[payment.paymentMethod] || {
                  label: payment.paymentMethod,
                  icon: <CreditCard className="w-3.5 h-3.5" />,
                  badge: 'bg-gray-500/20 text-gray-300 border-gray-500/30'
                };
                const isPrintingThis = printingPaymentId === payment.id;
                const itemsCount = (payment.itemsSnapshot || []).reduce((sum, item) => sum + item.quantity, 0);

                return (
                  <div 
                    key={payment.id}
                    id={`transaction-card-${payment.id}`}
                    className="bg-[#121524] border border-white/10 hover:border-amber-500/30 rounded-2xl overflow-hidden transition-all shadow-lg"
                  >
                    {/* Main Card Summary Row */}
                    <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      
                      {/* Left: Invoice ID, Timestamp, Table, Method */}
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-white/10 text-white border border-white/15">
                            #{payment.id}
                          </span>

                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${methodInfo.badge}`}>
                            {methodInfo.icon}
                            <span>{methodInfo.label}</span>
                          </span>

                          <span className="text-xs font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 rounded-lg">
                            {payment.tableName}
                          </span>

                          {payment.transactionReference && (
                            <span className="text-[11px] font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                              Réf: {payment.transactionReference}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-gray-500" />
                            <span>{formatDateTime(payment.timestamp)} ({formatDateShort(payment.timestamp)})</span>
                          </span>

                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-gray-500" />
                            <span>Serveur : <strong className="text-gray-200">{payment.serverName}</strong></span>
                          </span>

                          <span className="flex items-center gap-1">
                            <span>Caisse : <strong className="text-gray-300">{payment.cashierName}</strong></span>
                          </span>

                          <span className="text-gray-400">
                            {itemsCount} article{itemsCount > 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>

                      {/* Middle: Amount FCFA */}
                      <div className="text-left lg:text-right flex lg:flex-col justify-between items-center lg:items-end gap-1 border-t lg:border-t-0 pt-3 lg:pt-0 border-white/5">
                        <div>
                          <span className="text-xs text-gray-400 block lg:hidden">Montant Net Payé</span>
                          <span className="text-xl sm:text-2xl font-black bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 bg-clip-text text-transparent">
                            {formatFCFA(payment.totalPaidFCFA)}
                          </span>
                        </div>

                        {payment.discountFCFA > 0 && (
                          <span className="text-[11px] text-purple-400 font-semibold flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            Remise : -{formatFCFA(payment.discountFCFA)}
                            {payment.discountReason && ` (${payment.discountReason})`}
                          </span>
                        )}
                      </div>

                      {/* Right: Actions (1-Click Bluetooth Reprint, Preview, Toggle Items) */}
                      <div className="flex items-center gap-2 border-t lg:border-t-0 pt-3 lg:pt-0 border-white/5">
                        
                        {/* Direct Bluetooth Quick Reprint Button */}
                        <button
                          id={`btn-reprint-bt-${payment.id}`}
                          onClick={() => handleQuickBluetoothReprint(payment)}
                          disabled={isPrintingThis}
                          title="Réimprimer immédiatement le ticket via l'imprimante Bluetooth ESC/POS connectée"
                          className={`px-3.5 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md ${
                            isPrintingThis
                              ? 'bg-amber-500/50 text-black animate-pulse cursor-wait'
                              : 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20 active:scale-95'
                          }`}
                        >
                          <Printer className="w-4 h-4" />
                          <span>{isPrintingThis ? 'Impression BT...' : 'Réimprimer Ticket'}</span>
                        </button>

                        {/* Direct PDF Download Button */}
                        <button
                          id={`btn-pdf-receipt-${payment.id}`}
                          onClick={() => handleExportReceiptPDF(payment)}
                          title="Télécharger la facture officielle en PDF"
                          className="px-3 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm shadow-emerald-500/10"
                        >
                          <Download className="w-4 h-4 text-emerald-400" />
                          <span className="hidden sm:inline">PDF</span>
                        </button>

                        {/* Preview / Full Receipt Modal */}
                        <button
                          id={`btn-preview-receipt-${payment.id}`}
                          onClick={() => handleOpenReceiptPreview(payment)}
                          title="Ouvrir l'aperçu du reçu et les options d'impression système"
                          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4 text-cyan-400" />
                          <span className="hidden sm:inline">Aperçu</span>
                        </button>

                        {/* Expand/Collapse Items Details */}
                        <button
                          onClick={() => setExpandedPaymentId(isExpanded ? null : payment.id)}
                          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
                          title={isExpanded ? 'Masquer les articles' : 'Afficher les articles'}
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>

                    </div>

                    {/* Collapsible Items Details Breakdown */}
                    {isExpanded && (
                      <div className="px-4 sm:px-5 pb-5 pt-2 bg-[#0d101c]/80 border-t border-white/5 space-y-3">
                        <div className="flex items-center justify-between text-xs text-gray-400 font-semibold border-b border-white/5 pb-2">
                          <span>Détail des Articles Encaissés</span>
                          <span>Quantité × Prix Unitaire = Total</span>
                        </div>

                        <div className="space-y-2">
                          {(payment.itemsSnapshot || []).map((item, idx) => (
                            <div 
                              key={item.id || idx}
                              className="flex items-center justify-between text-xs py-1.5 px-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded bg-white/10 text-amber-300 font-black flex items-center justify-center text-xs">
                                  {item.quantity}×
                                </span>
                                <div>
                                  <span className="text-white font-medium">{item.productName}</span>
                                  <span className="text-[10px] text-gray-400 ml-2">({item.category})</span>
                                  {item.notes && (
                                    <p className="text-[11px] text-amber-300/80 italic">Note : {item.notes}</p>
                                  )}
                                </div>
                              </div>

                              <div className="text-right">
                                <span className="font-bold text-gray-200">{formatFCFA(item.totalPriceFCFA)}</span>
                                <span className="text-[10px] text-gray-400 block">
                                  {item.quantity} × {formatFCFA(item.unitPriceFCFA)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Financial Summary Breakdown */}
                        <div className="bg-white/5 p-3 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="space-y-0.5">
                            <span className="text-gray-400">Sous-Total Brut : <strong>{formatFCFA(payment.subTotalFCFA)}</strong></span>
                            {payment.discountFCFA > 0 && (
                              <span className="text-purple-300 block">
                                Remise Appliquée : -{formatFCFA(payment.discountFCFA)} ({payment.discountReason || 'Remise accordée'})
                              </span>
                            )}
                            {payment.cashGivenFCFA && (
                              <span className="text-emerald-300 block">
                                Espèces Reçues : {formatFCFA(payment.cashGivenFCFA)} | Monnaie Rendue : {formatFCFA(payment.changeReturnedFCFA || 0)}
                              </span>
                            )}
                          </div>

                          <div className="text-right">
                            <span className="text-gray-400 block text-[11px]">Total Net Encaissé</span>
                            <span className="text-base font-black text-amber-400">{formatFCFA(payment.totalPaidFCFA)}</span>
                          </div>
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

      {/* ========================================================================= */}
      {/* TAB 2: SYNTHÈSE DES VENTES JOURNALIÈRES (PAR JOUR)                        */}
      {/* ========================================================================= */}
      {activeTab === 'DAILY' && (
        <div className="space-y-4">
          
          {/* Header Description */}
          <div className="bg-[#121524] border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>Récapitulatif des Ventes Quotidiennes</span>
              </div>
              <h3 className="text-base font-bold text-white">
                Historique des Chiffres d'Affaires Journaliers
              </h3>
              <p className="text-xs text-gray-400">
                Consultez le total encaissé jour par jour, le nombre de tickets et le détail des modes de règlement.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-gray-400 font-medium">Total jours d'activité :</span>
              <span className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-black">
                {dailyBreakdown.length} jours
              </span>
            </div>
          </div>

          {/* Daily Breakdown List / Table Cards */}
          {dailyBreakdown.length === 0 ? (
            <div className="bg-[#121524] border border-white/10 rounded-3xl p-12 text-center text-gray-400 space-y-2">
              <Calendar className="w-8 h-8 text-gray-500 mx-auto" />
              <p className="text-sm font-bold text-white">Aucune vente enregistrée pour le moment</p>
            </div>
          ) : (
            <div className="space-y-3">
              {dailyBreakdown.map((day) => (
                <div
                  key={day.date}
                  className={`bg-[#121524] border rounded-2xl p-5 transition-all shadow-md ${
                    day.isToday 
                      ? 'border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-[#121524] to-[#121524]' 
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    
                    {/* Left: Date info */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm sm:text-base font-black text-white capitalize flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-amber-400" />
                          {day.formattedDate}
                        </span>
                        {day.isToday && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Aujourd'hui
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                        <span>{day.count} transaction{day.count > 1 ? 's' : ''}</span>
                        <span>{day.itemsCount} article{day.itemsCount > 1 ? 's' : ''} vendus</span>
                        <span>Top Serveur : <strong className="text-gray-200">{day.topServer}</strong></span>
                        <span>Panier moyen : <strong className="text-emerald-300">{formatFCFA(day.avgBasket)}</strong></span>
                      </div>
                    </div>

                    {/* Middle: Payment breakdown */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {day.cashTotal > 0 && (
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-semibold flex items-center gap-1">
                          <Banknote className="w-3 h-3" />
                          Espèces : {formatFCFA(day.cashTotal)}
                        </span>
                      )}
                      {day.mobileTotal > 0 && (
                        <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-semibold flex items-center gap-1">
                          <Smartphone className="w-3 h-3" />
                          Mobile Money : {formatFCFA(day.mobileTotal)}
                        </span>
                      )}
                      {day.cardTotal > 0 && (
                        <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 font-semibold flex items-center gap-1">
                          <CreditCard className="w-3 h-3" />
                          Carte : {formatFCFA(day.cardTotal)}
                        </span>
                      )}
                    </div>

                    {/* Right: Revenue & Action */}
                    <div className="flex items-center justify-between lg:justify-end gap-4 border-t lg:border-t-0 pt-3 lg:pt-0 border-white/5">
                      <div className="text-left lg:text-right">
                        <span className="text-[11px] text-gray-400 block">Total Encaissé</span>
                        <span className="text-lg sm:text-xl font-black text-amber-400">
                          {formatFCFA(day.totalRevenue)}
                        </span>
                      </div>

                      <button
                        onClick={() => handleFilterToDay(day.date)}
                        className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/10 active:scale-95 cursor-pointer"
                        title="Voir la liste complète des tickets de cette journée"
                      >
                        <span>Voir Tickets</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SYNTHÈSE DES VENTES MENSUELLES (PAR MOIS)                          */}
      {/* ========================================================================= */}
      {activeTab === 'MONTHLY' && (
        <div className="space-y-4">
          
          {/* Header Description */}
          <div className="bg-[#121524] border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-xs font-black text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Récapitulatif des Ventes Mensuelles</span>
              </div>
              <h3 className="text-base font-bold text-white">
                Historique des Chiffres d'Affaires par Mois
              </h3>
              <p className="text-xs text-gray-400">
                Visualisez la performance globale mois par mois, la moyenne journalière et la répartition des règlements.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-gray-400 font-medium">Total mois enregistrés :</span>
              <span className="px-3 py-1 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-black">
                {monthlyBreakdown.length} mois
              </span>
            </div>
          </div>

          {/* Monthly Breakdown Cards */}
          {monthlyBreakdown.length === 0 ? (
            <div className="bg-[#121524] border border-white/10 rounded-3xl p-12 text-center text-gray-400 space-y-2">
              <BarChart3 className="w-8 h-8 text-gray-500 mx-auto" />
              <p className="text-sm font-bold text-white">Aucun mois de vente enregistré pour le moment</p>
            </div>
          ) : (
            <div className="space-y-3">
              {monthlyBreakdown.map((month) => (
                <div
                  key={month.monthKey}
                  className={`bg-[#121524] border rounded-2xl p-5 transition-all shadow-md ${
                    month.isCurrentMonth
                      ? 'border-purple-500/40 bg-gradient-to-r from-purple-500/10 via-[#121524] to-[#121524]'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    
                    {/* Left: Month Info */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base sm:text-lg font-black text-white capitalize flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-purple-400" />
                          {month.monthLabel}
                        </span>
                        {month.isCurrentMonth && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            Mois en Cours
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                        <span>{month.count} transactions</span>
                        <span>{month.activeDaysCount} jours d'activité</span>
                        <span>Moyenne/Jour : <strong className="text-gray-200">{formatFCFA(month.dailyAvg)}</strong></span>
                        <span>Panier moyen : <strong className="text-emerald-300">{formatFCFA(month.avgBasket)}</strong></span>
                        {month.totalDiscounts > 0 && (
                          <span className="text-purple-300">Remises : -{formatFCFA(month.totalDiscounts)}</span>
                        )}
                      </div>
                    </div>

                    {/* Middle: Method Summary */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {month.cashTotal > 0 && (
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-semibold">
                          Espèces : {formatFCFA(month.cashTotal)}
                        </span>
                      )}
                      {month.mobileTotal > 0 && (
                        <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-semibold">
                          Mobile Money : {formatFCFA(month.mobileTotal)}
                        </span>
                      )}
                      {month.cardTotal > 0 && (
                        <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 font-semibold">
                          Carte : {formatFCFA(month.cardTotal)}
                        </span>
                      )}
                    </div>

                    {/* Right: Revenue & Action */}
                    <div className="flex items-center justify-between lg:justify-end gap-4 border-t lg:border-t-0 pt-3 lg:pt-0 border-white/5">
                      <div className="text-left lg:text-right">
                        <span className="text-[11px] text-gray-400 block">Total Chiffre d'Affaires</span>
                        <span className="text-xl sm:text-2xl font-black text-purple-300">
                          {formatFCFA(month.totalRevenue)}
                        </span>
                      </div>

                      <button
                        onClick={() => handleFilterToMonth(month.monthKey)}
                        className="px-3.5 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-purple-500/10 active:scale-95 cursor-pointer"
                        title="Voir la liste des tickets de ce mois"
                      >
                        <span>Voir Factures</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* Embedded Thermal Receipt Preview Modal */}
      {previewPayment && (
        <ThermalReceiptModal
          payment={previewPayment}
          isOpen={isReceiptModalOpen}
          onClose={() => {
            setIsReceiptModalOpen(false);
            setPreviewPayment(null);
          }}
        />
      )}

      {/* Director Reset Sales History Modal */}
      <ResetSalesHistoryModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
      />

    </div>
  );
};
