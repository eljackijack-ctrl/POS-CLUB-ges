import React, { useState } from 'react';
import { 
  X, CheckCircle2, User as UserIcon, Shield, Sparkles, 
  KeyRound, UserCheck, Lock, Eye, EyeOff, AlertTriangle, 
  ArrowLeft, Check, Delete, ShieldAlert, Key
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { User, UserRole } from '../types';
import { soundManager } from '../utils/formatters';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenProfileCreation?: () => void;
  onOpenChangeDirectorPassword?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ 
  isOpen, 
  onClose, 
  onOpenProfileCreation,
  onOpenChangeDirectorPassword
}) => {
  const { 
    users, 
    currentUser, 
    setCurrentUser, 
    verifyDirectorPin,
    setIsDirectorPasswordModalOpen
  } = usePOS();
  
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');
  const [pendingAdminUser, setPendingAdminUser] = useState<User | null>(null);
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [showPinMask, setShowPinMask] = useState<boolean>(false);
  const [pinError, setPinError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectUser = (user: User) => {
    // If selecting an ADMIN / Director profile, require Director password/PIN
    if (user.role === 'ADMIN' || user.name.toLowerCase().includes('direction') || user.name.toLowerCase().includes('directrice')) {
      // If already logged into this same admin user, just close
      if (currentUser.id === user.id) {
        onClose();
        return;
      }
      setPendingAdminUser(user);
      setEnteredPin('');
      setPinError(null);
      return;
    }

    // For non-admin profiles (Serveur, Barman, Manager), switch directly
    setCurrentUser(user);
    soundManager.playSuccessTone();
    onClose();
  };

  const handleValidateDirectorPin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pendingAdminUser) return;

    if (!enteredPin) {
      setPinError('Veuillez saisir votre mot de passe / code PIN.');
      soundManager.playAlert();
      return;
    }

    // Verify PIN against specific admin user or global director PIN
    const isValid = enteredPin === pendingAdminUser.pin || verifyDirectorPin(enteredPin);

    if (isValid) {
      setCurrentUser(pendingAdminUser);
      soundManager.playSuccessTone();
      setPendingAdminUser(null);
      setEnteredPin('');
      setPinError(null);
      onClose();
    } else {
      setPinError('Mot de passe ou Code PIN incorrect. Accès refusé.');
      soundManager.playAlert();
      setEnteredPin('');
    }
  };

  const handleKeypadPress = (digit: string) => {
    setPinError(null);
    if (enteredPin.length < 12) {
      setEnteredPin(prev => prev + digit);
    }
  };

  const handleKeypadBackspace = () => {
    setPinError(null);
    setEnteredPin(prev => prev.slice(0, -1));
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'SERVEUR':
        return { label: 'Serveur Salle', bg: 'bg-blue-500/20 text-blue-300 border-blue-500/40' };
      case 'BARMAN':
        return { label: 'Barman / Mixologue', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
      case 'MANAGER':
        return { label: 'Manager / Caisse', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
      case 'ADMIN':
        return { label: 'Direction Générale', bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40' };
    }
  };

  const filteredUsers = users.filter(u => {
    if (selectedRoleFilter === 'ALL') return true;
    return u.role === selectedRoleFilter;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#121522] border border-amber-500/40 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl text-white">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#181c2d]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 p-[1.5px] shadow-md shadow-amber-500/20 shrink-0">
              <div className="w-full h-full bg-[#121522] rounded-[10px] flex items-center justify-center overflow-hidden">
                <img
                  src="/clubpos-logo.png"
                  alt="ClubPOS Logo"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {pendingAdminUser ? 'Sécurité & Accès Direction' : 'Sélection du Profil Actif'}
              </h2>
              <p className="text-xs text-gray-400">
                {pendingAdminUser 
                  ? 'Veuillez saisir votre mot de passe pour prendre la main'
                  : 'Changement de profil • Direction sécurisée par code'}
              </p>
            </div>
          </div>
          <button
            id="close-auth-modal"
            onClick={() => {
              setPendingAdminUser(null);
              setEnteredPin('');
              setPinError(null);
              onClose();
            }}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View 1: Password Prompt for Director / Admin */}
        {pendingAdminUser ? (
          <div className="p-6 space-y-5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setPendingAdminUser(null);
                  setEnteredPin('');
                  setPinError(null);
                }}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-amber-400 font-bold transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Retour aux profils</span>
              </button>

              <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                🔒 Profil Direction Protégé
              </span>
            </div>

            {/* Target Director Card */}
            <div className="p-4 rounded-2xl bg-[#161a2c] border border-rose-500/30 flex items-center justify-between gap-3 shadow-inner">
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-base text-white shadow"
                  style={{ backgroundColor: pendingAdminUser.avatarColor || '#EF4444' }}
                >
                  {pendingAdminUser.name.charAt(0)}
                </div>
                <div>
                  <div className="font-black text-sm text-white flex items-center gap-1.5">
                    <span>{pendingAdminUser.name}</span>
                    <Shield className="w-4 h-4 text-rose-400" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-rose-500/20 text-rose-300 border-rose-500/40 mt-1 inline-block">
                    Direction Générale
                  </span>
                </div>
              </div>

              <div className="text-right text-[11px] text-gray-400">
                Code confidentiel requis
              </div>
            </div>

            {/* Error Banner */}
            {pinError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{pinError}</span>
              </div>
            )}

            {/* PIN Input Form */}
            <form onSubmit={handleValidateDirectorPin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300 flex items-center justify-between">
                  <span>Mot de Passe / Code PIN Direction :</span>
                  {pendingAdminUser.pin === '0000' && (
                    <span className="text-[10px] text-amber-400 font-normal">
                      (Code initial par défaut : 0000)
                    </span>
                  )}
                </label>

                <div className="relative">
                  <input
                    type={showPinMask ? 'text' : 'password'}
                    id="input-auth-director-pin"
                    value={enteredPin}
                    autoFocus
                    onChange={(e) => {
                      setEnteredPin(e.target.value);
                      setPinError(null);
                    }}
                    placeholder="Saisir le mot de passe..."
                    className="w-full bg-[#090b14] border border-amber-500/40 rounded-xl px-4 py-3 text-base text-white font-mono tracking-widest focus:outline-none focus:border-amber-400 shadow-md shadow-amber-500/10 pl-11 pr-11 text-center"
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
              </div>

              {/* Numeric Touch Pad */}
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
                  onClick={() => handleValidateDirectorPin()}
                  className="py-3 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 text-xs font-black flex items-center justify-center gap-1 cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  <Check className="w-4 h-4" />
                  <span>Valider</span>
                </button>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setPendingAdminUser(null);
                    setEnteredPin('');
                    setPinError(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-300 transition-colors"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={!enteredPin}
                  className={`px-6 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 transition-all cursor-pointer ${
                    enteredPin
                      ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/25'
                      : 'bg-white/10 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Key className="w-4 h-4" />
                  <span>Déverrouiller la Session Direction</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* View 2: User Cards Selection */
          <div className="p-6 space-y-5">
            
            {/* Quick Role Filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {[
                { value: 'ALL', label: 'Tous' },
                { value: 'SERVEUR', label: 'Serveurs' },
                { value: 'BARMAN', label: 'Barmen' },
                { value: 'MANAGER', label: 'Managers' },
                { value: 'ADMIN', label: 'Direction' },
              ].map(tab => (
                <button
                  key={tab.value}
                  onClick={() => setSelectedRoleFilter(tab.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                    selectedRoleFilter === tab.value
                      ? 'bg-amber-500 text-black font-bold'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* User Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
              {filteredUsers.map((user) => {
                const isCurrent = user.id === currentUser.id;
                const isAdmin = user.role === 'ADMIN';
                const badge = getRoleBadge(user.role);

                return (
                  <button
                    key={user.id}
                    id={`select-user-${user.id}`}
                    onClick={() => handleSelectUser(user)}
                    className={`p-3.5 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer group ${
                      isCurrent
                        ? 'bg-amber-500/15 border-amber-500/50 shadow-lg shadow-amber-500/10'
                        : isAdmin
                        ? 'bg-[#18121f] border-rose-500/30 hover:border-rose-500/60 hover:bg-[#22162c]'
                        : 'bg-[#171b2d] border-white/10 hover:border-white/20 hover:bg-[#1e2338]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white shadow shrink-0"
                        style={{ backgroundColor: user.avatarColor }}
                      >
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-white group-hover:text-amber-300 transition-colors flex items-center gap-1.5">
                          <span className="truncate max-w-[120px]">{user.name}</span>
                          {isCurrent && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-400 text-black">
                              Actif
                            </span>
                          )}
                          {isAdmin && (
                            <Lock className="w-3.5 h-3.5 text-rose-400" title="Protégé par mot de passe" />
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${badge.bg}`}>
                            {badge.label}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-gray-400 group-hover:text-white transition-colors shrink-0">
                      {isCurrent ? (
                        <CheckCircle2 className="w-5 h-5 text-amber-400" />
                      ) : isAdmin ? (
                        <div className="text-xs font-bold text-rose-300 group-hover:text-rose-200 flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          <span>Code →</span>
                        </div>
                      ) : (
                        <div className="text-xs font-semibold text-gray-500 group-hover:text-amber-400">
                          Choisir →
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Bottom Actions: Change Director Password & Staff management */}
            <div className="border-t border-white/10 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2.5">
              {currentUser.role === 'ADMIN' ? (
                <button
                  id="btn-change-director-pin-from-auth"
                  onClick={() => {
                    onClose();
                    if (onOpenChangeDirectorPassword) {
                      onOpenChangeDirectorPassword();
                    } else {
                      setIsDirectorPasswordModalOpen(true);
                    }
                  }}
                  className="w-full sm:w-auto px-3 py-2 rounded-xl bg-gradient-to-r from-rose-500/20 to-amber-500/20 hover:from-rose-500/30 hover:to-amber-500/30 border border-rose-500/40 text-xs font-bold text-rose-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-rose-400" />
                  <span>Modifier mon Mot de Passe Directeur</span>
                </button>
              ) : (
                <button
                  id="btn-open-director-password-change"
                  onClick={() => {
                    onClose();
                    if (onOpenChangeDirectorPassword) {
                      onOpenChangeDirectorPassword();
                    } else {
                      setIsDirectorPasswordModalOpen(true);
                    }
                  }}
                  className="w-full sm:w-auto px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-300 hover:text-amber-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Sécurité Mot de Passe Direction</span>
                </button>
              )}

              {onOpenProfileCreation && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenProfileCreation();
                  }}
                  className="w-full sm:w-auto px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-amber-300 transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <span>+ Gérer Profils Staff</span>
                </button>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
