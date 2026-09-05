import React, { useState } from 'react';
import { 
  X, Database, Download, Upload, RefreshCw, 
  CheckCircle2, AlertCircle, FileSpreadsheet, 
  Clock, Shield, ArrowUpRight, Sparkles, Trash2,
  Calendar, Layers, Save, HardDrive
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { DailyBackupSnapshot } from '../types';
import { formatFCFA, formatDateTime, formatDateShort } from '../utils/formatters';
import { exportDailyZReportPDF } from '../utils/pdfGenerator';
import confetti from 'canvas-confetti';

interface BackupManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BackupManagementModal: React.FC<BackupManagementModalProps> = ({
  isOpen,
  onClose
}) => {
  const { 
    currentUser,
    payments,
    orders,
    tables,
    products,
    stockMovements,
    archivedDailyBackups,
    sectionClosings,
    companyProfile,
    getDailyReport,
    createFullSystemBackup,
    restoreFromBackupSnapshot,
    saveEndOfDayClosing,
    exportFullBackupJSON,
    exportDailyBackupJSON,
    exportSalesCSV,
    importBackupJSON,
    deleteArchivedBackup
  } = usePOS();

  const [backupNotes, setBackupNotes] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'MANAGE' | 'HISTORY'>('MANAGE');

  if (!isOpen) return null;

  const totalRevenue = payments.reduce((acc, p) => acc + p.totalPaidFCFA, 0);

  const handleCreateInstantBackup = () => {
    try {
      const snap = createFullSystemBackup(backupNotes || 'Sauvegarde manuelle complète');
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      setStatusMessage({
        type: 'success',
        text: `Sauvegarde intégrale créée avec succès (${snap.id}) ! Données sécurisées localement.`
      });
      setBackupNotes('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatusMessage({ type: 'error', text: `Erreur: ${msg}` });
    }
  };

  const handleExportJSON = () => {
    try {
      exportFullBackupJSON();
      setStatusMessage({
        type: 'success',
        text: 'Fichier JSON de sauvegarde intégrale téléchargé avec succès !'
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatusMessage({ type: 'error', text: `Erreur de téléchargement: ${msg}` });
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        try {
          const parsed = JSON.parse(content);
          if (parsed.data && parsed.version) {
            // Full system backup snapshot
            const res = restoreFromBackupSnapshot(parsed);
            setStatusMessage({ type: res.success ? 'success' : 'error', text: res.message });
          } else {
            // Daily or standard backup
            const res = importBackupJSON(content);
            setStatusMessage({ type: res.success ? 'success' : 'error', text: res.message });
          }
        } catch {
          const res = importBackupJSON(content);
          setStatusMessage({ type: res.success ? 'success' : 'error', text: res.message });
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExportSnapshotPDF = (snap: DailyBackupSnapshot) => {
    try {
      const report = getDailyReport(snap.backupDate);
      exportDailyZReportPDF(report, companyProfile, snap.backupDate);
      setStatusMessage({
        type: 'success',
        text: `Rapport Z du ${formatDateShort(snap.backupDate)} téléchargé en PDF avec succès !`
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatusMessage({ type: 'error', text: `Erreur PDF: ${msg}` });
    }
  };

  const handleRestorePoint = (snapshotId: string) => {
    if (window.confirm(`Confirmer la restauration du point de sauvegarde "${snapshotId}" ?`)) {
      const res = restoreFromBackupSnapshot(snapshotId);
      setStatusMessage({ type: res.success ? 'success' : 'error', text: res.message });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#121522] border border-white/15 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl text-white">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#171b2e]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">Centre de Sauvegarde & Restauration</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Système Complet
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Sauvegardes intégrales instantanées, exports JSON hors-ligne, fin de journée et restauration
              </p>
            </div>
          </div>
          
          <button
            id="close-backup-modal"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-white/10 bg-[#131625]">
          <button
            onClick={() => setActiveTab('MANAGE')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'MANAGE'
                ? 'bg-[#181c2f] text-emerald-400 border-t-2 border-emerald-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>Options de Sauvegarde & Export</span>
          </button>

          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'HISTORY'
                ? 'bg-[#181c2f] text-emerald-400 border-t-2 border-emerald-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Points de Restauration ({archivedDailyBackups.length})</span>
          </button>
        </div>

        {/* Status notice */}
        {statusMessage && (
          <div className={`mx-6 mt-4 p-3 rounded-xl border text-xs flex items-center justify-between ${
            statusMessage.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}>
            <span>{statusMessage.text}</span>
            <button onClick={() => setStatusMessage(null)} className="text-gray-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {activeTab === 'MANAGE' ? (
            <div className="space-y-6">
              
              {/* Current System State Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-[#161a2b] border border-white/10">
                  <div className="text-[11px] text-gray-400 uppercase font-bold">Recettes en Base</div>
                  <div className="text-lg font-black text-amber-400 font-mono mt-0.5">
                    {formatFCFA(totalRevenue)}
                  </div>
                  <div className="text-[10px] text-gray-500">{payments.length} paiements</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#161a2b] border border-white/10">
                  <div className="text-[11px] text-gray-400 uppercase font-bold">Catalogue & Stocks</div>
                  <div className="text-lg font-black text-purple-300 font-mono mt-0.5">
                    {products.length} articles
                  </div>
                  <div className="text-[10px] text-gray-500">{stockMovements.length} mouvements</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#161a2b] border border-white/10">
                  <div className="text-[11px] text-gray-400 uppercase font-bold">Tables & Salons</div>
                  <div className="text-lg font-black text-emerald-400 font-mono mt-0.5">
                    {tables.length} tables
                  </div>
                  <div className="text-[10px] text-gray-500">{sectionClosings.length} sections clôturées</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#161a2b] border border-white/10">
                  <div className="text-[11px] text-gray-400 uppercase font-bold">Archives Déjà Créées</div>
                  <div className="text-lg font-black text-cyan-300 font-mono mt-0.5">
                    {archivedDailyBackups.length} points
                  </div>
                  <div className="text-[10px] text-gray-500">Prêtes à restaurer</div>
                </div>
              </div>

              {/* Action 1: Instant Full Backup Snapshot */}
              <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-[#161928] border border-emerald-500/30 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-emerald-300 flex items-center gap-2">
                      <Save className="w-4 h-4" />
                      <span>1. Créer un Point de Sauvegarde Intégrale Instantané</span>
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      Enregistre une copie instantanée de toutes les tables, commandes, stocks, clôtures et paramètres dans la mémoire du système.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <input
                    type="text"
                    placeholder="Libellé ou note (ex: Avant inventaire de nuit, Fin de week-end...)"
                    value={backupNotes}
                    onChange={(e) => setBackupNotes(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-[#0d0f17] border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400"
                  />
                  <button
                    id="btn-create-instant-backup"
                    onClick={handleCreateInstantBackup}
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                  >
                    <Save className="w-4 h-4" />
                    <span>Sauvegarder Maintenant</span>
                  </button>
                </div>
              </div>

              {/* Action 2 & 3: Export JSON & Import JSON */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Export JSON */}
                <div className="p-5 rounded-3xl bg-[#161a2c] border border-white/10 space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm mb-1">
                      <Download className="w-4 h-4" />
                      <span>2. Exporter Fichier de Sauvegarde JSON</span>
                    </div>
                    <p className="text-xs text-gray-400">
                      Téléchargez un fichier autonome <code className="text-cyan-300">.json</code> sur votre ordinateur ou clé USB contenant l'intégralité du POS.
                    </p>
                  </div>

                  <button
                    id="btn-download-full-backup-json"
                    onClick={handleExportJSON}
                    className="w-full py-3 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Télécharger Sauvegarde (.JSON)</span>
                  </button>
                </div>

                {/* Import JSON */}
                <div className="p-5 rounded-3xl bg-[#161a2c] border border-white/10 space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-sm mb-1">
                      <Upload className="w-4 h-4" />
                      <span>3. Restaurer depuis un Fichier JSON</span>
                    </div>
                    <p className="text-xs text-gray-400">
                      Importez un fichier de sauvegarde précédemment exporté pour recharger toutes les données du système.
                    </p>
                  </div>

                  <label className="w-full py-3 px-4 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer">
                    <Upload className="w-4 h-4" />
                    <span>Sélectionner Fichier JSON à Restaurer</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportFile}
                      className="hidden"
                    />
                  </label>
                </div>

              </div>

              {/* Action 4: CSV Export for Accounting / Excel */}
              <div className="p-4 rounded-2xl bg-[#141726] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Export Comptable Excel / CSV</h4>
                    <p className="text-[11px] text-gray-400">Générez un tableau détaillé des encaissements prêt pour Excel</p>
                  </div>
                </div>

                <button
                  onClick={() => exportSalesCSV('DAILY', new Date().toISOString().split('T')[0])}
                  className="px-4 py-2 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exporter CSV du Jour</span>
                </button>
              </div>

            </div>
          ) : (
            /* History & Restore Points */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">
                  Points de Sauvegarde & Clôtures Journalières Archivées
                </h3>
                <span className="text-xs text-gray-400">{(archivedDailyBackups || []).length} archive(s)</span>
              </div>

              {(!archivedDailyBackups || archivedDailyBackups.length === 0) ? (
                <div className="text-center py-12 bg-[#161928] rounded-2xl border border-white/10 text-gray-400">
                  <Database className="w-10 h-10 mx-auto mb-2 text-gray-600" />
                  <p className="text-sm font-bold text-gray-300">Aucun point de sauvegarde archivé.</p>
                  <p className="text-xs text-gray-500 mt-1">Créez votre premier point dans l'onglet "Options de Sauvegarde".</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(archivedDailyBackups || []).map((snap) => (
                    <div 
                      key={snap.id}
                      className="p-4 rounded-2xl bg-[#161a2c] border border-white/10 hover:border-emerald-500/40 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">Date: {snap.backupDate}</span>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-black/40 text-emerald-300 border border-emerald-500/30">
                            {snap.id}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 flex flex-wrap items-center gap-3">
                          <span>Auteur: <strong className="text-gray-200">{snap.authorName}</strong> ({snap.authorRole})</span>
                          <span>•</span>
                          <span>Créé le: {formatDateTime(snap.createdAt)}</span>
                          <span>•</span>
                          <span>{snap.totalOrdersCount} commandes traitées</span>
                        </div>
                        {snap.notes && (
                          <div className="text-xs text-emerald-300/80 italic pt-0.5">
                            "{snap.notes}"
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3 self-end md:self-center">
                        <div className="text-right">
                          <div className="text-xs text-gray-400">Recette Archivée</div>
                          <div className="font-mono font-black text-base text-amber-400">
                            {formatFCFA(snap.totalRevenueFCFA)}
                          </div>
                        </div>

                        <button
                          onClick={() => handleExportSnapshotPDF(snap)}
                          title="Télécharger le rapport Z complet de cette clôture en PDF"
                          className="p-2.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 transition-all cursor-pointer"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleRestorePoint(snap.id)}
                          title="Restaurer cet état de caisse"
                          className="px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Restaurer</span>
                        </button>

                        <button
                          onClick={() => deleteArchivedBackup(snap.id)}
                          title="Supprimer cette archive"
                          className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-white/10 bg-[#171a2d] flex items-center justify-between text-xs text-gray-400">
          <span>Toutes les sauvegardes sont chiffrées localement et prêtes pour le service hors-ligne</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold cursor-pointer transition-all"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
};
