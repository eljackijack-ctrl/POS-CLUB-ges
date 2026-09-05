import React, { useState } from 'react';
import { 
  X, Laptop, Wifi, Cpu, RotateCcw, ShieldCheck, AlertTriangle, 
  CheckCircle2, RefreshCw, Save, HardDrive, Sparkles, Copy, 
  Check, ArrowRight, ShieldAlert, Sliders, History, Globe
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { generateMacAddress, generateStationIp, DeviceSignature } from '../utils/deviceIdentifier';

interface DeviceStationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeviceStationModal: React.FC<DeviceStationModalProps> = ({
  isOpen,
  onClose
}) => {
  const { 
    deviceSignature, 
    updateStationDeviceConfig, 
    resetAllToFreshZero,
    simulateDeviceChange,
    knownDevicesList
  } = usePOS();

  const [activeTab, setActiveTab] = useState<'IDENTITY' | 'SETTINGS' | 'ACTIONS' | 'HISTORY'>('IDENTITY');
  
  // Editable fields
  const [macAddress, setMacAddress] = useState<string>(deviceSignature.macAddress);
  const [ipAddress, setIpAddress] = useState<string>(deviceSignature.ipAddress);
  const [deviceName, setDeviceName] = useState<string>(deviceSignature.deviceName);
  const [autoResetOnNewDevice, setAutoResetOnNewDevice] = useState<boolean>(deviceSignature.autoResetOnNewDevice);
  
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [showConfirmResetModal, setShowConfirmResetModal] = useState<boolean>(false);
  const [resetStockLevels, setResetStockLevels] = useState<boolean>(true);

  if (!isOpen) return null;

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleRegenerateMac = () => {
    const newMac = generateMacAddress();
    setMacAddress(newMac);
  };

  const handleRegenerateIp = () => {
    const newIp = generateStationIp();
    setIpAddress(newIp);
  };

  const handleSaveConfig = () => {
    updateStationDeviceConfig({
      macAddress: macAddress.trim().toUpperCase(),
      ipAddress: ipAddress.trim(),
      deviceName: deviceName.trim(),
      autoResetOnNewDevice
    });

    setSaveSuccessMsg('Configuration du terminal enregistrée avec succès !');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleExecuteReset = () => {
    resetAllToFreshZero({
      resetStockLevelsToZero: resetStockLevels,
      wipeCatalog: false,
      customMac: macAddress.trim().toUpperCase(),
      customIp: ipAddress.trim(),
      customDeviceName: deviceName.trim()
    });
    setShowConfirmResetModal(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        id="device-station-modal"
        className="relative w-full max-w-2xl bg-[#0c0f1a] border border-cyan-500/30 rounded-3xl shadow-2xl shadow-cyan-950/40 overflow-hidden text-gray-200"
      >
        {/* Header Ribbon */}
        <div className="p-5 sm:p-6 border-b border-white/10 flex items-start justify-between gap-4 bg-gradient-to-r from-[#121727] via-[#0e1322] to-[#0c0f1a]">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/10">
              <Laptop className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Terminal & Réseau POS
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  Station Authentifiée
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white mt-1">
                Identification Code MAC, IP & Changement d'Appareil
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

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-white/10 px-5 sm:px-6 bg-[#090b14] overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('IDENTITY')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'IDENTITY'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Wifi className="w-4 h-4" />
            <span>Codes MAC & IP</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SETTINGS')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'SETTINGS'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Règle Remise à 0</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ACTIONS')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'ACTIONS'
                ? 'border-rose-400 text-rose-300'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>Changer d'Appareil (Reset 0)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('HISTORY')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'HISTORY'
                ? 'border-purple-400 text-purple-300'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Historique Stations</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 max-h-[65vh] overflow-y-auto space-y-5">
          
          {saveSuccessMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          {/* TAB 1: IDENTITY (MAC & IP) */}
          {activeTab === 'IDENTITY' && (
            <div className="space-y-4">
              
              <div className="bg-[#121624] border border-cyan-500/30 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                    <Wifi className="w-4 h-4 text-cyan-400" />
                    Identification Réseau & Station
                  </span>
                  <span className="text-[11px] text-gray-400">
                    Détection Matérielle Active
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  
                  {/* MAC Field */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-300 flex items-center justify-between">
                      <span>Code MAC Station :</span>
                      <button
                        type="button"
                        onClick={handleRegenerateMac}
                        className="text-[11px] text-cyan-400 hover:text-cyan-300 underline cursor-pointer flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Générer
                      </button>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={macAddress}
                        onChange={(e) => setMacAddress(e.target.value)}
                        placeholder="Ex: 00:1A:2B:3C:4D:5E"
                        className="w-full bg-[#090b14] border border-cyan-500/40 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-cyan-400 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => handleCopy(macAddress, 'MAC')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                        title="Copier le code MAC"
                      >
                        {copiedField === 'MAC' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* IP Field */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-300 flex items-center justify-between">
                      <span>Code IP Station :</span>
                      <button
                        type="button"
                        onClick={handleRegenerateIp}
                        className="text-[11px] text-blue-400 hover:text-blue-300 underline cursor-pointer flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Générer
                      </button>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={ipAddress}
                        onChange={(e) => setIpAddress(e.target.value)}
                        placeholder="Ex: 192.168.1.105"
                        className="w-full bg-[#090b14] border border-blue-500/40 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-blue-400 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => handleCopy(ipAddress, 'IP')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                        title="Copier l'adresse IP"
                      >
                        {copiedField === 'IP' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Device Name */}
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-bold text-gray-300">
                      Nom / Emplacement de la Caisse :
                    </label>
                    <input
                      type="text"
                      value={deviceName}
                      onChange={(e) => setDeviceName(e.target.value)}
                      placeholder="Ex: Caisse Principale - Carré VIP #1"
                      className="w-full bg-[#090b14] border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* Hardware Fingerprint & ID */}
                  <div className="sm:col-span-2 p-3 rounded-xl bg-[#090c15] border border-white/5 space-y-2 text-xs text-gray-400">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-300">ID Matériel Unique :</span>
                      <span className="font-mono text-[11px] text-amber-300">{deviceSignature.deviceId}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-300">Système & Résolution :</span>
                      <span>{deviceSignature.platform} ({deviceSignature.screenResolution})</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-300">Fingerprint Hash :</span>
                      <span className="font-mono text-[11px] text-cyan-300">{deviceSignature.fingerprintHash}</span>
                    </div>
                  </div>

                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-black text-xs shadow-md shadow-cyan-500/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Enregistrer les Codes Station</span>
                </button>
              </div>

            </div>
          )}

          {/* TAB 2: SETTINGS (AUTO-RESET RULE) */}
          {activeTab === 'SETTINGS' && (
            <div className="space-y-4">
              
              <div className="p-4 rounded-2xl bg-[#121624] border border-amber-500/30 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <RotateCcw className="w-4 h-4 text-amber-400" />
                      Remise à 0 automatique à l'identification d'un nouveau terminal
                    </h3>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      Dès qu'un nouveau code MAC, une nouvelle IP ou un changement physique d'appareil est détecté, le système effectue automatiquement une remise à zéro complète pour isoler les caisses.
                    </p>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                    <input
                      type="checkbox"
                      checked={autoResetOnNewDevice}
                      onChange={(e) => setAutoResetOnNewDevice(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>
              </div>

              {/* Protocol Details */}
              <div className="p-4 rounded-2xl bg-[#0e121e] border border-white/10 space-y-3 text-xs">
                <h4 className="font-bold text-amber-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  Protocole de Sécurité & Clôture de Caisse :
                </h4>

                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Isolation des postes :</strong> Chaque appareil connecté avec un code MAC ou IP distinct démarre sur un service neuf à 0 FCFA.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Intégrité comptable :</strong> Évite tout mélange de transactions ou de commandes orphelines entre deux smartphones, tablettes ou PC de caisse.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Conservation du catalogue :</strong> Les fiches boissons et prix de vente restent configurés, seul le compteur des ventes et stocks démarre à 0.
                    </span>
                  </li>
                </ul>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Enregistrer la Règle</span>
                </button>
              </div>

            </div>
          )}

          {/* TAB 3: ACTIONS (MANUAL SWITCH & SIMULATIONS) */}
          {activeTab === 'ACTIONS' && (
            <div className="space-y-4">
              
              {/* Primary Action Button */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/50 via-[#18111e] to-[#121624] border border-rose-500/40 space-y-3">
                <div className="flex items-center gap-2.5">
                  <ShieldAlert className="w-5 h-5 text-rose-400" />
                  <h3 className="text-sm font-black text-white">
                    Déclencher un Changement d'Appareil (Remise à 0 Immédiate)
                  </h3>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Utilisez cette action si vous transférez cette session sur un nouvel appareil ou si vous souhaitez réinitialiser immédiatement tous les compteurs de vente et de stock à 0 pour ce poste.
                </p>

                <button
                  type="button"
                  onClick={() => setShowConfirmResetModal(true)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-rose-500/20 flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Remettre tout à 0 pour Nouveau Terminal</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Simulation Quick Tests */}
              <div className="p-4 rounded-2xl bg-[#0e121e] border border-white/10 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  Simulateur de Changement Réseau / Matériel (Tests & Démo)
                </h4>
                <p className="text-xs text-gray-400">
                  Générez un nouvel identifiant pour tester la réaction immédiate du système de caisse et la remise à 0 :
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => simulateDeviceChange('NEW_MAC')}
                    className="p-3 rounded-xl bg-[#141828] border border-cyan-500/30 hover:border-cyan-400 hover:bg-cyan-500/10 text-left transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 text-xs font-bold text-cyan-300 mb-1">
                      <Wifi className="w-4 h-4 text-cyan-400" />
                      <span>Nouveau Code MAC</span>
                    </div>
                    <p className="text-[10px] text-gray-400">Simule une nouvelle carte réseau</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => simulateDeviceChange('NEW_IP')}
                    className="p-3 rounded-xl bg-[#141828] border border-blue-500/30 hover:border-blue-400 hover:bg-blue-500/10 text-left transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 text-xs font-bold text-blue-300 mb-1">
                      <Cpu className="w-4 h-4 text-blue-400" />
                      <span>Nouvelle IP Station</span>
                    </div>
                    <p className="text-[10px] text-gray-400">Simule un changement d'adresse IP</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => simulateDeviceChange('NEW_DEVICE')}
                    className="p-3 rounded-xl bg-[#141828] border border-amber-500/30 hover:border-amber-400 hover:bg-amber-500/10 text-left transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-300 mb-1">
                      <Laptop className="w-4 h-4 text-amber-400" />
                      <span>Nouvel Appareil</span>
                    </div>
                    <p className="text-[10px] text-gray-400">Simule un nouveau smartphone / PC</p>
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: HISTORY */}
          {activeTab === 'HISTORY' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Terminaux Reconnus sur cet Établissement
                </span>
                <span className="text-xs text-purple-300 font-semibold">
                  {knownDevicesList.length} station(s)
                </span>
              </div>

              {knownDevicesList.length === 0 ? (
                <div className="p-8 rounded-2xl bg-[#090b14] border border-white/5 text-center text-xs text-gray-500">
                  Aucun autre terminal enregistré pour l'instant.
                </div>
              ) : (
                <div className="space-y-2">
                  {knownDevicesList.map((dev, idx) => (
                    <div 
                      key={idx}
                      className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                        dev.deviceId === deviceSignature.deviceId 
                          ? 'bg-cyan-950/30 border-cyan-500/40 text-cyan-200' 
                          : 'bg-[#121624] border-white/10 text-gray-300'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{dev.deviceName}</span>
                          {dev.deviceId === deviceSignature.deviceId && (
                            <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                              Poste Actuel
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 font-mono text-[11px] text-gray-400">
                          <span>MAC: {dev.macAddress}</span>
                          <span>•</span>
                          <span>IP: {dev.ipAddress}</span>
                        </div>
                      </div>

                      <div className="text-right text-[10px] text-gray-500">
                        {dev.lastSeenAt ? new Date(dev.lastSeenAt).toLocaleDateString('fr-FR') : 'Actif'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-[#080a12] flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Poste sécurisé • Mode Web 100% autonome</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>

      </div>

      {/* Confirmation Sub-Modal for Manual Reset */}
      {showConfirmResetModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 animate-fadeIn">
          <div className="w-full max-w-md bg-[#131625] border border-rose-500/50 rounded-3xl p-6 space-y-4 text-gray-200 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-white">
                Confirmer la Remise à 0 du Terminal ?
              </h3>
              <p className="text-xs text-gray-300">
                Toutes les ventes, commandes en cours et mouvements de caisse seront réinitialisés à <strong>0</strong> pour ce poste.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#090b14] border border-white/10 text-xs space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={resetStockLevels}
                  onChange={(e) => setResetStockLevels(e.target.checked)}
                  className="rounded border-gray-600 text-rose-500 focus:ring-rose-500"
                />
                <span className="text-gray-300">Remettre aussi les quantités de stock à 0</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmResetModal(false)}
                className="py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-gray-300 font-bold text-xs cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleExecuteReset}
                className="py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white font-black text-xs shadow-lg shadow-rose-500/20 cursor-pointer"
              >
                Oui, Remettre à 0
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
