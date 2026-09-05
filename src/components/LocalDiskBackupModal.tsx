import React, { useState, useEffect } from 'react';
import { 
  Folder, FolderCheck, HardDrive, FileJson, Download, Upload, 
  Clock, ShieldCheck, Check, AlertCircle, Trash2, RefreshCw, 
  Settings, X, Sparkles, Database, Save, ArrowDownToLine,
  CheckCircle2, Laptop
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { DiskBackupFileInfo } from '../types';

interface LocalDiskBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LocalDiskBackupModal: React.FC<LocalDiskBackupModalProps> = ({ isOpen, onClose }) => {
  const {
    diskBackupConfig,
    updateDiskBackupConfig,
    diskBackupFiles,
    isDiskBackupRunning,
    saveBackupToDiskNow,
    refreshDiskBackupFiles,
    pickCustomDiskFolder,
    restoreFromDiskBackup,
    deleteDiskBackupFile,
    downloadDiskBackupFile,
    importBackupJSON,
    companyProfile,
    payments
  } = usePOS();

  const [activeTab, setActiveTab] = useState<'FILES' | 'SETTINGS' | 'IMPORT'>('FILES');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedFileForRestore, setSelectedFileForRestore] = useState<DiskBackupFileInfo | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [backupNotes, setBackupNotes] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  useEffect(() => {
    if (isOpen) {
      refreshDiskBackupFiles();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setErrorMessage(msg);
      setSuccessMessage(null);
    } else {
      setSuccessMessage(msg);
      setErrorMessage(null);
    }
    setTimeout(() => {
      setSuccessMessage(null);
      setErrorMessage(null);
    }, 4500);
  };

  const handleCreateInstantBackup = async () => {
    setIsCreatingBackup(true);
    try {
      const res = await saveBackupToDiskNow(backupNotes || 'Sauvegarde manuelle disque', 'MANUAL');
      if (res.success) {
        showNotification(`Fichier ${res.fileName} (${res.sizeFormatted}) enregistré dans le dossier local !`);
        setBackupNotes('');
      } else {
        showNotification(res.error || "Erreur lors de l'enregistrement", true);
      }
    } catch (err: any) {
      showNotification(err.message || 'Erreur inconnue', true);
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handlePickDirectory = async () => {
    try {
      const res = await pickCustomDiskFolder();
      if (res.success) {
        showNotification(`Dossier local connecté : ${res.folderName}`);
        refreshDiskBackupFiles();
      } else if (res.error) {
        showNotification(res.error, true);
      }
    } catch (err: any) {
      showNotification(err.message || 'Erreur lors de la sélection du dossier', true);
    }
  };

  const handleConfirmRestore = async () => {
    if (!selectedFileForRestore) return;
    setIsRestoring(true);
    try {
      const res = await restoreFromDiskBackup(selectedFileForRestore.fileName);
      if (res.success) {
        showNotification(res.message);
        setSelectedFileForRestore(null);
      } else {
        showNotification(res.message, true);
      }
    } catch (err: any) {
      showNotification(err.message || 'Erreur de restauration', true);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDeleteFile = async (fileName: string) => {
    if (window.confirm(`Supprimer définitivement le fichier "${fileName}" du dossier disque local ?`)) {
      const ok = await deleteDiskBackupFile(fileName);
      if (ok) {
        showNotification(`Fichier "${fileName}" supprimé.`);
      } else {
        showNotification(`Impossible de supprimer le fichier.`, true);
      }
    }
  };

  const handleFileDropOrSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const res = importBackupJSON(text);
        if (res.success) {
          showNotification(res.message);
          setActiveTab('FILES');
        } else {
          showNotification(res.message, true);
        }
      } catch (err: any) {
        showNotification(`Fichier JSON invalide: ${err.message}`, true);
      }
    };
    reader.readAsText(file);
  };

  const formatFCFA = (amount: number) => {
    return `${amount.toLocaleString('fr-FR')} FCFA`;
  };

  const formatDateTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return iso;
    }
  };

  const filteredFiles = diskBackupFiles.filter(f => {
    if (filterType === 'ALL') return true;
    return f.backupType === filterType;
  });

  return (
    <div id="local-disk-backup-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div 
        id="local-disk-backup-modal-container"
        className="relative w-full max-w-3xl bg-[#0c1021] border border-white/10 rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="relative p-5 border-b border-white/10 bg-gradient-to-r from-[#11162d] via-[#161c3b] to-[#11162d] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-inner">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-wide">
                  Dossier de Sauvegarde Automatique (.JSON)
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  Disque Local
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Archivage automatique et continu des données de caisse sur le disque de l'appareil
              </p>
            </div>
          </div>
          <button
            id="btn-close-disk-backup-modal"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Notifications */}
        {successMessage && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-300 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span className="font-semibold">{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-300 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        {/* Disk Folder Status Banner */}
        <div className="mx-5 mt-4 p-4 rounded-xl bg-[#131936] border border-cyan-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FolderCheck className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Emplacement Actif sur le Disque :
              </span>
            </div>
            <p className="text-xs font-mono text-cyan-200 break-all bg-black/30 px-2.5 py-1 rounded-lg border border-white/5">
              {diskBackupConfig.folderPathOrName || "Disque Local Sécurisé de l'Appareil (OPFS) / ClubPOS_Sauvegardes_JSON"}
            </p>
            <div className="flex items-center gap-3 text-[11px] text-gray-400">
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                {diskBackupConfig.autoBackupEnabled && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                )}
                <ShieldCheck className="w-3.5 h-3.5" />
                {diskBackupConfig.autoBackupEnabled 
                  ? (diskBackupConfig.intervalMinutes === 1 ? 'Sauvegarde auto active (À chaque minute - 60s)' : `Sauvegarde auto active (Toutes les ${diskBackupConfig.intervalMinutes} min)`)
                  : 'Sauvegarde automatique en pause'}
              </span>
              <span>•</span>
              <span>{diskBackupFiles.length} fichier(s) .JSON archivé(s)</span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <button
              id="btn-pick-custom-disk-folder"
              onClick={handlePickDirectory}
              className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center justify-center gap-1.5 border border-white/10 transition-colors cursor-pointer"
              title="Choisir un dossier spécifique sur votre ordinateur ou clé USB"
            >
              <Folder className="w-3.5 h-3.5 text-cyan-400" />
              <span>Changer le Dossier</span>
            </button>
            <button
              id="btn-create-instant-backup-disk"
              disabled={isCreatingBackup || isDiskBackupRunning}
              onClick={handleCreateInstantBackup}
              className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isCreatingBackup ? 'Enregistrement...' : 'Sauvegarder Maintenant'}</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-5 pt-4 border-b border-white/10 text-xs font-medium">
          <button
            id="tab-disk-files"
            onClick={() => setActiveTab('FILES')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'FILES'
                ? 'border-cyan-400 text-cyan-300 font-bold'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <FileJson className="w-3.5 h-3.5" />
            <span>Fichiers .JSON du Dossier ({diskBackupFiles.length})</span>
          </button>

          <button
            id="tab-disk-settings"
            onClick={() => setActiveTab('SETTINGS')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'SETTINGS'
                ? 'border-cyan-400 text-cyan-300 font-bold'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Automatisation & Fréquence</span>
          </button>

          <button
            id="tab-disk-import"
            onClick={() => setActiveTab('IMPORT')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'IMPORT'
                ? 'border-cyan-400 text-cyan-300 font-bold'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Importer un Fichier Externe</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: FILES LIST */}
          {activeTab === 'FILES' && (
            <div className="space-y-4">
              {/* Quick Filter & Refresh */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-400">Filtrer :</span>
                  <select
                    id="filter-disk-backup-type"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="bg-[#12162a] border border-white/15 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="ALL">Tous les types ({diskBackupFiles.length})</option>
                    <option value="SHIFT_CLOSING">Clôtures de Caisse (Z)</option>
                    <option value="AUTO_INTERVAL">Sauvegardes Périodiques</option>
                    <option value="MANUAL">Sauvegardes Manuelles</option>
                    <option value="BEFORE_RESET">Avant Réinitialisation</option>
                  </select>
                </div>

                <button
                  id="btn-refresh-disk-backups"
                  onClick={() => refreshDiskBackupFiles()}
                  className="text-xs text-gray-400 hover:text-cyan-300 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Actualiser la liste</span>
                </button>
              </div>

              {/* Files Table / Empty state */}
              {filteredFiles.length === 0 ? (
                <div className="p-8 rounded-2xl bg-[#101426] border border-white/5 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 mx-auto flex items-center justify-center">
                    <FileJson className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Aucun fichier .JSON trouvé</h4>
                    <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
                      Cliquez sur "Sauvegarder Maintenant" pour générer votre premier fichier de sauvegarde .JSON dans le dossier local du disque.
                    </p>
                  </div>
                  <button
                    onClick={handleCreateInstantBackup}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Créer le Premier Fichier .JSON</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredFiles.map((file) => (
                    <div
                      key={file.fileName}
                      className="p-3.5 rounded-xl bg-[#12172f] border border-white/10 hover:border-cyan-500/30 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
                          <FileJson className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-mono font-bold text-white break-all">
                              {file.fileName}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              file.backupType === 'SHIFT_CLOSING'
                                ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                                : file.backupType === 'AUTO_INTERVAL'
                                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                                : file.backupType === 'BEFORE_RESET'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            }`}>
                              {file.backupType === 'SHIFT_CLOSING' ? 'Clôture Z'
                                : file.backupType === 'AUTO_INTERVAL' ? 'Auto Périodique'
                                : file.backupType === 'BEFORE_RESET' ? 'Avant Reset'
                                : 'Manuel'}
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-400 mt-1">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-gray-500" />
                              {formatDateTime(file.savedAt)}
                            </span>
                            <span>•</span>
                            <span className="text-cyan-300 font-mono">{file.formattedSize}</span>
                            {file.totalRevenueFCFA > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-amber-400 font-bold">{formatFCFA(file.totalRevenueFCFA)}</span>
                              </>
                            )}
                            {file.ordersCount > 0 && (
                              <>
                                <span>•</span>
                                <span>{file.ordersCount} cmd(s)</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <button
                          id={`btn-restore-${file.fileName}`}
                          onClick={() => setSelectedFileForRestore(file)}
                          className="px-2.5 py-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 text-xs font-semibold border border-purple-500/30 flex items-center gap-1 transition-colors cursor-pointer"
                          title="Restaurer l'état complet du système depuis ce fichier"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Restaurer</span>
                        </button>

                        <button
                          id={`btn-download-${file.fileName}`}
                          onClick={() => downloadDiskBackupFile(file.fileName)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
                          title="Télécharger une copie externe de ce fichier .JSON"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        <button
                          id={`btn-delete-${file.fileName}`}
                          onClick={() => handleDeleteFile(file.fileName)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 border border-rose-500/20 transition-colors cursor-pointer"
                          title="Supprimer définitivement ce fichier du dossier local"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SETTINGS & AUTOMATION */}
          {activeTab === 'SETTINGS' && (
            <div className="space-y-4">
              <div className="bg-[#12162a] p-4 rounded-2xl border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-sm font-bold text-white">Sauvegarde Automatique Continue</span>
                    <p className="text-xs text-gray-400">
                      Génère périodiquement un fichier .JSON horodaté sans interrompre les serveurs ou caissiers
                    </p>
                  </div>
                  <input
                    id="toggle-auto-backup"
                    type="checkbox"
                    checked={diskBackupConfig.autoBackupEnabled}
                    onChange={(e) => updateDiskBackupConfig({ autoBackupEnabled: e.target.checked })}
                    className="w-5 h-5 accent-cyan-500 rounded cursor-pointer"
                  />
                </div>

                <div className="pt-3 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-300">
                      Fréquence de sauvegarde automatique
                    </label>
                    <select
                      id="select-auto-backup-interval"
                      value={diskBackupConfig.intervalMinutes}
                      disabled={!diskBackupConfig.autoBackupEnabled}
                      onChange={(e) => updateDiskBackupConfig({ intervalMinutes: Number(e.target.value) })}
                      className="w-full bg-[#0a0d1a] border border-white/15 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white disabled:opacity-50 focus:outline-none"
                    >
                      <option value={1}>À chaque minute (1 min - Enregistrement continu)</option>
                      <option value={2}>Toutes les 2 minutes</option>
                      <option value={5}>Toutes les 5 minutes</option>
                      <option value={10}>Toutes les 10 minutes</option>
                      <option value={15}>Toutes les 15 minutes</option>
                      <option value={30}>Toutes les 30 minutes</option>
                      <option value={60}>Toutes les heures</option>
                      <option value={0}>Désactivé (sauvegarde à la clôture uniquement)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-300">
                      Conservation max des archives
                    </label>
                    <select
                      id="select-auto-backup-max-files"
                      value={diskBackupConfig.maxFilesToKeep}
                      onChange={(e) => updateDiskBackupConfig({ maxFilesToKeep: Number(e.target.value) })}
                      className="w-full bg-[#0a0d1a] border border-white/15 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    >
                      <option value={60}>60 derniers fichiers (1 heure à 1 min)</option>
                      <option value={120}>120 derniers fichiers (2 heures - Recommandé)</option>
                      <option value={240}>240 derniers fichiers (4 heures)</option>
                      <option value={500}>500 fichiers (archivage étendu)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10 space-y-3">
                  <label className="flex items-center gap-2.5 text-xs text-gray-300 cursor-pointer">
                    <input
                      id="toggle-backup-on-shift"
                      type="checkbox"
                      checked={diskBackupConfig.backupOnShiftClosing}
                      onChange={(e) => updateDiskBackupConfig({ backupOnShiftClosing: e.target.checked })}
                      className="w-4 h-4 accent-cyan-500 rounded"
                    />
                    <span>
                      Sauvegarder automatiquement un fichier .JSON lors de chaque <strong>Clôture de Caisse (Rapport Z)</strong>
                    </span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-gray-300 cursor-pointer">
                    <input
                      id="toggle-backup-before-reset"
                      type="checkbox"
                      checked={diskBackupConfig.backupBeforeReset}
                      onChange={(e) => updateDiskBackupConfig({ backupBeforeReset: e.target.checked })}
                      className="w-4 h-4 accent-cyan-500 rounded"
                    />
                    <span>
                      Sauvegarde de sécurité automatique obligatoire avant toute <strong>Remise à Zéro des Ventes</strong>
                    </span>
                  </label>
                </div>
              </div>

              {/* Physical Storage Details */}
              <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                  <HardDrive className="w-4 h-4" />
                  <span>Architecture de Stockage Disque Local :</span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Le système utilise une double écriture directe : les fichiers <code>.JSON</code> sont enregistrés dans le <strong>disque dur physique ou SSD local de l'appareil</strong> (via l'Origin Private File System et le dossier local connecté). Les fichiers restent intacts même en coupure de courant, sans Internet et sans téléchargement manuel.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: IMPORT EXTERNAL FILE */}
          {activeTab === 'IMPORT' && (
            <div className="space-y-4">
              <div className="p-6 rounded-2xl bg-[#12162a] border-2 border-dashed border-white/20 hover:border-cyan-400 text-center space-y-3 transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 mx-auto flex items-center justify-center">
                  <ArrowDownToLine className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Importer un fichier .JSON depuis le disque</h4>
                  <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                    Sélectionnez un fichier .JSON de sauvegarde sauvegardé sur une clé USB, un autre ordinateur ou un disque externe.
                  </p>
                </div>

                <label className="inline-block">
                  <input
                    id="input-file-import-json"
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileDropOrSelect}
                    className="hidden"
                  />
                  <span className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Sélectionner le Fichier .JSON</span>
                  </span>
                </label>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-200">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p>
                  <strong>Attention :</strong> L'importation d'une sauvegarde restaure les tables, produits, commandes, paiements et profils enregistrés dans ce fichier.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Restore Confirmation Modal Layer */}
        {selectedFileForRestore && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#12162e] border border-purple-500/40 rounded-2xl p-5 max-w-md w-full space-y-4 shadow-2xl">
              <div className="flex items-center gap-2.5 text-purple-300">
                <RefreshCw className="w-5 h-5 text-purple-400" />
                <h4 className="text-sm font-bold text-white">Confirmer la Restauration</h4>
              </div>

              <p className="text-xs text-gray-300 leading-relaxed">
                Voulez-vous restaurer l'état complet du système à partir du fichier :
              </p>

              <div className="bg-black/40 p-3 rounded-xl border border-white/10 font-mono text-xs text-cyan-300 break-all">
                {selectedFileForRestore.fileName}
              </div>

              <div className="text-[11px] text-gray-400 space-y-1 bg-white/5 p-3 rounded-xl">
                <div>Date : <strong>{formatDateTime(selectedFileForRestore.savedAt)}</strong></div>
                <div>Taille : <strong>{selectedFileForRestore.formattedSize}</strong></div>
                <div>Recette enregistrée : <strong>{formatFCFA(selectedFileForRestore.totalRevenueFCFA)}</strong></div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setSelectedFileForRestore(null)}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-gray-300 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  disabled={isRestoring}
                  onClick={handleConfirmRestore}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer shadow-lg shadow-purple-600/30"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isRestoring ? 'Restauration...' : 'Restaurer Maintenant'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-[#090d1c] flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Dossier local actif & synchronisé</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium cursor-pointer transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
