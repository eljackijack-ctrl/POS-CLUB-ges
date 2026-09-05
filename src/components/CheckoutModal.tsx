import React, { useState, useMemo } from 'react';
import { 
  X, Receipt, CreditCard, Banknote, Smartphone, 
  Sparkles, Check, Printer, Percent, ShieldCheck, 
  ArrowRight, Calculator, Coins, RotateCcw, AlertTriangle,
  Plus
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { PaymentMethod, Table, Order, Payment } from '../types';
import { formatFCFA } from '../utils/formatters';
import { triggerPaymentCompletedHaptic, triggerSelectionHaptic, triggerActionHaptic } from '../utils/capacitorBridge';

interface CheckoutModalProps {
  tableId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onPaymentCompleted: (payment: Payment) => void;
}

const PAYMENT_METHODS: Array<{ id: PaymentMethod; label: string; icon: React.ReactNode; color: string }> = [
  { id: 'ESPECES', label: 'Espèces (Cash)', icon: <Banknote className="w-4 h-4 text-emerald-400" />, color: 'border-emerald-500/40 bg-emerald-500/10' },
  { id: 'CARTE_BANCAIRE', label: 'Carte / TPE', icon: <CreditCard className="w-4 h-4 text-blue-400" />, color: 'border-blue-500/40 bg-blue-500/10' },
  { id: 'TMONEY', label: 'TMoney (Togo / WA)', icon: <Smartphone className="w-4 h-4 text-yellow-400" />, color: 'border-yellow-500/40 bg-yellow-500/10' },
  { id: 'FLOOZ', label: 'Flooz (Moov)', icon: <Smartphone className="w-4 h-4 text-blue-400" />, color: 'border-blue-500/40 bg-blue-500/10' },
  { id: 'ORANGE_MONEY', label: 'Orange Money', icon: <Smartphone className="w-4 h-4 text-orange-400" />, color: 'border-orange-500/40 bg-orange-500/10' },
  { id: 'MTN_MOMO', label: 'MTN MoMo', icon: <Smartphone className="w-4 h-4 text-amber-400" />, color: 'border-amber-500/40 bg-amber-500/10' },
  { id: 'WAVE', label: 'Wave Mobile', icon: <Smartphone className="w-4 h-4 text-cyan-400" />, color: 'border-cyan-500/40 bg-cyan-500/10' },
];

const STANDARD_FCFA_DENOMINATIONS = [5000, 10000, 20000, 50000, 100000, 200000, 500000];

// Helper to compute banknote breakdown for change
function getChangeBreakdown(changeAmount: number): Array<{ denomination: number; count: number }> {
  if (changeAmount <= 0) return [];
  const bills = [10000, 5000, 2000, 1000, 500];
  const result: Array<{ denomination: number; count: number }> = [];
  let remaining = changeAmount;

  for (const bill of bills) {
    if (remaining >= bill) {
      const count = Math.floor(remaining / bill);
      result.push({ denomination: bill, count });
      remaining = remaining % bill;
    }
  }
  return result;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  tableId,
  isOpen,
  onClose,
  onPaymentCompleted
}) => {
  const { tables, orders, currentUser, processCheckout } = usePOS();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('ESPECES');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [customDiscountFCFA, setCustomDiscountFCFA] = useState<string>('');
  const [discountReason, setDiscountReason] = useState<string>('');
  const [cashGiven, setCashGiven] = useState<string>('');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const currentTable = tables.find(t => t.id === tableId);
  const activeOrder = orders.find(o => o.tableId === tableId && o.status !== 'PAYEE' && o.status !== 'ANNULEE');

  const subTotalFCFA = activeOrder ? activeOrder.totalAmountFCFA : 0;
  
  // Calculate discount (Hook must be called unconditionally before early returns)
  const calculatedDiscountFCFA = useMemo(() => {
    if (customDiscountFCFA) {
      const parsed = parseFloat(customDiscountFCFA);
      return isNaN(parsed) ? 0 : Math.min(subTotalFCFA, parsed);
    }
    if (discountPercent > 0) {
      return Math.round((subTotalFCFA * discountPercent) / 100);
    }
    return 0;
  }, [subTotalFCFA, discountPercent, customDiscountFCFA]);

  if (!isOpen || !currentTable || !activeOrder) return null;

  const netToPayFCFA = Math.max(0, subTotalFCFA - calculatedDiscountFCFA);
  const cashGivenAmount = parseFloat(cashGiven) || 0;
  const changeToReturnFCFA = paymentMethod === 'ESPECES' && cashGivenAmount > netToPayFCFA 
    ? cashGivenAmount - netToPayFCFA 
    : 0;
  const remainingMissingFCFA = paymentMethod === 'ESPECES' && cashGivenAmount > 0 && cashGivenAmount < netToPayFCFA
    ? netToPayFCFA - cashGivenAmount
    : 0;

  const changeBreakdown = getChangeBreakdown(changeToReturnFCFA);

  const handleApplyQuickCash = (amount: number) => {
    triggerSelectionHaptic();
    setCashGiven(amount.toString());
  };

  const handleAddQuickCash = (increment: number) => {
    triggerSelectionHaptic();
    const current = parseFloat(cashGiven) || 0;
    setCashGiven((current + increment).toString());
  };

  const handleExactCash = () => {
    triggerSelectionHaptic();
    setCashGiven(netToPayFCFA.toString());
  };

  const handleExecutePayment = () => {
    if (isProcessing) return;
    setIsProcessing(true);
    triggerPaymentCompletedHaptic();

    try {
      const paymentResult = processCheckout({
        tableId: currentTable.id,
        paymentMethod,
        discountFCFA: calculatedDiscountFCFA,
        discountReason: calculatedDiscountFCFA > 0 ? (discountReason || 'Remise VIP') : undefined,
        transactionReference: transactionRef || undefined,
        cashGivenFCFA: paymentMethod === 'ESPECES' ? cashGivenAmount : undefined
      });

      onPaymentCompleted(paymentResult);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#121522] border border-amber-500/40 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl text-white max-h-[94vh] flex flex-col justify-between">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-[#171b2d] to-[#121524]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-inner">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <span>Encaissement & Clôture Table</span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500 text-black font-mono font-bold">
                  {currentTable.number}
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                {currentTable.name} ({currentTable.zone.replace('_', ' ')}) • Serveur: {activeOrder.serverName}
              </p>
            </div>
          </div>

          <button
            id="close-checkout-modal"
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 scrollbar-thin">
          
          {/* Itemized Order Breakdown */}
          <div className="bg-[#0e101a] border border-white/10 rounded-2xl p-3.5 space-y-2">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center justify-between pb-1 border-b border-white/10">
              <span>Détail des Consommations</span>
              <span>{activeOrder.items.filter(i => i.status !== 'ANNULE').length} article(s)</span>
            </div>

            <div className="space-y-1.5 max-h-[130px] overflow-y-auto pr-1 scrollbar-thin">
              {activeOrder.items.filter(i => i.status !== 'ANNULE').map((item) => (
                <div key={item.id} className="flex items-center justify-between text-xs py-1 border-b border-white/5">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="font-mono font-bold text-amber-400">{item.quantity}x</span>
                    <span className="text-white truncate">{item.productName}</span>
                    <span className="text-[10px] text-gray-500">({item.format})</span>
                  </div>
                  <div className="font-mono text-gray-200 font-bold shrink-0">
                    {formatFCFA(item.totalPriceFCFA)}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
              <span className="text-gray-400 font-medium">Sous-total consommations :</span>
              <span className="font-mono font-bold text-white text-sm">{formatFCFA(subTotalFCFA)}</span>
            </div>
          </div>

          {/* VIP Discount / Remise Selector */}
          <div className="bg-[#161a2c] border border-white/10 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5" />
                <span>Remise VIP / Geste Commercial</span>
              </span>
              {calculatedDiscountFCFA > 0 && (
                <span className="text-xs font-mono font-bold text-rose-400">
                  -{formatFCFA(calculatedDiscountFCFA)}
                </span>
              )}
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              {[0, 5, 10, 15, 20].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => { setDiscountPercent(pct); setCustomDiscountFCFA(''); }}
                  className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    discountPercent === pct && !customDiscountFCFA
                      ? 'bg-amber-500 text-black shadow'
                      : 'bg-[#0d0f18] text-gray-300 hover:bg-white/10'
                  }`}
                >
                  {pct === 0 ? 'Aucune' : `${pct}%`}
                </button>
              ))}
            </div>

            {calculatedDiscountFCFA > 0 && (
              <input
                type="text"
                placeholder="Motif de la remise (ex: Client VIP Gold, Offert Direction)..."
                value={discountReason}
                onChange={(e) => setDiscountReason(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-[#0b0d14] border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400"
              />
            )}
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
              Mode de Règlement en Franc CFA :
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PAYMENT_METHODS.map((method) => {
                const isSelected = paymentMethod === method.id;
                return (
                  <button
                    key={method.id}
                    id={`pay-method-${method.id}`}
                    onClick={() => setPaymentMethod(method.id)}
                    className={`p-2.5 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'border-amber-400 bg-amber-500/20 text-white shadow-lg shadow-amber-500/10'
                        : 'border-white/5 bg-[#141727] text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      {method.icon}
                      {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                    </div>
                    <span className="text-xs font-bold mt-2 truncate text-white">{method.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic Payment Specifics: Fast Cash Change Calculator */}
          {paymentMethod === 'ESPECES' && (
            <div className="bg-[#0b121b] border-2 border-emerald-500/50 rounded-2xl p-4 space-y-3.5 shadow-lg shadow-emerald-950/30">
              
              {/* Header with Amount Due */}
              <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Calculator className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-emerald-300 uppercase tracking-wide block">
                      Calcul Rendu de Monnaie FCFA
                    </span>
                    <span className="text-[10px] text-gray-400">
                      Calcul automatique instantané selon les billets reçus
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Net Dû</span>
                  <span className="font-mono text-base sm:text-lg font-black text-emerald-400">
                    {formatFCFA(netToPayFCFA)}
                  </span>
                </div>
              </div>

              {/* Main Inputs: Montant Reçu vs Monnaie à Rendre */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                {/* Left: Cash Received Input with Clear & Exact buttons */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-300 flex items-center gap-1">
                      <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Montant Donné par le Client :</span>
                    </label>
                    {cashGiven && (
                      <button
                        type="button"
                        onClick={() => setCashGiven('')}
                        className="text-[10px] text-gray-400 hover:text-rose-400 flex items-center gap-0.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Effacer</span>
                      </button>
                    )}
                  </div>
                  
                  <div className="relative">
                    <input
                      id="cash-received-input"
                      type="number"
                      placeholder={`ex: ${formatFCFA(Math.ceil(netToPayFCFA / 10000) * 10000 || 50000)}`}
                      value={cashGiven}
                      onChange={(e) => setCashGiven(e.target.value)}
                      className="w-full pl-3 pr-16 py-2.5 rounded-xl bg-[#141d28] border-2 border-emerald-500/40 text-lg font-mono font-black text-white focus:outline-none focus:border-emerald-400 transition-colors"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-400 pointer-events-none">
                      FCFA
                    </span>
                  </div>
                </div>

                {/* Right: Calculated Change to Return */}
                <div className={`rounded-xl p-3 border flex flex-col justify-between transition-all ${
                  changeToReturnFCFA > 0
                    ? 'bg-amber-500/15 border-amber-500/40 shadow-inner'
                    : cashGivenAmount === netToPayFCFA && cashGivenAmount > 0
                    ? 'bg-emerald-500/15 border-emerald-500/30'
                    : remainingMissingFCFA > 0
                    ? 'bg-rose-500/15 border-rose-500/30'
                    : 'bg-[#141d28] border-white/10'
                }`}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-300 font-bold flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5 text-amber-400" />
                      <span>Monnaie à Rendre :</span>
                    </span>
                    {changeToReturnFCFA > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500 text-black">
                        À RESTITUER
                      </span>
                    )}
                  </div>

                  <div className="mt-1">
                    {changeToReturnFCFA > 0 ? (
                      <span className="font-mono text-2xl font-black text-amber-400 block tracking-tight">
                        {formatFCFA(changeToReturnFCFA)}
                      </span>
                    ) : cashGivenAmount === netToPayFCFA && cashGivenAmount > 0 ? (
                      <div className="flex items-center gap-1.5 text-emerald-300 font-bold text-xs">
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>Compte Exact (0 FCFA à rendre)</span>
                      </div>
                    ) : remainingMissingFCFA > 0 ? (
                      <div className="flex items-center gap-1 text-rose-300 font-semibold text-xs">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span>Manque encore : {formatFCFA(remainingMissingFCFA)}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500 italic">
                        Entrez le montant ou cliquez sur un billet
                      </span>
                    )}
                  </div>
                </div>

              </div>

              {/* Banknote Decomposition Guidance (if change > 0) */}
              {changeToReturnFCFA > 0 && changeBreakdown.length > 0 && (
                <div className="bg-[#141d28] rounded-xl p-2.5 border border-amber-500/20 text-xs flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-gray-400 font-semibold mr-1">Rendu conseillé :</span>
                  {changeBreakdown.map((item, idx) => (
                    <span 
                      key={idx}
                      className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono text-[11px] font-bold"
                    >
                      {item.count}× {formatFCFA(item.denomination)}
                    </span>
                  ))}
                </div>
              )}

              {/* Quick Cash Shortcuts & Additive Banknotes */}
              <div className="space-y-2 pt-1 border-t border-emerald-500/10">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-400 font-semibold uppercase tracking-wider">
                    Billets Rapides FCFA :
                  </span>
                  
                  {/* Exact Amount Shortcut */}
                  <button
                    type="button"
                    onClick={handleExactCash}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500 text-black text-xs font-black hover:bg-emerald-400 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3 h-3" />
                    <span>Compte Exact ({formatFCFA(netToPayFCFA)})</span>
                  </button>
                </div>

                {/* Preset Direct Banknote Values */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {STANDARD_FCFA_DENOMINATIONS.map(amt => {
                    const isSelected = cashGivenAmount === amt;
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => handleApplyQuickCash(amt)}
                        className={`px-2 py-2 rounded-xl text-xs font-mono font-bold transition-all border cursor-pointer text-center ${
                          isSelected
                            ? 'bg-emerald-500 text-black border-emerald-400 shadow-md scale-[1.02]'
                            : amt >= netToPayFCFA
                            ? 'bg-[#141d28] text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                            : 'bg-[#141d28]/60 text-gray-400 border-white/5 hover:bg-white/5'
                        }`}
                      >
                        {formatFCFA(amt)}
                      </button>
                    );
                  })}
                </div>

                {/* Additive shortcuts (+5 000, +10 000, +20 000, +50 000) */}
                <div className="flex items-center gap-1.5 overflow-x-auto pt-1 scrollbar-thin">
                  <span className="text-[10px] text-gray-500 uppercase font-semibold shrink-0">Ajouter :</span>
                  {[5000, 10000, 20000, 50000].map(inc => (
                    <button
                      key={inc}
                      type="button"
                      onClick={() => handleAddQuickCash(inc)}
                      className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-[11px] font-mono font-bold flex items-center gap-0.5 cursor-pointer shrink-0"
                    >
                      <Plus className="w-3 h-3 text-emerald-400" />
                      <span>{formatFCFA(inc)}</span>
                    </button>
                  ))}
                </div>

              </div>

            </div>
          )}

          {(paymentMethod === 'TMONEY' || paymentMethod === 'FLOOZ' || paymentMethod === 'ORANGE_MONEY' || paymentMethod === 'MTN_MOMO' || paymentMethod === 'WAVE') && (
            <div className="bg-[#0e101a] border border-cyan-500/30 rounded-2xl p-3.5 space-y-2">
              <label className="text-xs font-bold text-cyan-300 block">
                ID / Référence de Transaction {paymentMethod.replace('_', ' ')} (Optionnel) :
              </label>
              <input
                id="mobile-money-ref-input"
                type="text"
                placeholder="ex: MP260820.1245.A890"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#171a2b] border border-cyan-500/40 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-[#171b2d] flex flex-col sm:flex-row items-center justify-between gap-3">
          
          <div>
            <div className="text-xs text-gray-400">Total Net à Encaisser :</div>
            <div className="font-mono text-2xl font-black text-amber-400 tracking-tight">
              {formatFCFA(netToPayFCFA)}
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              id="cancel-checkout-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs transition-colors cursor-pointer"
            >
              Annuler
            </button>

            <button
              id="validate-checkout-btn"
              type="button"
              disabled={isProcessing}
              onClick={handleExecutePayment}
              className="flex-1 sm:flex-none px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-xs sm:text-sm transition-all shadow-xl shadow-amber-500/25 active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Valider & Imprimer Facture ESC/POS</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};

