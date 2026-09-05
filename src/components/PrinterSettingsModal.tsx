import React, { useState, useEffect } from 'react';
import { 
  Printer, Bluetooth, BluetoothConnected, BluetoothOff, 
  Settings, Check, RefreshCw, Smartphone, FileText, 
  Scissors, DollarSign, Building2, X, Sparkles, CheckCircle2,
  AlertCircle, ArrowRight, Radio, Search, Sliders, Star,
  Trash2, Plus, ShieldCheck, Zap, HelpCircle, HardDrive,
  Cpu, Signal
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { 
  PrinterConfig, BluetoothScanOptions, BluetoothScanMode, 
  BluetoothDeviceRecord, BluetoothServiceTarget 
} from '../types';
import { isWebBluetoothSupported, KNOWN_POS_SERVICES, KNOWN_POS_NAME_PREFIXES, getSimulatedNearbyDevices } from '../utils/escpos';
import { formatDateTime } from '../utils/formatters';

interface PrinterSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ModalTab = 'SCANNER' | 'SCAN_OPTIONS' | 'PRINT_SETTINGS' | 'DIAGNOSTICS';

export const PrinterSettingsModal: React.FC<PrinterSettingsModalProps> = ({
  isOpen,
  onClose
}) => {
  const { 
    printerConfig, 
    setPrinterConfig, 
    connectBluetoothPrinter, 
    disconnectBluetoothPrinter,
    testPrintBluetooth,
    companyProfile,
    setShowCompanyProfileModal,
    updateScanOptions,
    searchAndPairBluetooth,
    connectSavedDevice,
    saveBluetoothDevice,
    removeBluetoothDevice,
    toggleFavoriteDevice
  } = usePOS();

  const [activeTab, setActiveTab] = useState<ModalTab>('SCANNER');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [testPrintLoading, setTestPrintLoading] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Filter text in device list
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [deviceFilter, setDeviceFilter] = useState<'ALL' | 'FAVORITES' | '58MM' | '80MM'>('ALL');

  // Manual device addition state
  const [showAddManualModal, setShowAddManualModal] = useState<boolean>(false);
  const [manualName, setManualName] = useState<string>('POS-58 Imprimante Caisse');
  const [manualWidth, setManualWidth] = useState<58 | 80>(58);
  const [manualMac, setManualMac] = useState<string>('68:37:E9:12:4A:8B');

  // Active scan options state
  const scanOpts: BluetoothScanOptions = printerConfig.scanOptions || {
    scanMode: 'POS_PRINTERS_ONLY',
    customNamePrefix: 'POS',
    targetService: 'AUTO',
    scanTimeoutSeconds: 10,
    autoReconnect: true,
    chunkSize: 100,
    includeSimulatedNearby: true
  };

  if (!isOpen) return null;

  const handleScanBluetooth = async () => {
    setIsScanning(true);
    setFeedbackMsg({ type: 'info', text: 'Recherche des périphériques Bluetooth compatibles en cours...' });
    try {
      const res = await searchAndPairBluetooth(scanOpts);
      if (res.success) {
        setFeedbackMsg({ type: 'success', text: res.message });
      } else {
        setFeedbackMsg({ type: 'error', text: res.message });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFeedbackMsg({ type: 'error', text: `Erreur: ${msg}` });
    } finally {
      setIsScanning(false);
    }
  };

  const handleConnectSpecificDevice = async (device: BluetoothDeviceRecord) => {
    setFeedbackMsg({ type: 'info', text: `Connexion à "${device.name}"...` });
    try {
      const res = await connectSavedDevice(device);
      setFeedbackMsg({ type: 'success', text: res.message });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFeedbackMsg({ type: 'error', text: `Échec de connexion : ${msg}` });
    }
  };

  const handleDisconnect = () => {
    disconnectBluetoothPrinter();
    setFeedbackMsg({ type: 'info', text: 'Imprimante Bluetooth déconnectée.' });
  };

  const handleTestPrint = async () => {
    setTestPrintLoading(true);
    setFeedbackMsg(null);
    try {
      const res = await testPrintBluetooth();
      if (res.success) {
        setFeedbackMsg({ type: 'success', text: res.message });
      } else {
        setFeedbackMsg({ type: 'error', text: res.message });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFeedbackMsg({ type: 'error', text: `Erreur lors du test: ${msg}` });
    } finally {
      setTestPrintLoading(false);
    }
  };

  const updateConfigField = <K extends keyof PrinterConfig>(field: K, value: PrinterConfig[K]) => {
    setPrinterConfig({
      ...printerConfig,
      [field]: value
    });
  };

  const handleAddManualDevice = () => {
    if (!manualName.trim()) return;
    const newDev: BluetoothDeviceRecord = {
      id: `BT_MANUAL_${Date.now().toString().slice(-6)}`,
      name: manualName.trim(),
      deviceType: manualWidth === 80 ? 'PRINTER_80' : 'PRINTER_58',
      paperWidthDefault: manualWidth,
      rssi: -50,
      lastConnectedAt: new Date().toISOString(),
      isFavorite: true,
      isPaired: true,
      macOrAddress: manualMac.trim() || undefined,
      serviceUuid: '000018f0-0000-1000-8000-00805f9b34fb'
    };
    saveBluetoothDevice(newDev);
    setShowAddManualModal(false);
    setFeedbackMsg({ type: 'success', text: `Périphérique "${newDev.name}" ajouté à votre liste.` });
  };

  // Filtered devices
  const savedList = printerConfig.savedDevices || [];
  const filteredDevices = savedList.filter(d => {
    const matchQuery = !searchQuery.trim() || 
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (d.macOrAddress && d.macOrAddress.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (!matchQuery) return false;

    if (deviceFilter === 'FAVORITES') return d.isFavorite;
    if (deviceFilter === '58MM') return d.paperWidthDefault === 58;
    if (deviceFilter === '80MM') return d.paperWidthDefault === 80;
    return true;
  });

  const getRssiColor = (rssi?: number) => {
    if (!rssi) return 'text-slate-400';
    if (rssi >= -60) return 'text-emerald-400';
    if (rssi >= -75) return 'text-amber-400';
    return 'text-rose-400';
  };

  const getRssiLabel = (rssi?: number) => {
    if (!rssi) return 'N/D';
    if (rssi >= -60) return `${rssi} dBm (Excellent)`;
    if (rssi >= -75) return `${rssi} dBm (Bon)`;
    return `${rssi} dBm (Faible)`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="relative bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/40 p-5 sm:p-6 border-b border-cyan-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shadow-lg">
              <Printer className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-wide">
                  Scanner & Options Bluetooth ESC/POS
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Sans Fil BLE
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Recherche d'imprimantes thermiques 58mm/80mm, filtres de détection et appairage Bluetooth
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

        {/* Navigation Sub-Tabs */}
        <div className="bg-slate-950 border-b border-slate-800/80 px-4 flex items-center gap-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('SCANNER')}
            className={`px-4 py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all shrink-0 cursor-pointer ${
              activeTab === 'SCANNER'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>Périphériques & Découverte</span>
            {savedList.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono">
                {savedList.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SCAN_OPTIONS')}
            className={`px-4 py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all shrink-0 cursor-pointer ${
              activeTab === 'SCAN_OPTIONS'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Options de Recherche Bluetooth</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PRINT_SETTINGS')}
            className={`px-4 py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all shrink-0 cursor-pointer ${
              activeTab === 'PRINT_SETTINGS'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Paramètres Impression & Papier</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('DIAGNOSTICS')}
            className={`px-4 py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all shrink-0 cursor-pointer ${
              activeTab === 'DIAGNOSTICS'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Diagnostics & Guide</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          
          {/* Global Feedback notification */}
          {feedbackMsg && (
            <div className={`p-3.5 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 animate-fadeIn ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : feedbackMsg.type === 'error'
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                : 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
            }`}>
              <div className="flex items-center gap-2">
                {feedbackMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{feedbackMsg.text}</span>
              </div>
              <button 
                type="button" 
                onClick={() => setFeedbackMsg(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* TAB 1: SCANNER & PÉRIPHÉRIQUES */}
          {activeTab === 'SCANNER' && (
            <div className="space-y-5">
              
              {/* Primary Connection Status & Scan Trigger Banner */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-cyan-500/30 space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center relative shadow-lg ${
                      printerConfig.isConnected 
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : isScanning
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 animate-pulse'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {printerConfig.isConnected ? (
                        <BluetoothConnected className="w-6 h-6" />
                      ) : isScanning ? (
                        <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
                      ) : (
                        <BluetoothOff className="w-6 h-6" />
                      )}
                      {printerConfig.isConnected && (
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-950 animate-ping"></span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-black text-white">
                          {printerConfig.bluetoothDeviceName || 'Aucune imprimante connectée'}
                        </h3>
                        {printerConfig.isConnected && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            Connecté • {printerConfig.paperWidth}mm
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {printerConfig.isConnected 
                          ? 'Prêt pour l’impression des tickets de caisse & rapports Z'
                          : 'Cliquez sur "Lancer la recherche" pour appairer votre imprimante Bluetooth'}
                      </p>
                    </div>
                  </div>

                  {/* Scan / Disconnect Buttons */}
                  <div className="flex items-center gap-2">
                    {printerConfig.isConnected ? (
                      <button
                        type="button"
                        onClick={handleDisconnect}
                        className="px-4 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all cursor-pointer"
                      >
                        Déconnecter
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleScanBluetooth}
                        disabled={isScanning}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 text-xs font-black flex items-center gap-2 shadow-lg shadow-cyan-500/25 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isScanning ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Scan en cours...</span>
                          </>
                        ) : (
                          <>
                            <Search className="w-4 h-4" />
                            <span>Lancer la recherche Bluetooth</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick Toolbar */}
                <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="px-2 py-0.5 rounded bg-slate-800 font-mono text-[10px] text-cyan-300">
                      Mode: {scanOpts.scanMode === 'POS_PRINTERS_ONLY' ? 'Imprimantes POS' : scanOpts.scanMode === 'CUSTOM_PREFIX' ? `Préfixe "${scanOpts.customNamePrefix}"` : 'Tous appareils'}
                    </span>
                    <span>• Timeout: {scanOpts.scanTimeoutSeconds}s</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddManualModal(true)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1 border border-slate-700 hover:border-slate-600 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Ajouter manuellement</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleTestPrint}
                      disabled={testPrintLoading}
                      className="px-3.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      {testPrintLoading ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <FileText className="w-3.5 h-3.5" />
                      )}
                      <span>Test Ticket ESC/POS</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Filter and Search Bar for Devices */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filtrer un périphérique..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                  <button
                    type="button"
                    onClick={() => setDeviceFilter('ALL')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      deviceFilter === 'ALL'
                        ? 'bg-cyan-500 text-slate-950 shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Tous ({savedList.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeviceFilter('FAVORITES')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                      deviceFilter === 'FAVORITES'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Star className="w-3 h-3 fill-current" />
                    Favoris
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeviceFilter('58MM')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      deviceFilter === '58MM'
                        ? 'bg-cyan-500 text-slate-950 shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    58mm
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeviceFilter('80MM')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      deviceFilter === '80MM'
                        ? 'bg-cyan-500 text-slate-950 shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    80mm
                  </button>
                </div>
              </div>

              {/* Devices Grid / List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                  <span>Périphériques Bluetooth Découverts & Enregistrés</span>
                  <span>{filteredDevices.length} périphérique(s)</span>
                </div>

                {filteredDevices.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-3">
                    <Radio className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-400">
                      {searchQuery ? 'Aucun périphérique ne correspond à votre recherche.' : 'Aucun périphérique enregistré pour le moment.'}
                    </p>
                    <button
                      type="button"
                      onClick={handleScanBluetooth}
                      className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>Lancer un scan Bluetooth</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredDevices.map((dev) => {
                      const isCurrentConnected = printerConfig.isConnected && printerConfig.bluetoothDeviceId === dev.id;
                      return (
                        <div
                          key={dev.id}
                          className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                            isCurrentConnected
                              ? 'bg-cyan-950/30 border-cyan-400 shadow-md shadow-cyan-500/10'
                              : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                isCurrentConnected
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                  : 'bg-slate-900 text-slate-400 border border-slate-800'
                              }`}>
                                <Printer className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <h4 className="text-xs font-black text-white line-clamp-1">
                                    {dev.name}
                                  </h4>
                                  {dev.isFavorite && (
                                    <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                  ID: {dev.macOrAddress || dev.id}
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => toggleFavoriteDevice(dev.id)}
                              className="text-slate-500 hover:text-amber-400 p-1 transition-colors"
                              title={dev.isFavorite ? 'Retirer des favoris' : 'Marquer comme favori'}
                            >
                              <Star className={`w-4 h-4 ${dev.isFavorite ? 'text-amber-400 fill-amber-400' : ''}`} />
                            </button>
                          </div>

                          {/* Specs & Signal */}
                          <div className="flex items-center justify-between text-[11px] py-1.5 px-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-cyan-300">
                                {dev.paperWidthDefault}mm ({dev.paperWidthDefault === 80 ? '48 cols' : '32 cols'})
                              </span>
                              <span className="text-slate-600">•</span>
                              <span className="text-slate-400 capitalize">
                                {dev.deviceType?.replace('_', ' ') || 'Imprimante POS'}
                              </span>
                            </div>

                            {dev.rssi && (
                              <div className={`flex items-center gap-1 font-mono font-bold ${getRssiColor(dev.rssi)}`}>
                                <Signal className="w-3 h-3" />
                                <span>{dev.rssi} dBm</span>
                              </div>
                            )}
                          </div>

                          {/* Card Actions */}
                          <div className="flex items-center justify-between gap-2 pt-1">
                            <span className="text-[10px] text-slate-500">
                              {dev.lastConnectedAt ? `Connecté: ${formatDateTime(dev.lastConnectedAt)}` : 'Non encore connecté'}
                            </span>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => removeBluetoothDevice(dev.id)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                title="Supprimer de la liste"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>

                              {isCurrentConnected ? (
                                <button
                                  type="button"
                                  onClick={handleDisconnect}
                                  className="px-3 py-1 rounded-lg bg-rose-500/20 text-rose-300 text-xs font-bold hover:bg-rose-500/30 transition-colors cursor-pointer"
                                >
                                  Déconnecter
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleConnectSpecificDevice(dev)}
                                  className="px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shadow-sm cursor-pointer"
                                >
                                  Connecter
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: OPTIONS DE RECHERCHE BLUETOOTH */}
          {activeTab === 'SCAN_OPTIONS' && (
            <div className="space-y-6">
              
              <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-start gap-3">
                <Sliders className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-white">Paramètres de Découverte & Filtrage Bluetooth BLE</p>
                  <p className="text-slate-300 leading-relaxed">
                    Ajustez les critères de scan pour cibler rapidement vos imprimantes de caisse (ex: POS-58, Xprinter, Sunmi) et éviter les interférences avec d'autres appareils Bluetooth aux alentours.
                  </p>
                </div>
              </div>

              {/* Mode de recherche / Scan Mode */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <label className="block text-xs font-black text-slate-200 uppercase tracking-wider">
                  1. Mode de Découverte / Filtre des Périphériques
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Option 1: POS Printers Only */}
                  <div
                    onClick={() => updateScanOptions({ scanMode: 'POS_PRINTERS_ONLY' })}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      scanOpts.scanMode === 'POS_PRINTERS_ONLY'
                        ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-bold text-cyan-300">Imprimantes POS Thermiques (Recommandé)</p>
                      {scanOpts.scanMode === 'POS_PRINTERS_ONLY' && <Check className="w-4 h-4 text-cyan-400" />}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Filtre automatiquement sur POS, MPT, RPP, Xprinter, Sunmi, Goojprt, Netum, etc.
                    </p>
                  </div>

                  {/* Option 2: All Bluetooth Devices */}
                  <div
                    onClick={() => updateScanOptions({ scanMode: 'ALL_DEVICES' })}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      scanOpts.scanMode === 'ALL_DEVICES'
                        ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-bold text-cyan-300">Tous les Appareils Bluetooth</p>
                      {scanOpts.scanMode === 'ALL_DEVICES' && <Check className="w-4 h-4 text-cyan-400" />}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Affiche tous les périphériques Bluetooth à portée sans filtrage de nom (acceptAllDevices).
                    </p>
                  </div>

                  {/* Option 3: Custom Name Prefix */}
                  <div
                    onClick={() => updateScanOptions({ scanMode: 'CUSTOM_PREFIX' })}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      scanOpts.scanMode === 'CUSTOM_PREFIX'
                        ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-bold text-cyan-300">Préfixe de Nom Personnalisé</p>
                      {scanOpts.scanMode === 'CUSTOM_PREFIX' && <Check className="w-4 h-4 text-cyan-400" />}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Ciblez une marque ou un nom spécifique configuré dans votre établissement.
                    </p>
                  </div>

                  {/* Option 4: Service UUID Target */}
                  <div
                    onClick={() => updateScanOptions({ scanMode: 'SERVICE_UUID' })}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      scanOpts.scanMode === 'SERVICE_UUID'
                        ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-bold text-cyan-300">Service GATT / UUID Spécifique</p>
                      {scanOpts.scanMode === 'SERVICE_UUID' && <Check className="w-4 h-4 text-cyan-400" />}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Recherche directe par identifiant de service ESC/POS matériel (18f0, ISSC, HM-10).
                    </p>
                  </div>
                </div>

                {/* Custom prefix input */}
                {scanOpts.scanMode === 'CUSTOM_PREFIX' && (
                  <div className="pt-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Préfixe du nom de l’imprimante (ex: POS, BAR, VIP_80, SUNMI) :
                    </label>
                    <input
                      type="text"
                      value={scanOpts.customNamePrefix || ''}
                      onChange={(e) => updateScanOptions({ customNamePrefix: e.target.value })}
                      placeholder="Ex: POS-80, XP-300, MPT..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                )}

                {/* Custom UUID input */}
                {scanOpts.scanMode === 'SERVICE_UUID' && (
                  <div className="pt-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      UUID Service GATT (128-bit) :
                    </label>
                    <input
                      type="text"
                      value={scanOpts.customServiceUuid || '000018f0-0000-1000-8000-00805f9b34fb'}
                      onChange={(e) => updateScanOptions({ customServiceUuid: e.target.value })}
                      placeholder="000018f0-0000-1000-8000-00805f9b34fb"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                )}
              </div>

              {/* Advanced Scan Timing & Chunk Size */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Scan Timeout */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Délai d'attente de recherche (Timeout)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { sec: 5, label: '5 sec' },
                      { sec: 10, label: '10 sec (Auto)' },
                      { sec: 20, label: '20 sec' }
                    ].map(t => (
                      <button
                        key={t.sec}
                        type="button"
                        onClick={() => updateScanOptions({ scanTimeoutSeconds: t.sec })}
                        className={`p-2 rounded-xl border text-center transition-all ${
                          scanOpts.scanTimeoutSeconds === t.sec
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className="text-xs">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Packet Chunk Size */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Découpage Buffer BLE (Taille Chunk)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { size: 20, label: '20 octets (BLE Safe)' },
                      { size: 100, label: '100 o (Optimal)' },
                      { size: 200, label: '200 o (Ultra)' }
                    ].map(c => (
                      <button
                        key={c.size}
                        type="button"
                        onClick={() => updateScanOptions({ chunkSize: c.size })}
                        className={`p-2 rounded-xl border text-center transition-all ${
                          scanOpts.chunkSize === c.size
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className="text-xs">{c.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* Automatic Behavior Toggles */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Automatisation & Reconnexion
                </h4>

                <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 cursor-pointer hover:border-slate-700">
                  <div className="pr-3">
                    <p className="text-xs font-bold text-white">Reconnexion Automatique au Démarrage</p>
                    <p className="text-[11px] text-slate-400">Recherche et reconnecte automatiquement la dernière imprimante active</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={scanOpts.autoReconnect}
                    onChange={(e) => updateScanOptions({ autoReconnect: e.target.checked })}
                    className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 bg-slate-800 border-slate-700"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 cursor-pointer hover:border-slate-700">
                  <div className="pr-3">
                    <p className="text-xs font-bold text-white">Activer le Simulateur d'Appareils à Proximité</p>
                    <p className="text-[11px] text-slate-400">Permet le test fluide dans les navigateurs sans Web Bluetooth matériel</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={scanOpts.includeSimulatedNearby}
                    onChange={(e) => updateScanOptions({ includeSimulatedNearby: e.target.checked })}
                    className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 bg-slate-800 border-slate-700"
                  />
                </label>
              </div>

            </div>
          )}

          {/* TAB 3: PARAMÈTRES IMPRESSION & PAPIER */}
          {activeTab === 'PRINT_SETTINGS' && (
            <div className="space-y-6">
              
              {/* Paper Width (58mm vs 80mm) */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Largeur du Rouleau Thermique ESC/POS
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => updateConfigField('paperWidth', 58)}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      printerConfig.paperWidth === 58
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <p className="text-xs font-bold">58 mm (32 colonnes)</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Format compact mobile / Terminaux POS portables</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => updateConfigField('paperWidth', 80)}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      printerConfig.paperWidth === 80
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <p className="text-xs font-bold">80 mm (48 colonnes)</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Format large / Imprimante de comptoir & bar</p>
                  </button>
                </div>
              </div>

              {/* Print Copies */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Nombre d’Exemplaires par Facture
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { count: 1, label: '1 copie', desc: 'Exemplaire Client' },
                    { count: 2, label: '2 copies', desc: 'Client + Barman' },
                    { count: 3, label: '3 copies', desc: 'Client + Bar + Compta' }
                  ].map((c) => (
                    <button
                      key={c.count}
                      type="button"
                      onClick={() => updateConfigField('printCopies', c.count)}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        printerConfig.printCopies === c.count
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-sm'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <p className="text-xs font-bold">{c.label}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{c.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Options ESC/POS & Facturation
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Auto Print */}
                  <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 cursor-pointer hover:border-slate-700">
                    <div className="pr-2">
                      <p className="text-xs font-bold text-white">Impression Automatique</p>
                      <p className="text-[10px] text-slate-400">Imprimer le ticket dès la validation du paiement</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={printerConfig.autoPrintReceipt}
                      onChange={(e) => updateConfigField('autoPrintReceipt', e.target.checked)}
                      className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 bg-slate-800 border-slate-700"
                    />
                  </label>

                  {/* Fiscal Header */}
                  <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 cursor-pointer hover:border-slate-700">
                    <div className="pr-2">
                      <p className="text-xs font-bold text-white">En-tête Fiscal RCCM & NIF</p>
                      <p className="text-[10px] text-slate-400">Afficher RCCM, NIF et adresse sur le ticket</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={printerConfig.printFiscalHeader}
                      onChange={(e) => updateConfigField('printFiscalHeader', e.target.checked)}
                      className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 bg-slate-800 border-slate-700"
                    />
                  </label>

                  {/* Paper Cut */}
                  <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 cursor-pointer hover:border-slate-700">
                    <div className="pr-2 flex items-center gap-1.5">
                      <Scissors className="w-3.5 h-3.5 text-slate-400" />
                      <div>
                        <p className="text-xs font-bold text-white">Découpe Automatique</p>
                        <p className="text-[10px] text-slate-400">Commande massicot ESC/POS GS V A</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={printerConfig.cutPaper}
                      onChange={(e) => updateConfigField('cutPaper', e.target.checked)}
                      className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 bg-slate-800 border-slate-700"
                    />
                  </label>

                  {/* Cash Drawer Kick */}
                  <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 cursor-pointer hover:border-slate-700">
                    <div className="pr-2 flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                      <div>
                        <p className="text-xs font-bold text-white">Ouverture Tiroir-Caisse</p>
                        <p className="text-[10px] text-slate-400">Impulsion 24V lors d'un règlement espèces</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={printerConfig.openCashDrawer}
                      onChange={(e) => updateConfigField('openCashDrawer', e.target.checked)}
                      className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 bg-slate-800 border-slate-700"
                    />
                  </label>
                </div>
              </div>

              {/* Link to Company Profile */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-amber-400" />
                  <div>
                    <p className="text-xs font-bold text-white">
                      Établissement : {companyProfile.name}
                    </p>
                    <p className="text-[11px] text-slate-300">
                      Coordonnées de facturation, RCCM, NIF et pied de page du ticket
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    setShowCompanyProfileModal(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1 transition-colors"
                >
                  <span>Éditer Profil</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          )}

          {/* TAB 4: DIAGNOSTICS & GUIDE */}
          {activeTab === 'DIAGNOSTICS' && (
            <div className="space-y-5">
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  <span>État du Support Web Bluetooth & Matériel</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-400">Navigateur Web Bluetooth :</span>
                    <span className={`font-bold ${isWebBluetoothSupported() ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {isWebBluetoothSupported() ? 'Disponible [OK]' : 'Non natif (Simulateur actif)'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-400">Protocole d'impression :</span>
                    <span className="font-bold text-cyan-300">ESC/POS Standard (58/80mm)</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-400">Service GATT Principal :</span>
                    <span className="font-mono text-[10px] text-slate-300">000018f0-0000-1000-8000</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-400">Imprimantes testées :</span>
                    <span className="font-bold text-white">POS-58, XP-80, Sunmi, MPT-II</span>
                  </div>
                </div>
              </div>

              {/* Step by step guide */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Guide d'appairage rapide sur Smartphone ou Tablette Android
                </h3>
                <ol className="list-decimal list-inside space-y-2 text-xs text-slate-300 leading-relaxed">
                  <li>Allumez votre imprimante thermique Bluetooth et vérifiez que le voyant bleu clignote.</li>
                  <li>Sur votre smartphone / tablette Android, ouvrez l'application dans <strong>Google Chrome</strong>.</li>
                  <li>Activez le <strong>Bluetooth</strong> et la <strong>Localisation (GPS)</strong> sur votre appareil Android (obligatoire pour autoriser le scan BLE).</li>
                  <li>Cliquez sur <strong>"Lancer la recherche Bluetooth"</strong> dans la caisse et sélectionnez votre imprimante dans la fenêtre contextuelle.</li>
                  <li>Cliquez ensuite sur <strong>"Imprimer un Ticket de Test"</strong> pour vérifier le bon alignement du papier.</li>
                </ol>
              </div>

              {/* Troubleshooting notes */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400 space-y-1.5">
                <p className="font-bold text-slate-200">En cas d'échec de détection :</p>
                <p>• Vérifiez que l'imprimante n'est pas déjà jumelée et connectée en exclusivité à un autre téléphone.</p>
                <p>• Si votre imprimante utilise un code PIN d'usine, les codes courants sont <strong>0000</strong> ou <strong>1234</strong>.</p>
                <p>• Le simulateur thermique intégré reste disponible en permanence pour prévisualiser toutes les factures en haute fidélité.</p>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-950 p-4 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
            <span>Compatible Android Chrome, WebBLE & Terminaux Mobiles</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/20 transition-all active:scale-95 cursor-pointer"
          >
            Terminé & Appliquer
          </button>
        </div>

      </div>

      {/* Sub-Modal: Add Manual Device */}
      {showAddManualModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-cyan-500/40 rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" />
                <span>Ajouter un Périphérique Bluetooth</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddManualModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nom du périphérique :</label>
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Ex: POS-58 Imprimante Bar Central"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Adresse MAC / Identifiant BLE (Optionnel) :</label>
                <input
                  type="text"
                  value={manualMac}
                  onChange={(e) => setManualMac(e.target.value)}
                  placeholder="Ex: 68:37:E9:12:4A:8B"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Largeur du rouleau :</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setManualWidth(58)}
                    className={`p-2 rounded-xl border text-center ${
                      manualWidth === 58 ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold' : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    58 mm
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualWidth(80)}
                    className={`p-2 rounded-xl border text-center ${
                      manualWidth === 80 ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold' : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    80 mm
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddManualModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-bold"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleAddManualDevice}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold shadow-md"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
