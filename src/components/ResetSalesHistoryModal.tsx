import React, { useState, useMemo } from 'react';
import { 
  Trash2, RotateCcw, ShieldAlert, CheckCircle2, AlertTriangle, 
  Lock, DollarSign, X, Archive, Sparkles, Check, Database,
  FileSpreadsheet, Layers, ShieldCheck, KeyRound, AlertCircle,
  Eye, EyeOff, Delete, UserCheck
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { formatFCFA, soundManager } from '../utils/formatters';

interface ResetSalesHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (info: { count: number; amountFCFA: number; backupId?: string }) => void;
}

export const ResetSalesHistoryModal: React.FC<ResetSalesHistoryModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { 
    payments, 
    orders, 
    tables, 
    currentUser, 
    users,
    verifyDirectorPin,
    resetSalesAndTransactionsHistory 
  } = usePOS();

  // Configuration options
  const [createBackupFirst, setCreateBackupFirst] = useState<boolean>(true);
  const [resetTablesAndOrders, setResetTablesAndOrders] = useState<boolean>(true);
  const [clearStockMovements, setClearStockMovements] = useState<boolean>(true);
  const [clearCloudRecords, setClearCloudRecords] = useState<boolean>(true);
  const [clearDailyArchives, setClearDailyArchives] = useState<boolean>(false);
  
  // Security PIN state
  const [pinInput, setPinInput] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [showKeypad, setShowKeypad] = useState<boolean>(false);
  const [successReport, setSuccessReport] = useState<{
    count: number;
    amountFCFA: number;
    backupId?: string;
  } | null>(null);

  // Identify director profile
  const directorUser = useMemo(() => {
    return users.find(u => u.role === 'ADMIN') || users.find(u => u.name.toLowerCase().includes('direct'));
  }, [users]);

  // Statistics of data to be cleared
  const totalRevenueToClear = useMemo(() => {
    return payments.reduce((acc, p) => acc + p.totalPaidFCFA, 0);
  }, [payments]);

  const activeOrdersCount = useMemo(() => {
    return orders.filter(o => o.status !== 'PAYEE' && o.status !== 'ANNULEE').length;
  }, [orders]);

  const occupiedTablesCount = useMemo(() => {
    return tables.filter(t => t.status !== 'LIBRE').length;
  }, [tables]);

  if (!isOpen) return null;

  const isUserDirector = currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER';

  const handleKeypadPress = (val: string) => {
    setPinError(null);
    if (pinInput.length < 12) {
      setPinInput(prev => prev + val);
    }
  };

  const handleKeypadBackspace = () => {
    setPinError(null);
    setPinInput(prev => prev.slice(0, -1));
  };

  const handleKeypadClear = () => {
    setPinError(null);
    setPinInput('');
  };

  const handleExecuteReset = () => {
    setPinError(null);

    const enteredPin = pinInput.trim();
    if (!enteredPin) {
      setPinError("Veuillez saisir le code d'accès du profil Directeur.");
      soundManager.playAlert();
      return;
    }

    // Check if entered pin matches the Director's profile access code
    const isDirectorPinValid = verifyDirectorPin(enteredPin) || (directorUser && directorUser.pin === enteredPin);

    if (!isDirectorPinValid) {
      setPinError("Code d'accès incorrect. Le mot de passe requis est exactement le code PIN / mot de passe d'accès de votre profil Directeur.");
      soundManager.playAlert();
      return;
    }

    setIsProcessing(true);

    try {
      const result = resetSalesAndTransactionsHistory({
        createBackupSnapshotFirst: createBackupFirst,
        resetTablesAndOrders: resetTablesAndOrders,
        clearStockMovements: clearStockMovements,
        clearCloudRecords: clearCloudRecords,
        clearDailyArchives: clearDailyArchives,
        notes: `Réinitialisation générale effectuée par ${currentUser.name} (${currentUser.role})`
      });

      if (result.success) {
        const report = {
          count: result.deletedPaymentsCount || totalRevenueToClear,
          amountFCFA: result.previousRevenueFCFA || totalRevenueToClear,
          backupId: result.backupId
        };
        setSuccessReport(report);
        if (onSuccess) {
          onSuccess(report);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setPinError(`Erreur lors de la réinitialisation : ${msg}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setSuccessReport(null);
    setPinInput('');
    setPinError(null);
    setShowKeypad(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div 
        id="modal-reset-sales-history"
        className="bg-[#101424] border border-rose-500/40 rounded-3xl max-w-xl w-full p-5 sm:p-7 space-y-5 shadow-2xl shadow-rose-950/40 relative overflow-hidden"
      >
        
        {/* Top Header Background Glow */}
        <div className="absolute -top-24 -right-24 w-56 h-56 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-56 h-56 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-start justify-between pb-3 border-b border-white/10 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-500/10 shrink-0">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Espace Direction
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  Sécurisé
                </span>
              </div>
              <h2 className="text-lg font-black text-white mt-1">
                Réinitialisation des Ventes & Transactions
              </h2>
              <p className="text-xs text-gray-400">
                Remise à 0 FCFA du chiffre d'affaires et de l'historique de caisse
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SUCCESS VIEW */}
        {successReport ? (
          <div className="space-y-4 py-2 relative z-10">
            <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">
                  Réinitialisation effectuée avec succès !
                </h3>
                <p className="text-xs text-emerald-300">
                  L'historique des ventes est désormais à <strong>0 FCFA</strong>. Toutes les tables sont libres et prêtes pour un nouveau service.
                </p>
              </div>
            </div>

            {/* Summary Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#0c0e17] p-3.5 rounded-2xl border border-white/10">
                <div className="text-[11px] font-medium text-gray-400">Transactions purgées</div>
                <div className="text-xl font-black text-amber-400 font-mono mt-0.5">
                  {successReport.count} paiements
                </div>
              </div>
              <div className="bg-[#0c0e17] p-3.5 rounded-2xl border border-white/10">
                <div className="text-[11px] font-medium text-gray-400">Recette remise à zéro</div>
                <div className="text-xl font-black text-rose-400 font-mono mt-0.5">
                  {formatFCFA(successReport.amountFCFA)}
                </div>
              </div>
            </div>

            {successReport.backupId && (
              <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-500/30 flex items-center justify-between text-xs text-blue-200">
                <div className="flex items-center gap-2">
                  <Archive className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Sauvegarde de sécurité créée sous l'identifiant :</span>
                </div>
                <code className="font-mono bg-blue-500/20 px-2 py-0.5 rounded text-[11px] text-blue-300 font-bold">
                  {successReport.backupId}
                </code>
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Terminé • Revenir au Tableau de Bord</span>
              </button>
            </div>
          </div>
        ) : (
          /* FORM & ACTION VIEW */
          <div className="space-y-4 relative z-10">
            
            {/* Warning Banner */}
            <div className="p-3.5 rounded-2xl bg-rose-950/30 border border-rose-500/30 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1 text-gray-200">
                <span className="font-bold text-rose-300">Action globale sur toute l'application :</span>
                <p className="text-gray-300 leading-relaxed">
                  Cette opération remet à <strong>0 FCFA</strong> l'ensemble des ventes, encaissements et historiques sur tous les écrans (Caisse, Plan de Salle, Tableau de Bord Directeur, Rapports Z, Transactions, Flux de Stock et Cloud). Le catalogue des boissons, les tarifs et les comptes du personnel restent intacts.
                </p>
              </div>
            </div>

            {/* Current State to be cleared */}
            <div className="bg-[#0b0e1a] p-3.5 rounded-2xl border border-white/10 space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Données actuelles qui seront remises à 0 FCFA :
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="bg-[#12162a] p-2.5 rounded-xl border border-white/5 text-center">
                  <div className="text-[10px] text-gray-400">Recette Totale</div>
                  <div className="text-xs sm:text-sm font-black text-rose-400 font-mono mt-0.5 truncate">
                    {formatFCFA(totalRevenueToClear)}
                  </div>
                </div>
                <div className="bg-[#12162a] p-2.5 rounded-xl border border-white/5 text-center">
                  <div className="text-[10px] text-gray-400">Transactions</div>
                  <div className="text-xs sm:text-sm font-black text-amber-400 font-mono mt-0.5">
                    {payments.length} tickets
                  </div>
                </div>
                <div className="bg-[#12162a] p-2.5 rounded-xl border border-white/5 text-center">
                  <div className="text-[10px] text-gray-400">Tables Actives</div>
                  <div className="text-xs sm:text-sm font-black text-cyan-400 font-mono mt-0.5">
                    {occupiedTablesCount} occupée(s)
                  </div>
                </div>
              </div>
            </div>

            {/* Options Checkboxes */}
            <div className="space-y-2.5 bg-[#0b0e1a] p-3.5 rounded-2xl border border-white/10">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                Portée de la réinitialisation sur toute l'application :
              </div>

              {/* Option 1: Create Backup */}
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={createBackupFirst}
                  onChange={(e) => setCreateBackupFirst(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-emerald-500 bg-[#151a2e] border-white/20 focus:ring-emerald-500"
                />
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Créer une sauvegarde automatique sur le disque local (.JSON)</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-normal">Recommandé</span>
                  </div>
                  <div className="text-[11px] text-gray-400">
                    Génère un fichier .JSON sécurisé directement dans le dossier local du disque dur et dans les archives avant d'effacer les données.
                  </div>
                </div>
              </label>

              {/* Option 2: Reset Tables & Open Orders */}
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={resetTablesAndOrders}
                  onChange={(e) => setResetTablesAndOrders(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-amber-500 bg-[#151a2e] border-white/20 focus:ring-amber-500"
                />
                <div>
                  <div className="text-xs font-bold text-white">
                    Libérer toutes les tables & vider les commandes en attente
                  </div>
                  <div className="text-[11px] text-gray-400">
                    Remet toutes les tables de la boîte à l'état LIBRE avec un solde de 0 FCFA.
                  </div>
                </div>
              </label>

              {/* Option 3: Reset Stock Movements */}
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={clearStockMovements}
                  onChange={(e) => setClearStockMovements(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-cyan-500 bg-[#151a2e] border-white/20 focus:ring-cyan-500"
                />
                <div>
                  <div className="text-xs font-bold text-white">
                    Purger le journal des flux & mouvements de stock
                  </div>
                  <div className="text-[11px] text-gray-400">
                    Remet à zéro l'historique des sorties et déstockages liés aux ventes.
                  </div>
                </div>
              </label>

              {/* Option 4: Clear Cloud Sync Records */}
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={clearCloudRecords}
                  onChange={(e) => setClearCloudRecords(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-indigo-500 bg-[#151a2e] border-white/20 focus:ring-indigo-500"
                />
                <div>
                  <div className="text-xs font-bold text-white">
                    Synchroniser la remise à 0 sur la base Cloud Firestore
                  </div>
                  <div className="text-[11px] text-gray-400">
                    Efface les transactions et commandes distantes pour éviter toute réinjection.
                  </div>
                </div>
              </label>

              {/* Option 5: Clear Daily Archives */}
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={clearDailyArchives}
                  onChange={(e) => setClearDailyArchives(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-rose-500 bg-[#151a2e] border-white/20 focus:ring-rose-500"
                />
                <div>
                  <div className="text-xs font-bold text-gray-300">
                    Effacer également les archives de clôtures Z antérieures
                  </div>
                  <div className="text-[11px] text-gray-500">
                    Purge la liste des clôtures quotidiennes archivées (laisser décoché pour conserver les rapports passés).
                  </div>
                </div>
              </label>
            </div>

            {/* Security PIN Authorization */}
            <div className="space-y-3 bg-[#12162a] p-4 rounded-2xl border border-amber-500/30">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  <span>Code d'accès / Mot de passe Direction :</span>
                </label>
                <div className="flex items-center gap-1.5 text-[11px] text-amber-200/80 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  <UserCheck className="w-3 h-3 text-amber-400" />
                  <span>Profil : <strong>{directorUser?.name || 'Direction / Admin'}</strong></span>
                </div>
              </div>

              <p className="text-[11px] text-gray-300">
                Saisissez le même mot de passe / code PIN que celui utilisé pour ouvrir votre session <strong>Directeur</strong>.
              </p>

              <div className="space-y-2">
                <div className="relative flex items-center">
                  <input
                    type={showPin ? "text" : "password"}
                    maxLength={12}
                    value={pinInput}
                    onChange={(e) => {
                      setPinError(null);
                      setPinInput(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && pinInput.trim()) {
                        handleExecuteReset();
                      }
                    }}
                    autoFocus
                    placeholder="Code d'accès du profil Directeur..."
                    className="w-full bg-[#090c16] border border-amber-500/40 focus:border-amber-400 rounded-xl pl-3.5 pr-20 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none font-mono tracking-widest"
                  />
                  <div className="absolute right-2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                      title={showPin ? "Masquer" : "Afficher"}
                    >
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowKeypad(!showKeypad)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                        showKeypad 
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' 
                          : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                      }`}
                    >
                      Clavier
                    </button>
                  </div>
                </div>

                {/* Virtual Keypad */}
                {showKeypad && (
                  <div className="pt-1 pb-1">
                    <div className="grid grid-cols-3 gap-1.5 max-w-xs mx-auto">
                      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                        <button
                          key={digit}
                          type="button"
                          onClick={() => handleKeypadPress(digit)}
                          className="py-2.5 rounded-xl bg-[#191e36] hover:bg-[#232a4a] active:scale-95 text-white font-mono font-bold text-sm border border-white/5 transition-all"
                        >
                          {digit}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={handleKeypadClear}
                        className="py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-bold text-xs border border-white/5"
                      >
                        Vider
                      </button>
                      <button
                        type="button"
                        onClick={() => handleKeypadPress('0')}
                        className="py-2.5 rounded-xl bg-[#191e36] hover:bg-[#232a4a] active:scale-95 text-white font-mono font-bold text-sm border border-white/5"
                      >
                        0
                      </button>
                      <button
                        type="button"
                        onClick={handleKeypadBackspace}
                        className="py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center border border-white/5"
                      >
                        <Delete className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {pinError && (
                <div className="text-[11px] text-rose-400 flex items-center gap-1.5 font-medium bg-rose-500/10 p-2 rounded-xl border border-rose-500/20">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{pinError}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Annuler
              </button>

              <button
                type="button"
                id="btn-confirm-reset-sales-history"
                onClick={handleExecuteReset}
                disabled={isProcessing}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-rose-600/25 cursor-pointer active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <RotateCcw className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
                <span>{isProcessing ? 'Réinitialisation en cours...' : 'Réinitialiser les Ventes (0 FCFA)'}</span>
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
