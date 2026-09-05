import React, { useState, useEffect } from 'react';
import { 
  X, UserPlus, Users, Lock, KeyRound, Shield, 
  Wine, Coffee, DollarSign, Check, Trash2, 
  Sparkles, Phone, AlertCircle, ArrowRight, 
  CheckCircle2, UserCheck, ShieldCheck, Edit3, Save,
  Building2, Printer, Bluetooth, Store, MapPin, Mail, Receipt,
  Sliders, Volume2, VolumeX, Eye, Laptop, HardDrive, 
  Layers, Flame, Crown, Disc, GlassWater, CheckSquare, Settings2,
  Search, RotateCcw, AlertTriangle
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { User, UserRole, CompanyProfile, StartupOptions, PrinterConfig } from '../types';
import { formatFCFA } from '../utils/formatters';

interface StartupProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: 'TABLES' | 'ORDER' | 'KDS_BAR' | 'STOCK' | 'REPORTS' | 'ARCHITECTURE') => void;
}

const AVATAR_COLORS = [
  { name: 'Or Impérial', color: '#F59E0B' },
  { name: 'Cyan Néon', color: '#06B6D4' },
  { name: 'Violet Électrique', color: '#8B5CF6' },
  { name: 'Rose Fluo', color: '#EC4899' },
  { name: 'Vert Émeraude', color: '#10B981' },
  { name: 'Bleu Saphir', color: '#3B82F6' },
  { name: 'Rouge Rubis', color: '#EF4444' },
  { name: 'Indigo Nuit', color: '#6366F1' },
];

const ROLE_DESCRIPTIONS: Record<UserRole, { title: string; desc: string; icon: React.ReactNode; badgeClass: string }> = {
  SERVEUR: {
    title: 'Serveur / Salle',
    desc: 'Prise de commande mobile, attribution des tables VIP & Piste, demande d’addition.',
    icon: <Wine className="w-4 h-4 text-blue-400" />,
    badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/40'
  },
  BARMAN: {
    title: 'Barman / KDS',
    desc: 'Écran de préparation en temps réel, sortie des verres et bouteilles, décompte stock.',
    icon: <Coffee className="w-4 h-4 text-emerald-400" />,
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
  },
  MANAGER: {
    title: 'Manager / Caisse',
    desc: 'Encaissement multi-moyens (Cash, TMoney, Flooz, Wave, Carte), remises VIP, clôture Z.',
    icon: <DollarSign className="w-4 h-4 text-amber-400" />,
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40'
  },
  ADMIN: {
    title: 'Direction / Admin',
    desc: 'Contrôle global, rapports financiers, gestion des équipes et configuration système.',
    icon: <Shield className="w-4 h-4 text-rose-400" />,
    badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40'
  }
};

const ESTABLISHMENT_PRESETS: Array<{
  id: string;
  name: string;
  badge: string;
  desc: string;
  profile: Partial<CompanyProfile>;
  options: Partial<StartupOptions>;
  printer: Partial<PrinterConfig>;
}> = [
  {
    id: 'VIP_NIGHTCLUB',
    name: '👑 VIP Nightclub & Discothèque',
    badge: 'Recommandé Boîte de Nuit',
    desc: 'Carrés VIP, Champagnes de prestige, Reçus thermiques avec logo couronne & 2 copies (Client + Bar).',
    profile: {
      name: 'LE VELVET VIP CLUB & LOUNGE',
      slogan: 'Cocktails d’Exception, Champagnes & Prestige VIP',
      rccm: 'RCCM: TG-LOM-2024-B-1284',
      nif: 'NIF: 1002345890',
      address: 'Boulevard du 13 Janvier, Zone Nocturne',
      cityCountry: 'Lomé, Togo',
      phone: '+228 90 11 22 33',
      email: 'direction@velvetvipclub.com',
      receiptFooterMessage: 'Merci pour votre confiance ! L’abus d’alcool est dangereux pour la santé, à consommer avec modération.',
      currency: 'FCFA',
      logoIcon: 'crown',
      isConfigured: true
    },
    options: {
      defaultScreen: 'TABLES',
      showStartupModalOnLaunch: true,
      requirePinOnStartup: false,
      isSoundEnabled: true,
      autoConnectBluetooth: true,
      autoPrintReceiptOnCheckout: true,
      printCopiesCount: 2,
      paperWidth: 58,
      defaultZoneFilter: 'ALL'
    },
    printer: {
      paperWidth: 58,
      printCopies: 2,
      printLogo: true,
      printFiscalHeader: true,
      autoPrintReceipt: true,
      cutPaper: true,
      openCashDrawer: true
    }
  },
  {
    id: 'BAR_LOUNGE',
    name: '🍸 Bar Lounge & Cocktails',
    badge: 'Mixologie & Afterwork',
    desc: 'Ambiance lounge chic, cocktail bar, impression 58mm rapide 1 exemplaire, sons actifs.',
    profile: {
      name: 'L’ALCHIMISTE COCKTAIL LOUNGE',
      slogan: 'Mixologie raffinée, Spiritueux rares & Tapas',
      rccm: 'RCCM: CI-ABJ-2023-B-5821',
      nif: 'NIF: 2049182301',
      address: 'Rue des Jardins, Deux Plateaux Vallons',
      cityCountry: 'Abidjan, Côte d’Ivoire',
      phone: '+225 07 48 90 12 34',
      email: 'contact@alchimiste-lounge.ci',
      receiptFooterMessage: 'Merci pour votre visite ! Au plaisir de vous revoir très bientôt.',
      currency: 'FCFA',
      logoIcon: 'martini',
      isConfigured: true
    },
    options: {
      defaultScreen: 'TABLES',
      showStartupModalOnLaunch: false,
      requirePinOnStartup: false,
      isSoundEnabled: true,
      autoConnectBluetooth: true,
      autoPrintReceiptOnCheckout: true,
      printCopiesCount: 1,
      paperWidth: 58,
      defaultZoneFilter: 'COMPTOIR_BAR'
    },
    printer: {
      paperWidth: 58,
      printCopies: 1,
      printLogo: true,
      printFiscalHeader: true,
      autoPrintReceipt: true,
      cutPaper: true,
      openCashDrawer: true
    }
  },
  {
    id: 'ROOFTOP_CLUB',
    name: '🌅 Rooftop Club & Terrasse',
    badge: 'Grand Standing',
    desc: 'Grand format 80mm large avec en-tête détaillé, écran barman KDS prioritaire.',
    profile: {
      name: 'SKYLINE ROOFTOP & BAR',
      slogan: 'Terrasse Panoramique, DJ Sets & Champagnes',
      rccm: 'RCCM: SN-DKR-2024-B-9912',
      nif: 'NIF: 3829104821',
      address: 'Corniche des Almadies',
      cityCountry: 'Dakar, Sénégal',
      phone: '+221 77 123 45 67',
      email: 'skyline@clubrooftop.sn',
      receiptFooterMessage: 'Skyline vous remercie pour votre fidélité ! Bonne fin de soirée.',
      currency: 'FCFA',
      logoIcon: 'sparkles',
      isConfigured: true
    },
    options: {
      defaultScreen: 'TABLES',
      showStartupModalOnLaunch: true,
      requirePinOnStartup: false,
      isSoundEnabled: true,
      autoConnectBluetooth: true,
      autoPrintReceiptOnCheckout: true,
      printCopiesCount: 1,
      paperWidth: 80,
      defaultZoneFilter: 'TERRASSE'
    },
    printer: {
      paperWidth: 80,
      printCopies: 1,
      printLogo: true,
      printFiscalHeader: true,
      autoPrintReceipt: true,
      cutPaper: true,
      openCashDrawer: true
    }
  },
  {
    id: 'CHICHA_SPORTSBAR',
    name: '💨 Chicha Lounge & Sports Bar',
    badge: 'Ambiance Festive',
    desc: 'Service direct rapide, bips sonores activés, impression compacte 58mm.',
    profile: {
      name: 'OASIS CHICHA & SPORTS BAR',
      slogan: 'Chichas Spéciales, Écrans Géants & Cocktails Glacés',
      rccm: 'RCCM: CM-DLA-2024-B-4321',
      nif: 'NIF: 5930219482',
      address: 'Boulevard de la Liberté, Akwa',
      cityCountry: 'Douala, Cameroun',
      phone: '+237 6 90 12 34 56',
      email: 'oasis.chicha@sportsbar.cm',
      receiptFooterMessage: 'Merci pour votre visite ! Retrouvez tous nos matchs en direct ce week-end.',
      currency: 'FCFA',
      logoIcon: 'flame',
      isConfigured: true
    },
    options: {
      defaultScreen: 'TABLES',
      showStartupModalOnLaunch: false,
      requirePinOnStartup: false,
      isSoundEnabled: true,
      autoConnectBluetooth: true,
      autoPrintReceiptOnCheckout: true,
      printCopiesCount: 1,
      paperWidth: 58,
      defaultZoneFilter: 'TERRASSE'
    },
    printer: {
      paperWidth: 58,
      printCopies: 1,
      printLogo: true,
      printFiscalHeader: true,
      autoPrintReceipt: true,
      cutPaper: true,
      openCashDrawer: true
    }
  }
];

export const StartupProfileModal: React.FC<StartupProfileModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab
}) => {
  const { 
    users, 
    tables,
    currentUser, 
    setCurrentUser, 
    addUser, 
    updateUser,
    deleteUser, 
    resetUsersToDefault,
    showStartupModal, 
    setShowStartupModal,
    companyProfile,
    updateCompanyProfile,
    setCompanyProfile,
    printerConfig,
    setPrinterConfig,
    setShowPrinterSettingsModal,
    startupOptions,
    updateStartupOptions,
    isSoundEnabled,
    toggleSound
  } = usePOS();

  const [activeTab, setActiveTab] = useState<'STAFF' | 'COMPANY' | 'PRINTER' | 'OPTIONS' | 'PRESETS'>('OPTIONS');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Delete User Confirmation State
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [showResetStaffConfirm, setShowResetStaffConfirm] = useState<boolean>(false);

  // Selected User for PIN Entry in Select Mode
  const [selectedUserToAuth, setSelectedUserToAuth] = useState<User | null>(null);
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);

  // New Profile Form State
  const [isCreatingUser, setIsCreatingUser] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');
  const [newRole, setNewRole] = useState<UserRole>('SERVEUR');
  const [newPin, setNewPin] = useState<string>('1234');
  const [newPhone, setNewPhone] = useState<string>('');
  const [newAvatarColor, setNewAvatarColor] = useState<string>('#F59E0B');
  const [userFormError, setUserFormError] = useState<string | null>(null);

  // Editing User State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editRole, setEditRole] = useState<UserRole>('SERVEUR');
  const [editPin, setEditPin] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [editAvatarColor, setEditAvatarColor] = useState<string>('#F59E0B');

  // Working States for Form Edits
  const [compForm, setCompForm] = useState<CompanyProfile>(companyProfile);
  const [startupForm, setStartupForm] = useState<StartupOptions>(startupOptions);
  const [printerForm, setPrinterForm] = useState<PrinterConfig>(printerConfig);

  const [globalSavedToast, setGlobalSavedToast] = useState<string | null>(null);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCompForm(companyProfile);
      setStartupForm(startupOptions);
      setPrinterForm(printerConfig);
      setGlobalSavedToast(null);
    }
  }, [isOpen, companyProfile, startupOptions, printerConfig]);

  if (!isOpen) return null;

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (u.phone && u.phone.includes(searchQuery));
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleSelectUserClick = (u: User) => {
    if (startupForm.requirePinOnStartup) {
      setSelectedUserToAuth(u);
      setEnteredPin('');
      setAuthError(null);
    } else {
      setCurrentUser(u);
      showSuccessToast(`Session active : ${u.name} (${u.role})`);
    }
  };

  const handleDigitPress = (digit: string) => {
    if (!selectedUserToAuth) return;
    if (enteredPin.length < 4) {
      const nextPin = enteredPin + digit;
      setEnteredPin(nextPin);
      setAuthError(null);

      if (nextPin.length === 4) {
        if (nextPin === selectedUserToAuth.pin) {
          setCurrentUser(selectedUserToAuth);
          setSelectedUserToAuth(null);
          setEnteredPin('');
          showSuccessToast(`Connexion réussie : ${selectedUserToAuth.name}`);
        } else {
          setAuthError('Code PIN incorrect pour ce profil');
          setTimeout(() => setEnteredPin(''), 600);
        }
      }
    }
  };

  const handleCreateProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setUserFormError('Veuillez renseigner le nom ou prénom du membre.');
      return;
    }
    if (newPin.trim().length !== 4 || !/^\d{4}$/.test(newPin.trim())) {
      setUserFormError('Le code PIN doit comporter exactement 4 chiffres.');
      return;
    }

    const created = addUser({
      name: newName.trim(),
      role: newRole,
      pin: newPin.trim(),
      avatarColor: newAvatarColor,
      phone: newPhone.trim() || undefined
    });

    setCurrentUser(created);
    setIsCreatingUser(false);
    setNewName('');
    setNewPin('1234');
    setNewPhone('');
    setUserFormError(null);
    showSuccessToast(`Membre créé avec succès : ${created.name}`);
  };

  const handleStartEdit = (u: User) => {
    setEditingUser(u);
    setEditName(u.name);
    setEditRole(u.role);
    setEditPin(u.pin);
    setEditPhone(u.phone || '');
    setEditAvatarColor(u.avatarColor);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editName.trim() || editPin.trim().length !== 4) return;

    const updated: User = {
      ...editingUser,
      name: editName.trim(),
      role: editRole,
      pin: editPin.trim(),
      phone: editPhone.trim() || undefined,
      avatarColor: editAvatarColor
    };

    updateUser(updated);
    setEditingUser(null);
    showSuccessToast(`Profil de ${updated.name} mis à jour !`);
  };

  const handleConfirmDeleteUser = () => {
    if (!userToDelete) return;
    const deletedName = userToDelete.name;
    const isCurrentActive = currentUser.id === userToDelete.id;
    deleteUser(userToDelete.id);
    if (editingUser?.id === userToDelete.id) {
      setEditingUser(null);
    }
    setUserToDelete(null);
    showSuccessToast(
      isCurrentActive
        ? `Profil "${deletedName}" supprimé. La session active a été basculée automatiquement.`
        : `Profil "${deletedName}" supprimé avec succès.`
    );
  };

  const handleConfirmResetStaff = () => {
    resetUsersToDefault();
    setShowResetStaffConfirm(false);
    showSuccessToast('Profils staff réinitialisés aux valeurs standards (7 membres d\'équipe).');
  };

  const handleApplyPreset = (preset: typeof ESTABLISHMENT_PRESETS[0]) => {
    const updatedCompany: CompanyProfile = {
      ...compForm,
      ...preset.profile,
      isConfigured: true,
      configuredAt: new Date().toISOString()
    };
    const updatedStartup: StartupOptions = {
      ...startupForm,
      ...preset.options
    };
    const updatedPrinter: PrinterConfig = {
      ...printerForm,
      ...preset.printer
    };

    setCompForm(updatedCompany);
    setStartupForm(updatedStartup);
    setPrinterForm(updatedPrinter);

    updateCompanyProfile(updatedCompany);
    updateStartupOptions(updatedStartup);
    setPrinterConfig(updatedPrinter);

    showSuccessToast(`Pack "${preset.name}" appliqué à toutes les options !`);
  };

  const showSuccessToast = (msg: string) => {
    setGlobalSavedToast(msg);
    setTimeout(() => {
      setGlobalSavedToast(null);
    }, 2800);
  };

  const handleSaveAllOptionsAndClose = () => {
    // Save Company Profile
    updateCompanyProfile({
      ...compForm,
      isConfigured: true,
      configuredAt: new Date().toISOString()
    });

    // Save Startup Options
    updateStartupOptions(startupForm);

    // Save Printer Config
    setPrinterConfig(printerForm);

    // If default screen changed and callback provided
    if (onNavigateTab && startupForm.defaultScreen) {
      onNavigateTab(startupForm.defaultScreen);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#101322] border border-amber-500/50 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl text-white flex flex-col max-h-[94vh]">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-white/10 bg-[#161a2b] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-600 p-[1.5px] shadow-lg shadow-amber-500/20 shrink-0">
              <div className="w-full h-full bg-[#101321] rounded-[14px] flex items-center justify-center">
                <Settings2 className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  Réglages & Options au Démarrage
                </h2>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Démarrage Nightclub
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Configurez l'ensemble des paramètres du système pour démarrer votre shift en toute sérénité
              </p>
            </div>
          </div>

          <button
            id="btn-close-startup-modal"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 px-4 sm:px-6 pt-2.5 border-b border-white/10 bg-[#0e101a] overflow-x-auto scrollbar-thin shrink-0">
          
          <button
            id="tab-startup-options"
            onClick={() => setActiveTab('OPTIONS')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'OPTIONS'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>1. Options Démarrage & Système</span>
          </button>

          <button
            id="tab-startup-staff"
            onClick={() => setActiveTab('STAFF')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'STAFF'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>2. Profil & Staff ({users.length})</span>
          </button>

          <button
            id="tab-startup-company"
            onClick={() => setActiveTab('COMPANY')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'COMPANY'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4 text-amber-400" />
            <span>3. Établissement & Facture FCFA</span>
          </button>

          <button
            id="tab-startup-printer"
            onClick={() => setActiveTab('PRINTER')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'PRINTER'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Printer className="w-4 h-4 text-cyan-400" />
            <span>4. Imprimante Bluetooth ({printerForm.paperWidth}mm)</span>
          </button>

          <button
            id="tab-startup-presets"
            onClick={() => setActiveTab('PRESETS')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'PRESETS'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span>5. Packs 1-Clic</span>
          </button>

        </div>

        {/* Global Toast Alert */}
        {globalSavedToast && (
          <div className="bg-emerald-500/20 border-b border-emerald-500/40 px-6 py-2 text-xs font-bold text-emerald-300 flex items-center justify-between animate-in fade-in duration-200 shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{globalSavedToast}</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-mono">Appliqué</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[520px] scrollbar-thin space-y-5">
          
          {/* TAB 1: SYSTEM & STARTUP OPTIONS */}
          {activeTab === 'OPTIONS' && (
            <div className="space-y-4">
              
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-[#141829] to-[#141829] border border-amber-500/30 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Comportement au lancement de l'application</span>
                  </h3>
                  <p className="text-xs text-gray-300">
                    Définissez la vue par défaut, la sécurité par code PIN et les options d'alertes à l'ouverture.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 text-amber-300">
                  Shift : {currentUser.name}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                
                {/* Default Screen Setting */}
                <div className="p-4 rounded-2xl bg-[#141727] border border-white/10 space-y-2">
                  <label className="text-xs font-bold text-white flex items-center gap-2">
                    <Laptop className="w-4 h-4 text-amber-400" />
                    <span>Écran par défaut à l'ouverture</span>
                  </label>
                  <p className="text-[11px] text-gray-400">
                    Choisissez la section qui s'affiche immédiatement lors du démarrage.
                  </p>
                  <select
                    id="select-default-screen"
                    value={startupForm.defaultScreen}
                    onChange={(e) => setStartupForm({ ...startupForm, defaultScreen: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-[#0c0e17] border border-white/15 text-white text-xs font-semibold focus:border-amber-400 focus:outline-none cursor-pointer"
                  >
                    <option value="TABLES">📍 Plan des Tables & Salons VIP (Recommandé Serveurs)</option>
                    <option value="ORDER">📝 Prise de Commande Rapide</option>
                    <option value="KDS_BAR">🍹 Écran Barman / KDS (Préparation Boissons)</option>
                    <option value="STOCK">📦 Gestion des Stocks & Bouteilles</option>
                    <option value="REPORTS">📊 Rapports Financiers & Clôture Z</option>
                  </select>
                </div>

                {/* Show Startup Modal Toggle */}
                <div className="p-4 rounded-2xl bg-[#141727] border border-white/10 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Eye className="w-4 h-4 text-cyan-400" />
                      <span>Afficher cette fenêtre au démarrage</span>
                    </div>
                    <p className="text-[11px] text-gray-400">
                      Ouvre automatiquement le panneau des options et choix du staff à l'ouverture.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={startupForm.showStartupModalOnLaunch}
                      onChange={(e) => setStartupForm({ ...startupForm, showStartupModalOnLaunch: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                {/* PIN Code Enforcement */}
                <div className="p-4 rounded-2xl bg-[#141727] border border-white/10 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-purple-400" />
                      <span>Exiger le code PIN au changement de profil</span>
                    </div>
                    <p className="text-[11px] text-gray-400">
                      Demande le code PIN 4 chiffres à chaque prise de poste pour sécuriser les encaissements.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={startupForm.requirePinOnStartup}
                      onChange={(e) => setStartupForm({ ...startupForm, requirePinOnStartup: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                {/* Sound Effects Toggle */}
                <div className="p-4 rounded-2xl bg-[#141727] border border-white/10 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      {startupForm.isSoundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-gray-400" />}
                      <span>Effets Sonores & Bips de Validation</span>
                    </div>
                    <p className="text-[11px] text-gray-400">
                      Bip sonore lors de l'ajout d'une boisson, commande envoyée au bar et encaissement.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={startupForm.isSoundEnabled}
                      onChange={(e) => setStartupForm({ ...startupForm, isSoundEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                {/* Bluetooth Auto Connect */}
                <div className="p-4 rounded-2xl bg-[#141727] border border-white/10 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Bluetooth className="w-4 h-4 text-cyan-400" />
                      <span>Reconnexion Bluetooth Automatique</span>
                    </div>
                    <p className="text-[11px] text-gray-400">
                      Tente de reconnecter la dernière imprimante thermique enregistrée dès l'ouverture.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={startupForm.autoConnectBluetooth}
                      onChange={(e) => setStartupForm({ ...startupForm, autoConnectBluetooth: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                {/* Default Zone Filter */}
                <div className="p-4 rounded-2xl bg-[#141727] border border-white/10 space-y-2">
                  <label className="text-xs font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    <span>Zone de tables affichée par défaut</span>
                  </label>
                  <p className="text-[11px] text-gray-400">
                    Filtre initial sur le plan de salle (VIP, Piste, Comptoir, Terrasse).
                  </p>
                  <select
                    value={startupForm.defaultZoneFilter}
                    onChange={(e) => setStartupForm({ ...startupForm, defaultZoneFilter: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-[#0c0e17] border border-white/15 text-white text-xs font-semibold focus:border-amber-400 focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">🌐 Toutes les zones de la discothèque</option>
                    <option value="CARRE_PREMIUM">👑 Carré Or & Platine Premium VIP</option>
                    <option value="VIP_1">🍾 Salons VIP 1 & 2</option>
                    <option value="PISTE">💃 Piste Principale & Tables Dancefloor</option>
                    <option value="COMPTOIR_BAR">🍸 Comptoir Bar Central</option>
                    <option value="TERRASSE">💨 Terrasse Lounge & Chichas</option>
                  </select>
                </div>

                {/* Quick Staff Management & Deletion Banner */}
                <div className="p-4 rounded-2xl bg-[#141727] border border-amber-500/30 sm:col-span-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-amber-500/10 via-[#141727] to-[#141727]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <span>Gestion & Nettoyage des Profils Staff</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                          {users.length} profil(s) actif(s)
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400">
                        Supprimez les anciens comptes, serveurs partis ou profils de test directement au démarrage.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab('STAFF')}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap shadow-sm active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Gérer & Supprimer des Profils</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: STAFF PROFILES */}
          {activeTab === 'STAFF' && (
            <div className="space-y-4">
              
              {/* Search & Actions Bar */}
              <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
                
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher par nom, rôle ou téléphone..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#0c0e17] border border-white/15 text-white text-xs placeholder-gray-500 focus:border-amber-400 focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowResetStaffConfirm(true)}
                    title="Restaurer l'équipe standard"
                    className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-gray-400" />
                    <span className="hidden sm:inline">Restaurer Équipe Standard</span>
                  </button>

                  <button
                    id="btn-toggle-create-user"
                    onClick={() => {
                      setIsCreatingUser(!isCreatingUser);
                      setEditingUser(null);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-sm"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{isCreatingUser ? 'Fermer Formulaire' : '+ Nouveau Profil'}</span>
                  </button>
                </div>
              </div>

              {/* Role Filters & Count */}
              <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-thin">
                <div className="flex items-center gap-1">
                  {['ALL', 'SERVEUR', 'BARMAN', 'MANAGER', 'ADMIN'].map((r) => (
                    <button
                      key={r}
                      onClick={() => setRoleFilter(r)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                        roleFilter === r
                          ? 'bg-amber-500 text-black shadow-sm'
                          : 'bg-white/5 text-gray-400 hover:text-white'
                      }`}
                    >
                      {r === 'ALL' ? 'Tous' : r === 'SERVEUR' ? 'Serveurs' : r === 'BARMAN' ? 'Barmans' : r === 'MANAGER' ? 'Caisse' : 'Admins'}
                    </button>
                  ))}
                </div>

                <div className="text-[11px] text-gray-400 font-mono shrink-0">
                  {filteredUsers.length} sur {users.length} profil(s)
                </div>
              </div>

              {/* Create User Form */}
              {isCreatingUser && (
                <form onSubmit={handleCreateProfileSubmit} className="p-4 rounded-2xl bg-[#141727] border border-amber-500/40 space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="text-xs font-bold text-amber-300">Ajouter un nouveau membre du staff</span>
                    <button
                      type="button"
                      onClick={() => setIsCreatingUser(false)}
                      className="text-xs text-gray-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-gray-300 font-semibold block mb-1">
                        Nom & Prénom *
                      </label>
                      <input
                        type="text"
                        required
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Ex: Yao (Serveur VIP)"
                        className="w-full px-3 py-2 rounded-xl bg-[#0c0e17] border border-white/15 text-white text-xs focus:border-amber-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-gray-300 font-semibold block mb-1">
                        Numéro Téléphone
                      </label>
                      <input
                        type="tel"
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        placeholder="+228 90 00 00 00"
                        className="w-full px-3 py-2 rounded-xl bg-[#0c0e17] border border-white/15 text-white text-xs focus:border-amber-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-gray-300 font-semibold block mb-1">
                        Code PIN Secret (4 chiffres) *
                      </label>
                      <input
                        type="password"
                        maxLength={4}
                        required
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        className="w-full px-3 py-2 rounded-xl bg-[#0c0e17] border border-white/15 text-amber-300 font-mono tracking-widest text-center text-sm font-bold focus:border-amber-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-gray-300 font-semibold block mb-1">
                        Rôle & Poste *
                      </label>
                      <select
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value as UserRole)}
                        className="w-full px-3 py-2 rounded-xl bg-[#0c0e17] border border-white/15 text-white text-xs focus:border-amber-400 focus:outline-none cursor-pointer"
                      >
                        <option value="SERVEUR">🍸 Serveur / Salle</option>
                        <option value="BARMAN">🍹 Barman / KDS</option>
                        <option value="MANAGER">💼 Manager / Caisse</option>
                        <option value="ADMIN">🛡️ Direction / Admin</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-gray-300 font-semibold block mb-1">
                      Couleur du Badge
                    </label>
                    <div className="flex items-center gap-2">
                      {AVATAR_COLORS.map((c) => (
                        <button
                          key={c.color}
                          type="button"
                          onClick={() => setNewAvatarColor(c.color)}
                          className={`w-6 h-6 rounded-lg transition-all cursor-pointer ${
                            newAvatarColor === c.color ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-[#101321]' : 'opacity-70 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: c.color }}
                          title={c.name}
                        />
                      ))}
                    </div>
                  </div>

                  {userFormError && (
                    <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs">
                      {userFormError}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-amber-500 text-black font-bold text-xs hover:bg-amber-400 transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Enregistrer et Activer</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Edit User Form */}
              {editingUser && (
                <form onSubmit={handleSaveEdit} className="p-4 rounded-2xl bg-[#141727] border border-amber-500/40 space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="text-xs font-bold text-white">Modifier le profil : {editingUser.name}</span>
                    <button
                      type="button"
                      onClick={() => setEditingUser(null)}
                      className="text-xs text-gray-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-gray-300 font-semibold block mb-1">
                        Nom & Prénom *
                      </label>
                      <input
                        type="text"
                        required
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#0c0e17] border border-white/15 text-white text-xs focus:border-amber-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-gray-300 font-semibold block mb-1">
                        Numéro Téléphone
                      </label>
                      <input
                        type="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#0c0e17] border border-white/15 text-white text-xs focus:border-amber-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-gray-300 font-semibold block mb-1">
                        Code PIN Secret (4 chiffres) *
                      </label>
                      <input
                        type="password"
                        maxLength={4}
                        required
                        value={editPin}
                        onChange={(e) => setEditPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        className="w-full px-3 py-2 rounded-xl bg-[#0c0e17] border border-white/15 text-amber-300 font-mono tracking-widest text-center text-sm font-bold focus:border-amber-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-gray-300 font-semibold block mb-1">
                        Rôle & Poste *
                      </label>
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value as UserRole)}
                        className="w-full px-3 py-2 rounded-xl bg-[#0c0e17] border border-white/15 text-white text-xs focus:border-amber-400 focus:outline-none cursor-pointer"
                      >
                        <option value="SERVEUR">🍸 Serveur / Salle</option>
                        <option value="BARMAN">🍹 Barman / KDS</option>
                        <option value="MANAGER">💼 Manager / Caisse</option>
                        <option value="ADMIN">🛡️ Direction / Admin</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-gray-300 font-semibold block mb-1">
                      Couleur du Badge
                    </label>
                    <div className="flex items-center gap-2">
                      {AVATAR_COLORS.map((c) => (
                        <button
                          key={c.color}
                          type="button"
                          onClick={() => setEditAvatarColor(c.color)}
                          className={`w-6 h-6 rounded-lg transition-all cursor-pointer ${
                            editAvatarColor === c.color ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-[#101321]' : 'opacity-70 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: c.color }}
                          title={c.name}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-amber-500 text-black font-bold text-xs hover:bg-amber-400 transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Enregistrer les modifications</span>
                    </button>
                  </div>
                </form>
              )}

              {/* User Grid with Direct In-App Delete Buttons */}
              {filteredUsers.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-[#141727] border border-white/10 space-y-2">
                  <Users className="w-8 h-8 text-gray-500 mx-auto" />
                  <p className="text-xs text-gray-300 font-semibold">Aucun profil ne correspond à votre recherche</p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setRoleFilter('ALL');
                    }}
                    className="text-xs text-amber-400 hover:underline font-bold"
                  >
                    Effacer les filtres
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[320px] overflow-y-auto pr-1 scrollbar-thin">
                  {filteredUsers.map((u) => {
                    const meta = ROLE_DESCRIPTIONS[u.role];
                    const isCurrent = u.id === currentUser.id;
                    const isOnlyUser = users.length <= 1;
                    const assignedTablesCount = tables.filter(t => t.assignedServerId === u.id).length;

                    return (
                      <div
                        key={u.id}
                        onClick={() => handleSelectUserClick(u)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 group ${
                          isCurrent
                            ? 'bg-amber-500/15 border-amber-500/60 shadow-lg shadow-amber-500/10'
                            : 'bg-[#141727] border-white/10 hover:border-amber-400/40 hover:bg-[#181c2f]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-white shadow shrink-0"
                            style={{ backgroundColor: u.avatarColor }}
                          >
                            {u.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-xs text-white flex items-center gap-1.5 truncate">
                              <span className="truncate">{u.name}</span>
                              {isCurrent && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500 text-black font-black shrink-0">
                                  ACTIF
                                </span>
                              )}
                              {assignedTablesCount > 0 && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold shrink-0">
                                  {assignedTablesCount} table{assignedTablesCount > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-gray-400 font-mono truncate">
                              {meta.title} • PIN : {u.pin} {u.phone ? `• ${u.phone}` : ''}
                            </div>
                          </div>
                        </div>

                        {/* Action buttons (Edit + Delete) */}
                        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            id={`btn-edit-user-${u.id}`}
                            onClick={() => handleStartEdit(u)}
                            className="p-2 rounded-xl bg-blue-500/15 hover:bg-blue-500/30 text-blue-300 transition-colors cursor-pointer"
                            title="Modifier ce profil"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          
                          <button
                            id={`btn-delete-user-${u.id}`}
                            disabled={isOnlyUser}
                            onClick={() => setUserToDelete(u)}
                            className={`p-2 rounded-xl transition-all cursor-pointer ${
                              isOnlyUser
                                ? 'bg-gray-800 text-gray-600 cursor-not-allowed opacity-40'
                                : 'bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 hover:text-rose-300 hover:scale-105 active:scale-95'
                            }`}
                            title={isOnlyUser ? "Impossible de supprimer le seul profil restant" : `Supprimer le profil de ${u.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

          {/* TAB 3: COMPANY & FISCAL RECEIPT */}
          {activeTab === 'COMPANY' && (
            <div className="space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                
                {/* Name */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300">
                    Nom Commercial de l'Établissement *
                  </label>
                  <input
                    type="text"
                    required
                    value={compForm.name}
                    onChange={(e) => setCompForm({ ...compForm, name: e.target.value })}
                    placeholder="LE VELVET VIP CLUB & LOUNGE"
                    className="w-full px-3 py-2 rounded-xl bg-[#0c0e17] border border-white/15 focus:border-amber-400 text-white text-xs font-bold"
                  />
                </div>

                {/* Slogan */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300">
                    Slogan & Accroche
                  </label>
                  <input
                    type="text"
                    value={compForm.slogan || ''}
                    onChange={(e) => setCompForm({ ...compForm, slogan: e.target.value })}
                    placeholder="Cocktails d’Exception, Champagnes & Prestige VIP"
                    className="w-full px-3 py-2 rounded-xl bg-[#0c0e17] border border-white/15 focus:border-amber-400 text-white text-xs"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-300">
                    Téléphone / Réservations VIP
                  </label>
                  <input
                    type="tel"
                    value={compForm.phone || ''}
                    onChange={(e) => setCompForm({ ...compForm, phone: e.target.value })}
                    placeholder="+228 90 11 22 33"
                    className="w-full px-3 py-2 rounded-xl bg-[#0c0e17] border border-white/15 focus:border-amber-400 text-white text-xs"
                  />
                </div>

                {/* City Country */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-300">
                    Ville & Pays
                  </label>
                  <input
                    type="text"
                    value={compForm.cityCountry || ''}
                    onChange={(e) => setCompForm({ ...compForm, cityCountry: e.target.value })}
                    placeholder="Lomé, Togo"
                    className="w-full px-3 py-2 rounded-xl bg-[#0c0e17] border border-white/15 focus:border-amber-400 text-white text-xs"
                  />
                </div>

                {/* RCCM */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-300">
                    RCCM (Registre du Commerce)
                  </label>
                  <input
                    type="text"
                    value={compForm.rccm || ''}
                    onChange={(e) => setCompForm({ ...compForm, rccm: e.target.value })}
                    placeholder="TG-LOM-2024-B-1284"
                    className="w-full px-3 py-2 rounded-xl bg-[#0c0e17] border border-white/15 focus:border-amber-400 text-white text-xs font-mono"
                  />
                </div>

                {/* NIF */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-300">
                    NIF (Numéro Fiscale)
                  </label>
                  <input
                    type="text"
                    value={compForm.nif || ''}
                    onChange={(e) => setCompForm({ ...compForm, nif: e.target.value })}
                    placeholder="NIF: 1002345890"
                    className="w-full px-3 py-2 rounded-xl bg-[#0c0e17] border border-white/15 focus:border-amber-400 text-white text-xs font-mono"
                  />
                </div>

                {/* Footer message */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300">
                    Message de Remerciement (Bas de Ticket ESC/POS)
                  </label>
                  <input
                    type="text"
                    value={compForm.receiptFooterMessage || ''}
                    onChange={(e) => setCompForm({ ...compForm, receiptFooterMessage: e.target.value })}
                    placeholder="Merci pour votre confiance ! L’abus d’alcool est dangereux pour la santé."
                    className="w-full px-3 py-2 rounded-xl bg-[#0c0e17] border border-white/15 focus:border-amber-400 text-white text-xs"
                  />
                </div>

              </div>

            </div>
          )}

          {/* TAB 4: PRINTER & BLUETOOTH */}
          {activeTab === 'PRINTER' && (
            <div className="space-y-4">
              
              <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-500/10 via-[#141829] to-[#141829] border border-cyan-500/30 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Printer className="w-4 h-4 text-cyan-400" />
                    <span>Configuration Facture Thermique ESC/POS</span>
                  </h3>
                  <p className="text-xs text-gray-300">
                    Paramétrez le format de papier 58mm ou 80mm et les automatismes d'impression.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPrinterSettingsModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Bluetooth className="w-3.5 h-3.5" />
                  <span>Scanner Bluetooth</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                
                {/* Paper Width */}
                <div className="p-4 rounded-2xl bg-[#141727] border border-white/10 space-y-2">
                  <label className="text-xs font-bold text-white">Largeur du Rouleau Thermique</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPrinterForm({ ...printerForm, paperWidth: 58 })}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                        printerForm.paperWidth === 58
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow'
                          : 'bg-black/30 border-white/10 text-gray-400 hover:text-white'
                      }`}
                    >
                      <div>58 mm (Standard)</div>
                      <div className="text-[10px] text-gray-400 font-normal mt-0.5">32 colonnes compact</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPrinterForm({ ...printerForm, paperWidth: 80 })}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                        printerForm.paperWidth === 80
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow'
                          : 'bg-black/30 border-white/10 text-gray-400 hover:text-white'
                      }`}
                    >
                      <div>80 mm (Large)</div>
                      <div className="text-[10px] text-gray-400 font-normal mt-0.5">48 colonnes détaillé</div>
                    </button>
                  </div>
                </div>

                {/* Copies Count */}
                <div className="p-4 rounded-2xl bg-[#141727] border border-white/10 space-y-2">
                  <label className="text-xs font-bold text-white">Nombre d'exemplaires imprimés</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3].map((nb) => (
                      <button
                        key={nb}
                        type="button"
                        onClick={() => setPrinterForm({ ...printerForm, printCopies: nb })}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                          printerForm.printCopies === nb
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow'
                            : 'bg-black/30 border-white/10 text-gray-400 hover:text-white'
                        }`}
                      >
                        <div>{nb} copie{nb > 1 ? 's' : ''}</div>
                        <div className="text-[9px] text-gray-400 font-normal">
                          {nb === 1 ? 'Client' : nb === 2 ? 'Client + Bar' : 'Client + Bar + Compta'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Auto Print */}
                <div className="p-4 rounded-2xl bg-[#141727] border border-white/10 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-white">Impression auto après paiement</div>
                    <p className="text-[11px] text-gray-400">Imprime immédiatement le ticket dès l'encaissement validé.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={printerForm.autoPrintReceipt}
                      onChange={(e) => setPrinterForm({ ...printerForm, autoPrintReceipt: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                {/* Open Cash Drawer */}
                <div className="p-4 rounded-2xl bg-[#141727] border border-white/10 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-white">Ouverture tiroir-caisse (Impulsion RJ11)</div>
                    <p className="text-[11px] text-gray-400">Envoie le signal d'éjection du tiroir à chaque addition réglée en espèces.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={printerForm.openCashDrawer}
                      onChange={(e) => setPrinterForm({ ...printerForm, openCashDrawer: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

              </div>

            </div>
          )}

          {/* TAB 5: 1-CLICK PRESETS */}
          {activeTab === 'PRESETS' && (
            <div className="space-y-3">
              <div className="text-xs text-gray-400 mb-1">
                Sélectionnez un pack tout-en-un pour appliquer immédiatement tous les paramètres parfaits en 1 seul clic :
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ESTABLISHMENT_PRESETS.map((preset) => (
                  <div
                    key={preset.id}
                    className="p-4 rounded-2xl bg-[#141829] border border-white/10 hover:border-amber-400/50 hover:bg-[#181c2f] transition-all flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-amber-300">{preset.name}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          {preset.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-300">
                        {preset.desc}
                      </p>
                      <div className="text-[10px] text-gray-400 font-mono">
                        Format: {preset.printer.paperWidth}mm • {preset.printer.printCopies} copie(s) • Vue: {preset.options.defaultScreen}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer active:scale-95"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Appliquer ce Pack en 1 Clic</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer with Global Save Button */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-white/10 bg-[#161a2b] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          
          <div className="flex items-center gap-2 text-xs text-gray-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Session : <strong>{currentUser.name}</strong> ({ROLE_DESCRIPTIONS[currentUser.role]?.title})</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 sm:w-auto px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 hover:text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Fermer
            </button>

            <button
              id="btn-save-all-startup-options"
              type="button"
              onClick={handleSaveAllOptionsAndClose}
              className="w-1/2 sm:w-auto px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition-all cursor-pointer active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>⚡ Enregistrer Toutes les Options</span>
            </button>
          </div>

        </div>

      </div>

      {/* CONFIRMATION DIALOG: DELETE PROFILE */}
      {userToDelete && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#101322] border-2 border-rose-500/50 rounded-3xl p-6 max-w-md w-full shadow-2xl shadow-rose-950/60 space-y-4">
            
            <div className="flex items-center gap-3 border-b border-white/10 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white">Supprimer ce Profil ?</h4>
                <p className="text-xs text-rose-300">Action irréversible au démarrage</p>
              </div>
            </div>

            {/* Profile Card Preview */}
            <div className="p-3.5 rounded-2xl bg-[#161a2e] border border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-white shadow shrink-0"
                  style={{ backgroundColor: userToDelete.avatarColor }}
                >
                  {userToDelete.name.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-xs text-white flex items-center gap-1.5">
                    <span>{userToDelete.name}</span>
                    {userToDelete.id === currentUser.id && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500 text-black font-black">
                        ACTIF
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-400 font-mono">
                    {ROLE_DESCRIPTIONS[userToDelete.role]?.title} • PIN : {userToDelete.pin}
                  </div>
                </div>
              </div>
            </div>

            {/* Warnings */}
            <div className="space-y-2 text-xs text-gray-300 bg-rose-500/10 p-3 rounded-2xl border border-rose-500/20">
              <p>
                Êtes-vous sûr de vouloir supprimer définitivement le profil de <strong>{userToDelete.name}</strong> ?
              </p>
              {userToDelete.id === currentUser.id && (
                <p className="text-amber-300 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Ce profil est la session active. La session sera automatiquement basculée.</span>
                </p>
              )}
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="w-1/2 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-gray-200 font-bold text-xs transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                id="btn-confirm-delete-user"
                type="button"
                onClick={handleConfirmDeleteUser}
                className="w-1/2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-rose-600/30 transition-all cursor-pointer active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Supprimer le Profil</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG: RESET STAFF */}
      {showResetStaffConfirm && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#101322] border-2 border-amber-500/50 rounded-3xl p-6 max-w-md w-full shadow-2xl shadow-amber-950/60 space-y-4">
            
            <div className="flex items-center gap-3 border-b border-white/10 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white">Restaurer les Profils Standards ?</h4>
                <p className="text-xs text-amber-300">Réinitialisation de la liste des 7 membres</p>
              </div>
            </div>

            <p className="text-xs text-gray-300">
              Cette action restaure la configuration d'origine comprenant les 7 comptes standards (Yao, Amina, Kofi, Marc, David, Alexandre, Direction) avec leurs codes PIN par défaut (1111, 2222, etc.).
            </p>

            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowResetStaffConfirm(false)}
                className="w-1/2 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-gray-200 font-bold text-xs transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                id="btn-confirm-reset-staff"
                type="button"
                onClick={handleConfirmResetStaff}
                className="w-1/2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/25 transition-all cursor-pointer active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurer l'Équipe</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
