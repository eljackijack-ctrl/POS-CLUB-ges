import React, { useState } from 'react';
import { 
  Download, Smartphone, Laptop, Apple, Check, 
  ExternalLink, Sparkles, X, ShieldCheck, 
  WifiOff, ArrowRight, Share2, PlusSquare, Info
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'ANDROID' | 'IOS' | 'DESKTOP'>(
    isIOS ? 'IOS' : isAndroid ? 'ANDROID' : 'DESKTOP'
  );
  const [installSuccess, setInstallSuccess] = useState(false);

  if (!isOpen) return null;

  const handleNativeInstall = async () => {
    const outcome = await install();
    if (outcome === 'accepted') {
      setInstallSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#111422] border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-8">
        
        {/* Header with gradient banner */}
        <div className="relative bg-gradient-to-r from-amber-600/20 via-slate-900 to-indigo-950/40 p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shadow-lg shadow-amber-500/10 shrink-0">
              <Download className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide">
                  Installer l'Application ClubPOS
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Android • iOS • PC • Mac
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Fonctionne comme une application native sans téléchargement de fichier APK lourd
              </p>
            </div>
          </div>

          <button
            id="btn-close-pwa-modal"
            onClick={onClose}
            className="p-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">

          {/* Quick 1-Click Install Banner (if browser triggers native prompt) */}
          {isInstallable && !isInstalled && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/40 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500 text-black font-bold">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-300">Installation Instantanée Détectée</h4>
                  <p className="text-xs text-gray-300">Votre navigateur est prêt pour l'installation en 1 clic sur cet appareil.</p>
                </div>
              </div>
              <button
                id="btn-trigger-pwa-prompt"
                onClick={handleNativeInstall}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-black font-extrabold text-xs shadow-lg shadow-amber-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>Installer Maintenant</span>
              </button>
            </div>
          )}

          {isInstalled && (
            <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-3">
              <Check className="w-6 h-6 text-emerald-400 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-emerald-300">Application Déjà Installée !</h4>
                <p className="text-xs text-gray-300">Vous utilisez actuellement ClubPOS en mode autonome (PWA / extension écran d'accueil).</p>
              </div>
            </div>
          )}

          {installSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-400 flex items-center gap-3 text-emerald-200 text-sm font-bold animate-pulse">
              <Check className="w-5 h-5" />
              Installation réussie ! L'icône a été ajoutée à vos applications.
            </div>
          )}

          {/* Advantages Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#161a2b] border border-white/5 space-y-1">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
                <WifiOff className="w-4 h-4" />
                <span>100% Hors-Ligne</span>
              </div>
              <p className="text-[11px] text-gray-400">
                Continue de fonctionner même sans connexion Internet ou Wi-Fi
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#161a2b] border border-white/5 space-y-1">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>Plein Écran Natif</span>
              </div>
              <p className="text-[11px] text-gray-400">
                Supprime la barre d'adresse pour une expérience de caisse immersive
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#161a2b] border border-white/5 space-y-1">
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold">
                <Smartphone className="w-4 h-4" />
                <span>Zéro Téléchargement</span>
              </div>
              <p className="text-[11px] text-gray-400">
                Installation ultra-légère sans occuper des gigaoctets de mémoire
              </p>
            </div>
          </div>

          {/* Platform Tab Switcher */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">
              Choisissez votre appareil pour voir le guide pas à pas :
            </label>
            <div className="grid grid-cols-3 gap-2 p-1 bg-[#0d0f19] rounded-2xl border border-white/10">
              <button
                id="tab-install-android"
                type="button"
                onClick={() => setActiveTab('ANDROID')}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'ANDROID'
                    ? 'bg-emerald-500 text-black shadow-md font-extrabold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>Android</span>
              </button>

              <button
                id="tab-install-ios"
                type="button"
                onClick={() => setActiveTab('IOS')}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'IOS'
                    ? 'bg-amber-500 text-black shadow-md font-extrabold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Apple className="w-4 h-4" />
                <span>iPhone / iPad</span>
              </button>

              <button
                id="tab-install-desktop"
                type="button"
                onClick={() => setActiveTab('DESKTOP')}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'DESKTOP'
                    ? 'bg-cyan-500 text-black shadow-md font-extrabold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Laptop className="w-4 h-4" />
                <span>PC / Mac / Chrome</span>
              </button>
            </div>
          </div>

          {/* Step-by-Step Instructions per Platform */}
          <div className="p-5 rounded-2xl bg-[#141829] border border-white/10">
            {activeTab === 'ANDROID' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <Smartphone className="w-4 h-4" />
                    <span>Guide d'Installation sur Smartphone & Tablette Android</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                    Chrome • Samsung • Firefox
                  </span>
                </div>

                <ol className="space-y-3 text-xs text-gray-200">
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold flex items-center justify-center shrink-0 text-xs">
                      1
                    </span>
                    <div>
                      <p className="font-semibold text-white">Appuyez sur le menu du navigateur</p>
                      <p className="text-gray-400 text-[11px] mt-0.5">
                        Touchez les <strong>3 petits points verticaux (⋮)</strong> situés tout en haut à droite de Google Chrome ou Samsung Internet.
                      </p>
                    </div>
                  </li>

                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold flex items-center justify-center shrink-0 text-xs">
                      2
                    </span>
                    <div>
                      <p className="font-semibold text-white">Sélectionnez « Installer l'application » ou « Ajouter à l'écran d'accueil »</p>
                      <p className="text-gray-400 text-[11px] mt-0.5">
                        Dans le menu déroulant, appuyez sur <strong>« Installer l'application »</strong> (ou « Ajouter à l'écran d'accueil »).
                      </p>
                    </div>
                  </li>

                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold flex items-center justify-center shrink-0 text-xs">
                      3
                    </span>
                    <div>
                      <p className="font-semibold text-white">Confirmez l'ajout</p>
                      <p className="text-gray-400 text-[11px] mt-0.5">
                        Cliquez sur <strong>« Installer »</strong> dans la fenêtre de confirmation. L'icône de caisse ClubPOS s'ajoute directement sur votre écran d'accueil comme une application Play Store.
                      </p>
                    </div>
                  </li>
                </ol>

                {isInstallable && (
                  <div className="pt-2">
                    <button
                      onClick={handleNativeInstall}
                      className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
                    >
                      <Download className="w-4 h-4" />
                      <span>Lancer l'installation directe Android</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'IOS' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                    <Apple className="w-4 h-4" />
                    <span>Guide d'Installation sur iPhone & iPad (Safari)</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                    iOS Safari
                  </span>
                </div>

                <ol className="space-y-3 text-xs text-gray-200">
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold flex items-center justify-center shrink-0 text-xs">
                      1
                    </span>
                    <div>
                      <p className="font-semibold text-white flex items-center gap-1.5">
                        <span>Ouvrez dans <strong>Safari</strong> et appuyez sur « Partager »</span>
                        <Share2 className="w-3.5 h-3.5 text-amber-400" />
                      </p>
                      <p className="text-gray-400 text-[11px] mt-0.5">
                        Touchez le bouton de partage (icône carré avec une flèche pointant vers le haut) dans la barre inférieure de Safari.
                      </p>
                    </div>
                  </li>

                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold flex items-center justify-center shrink-0 text-xs">
                      2
                    </span>
                    <div>
                      <p className="font-semibold text-white flex items-center gap-1.5">
                        <span>Choisissez « Sur l'écran d'accueil »</span>
                        <PlusSquare className="w-3.5 h-3.5 text-amber-400" />
                      </p>
                      <p className="text-gray-400 text-[11px] mt-0.5">
                        Faites défiler la liste des actions vers le bas et sélectionnez <strong>« Sur l'écran d'accueil »</strong>.
                      </p>
                    </div>
                  </li>

                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold flex items-center justify-center shrink-0 text-xs">
                      3
                    </span>
                    <div>
                      <p className="font-semibold text-white">Appuyez sur « Ajouter » en haut à droite</p>
                      <p className="text-gray-400 text-[11px] mt-0.5">
                        L'application apparaîtra instantanément avec son logo officiel sur l'écran d'accueil de votre iPhone ou iPad en plein écran sans barre Safari.
                      </p>
                    </div>
                  </li>
                </ol>
              </div>
            )}

            {activeTab === 'DESKTOP' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                    <Laptop className="w-4 h-4" />
                    <span>Guide Ordinateur (Google Chrome, Microsoft Edge, Brave, Mac)</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold">
                    Windows • macOS • Linux
                  </span>
                </div>

                <ol className="space-y-3 text-xs text-gray-200">
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-bold flex items-center justify-center shrink-0 text-xs">
                      1
                    </span>
                    <div>
                      <p className="font-semibold text-white">Icône d'installation dans la barre d'adresse</p>
                      <p className="text-gray-400 text-[11px] mt-0.5">
                        Dans Google Chrome ou Edge, regardez à l'extrémité droite de la barre d'adresse URL : cliquez sur la petite icône d'ordinateur avec flèche <strong>« Installer ClubPOS »</strong>.
                      </p>
                    </div>
                  </li>

                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-bold flex items-center justify-center shrink-0 text-xs">
                      2
                    </span>
                    <div>
                      <p className="font-semibold text-white">Ou via le menu du navigateur</p>
                      <p className="text-gray-400 text-[11px] mt-0.5">
                        Cliquez sur <strong>Menu (⋮) ➔ Enregistrer et partager ➔ « Installer la page en tant qu'application »</strong>.
                      </p>
                    </div>
                  </li>

                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-bold flex items-center justify-center shrink-0 text-xs">
                      3
                    </span>
                    <div>
                      <p className="font-semibold text-white">Épingler à la barre des tâches / Dock</p>
                      <p className="text-gray-400 text-[11px] mt-0.5">
                        L'application s'ouvre dans sa propre fenêtre indépendante. Faites un clic droit sur l'icône dans votre barre des tâches et choisissez <strong>« Épingler à la barre des tâches »</strong>.
                      </p>
                    </div>
                  </li>
                </ol>

                {isInstallable && (
                  <div className="pt-2">
                    <button
                      onClick={handleNativeInstall}
                      className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20"
                    >
                      <Download className="w-4 h-4" />
                      <span>Installer sur cet ordinateur</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick FAQ info */}
          <div className="p-3.5 rounded-xl bg-[#0b0d14] border border-white/5 flex items-start gap-3 text-xs text-gray-400">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p>
              <strong>Mises à jour automatiques :</strong> Grâce à la technologie PWA, dès qu'une amélioration ou correction est apportée au système, elle est automatiquement mise à jour sans intervention requise.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-[#0d0f19] border-t border-white/10 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
};
