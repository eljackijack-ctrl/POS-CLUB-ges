import React, { useState, useMemo } from 'react';
import { 
  BarChart3, DollarSign, Users, Award, 
  Printer, Sparkles, TrendingUp, CreditCard, 
  RotateCcw, CheckCircle2, Calendar, Clock,
  Flame, Wine, Download, Upload, ShieldCheck,
  FileSpreadsheet, Database, ArrowUpRight, ChevronRight,
  HelpCircle, Trash2, RefreshCw, FileText, Check,
  Bluetooth, Building2, AlertCircle, Receipt, History, Laptop, Wifi,
  HardDrive, FolderCheck
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  Tooltip, AreaChart, Area, CartesianGrid, Cell 
} from 'recharts';
import { usePOS } from '../context/POSContext';
import { ShiftReport, PaymentMethod, DailyReport, MonthlyReport, DailyBackupSnapshot } from '../types';
import { formatFCFA, formatDateTime, formatDateShort } from '../utils/formatters';
import { printViaWebBluetooth, ESCPOSReceiptData } from '../utils/escpos';
import { exportDailyZReportPDF, exportMonthlyReportPDF } from '../utils/pdfGenerator';
import { TransactionsHistoryView } from './TransactionsHistoryView';
import { ResetSalesHistoryModal } from './ResetSalesHistoryModal';
import confetti from 'canvas-confetti';
import { Radio, Share2 } from 'lucide-react';

type ReportTab = 'DAILY' | 'TRANSACTIONS' | 'MONTHLY' | 'BACKUPS' | 'SHIFT_LIVE';

interface NightReportViewProps {
  onOpenShareDirector?: () => void;
}

export const NightReportView: React.FC<NightReportViewProps> = ({
  onOpenShareDirector
}) => {
  const { 
    getLiveShiftReport, 
    closeNightShift, 
    shiftStartTime, 
    currentUser, 
    resetAllToFactoryDefaults,
    getDailyReport,
    getMonthlyReport,
    getAvailableDates,
    getAvailableMonths,
    saveEndOfDayClosing,
    exportDailyBackupJSON,
    exportSalesCSV,
    importBackupJSON,
    deleteArchivedBackup,
    archivedDailyBackups,
    payments,
    companyProfile,
    printerConfig,
    setShowPrinterSettingsModal,
    setShowCompanyProfileModal,
    setShowDeviceStationModal,
    deviceSignature,
    setShowDiskBackupModal,
    diskBackupConfig,
    diskBackupFiles,
    saveBackupToDiskNow,
    isDiskBackupRunning
  } = usePOS();

  const [activeSubTab, setActiveSubTab] = useState<ReportTab>('DAILY');
  const [isPrintingBT, setIsPrintingBT] = useState<boolean>(false);
  const [btStatusMsg, setBtStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Dates & Months selections
  const availableDates = useMemo(() => getAvailableDates(), [payments]);
  const availableMonths = useMemo(() => getAvailableMonths(), [payments]);

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return availableDates[0] || new Date().toISOString().split('T')[0];
  });

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return availableMonths[0]?.value || new Date().toISOString().substring(0, 7);
  });

  // End of Day Closing modal & state
  const [isClosingModalOpen, setIsClosingModalOpen] = useState<boolean>(false);
  const [isResetSalesModalOpen, setIsResetSalesModalOpen] = useState<boolean>(false);
  const [closingNotes, setClosingNotes] = useState<string>('');
  const [closingSuccessMessage, setClosingSuccessMessage] = useState<string | null>(null);

  // Import State
  const [importStatusMessage, setImportStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Data Calculations
  const liveShiftReport: ShiftReport = getLiveShiftReport();
  const dailyReport: DailyReport = useMemo(() => getDailyReport(selectedDate), [selectedDate, payments]);
  const monthlyReport: MonthlyReport = useMemo(() => getMonthlyReport(selectedMonth), [selectedMonth, payments]);

  // Bluetooth Z-Report Print Handler
  const handlePrintBluetoothZReport = async () => {
    setIsPrintingBT(true);
    setBtStatusMsg({ type: 'info', text: 'Envoi du rapport Z vers l’imprimante Bluetooth...' });
    
    try {
      // Create a typed payment representation for ESC/POS Z print formatting
      const dummyPayment: import('../types').Payment = {
        id: `Z-${selectedDate}`,
        orderId: `SHIFT-${selectedDate}`,
        tableId: 'CLOTURE_Z',
        tableName: 'RAPPORT DE CLÔTURE Z',
        serverId: currentUser.id,
        serverName: currentUser.name,
        cashierId: currentUser.id,
        cashierName: currentUser.name,
        subTotalFCFA: dailyReport.totalRevenueFCFA,
        discountFCFA: 0,
        taxFCFA: 0,
        totalPaidFCFA: dailyReport.totalRevenueFCFA,
        paymentMethod: 'ESPECES',
        cashGivenFCFA: dailyReport.totalRevenueFCFA,
        changeReturnedFCFA: 0,
        timestamp: new Date().toISOString(),
        itemsSnapshot: dailyReport.topProducts.slice(0, 8).map(p => ({
          id: `item-${p.productId}`,
          productId: p.productId,
          productName: p.productName,
          category: p.category || 'CHAMPAGNE',
          format: 'BOUTEILLE',
          quantity: p.quantitySold,
          unitPriceFCFA: p.quantitySold > 0 ? Math.round(p.totalFCFA / p.quantitySold) : 0,
          totalPriceFCFA: p.totalFCFA,
          status: 'SERVI' as const
        }))
      };

      const res = await printViaWebBluetooth({
        companyProfile,
        payment: dummyPayment,
        paperWidth: printerConfig.paperWidth,
        copyLabel: `RAPPORT Z DU ${formatDateShort(selectedDate)}`
      });

      setIsPrintingBT(false);
      if (res.success) {
        setBtStatusMsg({ type: 'success', text: `Rapport Z du ${formatDateShort(selectedDate)} imprimé avec succès !` });
      } else {
        setBtStatusMsg({ type: 'error', text: res.message });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setIsPrintingBT(false);
      setBtStatusMsg({ type: 'error', text: `Erreur: ${msg}` });
    }

    setTimeout(() => setBtStatusMsg(null), 5000);
  };

  // Handle End of Day save
  const handleConfirmEndOfDayClosing = () => {
    const backupSnapshot = saveEndOfDayClosing(closingNotes);
    setIsClosingModalOpen(false);
    setClosingNotes('');
    setClosingSuccessMessage(`Clôture du ${backupSnapshot.backupDate} enregistrée et archivée avec succès !`);
    
    confetti({
      particleCount: 150,
      spread: 90,
      origin: { y: 0.6 }
    });

    setTimeout(() => {
      setClosingSuccessMessage(null);
    }, 5000);
  };

  // Handle File Upload for Backup JSON Import
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const res = importBackupJSON(content);
        if (res.success) {
          setImportStatusMessage({ type: 'success', text: res.message });
        } else {
          setImportStatusMessage({ type: 'error', text: res.message });
        }
        setTimeout(() => setImportStatusMessage(null), 6000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportDailyPDF = () => {
    try {
      exportDailyZReportPDF(dailyReport, companyProfile, selectedDate);
      setClosingSuccessMessage(`Rapport Z du ${formatDateShort(selectedDate)} téléchargé en PDF !`);
      setTimeout(() => setClosingSuccessMessage(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setBtStatusMsg({ type: 'error', text: `Erreur PDF: ${msg}` });
      setTimeout(() => setBtStatusMsg(null), 5000);
    }
  };

  const handleExportMonthlyPDF = () => {
    try {
      exportMonthlyReportPDF(monthlyReport, companyProfile);
      setClosingSuccessMessage(`Bilan mensuel ${monthlyReport.monthLabel} téléchargé en PDF !`);
      setTimeout(() => setClosingSuccessMessage(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setBtStatusMsg({ type: 'error', text: `Erreur PDF: ${msg}` });
      setTimeout(() => setBtStatusMsg(null), 5000);
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Sub navigation bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#131625] p-2.5 rounded-2xl border border-white/10">
        
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            id="tab-report-daily"
            onClick={() => setActiveSubTab('DAILY')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'DAILY'
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/25'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Ventes Journalières</span>
          </button>

          <button
            id="tab-report-transactions"
            onClick={() => setActiveSubTab('TRANSACTIONS')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'TRANSACTIONS'
                ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/25'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Receipt className="w-4 h-4 text-indigo-300" />
            <span>Historique & Réimpression</span>
            {payments.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-white/20 text-current">
                {payments.length}
              </span>
            )}
          </button>

          <button
            id="tab-report-monthly"
            onClick={() => setActiveSubTab('MONTHLY')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'MONTHLY'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Ventes Mensuelles</span>
          </button>

          <button
            id="tab-report-backups"
            onClick={() => setActiveSubTab('BACKUPS')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'BACKUPS'
                ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/25'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Sauvegarde Fin de Journée</span>
            {archivedDailyBackups.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-white/20 text-current">
                {archivedDailyBackups.length}
              </span>
            )}
          </button>

          <button
            id="tab-report-live"
            onClick={() => setActiveSubTab('SHIFT_LIVE')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'SHIFT_LIVE'
                ? 'bg-blue-500 text-white shadow-md shadow-blue-500/25'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Shift en Cours (Live Z)</span>
          </button>
        </div>

        {/* Global Action Tools */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Bluetooth Z-Report Button */}
          <button
            id="btn-print-bt-z-report"
            onClick={handlePrintBluetoothZReport}
            disabled={isPrintingBT}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20 transition-all cursor-pointer disabled:opacity-50"
            title="Imprimer le ticket de clôture Z sur l'imprimante Bluetooth"
          >
            <Bluetooth className="w-3.5 h-3.5" />
            <span>{isPrintingBT ? 'Impression...' : 'Ticket Z Bluetooth'}</span>
          </button>

          {/* Direct PDF Export based on active subtab */}
          <button
            id="btn-export-pdf-report"
            onClick={activeSubTab === 'MONTHLY' ? handleExportMonthlyPDF : handleExportDailyPDF}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all active:scale-95 cursor-pointer"
            title="Enregistrer le rapport complet au format PDF officiel"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{activeSubTab === 'MONTHLY' ? 'Télécharger Bilan PDF' : 'Enregistrer Rapport Z (PDF)'}</span>
          </button>

          <button
            id="btn-print-report"
            onClick={handlePrint}
            className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Imprimer ou aperçu avant impression"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            <span>Imprimer Système</span>
          </button>

          <button
            id="btn-open-closing-modal"
            onClick={() => setIsClosingModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Clôturer & Sauvegarder</span>
          </button>
        </div>

      </div>

      {/* Bluetooth Status Banner */}
      {btStatusMsg && (
        <div className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fadeIn ${
          btStatusMsg.type === 'success' 
            ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300' 
            : btStatusMsg.type === 'error'
            ? 'bg-rose-500/20 border border-rose-500/40 text-rose-300'
            : 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300'
        }`}>
          {btStatusMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          )}
          <span>{btStatusMsg.text}</span>
        </div>
      )}

      {/* Success / Feedback Notification Banner */}
      {closingSuccessMessage && (
        <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 p-3 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{closingSuccessMessage}</span>
        </div>
      )}

      {importStatusMessage && (
        <div className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fadeIn ${
          importStatusMessage.type === 'success' 
            ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300' 
            : 'bg-rose-500/20 border border-rose-500/40 text-rose-300'
        }`}>
          {importStatusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <HelpCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{importStatusMessage.text}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. TRANSACTIONS HISTORY VIEW */}
      {/* ========================================================================= */}
      {activeSubTab === 'TRANSACTIONS' && (
        <TransactionsHistoryView />
      )}

      {/* ========================================================================= */}
      {/* 2. DAILY SALES REPORT VIEW (Rapports Ventes Journalières) */}
      {/* ========================================================================= */}
      {activeSubTab === 'DAILY' && (
        <div className="space-y-4">
          
          {/* Day Selector & Export Tools */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#131625] p-3.5 rounded-2xl border border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <label className="text-[11px] text-gray-400 block font-medium">Sélectionner la date de la soirée :</label>
                <div className="flex items-center gap-2 mt-0.5">
                  <select
                    id="select-daily-date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-[#0c0e17] border border-white/15 text-white font-bold text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    {availableDates.map(d => {
                      const [y, m, day] = d.split('-');
                      return (
                        <option key={d} value={d}>
                          {day}/{m}/{y} {d === new Date().toISOString().split('T')[0] ? '(Aujourd’hui)' : ''}
                        </option>
                      );
                    })}
                  </select>

                  <button
                    onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                    className="text-[11px] font-semibold px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                  >
                    Aujourd'hui
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="btn-export-daily-csv"
                onClick={() => exportSalesCSV('DAILY', selectedDate)}
                className="px-3 py-1.5 rounded-xl bg-[#1f2338] hover:bg-[#282d47] border border-white/10 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Exporter CSV Journalier</span>
              </button>

              <button
                id="btn-export-daily-backup-json"
                onClick={() => exportDailyBackupJSON(selectedDate)}
                className="px-3 py-1.5 rounded-xl bg-[#1f2338] hover:bg-[#282d47] border border-white/10 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>Sauvegarder Journée (.JSON)</span>
              </button>
            </div>
          </div>

          {/* Daily Grand Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            
            <div className="bg-gradient-to-br from-[#1d1a2c] to-[#121422] border border-amber-500/40 p-4 rounded-2xl shadow-xl shadow-amber-500/5">
              <div className="flex items-center justify-between text-xs text-amber-300 font-semibold mb-1">
                <span>RECETTE DU JOUR (FCFA)</span>
                <DollarSign className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-amber-400 font-mono tracking-tight">
                {formatFCFA(dailyReport.totalRevenueFCFA)}
              </div>
              <div className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>{dailyReport.totalOrdersCount} additions réglées</span>
              </div>
            </div>

            <div className="bg-[#131625] border border-white/10 p-4 rounded-2xl">
              <div className="flex items-center justify-between text-xs text-gray-400 font-semibold mb-1">
                <span>PANIER MOYEN / TABLE</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                {formatFCFA(dailyReport.averageBasketFCFA)}
              </div>
              <div className="text-[11px] text-gray-400 mt-1">
                Dépense moyenne par table encaissée
              </div>
            </div>

            <div className="bg-[#131625] border border-white/10 p-4 rounded-2xl">
              <div className="flex items-center justify-between text-xs text-gray-400 font-semibold mb-1">
                <span>ESPÈCES EN CAISSE</span>
                <CreditCard className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-black text-blue-400 font-mono">
                {formatFCFA(dailyReport.paymentsByMethod.ESPECES || 0)}
              </div>
              <div className="text-[11px] text-gray-400 mt-1">
                Cash physique dans le tiroir-caisse
              </div>
            </div>

            <div className="bg-[#131625] border border-white/10 p-4 rounded-2xl">
              <div className="flex items-center justify-between text-xs text-gray-400 font-semibold mb-1">
                <span>MOBILE MONEY & CARTE</span>
                <Flame className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-black text-purple-300 font-mono">
                {formatFCFA(
                  (dailyReport.paymentsByMethod.TMONEY || 0) +
                  (dailyReport.paymentsByMethod.FLOOZ || 0) +
                  (dailyReport.paymentsByMethod.WAVE || 0) +
                  (dailyReport.paymentsByMethod.ORANGE_MONEY || 0) +
                  (dailyReport.paymentsByMethod.MTN_MOMO || 0) +
                  (dailyReport.paymentsByMethod.CARTE_BANCAIRE || 0)
                )}
              </div>
              <div className="text-[11px] text-gray-400 mt-1">
                Total paiements dématérialisés
              </div>
            </div>

          </div>

          {/* Hourly Curve Chart (20h to 06h Nightclub activity) */}
          <div className="bg-[#131625] border border-white/10 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-amber-400" />
                  <span>Distribution des Ventes par Tranche Horaire (20h00 - 06h00)</span>
                </h3>
                <p className="text-xs text-gray-400">Heures de pointe et fréquentation du club pour la soirée du {dailyReport.dateFormatted}</p>
              </div>
              <span className="text-xs font-mono text-amber-400 font-bold bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                Pic Nocturne
              </span>
            </div>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyReport.hourlySales} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="label" stroke="#9ca3af" fontSize={11} tickLine={false} />
                  <YAxis 
                    stroke="#9ca3af" 
                    fontSize={11} 
                    tickFormatter={(v) => `${v / 1000}k`}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0c0e17', borderColor: '#374151', borderRadius: '12px' }}
                    labelStyle={{ color: '#fbbf24', fontWeight: 'bold' }}
                    formatter={(value: any) => [`${formatFCFA(Number(value))}`, "Chiffre d'affaires"]}
                  />
                  <Bar dataKey="revenueFCFA" radius={[6, 6, 0, 0]}>
                    {dailyReport.hourlySales.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.revenueFCFA > 500000 ? '#f59e0b' : entry.revenueFCFA > 0 ? '#6366f1' : '#374151'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Grid 2 Columns: Category Breakdown & Payment Methods */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* Payment Method Breakdown */}
            <div className="bg-[#131625] border border-white/10 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-amber-400" />
                  <span>Répartition des Modes de Règlement</span>
                </h3>
                <span className="text-xs text-gray-400 font-mono">Total: {formatFCFA(dailyReport.totalRevenueFCFA)}</span>
              </div>

              <div className="space-y-2.5">
                {Object.entries(dailyReport.paymentsByMethod).map(([method, val]) => {
                  const amount = Number(val) || 0;
                  const percent = dailyReport.totalRevenueFCFA > 0 ? (amount / dailyReport.totalRevenueFCFA) * 100 : 0;
                  return (
                    <div key={method} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-300 font-medium">{method.replace('_', ' ')}</span>
                        <span className="font-mono font-bold text-white">{formatFCFA(amount)} ({percent.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full h-2 bg-[#0c0e17] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sales by Category */}
            <div className="bg-[#131625] border border-white/10 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Wine className="w-4 h-4 text-purple-400" />
                  <span>Ventes par Famille de Produits</span>
                </h3>
                <span className="text-xs text-gray-400">
                  {dailyReport.salesByCategory.reduce((a, c) => a + c.quantitySold, 0)} articles vendus
                </span>
              </div>

              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {dailyReport.salesByCategory.length === 0 ? (
                  <p className="text-xs text-gray-400 py-4 text-center">Aucune vente enregistrée à cette date.</p>
                ) : (
                  dailyReport.salesByCategory.map(cat => {
                    const pct = dailyReport.totalRevenueFCFA > 0 ? (cat.totalFCFA / dailyReport.totalRevenueFCFA) * 100 : 0;
                    return (
                      <div key={cat.category} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-200 font-semibold">{cat.categoryLabel} ({cat.quantitySold} unités)</span>
                          <span className="font-mono font-bold text-amber-400">{formatFCFA(cat.totalFCFA)} ({pct.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full h-2 bg-[#0c0e17] rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>

          {/* Top Products of the Day */}
          <div className="bg-[#131625] border border-white/10 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                <span>Palmarès des Meilleures Ventes du Jour (Top Bouteilles & Conso)</span>
              </h3>
              <span className="text-xs text-gray-400">{dailyReport.topProducts.length} références débitées</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-gray-400 border-b border-white/10 font-semibold">
                    <th className="pb-2">Rang</th>
                    <th className="pb-2">Bouteille / Produit</th>
                    <th className="pb-2">Catégorie</th>
                    <th className="pb-2 text-center">Quantité Débitée</th>
                    <th className="pb-2 text-right">Recette Générée (FCFA)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {dailyReport.topProducts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-gray-500">
                        Aucune vente pour cette journée.
                      </td>
                    </tr>
                  ) : (
                    dailyReport.topProducts.slice(0, 8).map((prod, idx) => (
                      <tr key={prod.productId} className="hover:bg-white/5">
                        <td className="py-2.5 font-bold font-mono">
                          <span className={`w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] ${
                            idx === 0 ? 'bg-amber-500 text-black font-black' :
                            idx === 1 ? 'bg-gray-300 text-black font-bold' :
                            idx === 2 ? 'bg-amber-700 text-white font-bold' : 'bg-white/10 text-gray-300'
                          }`}>
                            {idx + 1}
                          </span>
                        </td>
                        <td className="py-2.5 font-semibold text-white">{prod.productName}</td>
                        <td className="py-2.5 text-gray-400">{prod.categoryName}</td>
                        <td className="py-2.5 text-center font-bold text-purple-300">{prod.quantitySold} btles/unités</td>
                        <td className="py-2.5 text-right font-mono font-bold text-amber-400">{formatFCFA(prod.totalFCFA)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Performance Serveurs et Zones */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* Sales by Server */}
            <div className="bg-[#131625] border border-white/10 rounded-2xl p-4 space-y-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span>Performance des Serveurs / Rang</span>
              </h3>
              <div className="space-y-2">
                {(!dailyReport?.salesByServer || dailyReport.salesByServer.length === 0) ? (
                  <p className="text-xs text-gray-500 py-3 text-center">Aucun service enregistré.</p>
                ) : (
                  (dailyReport.salesByServer || []).map((srv, idx) => (
                    <div key={srv.serverId} className="flex items-center justify-between p-2.5 bg-[#0c0e17] rounded-xl border border-white/5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold text-xs">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">{srv.serverName}</p>
                          <p className="text-[10px] text-gray-400">{srv.ordersCount} tables servies</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-mono font-bold text-amber-400">{formatFCFA(srv.totalFCFA)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Sales by Zone */}
            <div className="bg-[#131625] border border-white/10 rounded-2xl p-4 space-y-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Wine className="w-4 h-4 text-emerald-400" />
                <span>Recette par Zone (VIP, Carré, Piste, Bar)</span>
              </h3>
              <div className="space-y-2">
                {(dailyReport?.salesByZone || []).map(zone => (
                  <div key={zone.zone} className="flex items-center justify-between p-2.5 bg-[#0c0e17] rounded-xl border border-white/5">
                    <div>
                      <p className="text-xs font-bold text-white">{zone.zoneLabel}</p>
                      <p className="text-[10px] text-gray-400">{zone.ordersCount} additions</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-mono font-bold text-emerald-400">{formatFCFA(zone.totalFCFA)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MONTHLY SALES REPORT VIEW (Rapports Ventes Mensuelles) */}
      {/* ========================================================================= */}
      {activeSubTab === 'MONTHLY' && (
        <div className="space-y-4">
          
          {/* Month Selector & Export Tools */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#131625] p-3.5 rounded-2xl border border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <label className="text-[11px] text-gray-400 block font-medium">Sélectionner le mois :</label>
                <div className="flex items-center gap-2 mt-0.5">
                  <select
                    id="select-monthly-period"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-[#0c0e17] border border-white/15 text-white font-bold text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-purple-500 cursor-pointer"
                  >
                    {availableMonths.map(m => (
                      <option key={m.value} value={m.value}>
                        {m.label} ({m.value})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="btn-export-monthly-csv"
                onClick={() => exportSalesCSV('MONTHLY', selectedMonth)}
                className="px-3 py-1.5 rounded-xl bg-[#1f2338] hover:bg-[#282d47] border border-white/10 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Exporter CSV Mensuel</span>
              </button>
            </div>
          </div>

          {/* Monthly Grand Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            
            <div className="bg-gradient-to-br from-[#1d1a2c] to-[#121422] border border-purple-500/40 p-4 rounded-2xl shadow-xl shadow-purple-500/5">
              <div className="flex items-center justify-between text-xs text-purple-300 font-semibold mb-1">
                <span>TOTAL CHIFFRE D'AFFAIRES</span>
                <DollarSign className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-black text-purple-300 font-mono tracking-tight">
                {formatFCFA(monthlyReport.totalRevenueFCFA)}
              </div>
              <div className="text-[11px] text-gray-400 mt-1">
                Mois de {monthlyReport.monthLabel}
              </div>
            </div>

            <div className="bg-[#131625] border border-white/10 p-4 rounded-2xl">
              <div className="flex items-center justify-between text-xs text-gray-400 font-semibold mb-1">
                <span>MOYENNE PAR SOIRÉE OUVERTE</span>
                <TrendingUp className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-amber-400 font-mono">
                {formatFCFA(monthlyReport.averageDailyRevenueFCFA)}
              </div>
              <div className="text-[11px] text-gray-400 mt-1">
                Recette moyenne par date d'ouverture
              </div>
            </div>

            <div className="bg-[#131625] border border-white/10 p-4 rounded-2xl">
              <div className="flex items-center justify-between text-xs text-gray-400 font-semibold mb-1">
                <span>MEILLEURE SOIRÉE DU MOIS</span>
                <Award className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl font-black text-emerald-400 font-mono">
                {monthlyReport.bestDay ? formatFCFA(monthlyReport.bestDay.revenueFCFA) : '0 FCFA'}
              </div>
              <div className="text-[11px] text-gray-400 mt-1">
                {monthlyReport.bestDay ? `Record du ${monthlyReport.bestDay.dateFormatted}` : 'Aucune donnée'}
              </div>
            </div>

            <div className="bg-[#131625] border border-white/10 p-4 rounded-2xl">
              <div className="flex items-center justify-between text-xs text-gray-400 font-semibold mb-1">
                <span>TOTAL ADDITIONS ENCAISSÉES</span>
                <Users className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-black text-white font-mono">
                {monthlyReport.totalOrdersCount}
              </div>
              <div className="text-[11px] text-gray-400 mt-1">
                Panier moyen mensuel : {formatFCFA(monthlyReport.averageBasketFCFA)}
              </div>
            </div>

          </div>

          {/* Daily Evolution Curve Chart */}
          <div className="bg-[#131625] border border-white/10 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-400" />
                  <span>Évolution Quotidienne des Recettes (Jours 1 à 31)</span>
                </h3>
                <p className="text-xs text-gray-400">Courbe de performance de chaque soirée du mois</p>
              </div>
              <span className="text-xs font-mono text-purple-300 font-bold bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20">
                {monthlyReport.monthLabel}
              </span>
            </div>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyReport.dailyBreakdown} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="dayLabel" stroke="#9ca3af" fontSize={10} tickLine={false} />
                  <YAxis 
                    stroke="#9ca3af" 
                    fontSize={11} 
                    tickFormatter={(v) => `${v / 1000}k`}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0c0e17', borderColor: '#374151', borderRadius: '12px' }}
                    labelStyle={{ color: '#d8b4fe', fontWeight: 'bold' }}
                    formatter={(value: any) => [`${formatFCFA(Number(value))}`, "Recette du Jour"]}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenueFCFA" 
                    stroke="#a855f7" 
                    strokeWidth={2.5}
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Grid: Monthly Categories and Top Products */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* Monthly Categories Breakdown */}
            <div className="bg-[#131625] border border-white/10 rounded-2xl p-4 space-y-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Wine className="w-4 h-4 text-purple-400" />
                <span>Répartition des Ventes par Catégorie</span>
              </h3>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {(monthlyReport?.salesByCategory || []).map(cat => (
                  <div key={cat.category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-200 font-semibold">{cat.categoryLabel} ({cat.quantitySold} vendus)</span>
                      <span className="font-mono font-bold text-purple-300">
                        {formatFCFA(cat.totalFCFA)} ({cat.percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-[#0c0e17] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-500 rounded-full"
                        style={{ width: `${cat.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Monthly Top Products */}
            <div className="bg-[#131625] border border-white/10 rounded-2xl p-4 space-y-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                <span>Top Produits & Bouteilles du Mois</span>
              </h3>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {(monthlyReport?.topProducts || []).slice(0, 7).map((prod, idx) => (
                  <div key={prod.productId} className="flex items-center justify-between p-2 bg-[#0c0e17] rounded-xl border border-white/5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">{prod.productName}</p>
                        <p className="text-[10px] text-gray-400">{prod.quantitySold} unités • {prod.categoryName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-mono font-bold text-amber-400">{formatFCFA(prod.totalFCFA)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. END-OF-DAY BACKUP & HISTORICAL ARCHIVES (Sauvegarde Fin de Journée) */}
      {/* ========================================================================= */}
      {activeSubTab === 'BACKUPS' && (
        <div className="space-y-4">
          
          {/* Action Hub Card */}
          <div className="bg-gradient-to-br from-[#181a2e] to-[#121424] border border-emerald-500/30 p-5 rounded-3xl space-y-4">
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-emerald-400" />
                  <span>Sauvegardes et Clôtures Fin de Journée</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Conservez l'historique complet des encaissements, mouvements de stock, et générez des sauvegardes sécurisées téléchargeables.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="btn-trigger-eod-backup"
                  onClick={() => setIsClosingModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Enregistrer Clôture ce Soir</span>
                </button>

                <button
                  id="btn-download-full-database"
                  onClick={() => exportDailyBackupJSON()}
                  className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Télécharger la base de données JSON complète"
                >
                  <Download className="w-4 h-4 text-amber-400" />
                  <span>Télécharger Sauvegarde JSON</span>
                </button>
              </div>
            </div>

            {/* Quick Restore from JSON section */}
            <div className="bg-[#0c0e17] p-3.5 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Restaurer une Sauvegarde Précédente</h4>
                  <p className="text-[11px] text-gray-400">Importez un fichier .JSON de sauvegarde pour restaurer les ventes et les tables.</p>
                </div>
              </div>

              <label className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Importer un fichier .JSON</span>
                <input 
                  type="file" 
                  accept=".json,application/json" 
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
              </label>
            </div>

            {/* Local Device Disk Automatic JSON Backup Folder Card */}
            <div className="bg-gradient-to-br from-[#121929] to-[#0c1220] p-4 rounded-2xl border border-cyan-500/30 space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/30">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-white">Dossier de Sauvegarde Automatique Locale (.JSON)</h4>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                        {diskBackupConfig.autoBackupEnabled ? 'Actif' : 'Désactivé'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-300 mt-0.5">
                      Les fichiers .JSON sont enregistrés directement sur le disque dur / mémoire locale de l'appareil (Dossier : <strong className="text-cyan-300 font-mono">{diskBackupConfig.folderPathOrName || 'ClubPOS_Backups'}</strong>).
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => saveBackupToDiskNow('Sauvegarde manuelle depuis l\'onglet Rapports', 'MANUAL')}
                    disabled={isDiskBackupRunning}
                    className="px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <FolderCheck className="w-4 h-4" />
                    <span>{isDiskBackupRunning ? 'Enregistrement...' : 'Sauvegarder sur le Disque'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowDiskBackupModal(true)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-cyan-500/20"
                  >
                    <HardDrive className="w-4 h-4" />
                    <span>Gérer le Dossier ({diskBackupFiles.length})</span>
                  </button>
                </div>
              </div>

              {/* Status summary tags */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                <div className="bg-[#090d17] p-2 rounded-xl border border-white/5">
                  <span className="text-gray-400 block text-[10px]">Fréquence auto</span>
                  <span className="font-bold text-cyan-300">
                    {diskBackupConfig.intervalMinutes === 1 ? 'À chaque minute (1 min)' : `Toutes les ${diskBackupConfig.intervalMinutes} min`}
                  </span>
                </div>
                <div className="bg-[#090d17] p-2 rounded-xl border border-white/5">
                  <span className="text-gray-400 block text-[10px]">Clôture caisse Z</span>
                  <span className="font-bold text-white">{diskBackupConfig.backupOnShiftClosing ? 'Sauvegarde auto' : 'Non'}</span>
                </div>
                <div className="bg-[#090d17] p-2 rounded-xl border border-white/5">
                  <span className="text-gray-400 block text-[10px]">Avant remise à zéro</span>
                  <span className="font-bold text-white">{diskBackupConfig.backupBeforeReset ? 'Protection active' : 'Non'}</span>
                </div>
                <div className="bg-[#090d17] p-2 rounded-xl border border-white/5">
                  <span className="text-gray-400 block text-[10px]">Fichiers sur le disque</span>
                  <span className="font-bold text-cyan-300 font-mono">{diskBackupFiles.length} fichier(s) .json</span>
                </div>
              </div>
            </div>

          </div>

          {/* Archived Daily Snapshots List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                <span>Historique des Clôtures Journalières Archivées ({archivedDailyBackups.length})</span>
              </h4>
            </div>

            {(!archivedDailyBackups || archivedDailyBackups.length === 0) ? (
              <div className="bg-[#131625] border border-white/10 rounded-2xl p-8 text-center space-y-2">
                <Database className="w-8 h-8 text-gray-600 mx-auto" />
                <p className="text-xs font-bold text-gray-400">Aucune clôture archivée pour le moment.</p>
                <p className="text-[11px] text-gray-500">Cliquez sur "Enregistrer Clôture ce Soir" pour créer votre premier snapshot de fin de journée.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(archivedDailyBackups || []).map(snap => (
                  <div key={snap.id} className="bg-[#131625] border border-white/10 hover:border-amber-500/40 rounded-2xl p-4 space-y-3 transition-all">
                    
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{formatDateShort(snap.backupDate)}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {snap.id}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          Archivé par <span className="text-gray-200 font-semibold">{snap.authorName}</span> ({snap.authorRole}) • {formatDateTime(snap.createdAt)}
                        </p>
                      </div>

                      <button
                        onClick={() => deleteArchivedBackup(snap.id)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 transition-colors cursor-pointer"
                        title="Supprimer cette archive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-[#0c0e17] p-2.5 rounded-xl text-center">
                      <div>
                        <p className="text-[10px] text-gray-400">Recette Totale</p>
                        <p className="text-xs font-mono font-bold text-amber-400">{formatFCFA(snap.totalRevenueFCFA)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400">Espèces Caisse</p>
                        <p className="text-xs font-mono font-bold text-blue-400">{formatFCFA(snap.cashAmountFCFA)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400">Mobile / CB</p>
                        <p className="text-xs font-mono font-bold text-purple-300">{formatFCFA(snap.mobileMoneyAmountFCFA + snap.cardAmountFCFA)}</p>
                      </div>
                    </div>

                    {snap.notes && (
                      <p className="text-[11px] text-gray-300 italic bg-white/5 p-2 rounded-lg">
                        "{snap.notes}"
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px]">
                      <span className="text-gray-400">
                        {snap.totalOrdersCount} additions enregistrées
                      </span>
                      <button
                        onClick={() => exportDailyBackupJSON(snap.backupDate)}
                        className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="w-3 h-3" />
                        <span>Télécharger JSON</span>
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Director Live Tracking & Remote Link Sharing */}
          {onOpenShareDirector && (
            <div className="bg-gradient-to-r from-amber-500/15 via-[#131625] to-[#131625] border border-amber-500/40 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-amber-950/20">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-amber-400 animate-pulse" />
                  <h4 className="text-xs font-black text-white">Suivi des Ventes en Direct pour le Directeur</h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                    Smartphone & Web Live
                  </span>
                </div>
                <p className="text-[11px] text-gray-300">
                  Générez un QR code ou un lien WhatsApp pour permettre à la direction de surveiller le CA, les encaissements et les tables en temps réel.
                </p>
              </div>
              <button
                onClick={onOpenShareDirector}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer shrink-0 shadow-md shadow-amber-500/20 transition-all active:scale-95"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Partager le Lien Directeur</span>
              </button>
            </div>
          )}

          {/* Device & Terminal Station Management (Code MAC / IP / Changement d'appareil) */}
          <div className="bg-[#131625] border border-cyan-500/30 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Laptop className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs font-bold text-white">Identification Terminal, Code MAC & IP de Caisse</h4>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
                  {deviceSignature?.macAddress ? `${deviceSignature.macAddress.substring(0, 8)}...` : 'Station'}
                </span>
              </div>
              <p className="text-[11px] text-gray-400">
                Gérez l'assignation de ce terminal physique, vérifiez les codes réseau et configurez la remise à 0 automatique lors d'un changement d'appareil.
              </p>
            </div>
            <button
              onClick={() => setShowDeviceStationModal(true)}
              className="px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
            >
              <Wifi className="w-3.5 h-3.5" />
              <span>Gérer Codes MAC & IP</span>
            </button>
          </div>

          {/* Director Reset Sales & Transactions History Card */}
          <div className="bg-gradient-to-r from-rose-500/10 via-[#131625] to-[#131625] border border-rose-500/30 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-rose-950/20">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-rose-400" />
                <h4 className="text-xs font-bold text-white">Réinitialisation des Ventes & Transactions (Direction)</h4>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                  Directeur Uniquement (PIN)
                </span>
              </div>
              <p className="text-[11px] text-gray-400">
                Purger et remettre à 0 FCFA l'historique des encaissements et tickets sans effacer le catalogue des bouteilles ni les tables. Sauvegarde automatique incluse.
              </p>
            </div>
            <button
              id="btn-director-reset-sales-backups-tab"
              onClick={() => setIsResetSalesModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Remettre Ventes à 0</span>
            </button>
          </div>

          {/* Reset System Button */}
          <div className="bg-[#131625] border border-white/10 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-white">Réinitialisation d'Urgence</h4>
              <p className="text-[11px] text-gray-400">Remet les tables, produits et stocks aux valeurs de démonstration d'usine.</p>
            </div>
            <button
              onClick={() => {
                if (window.confirm('Voulez-vous vraiment réinitialiser toutes les données aux valeurs de départ ?')) {
                  resetAllToFactoryDefaults();
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Restaurer Démo Usine</span>
            </button>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. LIVE SHIFT REPORT (Rapport Z Shift en Cours) */}
      {/* ========================================================================= */}
      {activeSubTab === 'SHIFT_LIVE' && (
        <div className="space-y-4">
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#131625] p-3.5 rounded-2xl border border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Shift Actuel en Direct (Rapport Z)</span>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 font-mono">
                    En cours
                  </span>
                </h2>
                <p className="text-xs text-gray-400">
                  Ouvert le {formatDateTime(shiftStartTime)} • Responsable : {currentUser.name}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsClosingModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Clôturer le Shift</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-gradient-to-br from-[#1c1a2d] to-[#121422] border border-amber-500/40 p-4 rounded-2xl shadow-xl shadow-amber-500/5">
              <div className="flex items-center justify-between text-xs text-amber-300 font-semibold mb-1">
                <span>RECETTE DU SHIFT ACTUEL</span>
                <DollarSign className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-amber-400 font-mono tracking-tight">
                {formatFCFA(liveShiftReport.totalRevenueFCFA)}
              </div>
              <div className="text-[11px] text-gray-400 mt-1">
                {liveShiftReport.totalOrdersCount} additions réglées
              </div>
            </div>

            <div className="bg-[#131625] border border-white/10 p-4 rounded-2xl">
              <div className="flex items-center justify-between text-xs text-gray-400 font-semibold mb-1">
                <span>PANIER MOYEN</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                {formatFCFA(liveShiftReport.totalOrdersCount > 0 ? liveShiftReport.totalRevenueFCFA / liveShiftReport.totalOrdersCount : 0)}
              </div>
              <div className="text-[11px] text-gray-400 mt-1">
                Dépense moyenne par table
              </div>
            </div>

            <div className="bg-[#131625] border border-white/10 p-4 rounded-2xl">
              <div className="flex items-center justify-between text-xs text-gray-400 font-semibold mb-1">
                <span>CONVIVES ESTIMÉS</span>
                <Users className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-black text-purple-300 font-mono">
                ~{liveShiftReport.totalGuestsServed} clients
              </div>
              <div className="text-[11px] text-gray-400 mt-1">
                Fréquentation en temps réel
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* END-OF-DAY CLOSING MODAL */}
      {/* ========================================================================= */}
      {isClosingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#131625] border border-emerald-500/40 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Clôture & Sauvegarde Fin de Journée</h3>
                  <p className="text-xs text-emerald-400 font-medium">Archivage officiel • L'historique des ventes reste 100% conservé</p>
                </div>
              </div>
            </div>

            <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3 flex items-start gap-2.5 text-xs text-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Garantie de conservation :</strong> L'ensemble de vos transactions, encaissements et tickets passés est intégralement conservé dans l'historique et les bilans mensuels. Seul le chrono du quart en cours est réinitialisé.
              </span>
            </div>

            <div className="bg-[#0c0e17] p-4 rounded-2xl border border-white/10 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Date du service :</span>
                <span className="font-bold text-white">{new Date().toLocaleDateString('fr-FR')}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Responsable de caisse :</span>
                <span className="font-bold text-amber-400">{currentUser.name} ({currentUser.role})</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Total Chiffre d'Affaires :</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">{formatFCFA(liveShiftReport.totalRevenueFCFA)}</span>
              </div>
              <div className="flex justify-between text-xs pt-1 border-t border-white/5">
                <span className="text-gray-400">Cash physique en caisse :</span>
                <span className="font-mono font-bold text-white">{formatFCFA(liveShiftReport.paymentsByMethod.ESPECES || 0)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Total Mobile Money & CB :</span>
                <span className="font-mono font-bold text-purple-300">
                  {formatFCFA(
                    (liveShiftReport.paymentsByMethod.TMONEY || 0) +
                    (liveShiftReport.paymentsByMethod.FLOOZ || 0) +
                    (liveShiftReport.paymentsByMethod.WAVE || 0) +
                    (liveShiftReport.paymentsByMethod.ORANGE_MONEY || 0) +
                    (liveShiftReport.paymentsByMethod.MTN_MOMO || 0) +
                    (liveShiftReport.paymentsByMethod.CARTE_BANCAIRE || 0)
                  )}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">
                Notes ou observations de fin de soirée (optionnel) :
              </label>
              <textarea
                value={closingNotes}
                onChange={(e) => setClosingNotes(e.target.value)}
                placeholder="Ex: Soirée VIP réussie, écart de caisse 0 FCFA, 2 bouteilles de champagne offertes par la direction..."
                className="w-full h-20 bg-[#0c0e17] border border-white/15 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsClosingModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 text-xs font-semibold cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmEndOfDayClosing}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/25 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Valider la Clôture & Archiver</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Director Reset Sales History Modal */}
      <ResetSalesHistoryModal
        isOpen={isResetSalesModalOpen}
        onClose={() => setIsResetSalesModalOpen(false)}
      />

    </div>
  );
};
