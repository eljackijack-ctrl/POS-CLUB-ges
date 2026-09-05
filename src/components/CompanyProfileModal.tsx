import React, { useState } from 'react';
import { 
  Building2, Sparkles, Phone, Mail, MapPin, 
  FileText, ShieldCheck, Check, Save, RotateCcw,
  Crown, Flame, GlassWater, Disc, Wine, X, Printer,
  Receipt, ArrowRight, Store
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { CompanyProfile } from '../types';

interface CompanyProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  isFirstLaunch?: boolean;
}

const PRESET_ESTABLISHMENTS: Array<{
  label: string;
  desc: string;
  profile: Partial<CompanyProfile>;
}> = [
  {
    label: 'VIP Nightclub & Discothèque',
    desc: 'Clubbing haut standing, carrés VIP, shows & champagnes',
    profile: {
      name: 'LE VELVET VIP CLUB & LOUNGE',
      slogan: 'Cocktails d’Exception, Champagnes & Prestige VIP',
      rccm: 'RCCM: TG-LOM-2024-B-1284',
      nif: 'NIF: 1002345890',
      address: 'Boulevard du 13 Janvier, Zone Nocturne',
      cityCountry: 'Lomé, Togo',
      phone: '+228 90 11 22 33',
      email: 'contact@velvetvipclub.com',
      receiptFooterMessage: 'Merci pour votre confiance ! L’abus d’alcool est dangereux pour la santé.',
      currency: 'FCFA',
      logoIcon: 'crown'
    }
  },
  {
    label: 'Lounge Bar & Cocktails',
    desc: 'Ambiance feutrée, mixologie, tapas & afterworks',
    profile: {
      name: 'L’ALCHIMISTE COCKTAIL LOUNGE',
      slogan: 'Mixologie raffinée, Spiritueux rares & Saveurs',
      rccm: 'RCCM: CI-ABJ-2023-B-5821',
      nif: 'NIF: 2049182301',
      address: 'Rue des Jardins, Deux Plateaux Vallons',
      cityCountry: 'Abidjan, Côte d’Ivoire',
      phone: '+225 07 48 90 12 34',
      email: 'reservations@alchimiste-lounge.ci',
      receiptFooterMessage: 'Merci pour votre visite ! Au plaisir de vous revoir très bientôt.',
      currency: 'FCFA',
      logoIcon: 'sparkles'
    }
  },
  {
    label: 'Rooftop & Beach Club',
    desc: 'Terrasse panoramique, DJ sets & service bouteilles',
    profile: {
      name: 'SKYLINE ROOFTOP & BAR',
      slogan: 'Vue panoramique 360°, DJ Sets & Sunset Cocktails',
      rccm: 'RCCM: RB-COT-2024-B-8910',
      nif: 'NIF: 3201948572',
      address: 'Haie Vive, Avenue de la Marina',
      cityCountry: 'Cotonou, Bénin',
      phone: '+229 97 00 11 22',
      email: 'direction@skyline-rooftop.com',
      receiptFooterMessage: 'Merci de partager vos plus belles soirées avec nous !',
      currency: 'FCFA',
      logoIcon: 'flame'
    }
  }
];

export const CompanyProfileModal: React.FC<CompanyProfileModalProps> = ({
  isOpen,
  onClose,
  isFirstLaunch = false
}) => {
  const { companyProfile, updateCompanyProfile, setShowPrinterSettingsModal } = usePOS();

  const [formData, setFormData] = useState<CompanyProfile>({
    name: companyProfile.name || '',
    slogan: companyProfile.slogan || '',
    rccm: companyProfile.rccm || '',
    nif: companyProfile.nif || '',
    address: companyProfile.address || '',
    cityCountry: companyProfile.cityCountry || '',
    phone: companyProfile.phone || '',
    email: companyProfile.email || '',
    receiptFooterMessage: companyProfile.receiptFooterMessage || '',
    currency: companyProfile.currency || 'FCFA',
    logoIcon: companyProfile.logoIcon || 'crown',
    isConfigured: companyProfile.isConfigured || true,
    configuredAt: companyProfile.configuredAt
  });

  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleChange = (field: keyof CompanyProfile, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrorMsg(null);
    setSavedSuccess(false);
  };

  const handleApplyPreset = (preset: Partial<CompanyProfile>) => {
    setFormData(prev => ({
      ...prev,
      ...preset
    }));
    setErrorMsg(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg('Veuillez renseigner le nom de l’établissement.');
      return;
    }
    if (!formData.phone.trim()) {
      setErrorMsg('Veuillez renseigner un numéro de téléphone de contact.');
      return;
    }

    updateCompanyProfile(formData);
    setSavedSuccess(true);

    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const renderIconBadge = (iconName: CompanyProfile['logoIcon']) => {
    switch (iconName) {
      case 'crown': return <Crown className="w-5 h-5 text-amber-400" />;
      case 'sparkles': return <Sparkles className="w-5 h-5 text-cyan-400" />;
      case 'flame': return <Flame className="w-5 h-5 text-rose-400" />;
      case 'martini': return <GlassWater className="w-5 h-5 text-purple-400" />;
      case 'disc': return <Disc className="w-5 h-5 text-emerald-400" />;
      case 'wine': return <Wine className="w-5 h-5 text-amber-500" />;
      default: return <Crown className="w-5 h-5 text-amber-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="relative bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/40 p-6 border-b border-amber-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/40 flex items-center justify-center shadow-lg">
              <Building2 className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-wide">
                  {isFirstLaunch ? "Configuration Initiale de l'Entreprise" : "Identité & Profil de l'Entreprise"}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  En-tête Facture & Bluetooth
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-0.5">
                Définissez les coordonnées officielles imprimées sur tous les tickets de caisse thermique ESC/POS
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Form Fields (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Quick Presets */}
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Modèles Rapides Prédéfinis
                </span>
                <span className="text-[11px] text-slate-400">Cliquez pour pré-remplir</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {PRESET_ESTABLISHMENTS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPreset(preset.profile)}
                    className="p-2.5 rounded-lg bg-slate-900/80 hover:bg-amber-500/10 border border-slate-800 hover:border-amber-500/40 text-left transition-all group"
                  >
                    <p className="text-xs font-semibold text-slate-200 group-hover:text-amber-300 truncate">
                      {preset.label}
                    </p>
                    <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                      {preset.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <form id="company-profile-form" onSubmit={handleSubmit} className="space-y-4">
              
              {/* Name & Slogan */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Nom de l’Établissement / Raison Sociale *
                  </label>
                  <div className="relative">
                    <Store className="w-4 h-4 text-amber-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      placeholder="Ex: LE VELVET VIP CLUB & LOUNGE"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400 font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Slogan / Sous-Titre Commercial
                  </label>
                  <input
                    type="text"
                    value={formData.slogan}
                    onChange={(e) => handleChange('slogan', e.target.value)}
                    placeholder="Ex: Cocktails d’Exception, Champagnes & Prestige VIP"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Logo Icon Style */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Icône Emblème du Ticket
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {(['crown', 'sparkles', 'flame', 'martini', 'disc', 'wine'] as const).map((iconKey) => (
                    <button
                      key={iconKey}
                      type="button"
                      onClick={() => handleChange('logoIcon', iconKey)}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                        formData.logoIcon === iconKey
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-md shadow-amber-500/10'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {renderIconBadge(iconKey)}
                      <span className="text-[10px] capitalize">{iconKey}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Legal Info: RCCM & NIF */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    N° Registre Commerce (RCCM)
                  </label>
                  <input
                    type="text"
                    value={formData.rccm}
                    onChange={(e) => handleChange('rccm', e.target.value)}
                    placeholder="Ex: RCCM: TG-LOM-2024-B-1284"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Numéro Fiscal (NIF / IFU)
                  </label>
                  <input
                    type="text"
                    value={formData.nif}
                    onChange={(e) => handleChange('nif', e.target.value)}
                    placeholder="Ex: NIF: 1002345890"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>
              </div>

              {/* Physical Location & City */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Adresse Physique / Rue
                  </label>
                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => handleChange('address', e.target.value)}
                      placeholder="Ex: Boulevard du 13 Janvier"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Ville & Pays
                  </label>
                  <input
                    type="text"
                    value={formData.cityCountry}
                    onChange={(e) => handleChange('cityCountry', e.target.value)}
                    placeholder="Ex: Lomé, Togo"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Téléphone Service / Caisse *
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-emerald-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      placeholder="Ex: +228 90 11 22 33"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Email de Direction / Contact
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-blue-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder="Ex: contact@velvetvipclub.com"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>

              {/* Receipt Footer Message */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Message de Pied de Facture Thermique
                </label>
                <textarea
                  rows={2}
                  value={formData.receiptFooterMessage}
                  onChange={(e) => handleChange('receiptFooterMessage', e.target.value)}
                  placeholder="Ex: Merci de votre visite ! L'abus d'alcool est dangereux pour la santé, à consommer avec modération."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>

              {/* Error or Success feedback */}
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-medium">
                  {errorMsg}
                </div>
              )}

              {savedSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-medium flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Identité enregistrée avec succès ! Prise en compte immédiate sur les factures thermiques et l'imprimante Bluetooth.
                </div>
              )}
            </form>
          </div>

          {/* Right Column: Live Receipt Preview (5 cols) */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-amber-400" />
                Aperçu En-Tête Thermique
              </span>
              <span className="text-[10px] text-amber-400 font-mono">Format 58mm / 80mm</span>
            </div>

            {/* Thermal Paper Simulation */}
            <div className="flex-1 bg-white text-slate-900 rounded-xl p-4 shadow-xl border border-slate-300 font-mono text-[11px] leading-snug flex flex-col justify-between select-none">
              <div className="space-y-1 text-center">
                
                {/* Logo Icon Visual */}
                <div className="flex justify-center mb-1 text-amber-600">
                  {renderIconBadge(formData.logoIcon)}
                </div>

                <p className="font-extrabold text-xs tracking-wider text-black">
                  {formData.name || 'NOM DU CLUB'}
                </p>
                {formData.slogan && (
                  <p className="text-[10px] text-slate-700 italic">
                    {formData.slogan}
                  </p>
                )}
                <p className="text-[10px] text-slate-700">
                  {formData.address || 'Adresse de l’établissement'}
                  {formData.cityCountry ? ` - ${formData.cityCountry}` : ''}
                </p>
                <p className="text-[10px] text-slate-700 font-bold">
                  TEL: {formData.phone || '+228 90 00 00 00'}
                </p>
                {formData.email && (
                  <p className="text-[9px] text-slate-600">
                    EMAIL: {formData.email}
                  </p>
                )}
                {(formData.rccm || formData.nif) && (
                  <p className="text-[9px] text-slate-600 border-t border-b border-dashed border-slate-300 py-0.5 my-1">
                    {formData.rccm} {formData.nif ? `• ${formData.nif}` : ''}
                  </p>
                )}

                <div className="my-2 border-b border-black"></div>

                {/* Sample Ticket Body */}
                <p className="font-bold text-[10px]">*** FACTURE OFFICIELLE CLIENT ***</p>
                <div className="text-left text-[10px] text-slate-800 space-y-0.5 pt-1">
                  <div className="flex justify-between">
                    <span>FACTURE N°:</span>
                    <span className="font-bold">FAC-98421</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TABLE:</span>
                    <span className="font-bold">Carré VIP Or 1</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SERVEUR:</span>
                    <span>Yao (Serveur VIP)</span>
                  </div>
                </div>

                <div className="my-1.5 border-b border-dashed border-slate-400"></div>

                <div className="text-left text-[10px] space-y-1">
                  <div className="flex justify-between font-bold">
                    <span>ARTICLE</span>
                    <span>TOTAL</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span>1x Pack VIP Diamant</span>
                    <span>320.000 F</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span>2x Moët & Chandon Brut</span>
                    <span>150.000 F</span>
                  </div>
                </div>

                <div className="my-2 border-b border-black"></div>

                <div className="flex justify-between font-extrabold text-xs text-black">
                  <span>TOTAL PAYÉ:</span>
                  <span>470.000 FCFA</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-700">
                  <span>RÈGLEMENT:</span>
                  <span>WAVE / SÉCURISÉ</span>
                </div>

                <div className="my-2 border-b border-dashed border-slate-400"></div>

                {/* Footer message */}
                <p className="text-[9px] text-slate-700 italic px-2">
                  {formData.receiptFooterMessage || "Merci de votre visite ! L'abus d'alcool est dangereux pour la santé."}
                </p>
                <p className="text-[9px] font-bold text-slate-900 pt-1">
                  *** {formData.name || 'LE VELVET VIP'} ***
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-dashed border-slate-300 text-center">
                <span className="text-[9px] text-slate-500">
                  ✂ Découpe automatique ESC/POS activée
                </span>
              </div>
            </div>

            {/* Quick Bluetooth Printer Link */}
            <div className="mt-4 p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-cyan-400" />
                <div>
                  <p className="text-xs font-semibold text-white">Imprimante Bluetooth</p>
                  <p className="text-[10px] text-slate-400">Configurer la liaison sans fil</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setShowPrinterSettingsModal(true);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-medium flex items-center gap-1 transition-colors"
              >
                Gérer <ArrowRight className="w-3 h-3" />
              </button>
            </div>

          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="bg-slate-950 p-4 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-sm font-medium"
          >
            Annuler
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setFormData(companyProfile);
                setErrorMsg(null);
                setSavedSuccess(false);
              }}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Réinitialiser
            </button>

            <button
              type="submit"
              form="company-profile-form"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-95"
            >
              <Save className="w-4 h-4" />
              Enregistrer l’Identité
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
