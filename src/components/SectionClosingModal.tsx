import React, { useState } from 'react';
import { 
  X, Layers, CheckCircle2, Printer, AlertTriangle, 
  Users, DollarSign, Clock, FileText, ChevronRight, 
  RotateCcw, Sparkles, Building2, Bluetooth, Receipt, Download
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { TableZone, SectionClosingRecord, PaymentMethod } from '../types';
import { ZONE_LABELS } from '../data/initialData';
import { formatFCFA, formatDateTime } from '../utils/formatters';
import { generateSectionClosingReceipt, printViaWebBluetooth } from '../utils/escpos';
import { exportSectionClosingPDF } from '../utils/pdfGenerator';
import confetti from 'canvas-confetti';

interface SectionClosingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialZone?: TableZone | 'ALL';
}

export const SectionClosingModal: React.FC<SectionClosingModalProps> = ({
  isOpen,
  onClose,
  initialZone = 'ALL'
}) => {
  const { 
    tables, 
    currentUser, 
    companyProfile, 
    printerConfig, 
    sectionClosings,
    getSectionReport,
    closeSection,
    reopenSection,
    deleteSectionClosing
  } = usePOS();

  const [selectedZone, setSelectedZone] = useState<TableZone | 'ALL'>(initialZone);
  const [closingNotes, setClosingNotes] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'NEW_CLOSING' | 'HISTORY'>('NEW_CLOSING');
  const [isPrintingBT, setIsPrintingBT] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedHistoricalRecord, setSelectedHistoricalRecord] = useState<SectionClosingRecord | null>(null);

  if (!isOpen) return null;

  // Check if selected zone is currently closed in latest record
  const latestClosingForZone = sectionClosings.find(c => (selectedZone === 'ALL' || c.zone === selectedZone) && c.status !== 'REOPENED');

  const handleReopenSection = (zone: TableZone | 'ALL') => {
    try {
      const res = reopenSection(zone);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      setActionMessage({
        type: 'success',
        text: res.message
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionMessage({ type: 'error', text: `Erreur réouverture: ${msg}` });
    }
  };

  // Compute live report preview for the selected zone
  const currentPreview: SectionClosingRecord = getSectionReport(selectedZone);
  const targetTables = tables.filter(t => selectedZone === 'ALL' || t.zone === selectedZone);
  const occupiedTablesInZone = targetTables.filter(t => t.status !== 'LIBRE');

  const zoneOptions: Array<{ value: TableZone | 'ALL'; label: string }> = [
    { value: 'ALL', label: 'Toutes les Sections (Globale)' },
    { value: 'CARRE_PREMIUM', label: 'Carré Premium / Or' },
    { value: 'VIP_1', label: 'Salons VIP 1' },
    { value: 'VIP_2', label: 'Mezzanine VIP 2' },
    { value: 'PISTE', label: 'Piste Centrale' },
    { value: 'COMPTOIR_BAR', label: 'Comptoir Bar' },
    { value: 'TERRASSE', label: 'Terrasse Lounge' },
  ];

  const handleExportPDF = (record: SectionClosingRecord) => {
    try {
      exportSectionClosingPDF(record, companyProfile);
      setActionMessage({
        type: 'success',
        text: `Rapport de clôture de section (${record.zoneLabel}) téléchargé en PDF !`
      });
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionMessage({ type: 'error', text: `Erreur PDF: ${msg}` });
    }
  };

  const handleExecuteClosing = () => {
    try {
      const closedRecord = closeSection(selectedZone, closingNotes);
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
      setActionMessage({
        type: 'success',
        text: `Fermeture de la section "${closedRecord.zoneLabel}" validée avec succès ! ${closedRecord.openTablesResetCount} table(s) réinitialisée(s).`
      });
      setSelectedHistoricalRecord(closedRecord);
      setActiveTab('HISTORY');
      setClosingNotes('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionMessage({ type: 'error', text: `Erreur: ${msg}` });
    }
  };

  const handlePrintThermalSlip = async (recordToPrint: SectionClosingRecord) => {
    setIsPrintingBT(true);
    setActionMessage(null);
    try {
      const receiptText = generateSectionClosingReceipt(companyProfile, recordToPrint, printerConfig.paperWidth);
      
      // Simulate/Trigger via Bluetooth if connected, or provide text view
      const dummyPayment: import('../types').Payment = {
        id: recordToPrint.id,
        orderId: `SEC-${recordToPrint.id}`,
        tableId: `ZONE_${recordToPrint.zone}`,
        tableName: `CLÔTURE SECTION: ${recordToPrint.zoneLabel}`,
        serverId: recordToPrint.closedByName,
        serverName: recordToPrint.closedByName,
        cashierId: currentUser.id,
        cashierName: currentUser.name,
        subTotalFCFA: recordToPrint.totalRevenueFCFA,
        discountFCFA: 0,
        taxFCFA: 0,
        totalPaidFCFA: recordToPrint.totalRevenueFCFA,
        paymentMethod: 'ESPECES',
        cashGivenFCFA: recordToPrint.totalRevenueFCFA,
        changeReturnedFCFA: 0,
        timestamp: recordToPrint.closedAt,
        itemsSnapshot: recordToPrint.topProducts.map(p => ({
          id: `prod-${p.productId}`,
          productId: p.productId,
          productName: p.productName,
          category: 'CHAMPAGNE',
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
        copyLabel: `CLÔTURE SECTION: ${recordToPrint.zoneLabel}`
      });

      setIsPrintingBT(false);
      if (res.success) {
        setActionMessage({ type: 'success', text: 'Ticket de section imprimé avec succès !' });
      } else {
        setActionMessage({ type: 'error', text: `Impression Bluetooth : ${res.message}` });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setIsPrintingBT(false);
      setActionMessage({ type: 'error', text: `Erreur d'impression : ${msg}` });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#121522] border border-white/15 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl text-white">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#171b2e]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">Fermeture & Clôture de Section</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Service / Zone
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Clôturez un carré VIP, une salle ou une zone de service avec bilan financier et réinitialisation des tables
              </p>
            </div>
          </div>
          
          <button
            id="close-section-modal"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-white/10 bg-[#131625]">
          <button
            id="tab-new-section-closing"
            onClick={() => setActiveTab('NEW_CLOSING')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'NEW_CLOSING'
                ? 'bg-[#181c2f] text-amber-400 border-t-2 border-amber-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Nouvelle Clôture de Section</span>
          </button>

          <button
            id="tab-history-section-closing"
            onClick={() => setActiveTab('HISTORY')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'HISTORY'
                ? 'bg-[#181c2f] text-amber-400 border-t-2 border-amber-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Historique des Clôtures ({sectionClosings.length})</span>
          </button>
        </div>

        {/* Status notice */}
        {actionMessage && (
          <div className={`mx-6 mt-4 p-3 rounded-xl border text-xs flex items-center justify-between ${
            actionMessage.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}>
            <span>{actionMessage.text}</span>
            <button onClick={() => setActionMessage(null)} className="text-gray-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Data Protection & Persistence Banner */}
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3 text-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-emerald-300">Garantie d'Historique Permanent :</span>
              <p className="text-gray-300">
                La fermeture et la réouverture d'une section ne suppriment <strong>jamais</strong> l'historique des ventes, des tickets et des encaissements. Toutes les recettes restent conservées et consultables dans l'historique général, les rapports journaliers et mensuels.
              </p>
            </div>
          </div>

          {activeTab === 'NEW_CLOSING' ? (
            <div className="space-y-6">
              
              {/* Zone Selector */}
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                  1. Sélectionner la Section / Zone à clôturer ou gérer :
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {zoneOptions.map((opt) => {
                    const isSelected = selectedZone === opt.value;
                    const zoneTables = tables.filter(t => opt.value === 'ALL' || t.zone === opt.value);
                    const occupiedInOpt = zoneTables.filter(t => t.status !== 'LIBRE').length;
                    const isZoneClosed = sectionClosings.some(c => (opt.value === 'ALL' || c.zone === opt.value) && c.status !== 'REOPENED');

                    return (
                      <button
                        key={opt.value}
                        id={`btn-select-zone-${opt.value}`}
                        onClick={() => setSelectedZone(opt.value)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500 text-black border-amber-400 shadow-lg shadow-amber-500/20 scale-[1.02]'
                            : isZoneClosed
                            ? 'bg-[#1a1424] border-purple-500/30 text-gray-300 hover:border-purple-500/50'
                            : 'bg-[#181c2d] border-white/10 hover:border-white/20 text-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-black truncate">{opt.label}</span>
                          {isZoneClosed && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-500/30 text-purple-300 border border-purple-500/40">
                              Clôturée
                            </span>
                          )}
                        </div>
                        <div className={`text-[11px] mt-1 flex items-center justify-between ${isSelected ? 'text-black/80' : 'text-gray-400'}`}>
                          <span>{zoneTables.length} tables</span>
                          {occupiedInOpt > 0 && (
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              isSelected ? 'bg-black text-amber-300' : 'bg-amber-500/20 text-amber-300'
                            }`}>
                              {occupiedInOpt} occupée(s)
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Reopen notice if selected zone is closed */}
              {latestClosingForZone && (
                <div className="p-4 rounded-2xl bg-[#1e1530] border border-purple-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fadeIn">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse" />
                      <span className="font-bold text-xs text-white">Cette section ({currentPreview.zoneLabel}) a déjà été clôturée</span>
                    </div>
                    <p className="text-[11px] text-gray-300">
                      Vous pouvez la réouvrir pour démarrer une nouvelle vague de clients. L'historique des ventes antérieures sera 100% conservé.
                    </p>
                  </div>
                  <button
                    onClick={() => handleReopenSection(selectedZone)}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer whitespace-nowrap"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Réouvrir la Section</span>
                  </button>
                </div>
              )}

              {/* Section Live Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                
                <div className="p-4 rounded-2xl bg-[#161a2b] border border-amber-500/30">
                  <div className="text-xs text-amber-300 font-semibold mb-1 flex items-center justify-between">
                    <span>RECETTES SECTION</span>
                    <DollarSign className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-2xl font-black text-white font-mono">
                    {formatFCFA(currentPreview.totalRevenueFCFA)}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1">
                    {currentPreview.totalOrdersCount} commande(s) réglée(s)
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#161a2b] border border-white/10">
                  <div className="text-xs text-gray-400 font-semibold mb-1 flex items-center justify-between">
                    <span>TABLES SECTION</span>
                    <Layers className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="text-2xl font-black text-purple-300 font-mono">
                    {targetTables.length} <span className="text-xs font-normal text-gray-500">tables au total</span>
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1">
                    {occupiedTablesInZone.length} table(s) actuellement occupée(s)
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#161a2b] border border-white/10">
                  <div className="text-xs text-gray-400 font-semibold mb-1 flex items-center justify-between">
                    <span>CLIENTS / GUESTS</span>
                    <Users className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-black text-emerald-400 font-mono">
                    {currentPreview.totalGuestsServed} pers.
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1">
                    Responsable : {currentUser.name}
                  </div>
                </div>

              </div>

              {/* Breakdown Details (Payments & Servers) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Payment Breakdown */}
                <div className="p-4 rounded-2xl bg-[#151828] border border-white/10 space-y-3">
                  <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                    Modes de Paiement Encaissés
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(currentPreview.paymentsByMethod).map(([method, amount]) => (
                      <div key={method} className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-xl bg-black/20 border border-white/5">
                        <span className="text-gray-300 font-medium">{method.replace(/_/g, ' ')}</span>
                        <span className={`font-mono font-bold ${amount > 0 ? 'text-amber-400' : 'text-gray-500'}`}>
                          {formatFCFA(amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sales by Server */}
                <div className="p-4 rounded-2xl bg-[#151828] border border-white/10 space-y-3">
                  <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                    Ventes par Serveur dans cette Section
                  </h3>
                  {currentPreview.salesByServer.length === 0 ? (
                    <div className="text-center py-6 text-xs text-gray-500">
                      Aucune vente enregistrée dans cette section pour ce service
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[160px] overflow-y-auto">
                      {currentPreview.salesByServer.map(s => (
                        <div key={s.serverId} className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-xl bg-black/20 border border-white/5">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px] font-bold">
                              {s.serverName.charAt(0)}
                            </div>
                            <span className="text-white font-medium">{s.serverName}</span>
                            <span className="text-[10px] text-gray-400">({s.ordersCount} cmd)</span>
                          </div>
                          <span className="font-mono font-bold text-emerald-400">
                            {formatFCFA(s.totalFCFA)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Notes Input */}
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Notes ou observations de clôture de service (Optionnel) :
                </label>
                <input
                  type="text"
                  placeholder="Ex: Clôture fin de carré VIP 1ère partie de soirée, remise de caisse effectuée..."
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#0e1019] border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Confirmation Action Box */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-indigo-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400" />
                    <span>Confirmer la Fermeture de : {currentPreview.zoneLabel}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Cette action archivera le bilan de section et réinitialisera les tables de la zone à l'état LIBRE.
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    id="btn-confirm-close-section"
                    onClick={handleExecuteClosing}
                    className="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 active:scale-95 transition-all cursor-pointer"
                  >
                    <Layers className="w-4 h-4" />
                    <span>Valider Clôture de Section</span>
                  </button>
                </div>
              </div>

            </div>
          ) : (
            /* History Tab */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">
                  Historique des Clôtures de Sections Récentes
                </h3>
                <span className="text-xs text-gray-400">{sectionClosings.length} clôture(s) enregistrée(s)</span>
              </div>

              {sectionClosings.length === 0 ? (
                <div className="text-center py-12 bg-[#161928] rounded-2xl border border-white/10 text-gray-400">
                  <Layers className="w-10 h-10 mx-auto mb-2 text-gray-600" />
                  <p className="text-sm font-bold text-gray-300">Aucune clôture de section archivée pour le moment.</p>
                  <p className="text-xs text-gray-500 mt-1">Utilisez l'onglet "Nouvelle Clôture" pour clôturer une section de la boîte.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sectionClosings.map((closing) => {
                    const isReopened = closing.status === 'REOPENED';

                    return (
                      <div 
                        key={closing.id}
                        className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${
                          isReopened 
                            ? 'bg-[#141d2c] border-emerald-500/30' 
                            : 'bg-[#161a2c] border-white/10 hover:border-amber-500/40'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white">{closing.zoneLabel}</span>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-black/40 text-amber-300 border border-amber-500/30">
                              {closing.id}
                            </span>
                            {isReopened ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Section Réouverte</span>
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                                Clôturée
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400 flex flex-wrap items-center gap-3">
                            <span>Clôturé par: <strong className="text-gray-200">{closing.closedByName}</strong></span>
                            <span>•</span>
                            <span>Le: {formatDateTime(closing.closedAt)}</span>
                            <span>•</span>
                            <span>{closing.tablesClosedCount} tables ({closing.openTablesResetCount} libérées)</span>
                          </div>
                          {isReopened && closing.reopenedAt && (
                            <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5 pt-0.5">
                              <RotateCcw className="w-3 h-3" />
                              <span>Réouverte le {formatDateTime(closing.reopenedAt)} par {closing.reopenedByName || 'Staff'} (Ventes historiques 100% conservées)</span>
                            </div>
                          )}
                          {closing.notes && (
                            <div className="text-xs text-amber-300/80 italic pt-0.5">
                              "{closing.notes}"
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2.5 self-end md:self-center">
                          <div className="text-right mr-1">
                            <div className="text-xs text-gray-400">Recettes Section</div>
                            <div className="font-mono font-black text-base text-amber-400">
                              {formatFCFA(closing.totalRevenueFCFA)}
                            </div>
                          </div>

                          {!isReopened && (
                            <button
                              onClick={() => handleReopenSection(closing.zone)}
                              title="Réouvrir cette section pour de nouvelles commandes (conserve toutes les ventes)"
                              className="px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Réouvrir</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleExportPDF(closing)}
                            title="Télécharger le rapport de clôture de section en PDF"
                            className="p-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 transition-all cursor-pointer"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handlePrintThermalSlip(closing)}
                            disabled={isPrintingBT}
                            title="Imprimer le ticket thermique de clôture de section"
                            className="p-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 transition-all cursor-pointer"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => deleteSectionClosing(closing.id)}
                            title="Supprimer cette archive"
                            className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 transition-all cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-white/10 bg-[#171a2d] flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <Bluetooth className="w-4 h-4 text-cyan-400" />
            <span>Imprimante ESC/POS : {printerConfig.paperWidth}mm ({printerConfig.isConnected ? 'Connectée' : 'Prête'})</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold cursor-pointer transition-all"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
};
