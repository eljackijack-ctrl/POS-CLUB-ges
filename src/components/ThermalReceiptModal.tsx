import React, { useState, useEffect } from 'react';
import { 
  X, Printer, Bluetooth, Download, Copy, 
  Check, QrCode, Sparkles, Smartphone, ShieldCheck,
  Settings, Building2, Scissors, CheckCircle2, AlertCircle,
  Edit3, Save, RotateCcw, ChevronDown, ChevronUp, MapPin, Phone, Mail
} from 'lucide-react';
import { Payment, CompanyProfile } from '../types';
import { usePOS } from '../context/POSContext';
import { generateTextReceipt, printViaWebBluetooth, ESCPOSReceiptData } from '../utils/escpos';
import { formatFCFA } from '../utils/formatters';
import { exportReceiptPDF } from '../utils/pdfGenerator';

interface ThermalReceiptModalProps {
  payment: Payment | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({
  payment,
  isOpen,
  onClose
}) => {
  const { 
    printerConfig, 
    setPrinterConfig, 
    companyProfile,
    updateCompanyProfile,
    setShowPrinterSettingsModal,
    setShowCompanyProfileModal 
  } = usePOS();
  
  const [printStatus, setPrintStatus] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isPrintingBT, setIsPrintingBT] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [copiesToPrint, setCopiesToPrint] = useState<number>(printerConfig.printCopies || 1);

  // Live Inline Edit of Company Profile directly on Invoice
  const [isEditingCompany, setIsEditingCompany] = useState<boolean>(false);
  const [companyForm, setCompanyForm] = useState<CompanyProfile>(companyProfile);
  const [editSuccessMsg, setEditSuccessMsg] = useState<string | null>(null);

  // Keep form in sync when companyProfile changes in POSContext
  useEffect(() => {
    setCompanyForm(companyProfile);
  }, [companyProfile]);

  if (!isOpen || !payment) return null;

  // Active preview data uses live edited form when editing, or stored profile
  const activeCompanyProfile = isEditingCompany ? companyForm : companyProfile;

  const receiptData: ESCPOSReceiptData = {
    companyProfile: activeCompanyProfile,
    payment,
    paperWidth: printerConfig.paperWidth,
    copyLabel: copiesToPrint > 1 ? 'EXEMPLAIRE CLIENT' : undefined
  };

  const receiptText = generateTextReceipt(receiptData);

  const handlePrintWebBluetooth = async () => {
    setIsPrintingBT(true);
    setPrintStatus({ type: 'info', text: 'Recherche et envoi vers l’imprimante Bluetooth ESC/POS...' });
    
    try {
      const result = await printViaWebBluetooth(receiptData, printerConfig.scanOptions);
      setIsPrintingBT(false);
      if (result.success) {
        setPrintStatus({
          type: 'success',
          text: result.message || `Facture ${payment.id} imprimée via Bluetooth avec succès !`
        });
      } else {
        setPrintStatus({
          type: 'error',
          text: result.message
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setIsPrintingBT(false);
      setPrintStatus({ type: 'error', text: `Erreur: ${msg}` });
    }
  };

  const handleStandardPrint = () => {
    window.print();
  };

  const handleSavePDF = () => {
    try {
      exportReceiptPDF(payment, activeCompanyProfile);
      setPrintStatus({
        type: 'success',
        text: `Facture N° ${payment.id} enregistrée en PDF avec succès !`
      });
      setTimeout(() => setPrintStatus(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setPrintStatus({ type: 'error', text: `Erreur génération PDF: ${msg}` });
    }
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(receiptText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const togglePaperWidth = (width: 58 | 80) => {
    setPrinterConfig({ ...printerConfig, paperWidth: width });
  };

  const handleSaveCompanyInline = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!companyForm.name.trim()) {
      setPrintStatus({ type: 'error', text: 'Le nom de l’établissement est obligatoire.' });
      return;
    }
    updateCompanyProfile(companyForm);
    setIsEditingCompany(false);
    setEditSuccessMsg('Identité de l’entreprise mise à jour instantanément sur toutes les factures !');
    setTimeout(() => setEditSuccessMsg(null), 4000);
  };

  const handleQuickPreset = (presetType: 'CLUB' | 'LOUNGE' | 'ROOFTOP') => {
    if (presetType === 'CLUB') {
      setCompanyForm(prev => ({
        ...prev,
        name: 'LE VELVET VIP CLUB & LOUNGE',
        slogan: 'Cocktails d’Exception, Champagnes & Prestige VIP',
        rccm: 'RCCM: TG-LOM-2024-B-1284',
        nif: 'NIF: 1002345890',
        address: 'Boulevard du 13 Janvier, Zone Nocturne',
        cityCountry: 'Lomé, Togo',
        phone: '+228 90 11 22 33',
        email: 'contact@velvetvipclub.com',
        receiptFooterMessage: 'Merci pour votre confiance ! L’abus d’alcool est dangereux pour la santé.'
      }));
    } else if (presetType === 'LOUNGE') {
      setCompanyForm(prev => ({
        ...prev,
        name: 'L’ALCHIMISTE COCKTAIL LOUNGE',
        slogan: 'Mixologie raffinée, Spiritueux rares & Saveurs',
        rccm: 'RCCM: CI-ABJ-2023-B-5821',
        nif: 'NIF: 2049182301',
        address: 'Rue des Jardins, Deux Plateaux Vallons',
        cityCountry: 'Abidjan, Côte d’Ivoire',
        phone: '+225 07 48 90 12 34',
        email: 'contact@alchimiste-lounge.ci',
        receiptFooterMessage: 'Merci pour votre visite ! Au plaisir de vous revoir très bientôt.'
      }));
    } else {
      setCompanyForm(prev => ({
        ...prev,
        name: 'SKYLINE ROOFTOP & BAR',
        slogan: 'Vue panoramique 360°, DJ Sets & Sunset Cocktails',
        rccm: 'RCCM: RB-COT-2024-B-8910',
        nif: 'NIF: 3201948572',
        address: 'Haie Vive, Avenue de la Marina',
        cityCountry: 'Cotonou, Bénin',
        phone: '+229 97 00 11 22',
        email: 'direction@skyline-rooftop.com',
        receiptFooterMessage: 'Merci de partager vos plus belles soirées avec nous !'
      }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#121522] border border-amber-500/30 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl text-white max-h-[92vh] flex flex-col justify-between">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-white/10 bg-[#171a2b]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white">Facture Client ESC/POS</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {printerConfig.paperWidth}mm
                </span>
              </div>
              <p className="text-xs text-gray-400">
                {activeCompanyProfile.name} • Facture N° {payment.id} • Table {payment.tableName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Paper Width Selector */}
            <div className="flex items-center gap-1 bg-[#0c0e17] p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => togglePaperWidth(58)}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  printerConfig.paperWidth === 58
                    ? 'bg-amber-500 text-black'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                58 mm
              </button>
              <button
                type="button"
                onClick={() => togglePaperWidth(80)}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  printerConfig.paperWidth === 80
                    ? 'bg-amber-500 text-black'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                80 mm
              </button>
            </div>

            {/* Quick Settings Icon */}
            <button
              type="button"
              onClick={() => setShowPrinterSettingsModal(true)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
              title="Paramètres Imprimante Bluetooth"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Receipt Simulation & Company Live Editor Body */}
        <div className="p-4 sm:p-5 overflow-y-auto max-h-[520px] scrollbar-thin flex flex-col items-center space-y-3">
          
          {/* Notification Feedback */}
          {editSuccessMsg && (
            <div className="w-full max-w-lg p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{editSuccessMsg}</span>
            </div>
          )}

          {/* Quick Bar / Accordion: Modifier automatiquement l'identité */}
          <div className="w-full max-w-lg rounded-2xl bg-slate-900/90 border border-amber-500/30 overflow-hidden shadow-lg transition-all">
            <div 
              onClick={() => setIsEditingCompany(!isEditingCompany)}
              className="p-3 bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 flex items-center justify-between cursor-pointer hover:bg-slate-800/80 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-white">{activeCompanyProfile.name}</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300">
                      En-tête Facture
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate max-w-[280px] sm:max-w-md">
                    {activeCompanyProfile.address} • Tel: {activeCompanyProfile.phone}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                <Edit3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isEditingCompany ? 'Masquer' : 'Modifier Identité'}</span>
                {isEditingCompany ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>

            {/* Inline Quick Form */}
            {isEditingCompany && (
              <div className="p-4 border-t border-slate-800/80 bg-slate-950/90 space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wide">
                    Modifications automatiques en direct sur le ticket
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500">Préréglages:</span>
                    <button
                      type="button"
                      onClick={() => handleQuickPreset('CLUB')}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                    >
                      Club VIP
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickPreset('LOUNGE')}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30"
                    >
                      Lounge
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickPreset('ROOFTOP')}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 hover:bg-rose-500/30"
                    >
                      Rooftop
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Nom de l’Établissement *</label>
                    <input
                      type="text"
                      value={companyForm.name}
                      onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                      placeholder="Ex: LE VELVET VIP CLUB"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Slogan / Sous-titre</label>
                    <input
                      type="text"
                      value={companyForm.slogan}
                      onChange={(e) => setCompanyForm({ ...companyForm, slogan: e.target.value })}
                      placeholder="Ex: Cocktails & Prestige VIP"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Adresse & Quartier</label>
                    <input
                      type="text"
                      value={companyForm.address}
                      onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                      placeholder="Ex: Bd du 13 Janvier"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Ville & Pays</label>
                    <input
                      type="text"
                      value={companyForm.cityCountry}
                      onChange={(e) => setCompanyForm({ ...companyForm, cityCountry: e.target.value })}
                      placeholder="Ex: Lomé, Togo"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Téléphone / Contact</label>
                    <input
                      type="text"
                      value={companyForm.phone}
                      onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                      placeholder="Ex: +228 90 11 22 33"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-0.5">RCCM & NIF Fiscal</label>
                    <div className="grid grid-cols-2 gap-1">
                      <input
                        type="text"
                        value={companyForm.rccm}
                        onChange={(e) => setCompanyForm({ ...companyForm, rccm: e.target.value })}
                        placeholder="RCCM: TG-..."
                        className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-[11px] text-white focus:outline-none focus:border-amber-400"
                      />
                      <input
                        type="text"
                        value={companyForm.nif}
                        onChange={(e) => setCompanyForm({ ...companyForm, nif: e.target.value })}
                        placeholder="NIF: 100..."
                        className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-[11px] text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Message Pied de Page du Ticket</label>
                  <input
                    type="text"
                    value={companyForm.receiptFooterMessage}
                    onChange={(e) => setCompanyForm({ ...companyForm, receiptFooterMessage: e.target.value })}
                    placeholder="Merci pour votre confiance ! L'abus d'alcool est dangereux."
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowCompanyProfileModal(true)}
                    className="text-xs text-slate-400 hover:text-white underline"
                  >
                    Ouvrir le panneau complet
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCompanyForm(companyProfile);
                        setIsEditingCompany(false);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveCompanyInline()}
                      className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-black flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Enregistrer & Appliquer</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Thermal Paper Realistic Mockup */}
          <div className={`bg-[#fbfbf9] text-gray-900 font-mono text-[11px] p-5 rounded-md shadow-2xl border-t-8 border-amber-600 select-text whitespace-pre leading-tight ${
            printerConfig.paperWidth === 80 ? 'w-[360px]' : 'w-[280px]'
          }`}>
            {receiptText}
          </div>

          {printStatus && (
            <div className={`mt-3 text-xs px-4 py-2.5 rounded-xl border flex items-center gap-2 max-w-sm ${
              printStatus.type === 'success'
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : printStatus.type === 'error'
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                : 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
            }`}>
              {printStatus.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{printStatus.text}</span>
            </div>
          )}

        </div>

        {/* Modal Actions */}
        <div className="p-4 border-t border-white/10 bg-[#171a2b] space-y-2.5">
          
          {/* Quick Copies Selector */}
          <div className="flex items-center justify-between text-xs text-slate-300 px-1">
            <span className="flex items-center gap-1.5">
              <Scissors className="w-3.5 h-3.5 text-slate-400" />
              Exemplaires :
            </span>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3].map((cp) => (
                <button
                  key={cp}
                  type="button"
                  onClick={() => setCopiesToPrint(cp)}
                  className={`px-2 py-0.5 rounded-md text-xs font-bold transition-all ${
                    copiesToPrint === cp
                      ? 'bg-amber-500 text-black'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {cp} {cp === 1 ? 'copie' : 'copies'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            
            {/* Direct Bluetooth ESC/POS Print */}
            <button
              id="print-bluetooth-btn"
              onClick={handlePrintWebBluetooth}
              disabled={isPrintingBT}
              className="py-3 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <Bluetooth className="w-4 h-4 shrink-0" />
              <span className="truncate">{isPrintingBT ? 'Impression...' : `Bluetooth POS (${copiesToPrint}x)`}</span>
            </button>

            {/* Direct PDF Save */}
            <button
              id="btn-save-receipt-pdf"
              onClick={handleSavePDF}
              className="py-3 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>Enregistrer en PDF</span>
            </button>

            {/* Standard System Print */}
            <button
              id="print-standard-btn"
              onClick={handleStandardPrint}
              className="py-3 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span>Imprimer Système</span>
            </button>

          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleCopyText}
              className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isCopied ? 'Texte copié !' : 'Copier le texte brut ESC/POS'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPrinterSettingsModal(true)}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium transition-colors"
            >
              <Bluetooth className="w-3.5 h-3.5" />
              <span>{printerConfig.bluetoothDeviceName || 'Configurer Bluetooth'}</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
