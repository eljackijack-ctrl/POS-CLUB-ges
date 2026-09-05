import React, { useState } from 'react';
import { 
  Laptop, Cpu, Wifi, RotateCcw, ShieldAlert, CheckCircle2, 
  AlertTriangle, ArrowRight, ShieldCheck, Database, RefreshCw,
  Info, Sparkles, X, Layers, Building2, PackageCheck
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { DeviceChangeAlert } from '../types';

interface NewDeviceZeroResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  alert: DeviceChangeAlert | null;
  onConfirmReset: (options: { resetStockLevelsToZero: boolean; keepCatalog: boolean }) => void;
}

export const NewDeviceZeroResetModal: React.FC<NewDeviceZeroResetModalProps> = ({
  isOpen,
  onClose,
  alert,
  onConfirmReset
}) => {
  const { deviceSignature, setShowDeviceStationModal } = usePOS();
  const [resetStockLevelsToZero, setResetStockLevelsToZero] = useState<boolean>(true);
  const [keepCatalog, setKeepCatalog] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  if (!isOpen || !alert) return null;

  const handleExecute = () => {
    setIsProcessing(true);
    setTimeout(() => {
      onConfirmReset({
        resetStockLevelsToZero,
        keepCatalog
      });
      setIsProcessing(false);
      onClose();
    }, 400);
  };

  const getReasonBadge = () => {
    switch (alert.reason) {
      case 'NEW_MAC':
        return {
          title: 'Nouveau Code MAC Détecté',
          desc: 'L\'adresse MAC réseau de la station a changé.',
          color: 'from-cyan-500/20 to-blue-500/20 border-cyan-500/40 text-cyan-300',
          icon: <Wifi className="w-5 h-5 text-cyan-400" />
        };
      case 'NEW_IP':
        return {
          title: 'Nouvelle Adresse IP Détectée',
          desc: 'L\'adresse IP du terminal de caisse a changé.',
          color: 'from-blue-500/20 to-indigo-500/20 border-blue-500/40 text-blue-300',
          icon: <Cpu className="w-5 h-5 text-blue-400" />
        };
      case 'NEW_DEVICE':
        return {
          title: 'Changement d\'Appareil Détecté',
          desc: 'Un nouveau terminal physique ou navigateur a été identifié.',
          color: 'from-amber-500/20 to-orange-500/20 border-amber-500/40 text-amber-300',
          icon: <Laptop className="w-5 h-5 text-amber-400" />
        };
      case 'MULTIPLE_CHANGES':
        return {
          title: 'Nouvel Appareil & Réseau Identifié',
          desc: 'Nouveau code MAC, nouvelle IP et nouvel appareil physique.',
          color: 'from-rose-500/20 to-amber-500/20 border-rose-500/40 text-rose-300',
          icon: <ShieldAlert className="w-5 h-5 text-rose-400" />
        };
      case 'FIRST_LAUNCH':
        return {
          title: 'Initialisation Premier Démarrage Terminal',
          desc: 'Attribution du premier code MAC/IP et démarrage à zéro.',
          color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/40 text-emerald-300',
          icon: <Sparkles className="w-5 h-5 text-emerald-400" />
        };
      default:
        return {
          title: 'Identification Nouveau Terminal',
          desc: 'Détection d\'un nouvel identifiant réseau ou matériel.',
          color: 'from-purple-500/20 to-indigo-500/20 border-purple-500/40 text-purple-300',
          icon: <Layers className="w-5 h-5 text-purple-400" />
        };
    }
  };

  const reasonInfo = getReasonBadge();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        id="new-device-zero-reset-modal"
        className="relative w-full max-w-xl bg-[#0e121e] border border-amber-500/40 rounded-3xl shadow-2xl shadow-amber-950/50 overflow-hidden text-gray-200"
      >
        {/* Glow Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-rose-500 to-cyan-500" />

        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-white/10 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/10">
              <RotateCcw className="w-6 h-6 text-amber-400 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Sécurité & Conformité Caisse
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Remise à 0 Activée
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white mt-1">
                Changement d'Appareil / Nouveau Code MAC ou IP
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          
          {/* Reason Card */}
          <div className={`p-4 rounded-2xl border bg-gradient-to-r ${reasonInfo.color} flex items-start gap-3`}>
            <div className="p-2 rounded-xl bg-black/40 border border-white/10 shrink-0 mt-0.5">
              {reasonInfo.icon}
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                {reasonInfo.title}
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed">
                {alert.message || reasonInfo.desc}
              </p>
            </div>
          </div>

          {/* Identification Diff Grid */}
          <div className="bg-[#141824] border border-white/10 rounded-2xl p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center justify-between">
              <span>Signatures Réseau & Matériel Détectées</span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setShowDeviceStationModal(true);
                }}
                className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold underline cursor-pointer"
              >
                Gérer les codes
              </button>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              
              {/* MAC Address */}
              <div className="p-3 rounded-xl bg-[#0b0e17] border border-cyan-500/30 space-y-1">
                <div className="flex items-center justify-between text-gray-400">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-cyan-300">
                    <Wifi className="w-3.5 h-3.5 text-cyan-400" />
                    Code MAC Station
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono">Actuel</span>
                </div>
                <div className="font-mono font-black text-sm text-white tracking-wider">
                  {alert.currentMac}
                </div>
                {alert.previousMac && alert.previousMac !== alert.currentMac && (
                  <div className="text-[10px] text-gray-500 font-mono line-through">
                    Précédent : {alert.previousMac}
                  </div>
                )}
              </div>

              {/* IP Address */}
              <div className="p-3 rounded-xl bg-[#0b0e17] border border-blue-500/30 space-y-1">
                <div className="flex items-center justify-between text-gray-400">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-blue-300">
                    <Cpu className="w-3.5 h-3.5 text-blue-400" />
                    Code IP Station
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-mono">Actuel</span>
                </div>
                <div className="font-mono font-black text-sm text-white tracking-wider">
                  {alert.currentIp}
                </div>
                {alert.previousIp && alert.previousIp !== alert.currentIp && (
                  <div className="text-[10px] text-gray-500 font-mono line-through">
                    Précédent : {alert.previousIp}
                  </div>
                )}
              </div>

              {/* Device ID */}
              <div className="sm:col-span-2 p-3 rounded-xl bg-[#0b0e17] border border-white/10 space-y-1">
                <div className="flex items-center justify-between text-gray-400">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-gray-300">
                    <Laptop className="w-3.5 h-3.5 text-amber-400" />
                    ID Terminal Matériel
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-gray-300 font-mono">{deviceSignature.platform}</span>
                </div>
                <div className="font-mono font-bold text-xs text-amber-200 truncate">
                  {alert.currentDeviceId}
                </div>
              </div>

            </div>
          </div>

          {/* Zero-Reset Explanation & Scope */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Opérations exécutées lors de la remise à zéro :</span>
            </h4>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-[#141824] border border-white/5 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Ventes & Factures = <strong>0 FCFA</strong></span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#141824] border border-white/5 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Commandes actives = <strong>0</strong></span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#141824] border border-white/5 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Toutes les Tables = <strong>LIBRE</strong></span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#141824] border border-white/5 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Mouvements Stock = <strong>0</strong></span>
              </div>
            </div>
          </div>

          {/* Options Checklist */}
          <div className="p-4 rounded-2xl bg-[#111522] border border-white/10 space-y-3 text-xs">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={resetStockLevelsToZero}
                onChange={(e) => setResetStockLevelsToZero(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-600 text-amber-500 focus:ring-amber-500"
              />
              <div className="space-y-0.5">
                <span className="font-bold text-white group-hover:text-amber-300 transition-colors">
                  Remettre les quantités de stock de toutes les boissons à 0
                </span>
                <p className="text-[11px] text-gray-400">
                  Idéal pour réaliser un inventaire d'entrée propre et saisir les nouveaux approvisionnements sur ce terminal.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={keepCatalog}
                onChange={(e) => setKeepCatalog(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-600 text-amber-500 focus:ring-amber-500"
              />
              <div className="space-y-0.5">
                <span className="font-bold text-white group-hover:text-amber-300 transition-colors">
                  Conserver la structure de la carte et les tarifs boissons (Prix FCFA)
                </span>
                <p className="text-[11px] text-gray-400">
                  Garde vos fiches produits (Champagnes, Spiritueux, Bières, Softs) prêtes à l'emploi avec stock réinitialisé.
                </p>
              </div>
            </label>
          </div>

        </div>

        {/* Modal Footer Buttons */}
        <div className="p-5 sm:p-6 border-t border-white/10 bg-[#090c15] flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
          
          <button
            type="button"
            onClick={() => {
              onClose();
              setShowDeviceStationModal(true);
            }}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-gray-300 hover:text-white font-bold text-xs transition-colors cursor-pointer text-center"
          >
            Paramètres Réseau Station
          </button>

          <button
            type="button"
            id="btn-confirm-device-reset-zero"
            onClick={handleExecute}
            disabled={isProcessing}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                <span>Réinitialisation à 0 en cours...</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4 text-slate-950" />
                <span>Identifier le Terminal & Remettre tout à 0</span>
                <ArrowRight className="w-4 h-4 text-slate-950" />
              </>
            )}
          </button>

        </div>

      </div>
    </div>
  );
};
