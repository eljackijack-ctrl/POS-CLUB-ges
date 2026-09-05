import React, { useState } from 'react';
import { 
  Building2, Share2, Copy, Check, Plus, Sparkles, ShieldCheck, 
  Layers, ExternalLink, Users, GlassWater, Utensils, Wine, 
  Trash2, KeyRound, RefreshCw, X, ArrowRight, CheckCircle2,
  AlertCircle, Smartphone, Globe
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { soundManager } from '../utils/formatters';
import { EstablishmentTemplateType } from '../types';

interface EnterpriseManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EnterpriseManagementModal: React.FC<EnterpriseManagementModalProps> = ({
  isOpen,
  onClose
}) => {
  const {
    activeEnterpriseId,
    enterprisesList,
    companyProfile,
    users,
    products,
    tables,
    switchEnterprise,
    createNewEnterprise,
    joinEnterpriseByCode,
    deleteEnterprise,
    getEnterpriseShareLink
  } = usePOS();

  const [activeTab, setActiveTab] = useState<'current' | 'create' | 'list'>('current');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Creation form state
  const [newOrgName, setNewOrgName] = useState('');
  const [newTemplateType, setNewTemplateType] = useState<EstablishmentTemplateType>('VIP_NIGHTCLUB');
  const [newDirectorName, setNewDirectorName] = useState('Directeur');
  const [newDirectorPin, setNewDirectorPin] = useState('0000');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newCurrency, setNewCurrency] = useState('FCFA');
  const [newCatalogOption, setNewCatalogOption] = useState<'TEMPLATE_CATALOG' | 'EMPTY'>('TEMPLATE_CATALOG');
  const [creationError, setCreationError] = useState<string | null>(null);
  const [creationSuccess, setCreationSuccess] = useState<string | null>(null);

  // Join code state
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinStatus, setJoinStatus] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  if (!isOpen) return null;

  const currentRecord = enterprisesList.find(e => e.id === activeEnterpriseId) || {
    id: activeEnterpriseId,
    code: companyProfile.enterpriseCode || 'CLUBPOS',
    name: companyProfile.name,
    templateType: 'VIP_NIGHTCLUB' as EstablishmentTemplateType,
    createdAt: new Date().toISOString()
  };

  const shareUrl = getEnterpriseShareLink(activeEnterpriseId);

  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedLink(true);
      soundManager.playSuccessTone();
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  const handleCopyCode = () => {
    if (!currentRecord.code) return;
    navigator.clipboard.writeText(currentRecord.code).then(() => {
      setCopiedCode(true);
      soundManager.playSuccessTone();
      setTimeout(() => setCopiedCode(false), 2500);
    });
  };

  const handleCreateEnterprise = (e: React.FormEvent) => {
    e.preventDefault();
    setCreationError(null);
    setCreationSuccess(null);

    if (!newOrgName.trim()) {
      setCreationError("Veuillez saisir le nom de l'établissement.");
      soundManager.playAlert();
      return;
    }

    if (newDirectorPin && newDirectorPin.length < 4) {
      setCreationError("Le code PIN du profil Directeur doit comporter au moins 4 chiffres.");
      soundManager.playAlert();
      return;
    }

    const res = createNewEnterprise({
      name: newOrgName.trim(),
      templateType: newTemplateType,
      directorName: newDirectorName.trim() || 'Directeur',
      directorPin: newDirectorPin.trim() || '0000',
      phone: newPhone.trim(),
      address: newAddress.trim(),
      currency: newCurrency.trim() || 'FCFA',
      starterCatalogOption: newCatalogOption
    });

    if (res.success) {
      setCreationSuccess(res.message);
      soundManager.playCashRegister();
      setTimeout(() => {
        setActiveTab('current');
        setCreationSuccess(null);
      }, 1800);
    } else {
      setCreationError(res.message);
      soundManager.playAlert();
    }
  };

  const handleJoinCode = (e: React.FormEvent) => {
    e.preventDefault();
    setJoinStatus(null);
    const code = joinCodeInput.trim();
    if (!code) {
      setJoinStatus({ type: 'error', message: 'Veuillez saisir un code établissement.' });
      soundManager.playAlert();
      return;
    }

    const res = joinEnterpriseByCode(code);
    if (res.success) {
      setJoinStatus({ type: 'success', message: res.message });
      soundManager.playSuccessTone();
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      setJoinStatus({ type: 'error', message: res.message });
      soundManager.playAlert();
    }
  };

  const templateIcons: Record<EstablishmentTemplateType, React.ReactNode> = {
    VIP_NIGHTCLUB: <Wine className="w-4 h-4 text-purple-400" />,
    BAR_LOUNGE: <GlassWater className="w-4 h-4 text-cyan-400" />,
    ROOFTOP_CLUB: <Building2 className="w-4 h-4 text-emerald-400" />,
    RESTAURANT_MAQUIS: <Utensils className="w-4 h-4 text-amber-400" />,
    BLANK_CLEAN: <Sparkles className="w-4 h-4 text-rose-400" />
  };

  const templateLabels: Record<EstablishmentTemplateType, string> = {
    VIP_NIGHTCLUB: 'Discothèque / Club VIP',
    BAR_LOUNGE: 'Bar Lounge & Cocktails',
    ROOFTOP_CLUB: 'Rooftop & Sunset Club',
    RESTAURANT_MAQUIS: 'Restaurant & Maquis Gastronomique',
    BLANK_CLEAN: 'Établissement Personnalisé (Vierge)'
  };

  return (
    <div id="enterprise-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div 
        id="enterprise-modal-container"
        className="relative w-full max-w-2xl bg-[#0d1124] border border-white/10 rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="relative p-5 border-b border-white/10 bg-gradient-to-r from-[#12162e] to-[#181d3d] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Multi-Entreprises & Partage</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Données Isolées
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                Partagez l'application avec d'autres entreprises avec profils, caisses et données séparés.
              </p>
            </div>
          </div>
          <button
            id="close-enterprise-modal-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 p-2 bg-[#090c1a] border-b border-white/10 px-4">
          <button
            id="tab-current-enterprise"
            onClick={() => setActiveTab('current')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'current'
                ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40 shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Établissement Actif</span>
          </button>

          <button
            id="tab-create-enterprise"
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'create'
                ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40 shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nouvelle Entreprise</span>
          </button>

          <button
            id="tab-list-enterprise"
            onClick={() => setActiveTab('list')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'list'
                ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40 shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Basculer ({enterprisesList.length})</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: CURRENT ENTERPRISE & SHARING */}
          {activeTab === 'current' && (
            <div className="space-y-4 animate-fade-in">
              {/* Active Enterprise Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#121630] to-[#1a2046] border border-purple-500/30 shadow-lg relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/30 border border-purple-400/40 flex items-center justify-center text-purple-200 text-lg font-black">
                      {templateIcons[currentRecord.templateType || 'VIP_NIGHTCLUB']}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base sm:text-lg font-bold text-white">
                          {companyProfile.name}
                        </h3>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Actif
                        </span>
                      </div>
                      <p className="text-xs text-gray-300">
                        {templateLabels[currentRecord.templateType || 'VIP_NIGHTCLUB']} • Devise : <strong>{companyProfile.currency || 'FCFA'}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-right">
                      <div className="text-[10px] uppercase text-gray-400">Code Établissement</div>
                      <div className="text-xs sm:text-sm font-mono font-bold text-amber-300">
                        {currentRecord.code || companyProfile.enterpriseCode || 'CLUBPOS'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Metrics snapshot for active enterprise */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/10">
                  <div className="bg-black/30 p-2 rounded-xl text-center">
                    <div className="text-[10px] text-gray-400">Produits en Carte</div>
                    <div className="text-sm font-bold text-cyan-300">{products.length} articles</div>
                  </div>
                  <div className="bg-black/30 p-2 rounded-xl text-center">
                    <div className="text-[10px] text-gray-400">Tables / Salons</div>
                    <div className="text-sm font-bold text-emerald-300">{tables.length} tables</div>
                  </div>
                  <div className="bg-black/30 p-2 rounded-xl text-center">
                    <div className="text-[10px] text-gray-400">Comptes Utilisateurs</div>
                    <div className="text-sm font-bold text-purple-300">{users.length} profils</div>
                  </div>
                </div>
              </div>

              {/* Share Options */}
              <div className="bg-[#12162a] p-4 rounded-2xl border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-2">
                    <Share2 className="w-4 h-4" />
                    <span>Lien direct de partage pour vos caisses et gérants</span>
                  </h4>
                  <span className="text-[10px] text-gray-400 bg-white/5 px-2 py-0.5 rounded-full">
                    Accès instantané
                  </span>
                </div>

                <p className="text-xs text-gray-300 leading-relaxed">
                  Envoyez ce lien aux tablettes, smartphones ou postes de vos serveurs et barmans. L'application s'ouvrira directement sur cet établissement avec toutes ses données synchronisées.
                </p>

                {/* Share URL input with Copy button */}
                <div className="flex items-center gap-2">
                  <input
                    id="enterprise-share-url-input"
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="flex-1 bg-[#0a0d1a] border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-300 font-mono select-all focus:outline-none"
                  />
                  <button
                    id="btn-copy-enterprise-link"
                    onClick={handleCopyLink}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                      copiedLink
                        ? 'bg-emerald-600 text-white'
                        : 'bg-purple-600 hover:bg-purple-500 text-white shadow-md'
                    }`}
                  >
                    {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedLink ? 'Copié !' : 'Copier le lien'}</span>
                  </button>
                </div>

                {/* Code Sharing */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-white/5 text-xs text-gray-400">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-gray-400" />
                    <span>Ou partagez simplement le code court :</span>
                    <strong className="text-amber-300 font-mono bg-black/40 px-2 py-0.5 rounded border border-white/10">
                      {currentRecord.code || companyProfile.enterpriseCode || 'CLUBPOS'}
                    </strong>
                  </div>
                  <button
                    id="btn-copy-enterprise-code"
                    onClick={handleCopyCode}
                    className="text-[11px] text-purple-300 hover:text-purple-200 underline font-semibold flex items-center gap-1 self-start sm:self-auto"
                  >
                    {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCode ? 'Code copié' : 'Copier le code'}</span>
                  </button>
                </div>
              </div>

              {/* Data Isolation Notice */}
              <div className="p-3 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-200">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold text-emerald-300">Garantie d'étanchéité totale des données :</span>
                  <p className="text-gray-300 text-[11px] leading-relaxed">
                    Chaque entreprise dispose d'un espace isolé dans le Cloud Firestore (<code>/enterprises/{activeEnterpriseId}/...</code>). Les recettes, historiques des ventes, caisses et stocks d'une entreprise ne peuvent jamais être vus ni mélangés avec ceux d'une autre entreprise.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CREATE NEW ENTERPRISE */}
          {activeTab === 'create' && (
            <form onSubmit={handleCreateEnterprise} className="space-y-4 animate-fade-in">
              {creationError && (
                <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{creationError}</span>
                </div>
              )}

              {creationSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{creationSuccess}</span>
                </div>
              )}

              <div className="bg-[#12162a] p-4 rounded-2xl border border-white/10 space-y-3.5">
                <div className="text-xs font-bold uppercase tracking-wider text-purple-300">
                  1. Identité du Nouvel Établissement
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-gray-300">
                      Nom de l'entreprise / Club / Bar *
                    </label>
                    <input
                      id="new-enterprise-name"
                      type="text"
                      required
                      placeholder="Ex: Le Majestic VIP, Lounge Bar Oasis..."
                      value={newOrgName}
                      onChange={(e) => setNewOrgName(e.target.value)}
                      className="w-full bg-[#0a0d1a] border border-white/15 focus:border-purple-400 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-gray-300">
                      Type d'activité & Ambiance
                    </label>
                    <select
                      id="new-enterprise-type"
                      value={newTemplateType}
                      onChange={(e) => setNewTemplateType(e.target.value as EstablishmentTemplateType)}
                      className="w-full bg-[#0a0d1a] border border-white/15 focus:border-purple-400 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    >
                      <option value="VIP_NIGHTCLUB">Discothèque / Club VIP</option>
                      <option value="BAR_LOUNGE">Bar Lounge & Cocktails</option>
                      <option value="ROOFTOP_CLUB">Rooftop & Sunset Club</option>
                      <option value="RESTAURANT_MAQUIS">Restaurant & Maquis Gastronomique</option>
                      <option value="BLANK_CLEAN">Établissement Personnalisé (Vierge)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-gray-300">Téléphone de contact</label>
                    <input
                      id="new-enterprise-phone"
                      type="text"
                      placeholder="+225 07 00 00 00 00"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      className="w-full bg-[#0a0d1a] border border-white/15 focus:border-purple-400 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-gray-300">Adresse / Ville</label>
                    <input
                      id="new-enterprise-address"
                      type="text"
                      placeholder="Abidjan, Dakar, Yaoundé..."
                      value={newAddress}
                      onChange={(e) => setNewAddress(e.target.value)}
                      className="w-full bg-[#0a0d1a] border border-white/15 focus:border-purple-400 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-gray-300">Devise de caisse</label>
                    <input
                      id="new-enterprise-currency"
                      type="text"
                      placeholder="FCFA"
                      value={newCurrency}
                      onChange={(e) => setNewCurrency(e.target.value)}
                      className="w-full bg-[#0a0d1a] border border-white/15 focus:border-purple-400 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Director Profile Configuration */}
              <div className="bg-[#12162a] p-4 rounded-2xl border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>2. Profil & Code d'Accès du Directeur</span>
                  </div>
                  <span className="text-[10px] text-gray-400">Pour ce nouvel établissement</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-gray-300">
                      Nom du Directeur / Administrateur
                    </label>
                    <input
                      id="new-director-name"
                      type="text"
                      placeholder="Ex: M. Kouassi, Direction Générale"
                      value={newDirectorName}
                      onChange={(e) => setNewDirectorName(e.target.value)}
                      className="w-full bg-[#0a0d1a] border border-white/15 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-gray-300">
                      Code PIN d'accès Directeur (utilisé pour réinitialisation) *
                    </label>
                    <input
                      id="new-director-pin"
                      type="password"
                      maxLength={6}
                      required
                      placeholder="0000"
                      value={newDirectorPin}
                      onChange={(e) => setNewDirectorPin(e.target.value)}
                      className="w-full bg-[#0a0d1a] border border-amber-500/40 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none font-mono tracking-widest"
                    />
                    <div className="text-[10px] text-amber-200/80">
                      Ce mot de passe servira à ouvrir la session Directeur et à réinitialiser les historiques de ventes de cette entreprise.
                    </div>
                  </div>
                </div>
              </div>

              {/* Initial Data Option */}
              <div className="bg-[#12162a] p-4 rounded-2xl border border-white/10 space-y-2.5">
                <div className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                  3. Données de Démarrage
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label className={`p-3 rounded-xl border cursor-pointer flex items-start gap-2.5 transition-colors ${
                    newCatalogOption === 'TEMPLATE_CATALOG'
                      ? 'bg-purple-950/30 border-purple-500/50 text-white'
                      : 'bg-black/20 border-white/10 text-gray-400 hover:text-white'
                  }`}>
                    <input
                      type="radio"
                      name="catalogOption"
                      checked={newCatalogOption === 'TEMPLATE_CATALOG'}
                      onChange={() => setNewCatalogOption('TEMPLATE_CATALOG')}
                      className="mt-0.5 text-purple-500"
                    />
                    <div className="text-xs">
                      <div className="font-bold">Catalogue type préconfiguré</div>
                      <div className="text-[11px] text-gray-400 mt-0.5">
                        Importe une carte adaptée (Champagnes, Vins, Spiritueux, Cocktails, Bières, Softs) avec salons et tables prêts à encaisser.
                      </div>
                    </div>
                  </label>

                  <label className={`p-3 rounded-xl border cursor-pointer flex items-start gap-2.5 transition-colors ${
                    newCatalogOption === 'EMPTY'
                      ? 'bg-purple-950/30 border-purple-500/50 text-white'
                      : 'bg-black/20 border-white/10 text-gray-400 hover:text-white'
                  }`}>
                    <input
                      type="radio"
                      name="catalogOption"
                      checked={newCatalogOption === 'EMPTY'}
                      onChange={() => setNewCatalogOption('EMPTY')}
                      className="mt-0.5 text-purple-500"
                    />
                    <div className="text-xs">
                      <div className="font-bold">Catalogue vierge (0 article)</div>
                      <div className="text-[11px] text-gray-400 mt-0.5">
                        Démarre avec un catalogue totalement vide pour saisir vous-même vos propres références et tarifs.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Submit button */}
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('current')}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5"
                >
                  Annuler
                </button>
                <button
                  id="btn-submit-create-enterprise"
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Créer & Basculer sur cet Établissement</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: LIST OF ENTERPRISES & JOIN CODE */}
          {activeTab === 'list' && (
            <div className="space-y-4 animate-fade-in">
              {/* Quick join input */}
              <form onSubmit={handleJoinCode} className="bg-[#12162a] p-3.5 rounded-2xl border border-white/10 space-y-2">
                <div className="text-xs font-bold text-gray-300 flex items-center justify-between">
                  <span>Rejoindre un établissement par son Code d'accès :</span>
                  <span className="text-[10px] text-purple-300">Pour connecter une nouvelle caisse</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="input-join-enterprise-code"
                    type="text"
                    placeholder="Ex: ENT4819 ou code partagé..."
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value)}
                    className="flex-1 bg-[#0a0d1a] border border-white/15 focus:border-purple-400 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none uppercase font-mono font-bold"
                  />
                  <button
                    id="btn-join-enterprise"
                    type="submit"
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-1.5 transition-colors"
                  >
                    <span>Rejoindre</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                {joinStatus && (
                  <div className={`text-[11px] p-2 rounded-lg ${
                    joinStatus.type === 'success' 
                      ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300' 
                      : 'bg-rose-950/40 border border-rose-500/40 text-rose-300'
                  }`}>
                    {joinStatus.message}
                  </div>
                )}
              </form>

              {/* Enterprises List */}
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-gray-400 px-1">
                  Établissements enregistrés sur cet appareil :
                </div>

                <div className="space-y-2">
                  {enterprisesList.map((ent) => {
                    const isActive = ent.id === activeEnterpriseId;
                    return (
                      <div
                        key={ent.id}
                        className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isActive
                            ? 'bg-purple-950/30 border-purple-500/50 shadow-md'
                            : 'bg-[#12162a] border-white/5 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                            isActive ? 'bg-purple-500/30 text-purple-200 border border-purple-500/40' : 'bg-white/5 text-gray-400'
                          }`}>
                            {templateIcons[ent.templateType || 'VIP_NIGHTCLUB']}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs sm:text-sm font-bold text-white">
                                {ent.name}
                              </span>
                              {isActive && (
                                <span className="px-1.5 py-0.2 text-[9px] font-bold bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">
                                  Actuel
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-400 flex items-center gap-2 mt-0.5">
                              <span>Code : <strong className="text-amber-300 font-mono">{ent.code}</strong></span>
                              <span>•</span>
                              <span>{templateLabels[ent.templateType || 'VIP_NIGHTCLUB']}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          {!isActive ? (
                            <button
                              id={`btn-switch-to-${ent.id}`}
                              onClick={() => {
                                switchEnterprise(ent.id);
                                onClose();
                              }}
                              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white flex items-center gap-1 transition-colors"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Basculer</span>
                            </button>
                          ) : (
                            <div className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Actif</span>
                            </div>
                          )}

                          {ent.id !== 'default' && (
                            <button
                              id={`btn-delete-enterprise-${ent.id}`}
                              onClick={() => {
                                if (window.confirm(`Êtes-vous sûr de vouloir retirer "${ent.name}" de votre liste d'établissements ?`)) {
                                  deleteEnterprise(ent.id);
                                }
                              }}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title="Retirer de la liste"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-[#090c1a] flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-purple-400" />
            <span>ID Système : <code className="text-gray-300 font-mono text-[10px]">{activeEnterpriseId}</code></span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
