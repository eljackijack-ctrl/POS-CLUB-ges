import React, { useState, useEffect } from 'react';
import { 
  X, Lock, KeyRound, ShieldCheck, Eye, EyeOff, 
  CheckCircle2, AlertTriangle, Sparkles, Delete, 
  Check, ArrowRight, ShieldAlert, Key
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { soundManager } from '../utils/formatters';

interface ChangeDirectorPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ChangeDirectorPasswordModal: React.FC<ChangeDirectorPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { 
    currentUser, 
    verifyDirectorPin, 
    changeDirectorPin,
    users
  } = usePOS();

  const directorUser = users.find(u => u.role === 'ADMIN') || users.find(u => u.name.toLowerCase().includes('direct'));

  const [currentPin, setCurrentPin] = useState<string>('');
  const [newPin, setNewPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');

  const [showCurrentPin, setShowCurrentPin] = useState<boolean>(false);
  const [showNewPin, setShowNewPin] = useState<boolean>(false);
  const [showConfirmPin, setShowConfirmPin] = useState<boolean>(false);

  const [focusedField, setFocusedField] = useState<'current' | 'new' | 'confirm'>('current');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      setErrorMessage(null);
      setSuccessMessage(null);
      setIsSubmitting(false);
      setFocusedField('current');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleKeypadPress = (digit: string) => {
    setErrorMessage(null);
    if (focusedField === 'current') {
      if (currentPin.length < 12) setCurrentPin(prev => prev + digit);
    } else if (focusedField === 'new') {
      if (newPin.length < 12) setNewPin(prev => prev + digit);
    } else if (focusedField === 'confirm') {
      if (confirmPin.length < 12) setConfirmPin(prev => prev + digit);
    }
  };

  const handleKeypadBackspace = () => {
    setErrorMessage(null);
    if (focusedField === 'current') {
      setCurrentPin(prev => prev.slice(0, -1));
    } else if (focusedField === 'new') {
      setNewPin(prev => prev.slice(0, -1));
    } else if (focusedField === 'confirm') {
      setConfirmPin(prev => prev.slice(0, -1));
    }
  };

  const handleKeypadClear = () => {
    setErrorMessage(null);
    if (focusedField === 'current') {
      setCurrentPin('');
    } else if (focusedField === 'new') {
      setNewPin('');
    } else if (focusedField === 'confirm') {
      setConfirmPin('');
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    // 1. Check current pin
    if (!currentPin) {
      setErrorMessage('Veuillez saisir votre mot de passe / code PIN actuel.');
      soundManager.playAlert();
      setFocusedField('current');
      return;
    }

    if (!verifyDirectorPin(currentPin)) {
      setErrorMessage('Le mot de passe actuel est incorrect.');
      soundManager.playAlert();
      setFocusedField('current');
      return;
    }

    // 2. Check new pin length
    if (!newPin || newPin.length < 4) {
      setErrorMessage('Le nouveau mot de passe doit comporter au moins 4 caractères ou chiffres.');
      soundManager.playAlert();
      setFocusedField('new');
      return;
    }

    // 3. Check confirmation match
    if (newPin !== confirmPin) {
      setErrorMessage('La confirmation ne correspond pas au nouveau mot de passe.');
      soundManager.playAlert();
      setFocusedField('confirm');
      return;
    }

    setIsSubmitting(true);

    const result = changeDirectorPin(currentPin, newPin);

    if (result.success) {
      setSuccessMessage('Mot de passe Directeur mis à jour avec succès !');
      soundManager.playSuccessTone();
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1500);
    } else {
      setIsSubmitting(false);
      setErrorMessage(result.error || 'Erreur lors de la mise à jour.');
      soundManager.playAlert();
    }
  };

  const isFormValid = currentPin.length >= 4 && newPin.length >= 4 && newPin === confirmPin;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        id="change-director-password-modal"
        className="relative w-full max-w-lg bg-[#0d101d] border border-amber-500/40 rounded-3xl shadow-2xl shadow-amber-950/40 overflow-hidden text-gray-200"
      >
        {/* Glow Header bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600" />

        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-white/10 flex items-start justify-between gap-4 bg-[#121626]">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 p-0.5 shadow-lg shadow-amber-500/20 shrink-0">
              <div className="w-full h-full bg-[#0d101d] rounded-[14px] flex items-center justify-center">
                <KeyRound className="w-6 h-6 text-amber-400" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Sécurité Confidentielle
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Directeur / Directrice
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white mt-1">
                Modifier le Mot de Passe Direction
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
        <div className="p-5 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          
          {/* Information Notice */}
          <div className="p-3.5 rounded-2xl bg-[#14192d] border border-amber-500/20 text-xs text-gray-300 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white block mb-0.5">Protection Exclusif du Profil Direction</span>
              Ce mot de passe protège l'accès à la session Directrice, au tableau de bord live des ventes & stocks, ainsi qu'aux réinitialisations du système.
            </div>
          </div>

          {/* Feedback Messages */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-2 animate-shake">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-pulse">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Input Fields */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Field 1: Ancien Mot de passe */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-300 flex items-center justify-between">
                <span>Ancien Mot de passe / Code PIN Actuel :</span>
                {directorUser?.pin === '0000' && (
                  <span className="text-[10px] text-amber-400 font-normal">
                    (Code par défaut : 0000)
                  </span>
                )}
              </label>

              <div className="relative">
                <input
                  type={showCurrentPin ? 'text' : 'password'}
                  id="input-current-director-pin"
                  value={currentPin}
                  onFocus={() => setFocusedField('current')}
                  onChange={(e) => {
                    setCurrentPin(e.target.value);
                    setErrorMessage(null);
                  }}
                  placeholder="Code PIN actuel (ex: 0000)"
                  className={`w-full bg-[#080a14] border rounded-xl px-3.5 py-2.5 text-sm text-white font-mono tracking-wider focus:outline-none transition-all pl-10 pr-10 ${
                    focusedField === 'current' ? 'border-amber-400 shadow-md shadow-amber-500/10' : 'border-white/15'
                  }`}
                />
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <button
                  type="button"
                  onClick={() => setShowCurrentPin(!showCurrentPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1"
                >
                  {showCurrentPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Field 2: Nouveau Mot de passe */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-300 flex items-center justify-between">
                <span>Nouveau Mot de passe / Code PIN (4 à 12 car.) :</span>
                <span className="text-[10px] text-gray-400 font-mono">
                  {newPin.length >= 4 ? '✓ Valide' : 'Min. 4 chiffres'}
                </span>
              </label>

              <div className="relative">
                <input
                  type={showNewPin ? 'text' : 'password'}
                  id="input-new-director-pin"
                  value={newPin}
                  onFocus={() => setFocusedField('new')}
                  onChange={(e) => {
                    setNewPin(e.target.value);
                    setErrorMessage(null);
                  }}
                  placeholder="Nouveau code confidentiel"
                  className={`w-full bg-[#080a14] border rounded-xl px-3.5 py-2.5 text-sm text-white font-mono tracking-wider focus:outline-none transition-all pl-10 pr-10 ${
                    focusedField === 'new' ? 'border-amber-400 shadow-md shadow-amber-500/10' : 'border-white/15'
                  }`}
                />
                <Key className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <button
                  type="button"
                  onClick={() => setShowNewPin(!showNewPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1"
                >
                  {showNewPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Field 3: Confirmer le nouveau mot de passe */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-300 flex items-center justify-between">
                <span>Confirmer le Nouveau Mot de passe :</span>
                {newPin && confirmPin && (
                  <span className={`text-[10px] font-bold ${newPin === confirmPin ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {newPin === confirmPin ? '✓ Identique' : '✗ Différent'}
                  </span>
                )}
              </label>

              <div className="relative">
                <input
                  type={showConfirmPin ? 'text' : 'password'}
                  id="input-confirm-director-pin"
                  value={confirmPin}
                  onFocus={() => setFocusedField('confirm')}
                  onChange={(e) => {
                    setConfirmPin(e.target.value);
                    setErrorMessage(null);
                  }}
                  placeholder="Confirmez le nouveau code"
                  className={`w-full bg-[#080a14] border rounded-xl px-3.5 py-2.5 text-sm text-white font-mono tracking-wider focus:outline-none transition-all pl-10 pr-10 ${
                    focusedField === 'confirm' ? 'border-amber-400 shadow-md shadow-amber-500/10' : 'border-white/15'
                  }`}
                />
                <ShieldCheck className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <button
                  type="button"
                  onClick={() => setShowConfirmPin(!showConfirmPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1"
                >
                  {showConfirmPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

          </form>

          {/* Virtual Numeric Touch Keypad for quick POS entry */}
          <div className="bg-[#090b14] border border-white/10 rounded-2xl p-3 space-y-2">
            <div className="text-[10px] text-gray-400 flex items-center justify-between px-1">
              <span>Saisie tactile rapide (Champ sélectionné: <strong className="text-amber-300">{focusedField === 'current' ? 'Ancien' : focusedField === 'new' ? 'Nouveau' : 'Confirmation'}</strong>)</span>
              <button
                type="button"
                onClick={handleKeypadClear}
                className="text-amber-400 hover:text-amber-300 font-bold"
              >
                Vider
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleKeypadPress(digit)}
                  className="py-2.5 rounded-xl bg-[#141828] hover:bg-amber-500/20 active:bg-amber-500 border border-white/5 hover:border-amber-500/30 text-white hover:text-amber-300 active:text-black text-sm font-bold font-mono transition-all cursor-pointer"
                >
                  {digit}
                </button>
              ))}
              
              <button
                type="button"
                onClick={handleKeypadBackspace}
                className="py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 text-xs font-bold flex items-center justify-center cursor-pointer"
              >
                <Delete className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => handleKeypadPress('0')}
                className="py-2.5 rounded-xl bg-[#141828] hover:bg-amber-500/20 active:bg-amber-500 border border-white/5 hover:border-amber-500/30 text-white hover:text-amber-300 active:text-black text-sm font-bold font-mono transition-all cursor-pointer"
              >
                0
              </button>

              <button
                type="button"
                onClick={() => {
                  if (focusedField === 'current') setFocusedField('new');
                  else if (focusedField === 'new') setFocusedField('confirm');
                  else if (focusedField === 'confirm') handleSubmit();
                }}
                className="py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-300 text-xs font-bold flex items-center justify-center cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold transition-colors cursor-pointer"
            >
              Annuler
            </button>

            <button
              type="button"
              id="btn-confirm-change-director-password"
              onClick={() => handleSubmit()}
              disabled={!isFormValid || isSubmitting}
              className={`px-5 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer ${
                isFormValid && !isSubmitting
                  ? 'bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 shadow-amber-500/25 active:scale-95'
                  : 'bg-white/10 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Enregistrement...' : 'Enregistrer le Nouveau Mot de Passe'}</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
