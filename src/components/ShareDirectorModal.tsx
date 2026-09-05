import React, { useState, useEffect } from 'react';
import { 
  X, Share2, Copy, Check, QrCode, Smartphone, Globe, 
  ExternalLink, MessageCircle, Mail, ShieldCheck, Lock, 
  Eye, RefreshCw, Sparkles, Building2, Radio, CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { generateQRCodeSVG } from '../utils/qrCodeGenerator';

interface ShareDirectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDirectorDashboard?: () => void;
}

export const ShareDirectorModal: React.FC<ShareDirectorModalProps> = ({
  isOpen,
  onClose,
  onOpenDirectorDashboard
}) => {
  const { companyProfile } = usePOS();
  const [copied, setCopied] = useState<boolean>(false);
  const [includePin, setIncludePin] = useState<boolean>(false);
  const [pinCode, setPinCode] = useState<string>('1234');
  const [directorUrl, setDirectorUrl] = useState<string>('');
  const [qrSvg, setQrSvg] = useState<string>('');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const origin = window.location.origin;
    const pathname = window.location.pathname;
    const base = `${origin}${pathname}`;
    
    const params = new URLSearchParams();
    params.set('mode', 'director');
    if (includePin && pinCode) {
      params.set('pin', pinCode);
    }
    params.set('ref', 'share');

    const fullUrl = `${base}?${params.toString()}`;
    setDirectorUrl(fullUrl);

    // Generate QR SVG
    try {
      const svg = generateQRCodeSVG(fullUrl, 180, '#f59e0b', 'transparent');
      setQrSvg(svg);
    } catch (e) {
      console.warn('Failed to generate QR Code:', e);
    }
  }, [isOpen, includePin, pinCode]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(directorUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWhatsAppShare = () => {
    const establishment = companyProfile.name || 'Club & Bar VIP';
    const message = encodeURIComponent(
      `🍾 *${establishment} - Suivi Directrice en Direct*\n\n` +
      `Bonjour Madame la Directrice / Monsieur le Directeur,\n` +
      `Voici votre lien d'accès en direct pour surveiller en temps réel l'Historique des Ventes (encaissements, tickets) et l'État du Stock de bouteilles du club :\n\n` +
      `👉 ${directorUrl}\n\n` +
      `_(Mise à jour instantanée en live sans rechargement de page)_`
    );
    window.open(`https://api.whatsapp.com/send?text=${message}`, '_blank');
  };

  const handleEmailShare = () => {
    const establishment = companyProfile.name || 'Club & Bar VIP';
    const subject = encodeURIComponent(`[Directrice Live] Historique des Ventes et État du Stock - ${establishment}`);
    const body = encodeURIComponent(
      `Bonjour,\n\n` +
      `Accédez au tableau de bord en direct pour ${establishment} :\n` +
      `${directorUrl}\n\n` +
      `Ce lien vous donne accès exclusif en temps réel à l'historique complet des ventes (tickets, chiffre d'affaires) et à l'état du stock de bouteilles en cave et bar.\n\n` +
      `Cordialement,\nSystème de Caisse ClubPOS`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  const handleOpenDirect = () => {
    if (onOpenDirectorDashboard) {
      onOpenDirectorDashboard();
      onClose();
    } else {
      window.open(directorUrl, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        id="share-director-modal"
        className="relative w-full max-w-xl bg-[#0d111d] border border-amber-500/40 rounded-3xl shadow-2xl shadow-amber-950/40 overflow-hidden text-gray-200"
      >
        {/* Glow Top Line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600" />

        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-white/10 flex items-start justify-between gap-4 bg-[#111524]">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/10">
              <Radio className="w-6 h-6 text-amber-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Accès Superviseur & Direction
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Flux Live 24/7
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white mt-1">
                Partager le Suivi des Ventes en Direct
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

        {/* Modal Content */}
        <div className="p-5 sm:p-6 max-h-[70vh] overflow-y-auto space-y-5">
          
          {/* Main Description */}
          <div className="p-3.5 rounded-2xl bg-[#14192b] border border-amber-500/20 text-xs text-gray-300 leading-relaxed flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <span>
              Le Directeur peut suivre <strong>en direct</strong> depuis son smartphone (iPhone / Android) ou son ordinateur le <strong>Chiffre d'Affaires en FCFA</strong>, le détail des encaissements, les tables occupées et les alertes stock en temps réel sans jamais perturber la caisse.
            </span>
          </div>

          {/* QR Code & Link Container */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center bg-[#080b14] p-4 rounded-2xl border border-white/10">
            
            {/* QR Code Side */}
            <div className="sm:col-span-5 flex flex-col items-center justify-center p-3 rounded-xl bg-[#101422] border border-amber-500/30">
              <div 
                className="w-36 h-36 flex items-center justify-center bg-black/40 rounded-xl p-2 border border-amber-500/20"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
              <div className="text-[11px] text-amber-300 font-bold mt-2 flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5" />
                <span>Scanner avec Smartphone</span>
              </div>
              <span className="text-[10px] text-gray-400 text-center mt-0.5">
                Ouvre directement le tableau de bord
              </span>
            </div>

            {/* Direct Actions Side */}
            <div className="sm:col-span-7 space-y-3">
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300 flex items-center justify-between">
                  <span>Lien Direct d'Accès Directeur :</span>
                  <span className="text-[10px] text-emerald-400 font-mono">Lecture Seule Sécurisée</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={directorUrl}
                    className="w-full bg-[#111522] border border-white/15 rounded-xl px-3 py-2 text-xs font-mono text-amber-200 select-all focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                      copied 
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' 
                        : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Copié !</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copier</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Instant Share Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                
                {/* WhatsApp Share */}
                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  className="px-3 py-2.5 rounded-xl bg-[#25D366]/20 hover:bg-[#25D366]/30 border border-[#25D366]/40 text-[#25D366] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Sur WhatsApp</span>
                </button>

                {/* Email Share */}
                <button
                  type="button"
                  onClick={handleEmailShare}
                  className="px-3 py-2.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Mail className="w-4 h-4" />
                  <span>Par Email</span>
                </button>

              </div>

            </div>

          </div>

          {/* Security & Access Features */}
          <div className="p-4 rounded-2xl bg-[#121626] border border-white/10 space-y-3">
            <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Avantages du Suivi Directeur en Ligne :</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-gray-300">
              <div className="p-2.5 rounded-xl bg-[#090c16] border border-white/5 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Zéro Rechargement :</strong> Les ventes et ajouts de commandes s'affichent instantanément en direct via Cloud Firestore.
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#090c16] border border-white/5 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Consultation Partout :</strong> Fonctionne depuis n'importe quel réseau WiFi, 4G/5G, à l'étranger ou sur place.
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#090c16] border border-white/5 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Surveillance Fraude & Annulations :</strong> Notifications des suppressions d'articles et offerts VIP.
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#090c16] border border-white/5 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Export PDF Immédiat :</strong> Le directeur peut télécharger son bilan financier d'un simple clic.
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-5 sm:p-6 border-t border-white/10 bg-[#090c15] flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-gray-300 hover:text-white font-bold text-xs transition-colors cursor-pointer text-center"
          >
            Fermer
          </button>

          <button
            type="button"
            onClick={handleOpenDirect}
            className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <Eye className="w-4 h-4 text-slate-950" />
            <span>Ouvrir la Vue Directeur Maintenant</span>
            <ArrowRight className="w-4 h-4 text-slate-950" />
          </button>
        </div>

      </div>
    </div>
  );
};
