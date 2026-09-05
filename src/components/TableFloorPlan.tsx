import React, { useState } from 'react';
import { 
  Plus, Receipt, Wine, Sparkles, Clock, 
  Users, CheckCircle2, AlertCircle, Search, 
  Layers, ArrowUpRight, Edit3, Trash2, X, Save,
  UserCheck, Database, UserPlus, Filter, ChevronDown
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { Table, TableZone, TableStatus, User } from '../types';
import { ZONE_LABELS } from '../data/initialData';
import { formatFCFA, formatDateTime } from '../utils/formatters';
import { SectionClosingModal } from './SectionClosingModal';
import { BackupManagementModal } from './BackupManagementModal';

interface TableFloorPlanProps {
  onSelectTableForOrder: (tableId: string) => void;
  onSelectTableForCheckout: (tableId: string) => void;
}

const ZONE_OPTIONS: Array<{ value: TableZone; label: string }> = [
  { value: 'CARRE_PREMIUM', label: 'Carré Premium / Or' },
  { value: 'VIP_1', label: 'Salons VIP 1' },
  { value: 'VIP_2', label: 'Mezzanine VIP 2' },
  { value: 'PISTE', label: 'Piste Centrale' },
  { value: 'COMPTOIR_BAR', label: 'Comptoir Bar' },
  { value: 'TERRASSE', label: 'Terrasse Lounge' },
];

export const TableFloorPlan: React.FC<TableFloorPlanProps> = ({
  onSelectTableForOrder,
  onSelectTableForCheckout
}) => {
  const { 
    tables, 
    orders, 
    users, 
    currentUser, 
    addTable, 
    updateTable, 
    deleteTable 
  } = usePOS();

  const [selectedZone, setSelectedZone] = useState<string>('ALL');
  const [selectedServerFilter, setSelectedServerFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showServerPanel, setShowServerPanel] = useState<boolean>(true);

  // Modals
  const [isSectionClosingModalOpen, setIsSectionClosingModalOpen] = useState<boolean>(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);
  const [isTableModalOpen, setIsTableModalOpen] = useState<boolean>(false);
  const [editingTableId, setEditingTableId] = useState<string | null>(null);

  // Quick Table Assignment State
  const [assigningTableId, setAssigningTableId] = useState<string | null>(null);

  // Form State
  const [formNumber, setFormNumber] = useState<string>('');
  const [formName, setFormName] = useState<string>('');
  const [formZone, setFormZone] = useState<TableZone>('PISTE');
  const [formCapacity, setFormCapacity] = useState<string>('4');
  const [formMinSpendFCFA, setFormMinSpendFCFA] = useState<string>('');
  const [formAssignedServerId, setFormAssignedServerId] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  // Calculations
  const totalActiveRevenue = tables.reduce((acc, t) => acc + t.totalAmountFCFA, 0);
  const occupiedCount = tables.filter(t => t.status !== 'LIBRE').length;
  const freeCount = tables.filter(t => t.status === 'LIBRE').length;

  // Filter staff who can be assigned to tables (Serveurs, Barmen, Managers)
  const staffServers = users.filter(u => u.role === 'SERVEUR' || u.role === 'BARMAN' || u.role === 'MANAGER');

  // Filtered tables by Zone, Server and Search
  const filteredTables = tables.filter(t => {
    const matchesZone = selectedZone === 'ALL' || t.zone === selectedZone;
    const matchesServer = selectedServerFilter === 'ALL' || t.assignedServerId === selectedServerFilter;
    const matchesSearch = 
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.assignedServerName && t.assignedServerName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesZone && matchesServer && matchesSearch;
  });

  const getStatusBadge = (status: TableStatus) => {
    switch (status) {
      case 'LIBRE':
        return { label: 'Libre', color: 'text-gray-400 bg-gray-500/10 border-gray-500/30' };
      case 'COMMANDE_EN_ATTENTE':
        return { label: 'En attente Bar', color: 'text-amber-400 bg-amber-500/20 border-amber-500/40 animate-pulse' };
      case 'SERVI':
        return { label: 'Boissons Servies', color: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40' };
      case 'ADDITION_DEMANDEE':
        return { label: 'Addition Demandée', color: 'text-cyan-400 bg-cyan-500/20 border-cyan-500/40' };
      case 'OCCUPEE':
        return { label: 'Occupée', color: 'text-blue-400 bg-blue-500/20 border-blue-500/40' };
    }
  };

  const handleOpenAddTable = () => {
    setEditingTableId(null);
    setFormNumber(`T-${tables.length + 1}`);
    setFormName(`Table Piste ${tables.length + 1}`);
    setFormZone('PISTE');
    setFormCapacity('4');
    setFormMinSpendFCFA('');
    setFormAssignedServerId(currentUser.id);
    setFormError(null);
    setIsTableModalOpen(true);
  };

  const handleOpenEditTable = (table: Table, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTableId(table.id);
    setFormNumber(table.number);
    setFormName(table.name);
    setFormZone(table.zone);
    setFormCapacity(table.capacity.toString());
    setFormMinSpendFCFA(table.minSpendFCFA ? table.minSpendFCFA.toString() : '');
    setFormAssignedServerId(table.assignedServerId || '');
    setFormError(null);
    setIsTableModalOpen(true);
  };

  const handleQuickAssignServer = (table: Table, server: User | null, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    updateTable({
      ...table,
      assignedServerId: server ? server.id : undefined,
      assignedServerName: server ? server.name : undefined
    });
    setAssigningTableId(null);
  };

  const handleSaveTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNumber.trim() || !formName.trim()) {
      setFormError('Le numéro et le nom de la table sont obligatoires.');
      return;
    }
    const cap = parseInt(formCapacity, 10) || 4;
    const minSpend = formMinSpendFCFA ? parseFloat(formMinSpendFCFA) : undefined;
    const serverObj = users.find(u => u.id === formAssignedServerId);

    if (editingTableId) {
      const existing = tables.find(t => t.id === editingTableId);
      if (existing) {
        updateTable({
          ...existing,
          number: formNumber.trim().toUpperCase(),
          name: formName.trim(),
          zone: formZone,
          capacity: cap,
          minSpendFCFA: minSpend,
          assignedServerId: serverObj ? serverObj.id : undefined,
          assignedServerName: serverObj ? serverObj.name : undefined
        });
      }
    } else {
      addTable({
        number: formNumber.trim().toUpperCase(),
        name: formName.trim(),
        zone: formZone,
        capacity: cap,
        minSpendFCFA: minSpend,
        assignedServerId: serverObj ? serverObj.id : undefined,
        assignedServerName: serverObj ? serverObj.name : undefined
      });
    }

    setIsTableModalOpen(false);
  };

  const handleDeleteTable = (table: Table, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Confirmer la suppression de la table "${table.name}" (${table.number}) ?`)) {
      const res = deleteTable(table.id);
      if (!res.success) {
        alert(res.error || 'Impossible de supprimer cette table.');
      }
    }
  };

  return (
    <div className="space-y-5">
      
      {/* Top Nightclub Status & Fast Actions Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        
        <div className="bg-[#131625] border border-amber-500/30 p-3.5 rounded-2xl relative overflow-hidden shadow-lg shadow-amber-500/5">
          <div className="flex items-center justify-between text-xs text-amber-300 font-semibold mb-1">
            <span>TOTAL EN SALLE (EN COURS)</span>
            <Wine className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">
            {formatFCFA(totalActiveRevenue)}
          </div>
          <div className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
            <span>Addition sur {occupiedCount} table(s)</span>
          </div>
        </div>

        <div className="bg-[#131625] border border-white/10 p-3.5 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-gray-400 font-semibold mb-1">
            <span>TABLES OCCUPÉES</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-purple-300 font-mono">
            {occupiedCount} <span className="text-sm font-normal text-gray-500">/ {tables.length}</span>
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            {tables.length > 0 ? Math.round((occupiedCount / tables.length) * 100) : 0}% d'occupation
          </div>
        </div>

        <div className="bg-[#131625] border border-white/10 p-3.5 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-gray-400 font-semibold mb-1">
            <span>SERVEURS ACTIFS</span>
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
            {staffServers.length}
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            Tables réparties par staff
          </div>
        </div>

        {/* Quick Action Hub: Clôture Section & Sauvegardes */}
        <div className="bg-[#131625] border border-white/10 p-2.5 rounded-2xl flex flex-col justify-between gap-1.5">
          <button
            id="btn-open-section-closing"
            onClick={() => setIsSectionClosingModalOpen(true)}
            className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Fermeture de Section</span>
          </button>

          <button
            id="btn-open-backups-hub"
            onClick={() => setIsBackupModalOpen(true)}
            className="w-full py-1.5 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Sauvegardes & Exports</span>
          </button>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* PANEL: AFFICHER TOUS LES SERVEURS ET LEURS TABLES ASSIGNÉES               */}
      {/* ========================================================================= */}
      <div className="bg-[#131625] border border-white/10 rounded-2xl overflow-hidden shadow-lg">
        
        {/* Panel Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#171b2d] border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/30">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                <span>Tous les Serveurs & Tables Assignées</span>
                <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-white/10 text-gray-300">
                  {staffServers.length} Serveurs
                </span>
              </h2>
              <p className="text-[11px] text-gray-400 hidden sm:block">
                Visualisez la répartition des tables par serveur ou filtrez la salle d'un simple clic
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedServerFilter !== 'ALL' && (
              <button
                onClick={() => setSelectedServerFilter('ALL')}
                className="px-2.5 py-1 rounded-lg bg-amber-500 text-black text-[11px] font-bold cursor-pointer transition-all"
              >
                Réinitialiser filtre serveur
              </button>
            )}

            <button
              onClick={() => setShowServerPanel(!showServerPanel)}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all"
            >
              <span>{showServerPanel ? 'Masquer' : 'Afficher'}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showServerPanel ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Server Cards List */}
        {showServerPanel && (
          <div className="p-3.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-[#0e101a]">
            {staffServers.map((server) => {
              const assignedTables = tables.filter(t => t.assignedServerId === server.id);
              const serverActiveRevenue = assignedTables.reduce((acc, t) => acc + t.totalAmountFCFA, 0);
              const isFilterActive = selectedServerFilter === server.id;

              return (
                <div
                  key={server.id}
                  id={`server-card-${server.id}`}
                  onClick={() => setSelectedServerFilter(isFilterActive ? 'ALL' : server.id)}
                  title={`Cliquer pour afficher les ${assignedTables.length} table(s) assignée(s) à ${server.name}`}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between group/card ${
                    isFilterActive
                      ? 'bg-gradient-to-b from-amber-500/25 via-[#181d33] to-[#121524] border-amber-400 shadow-xl shadow-amber-500/20 ring-2 ring-amber-400/50'
                      : 'bg-[#151828] border-white/10 hover:border-amber-400/40 hover:bg-[#1a1f33]'
                  }`}
                >
                  <div>
                    {/* Server Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <div 
                          className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm text-white shadow ring-1 ring-white/20"
                          style={{ backgroundColor: server.avatarColor }}
                        >
                          {server.name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-1">
                            <span>{server.name}</span>
                            {server.id === currentUser.id && (
                              <span className="text-[9px] font-bold px-1 rounded bg-amber-400 text-black">
                                Vous
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-gray-400">
                            {server.role}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors ${
                          isFilterActive
                            ? 'bg-amber-400 text-black border-amber-400 font-black'
                            : assignedTables.length > 0 
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 group-hover/card:border-amber-400/50' 
                              : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                        }`}>
                          {assignedTables.length} Table(s)
                        </span>
                      </div>
                    </div>

                    {/* Assigned Tables Badges */}
                    <div className="mt-2.5">
                      <div className="flex items-center justify-between text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1.5">
                        <span>Tables assignées :</span>
                        <span className="text-[9px] lowercase font-normal text-amber-400/90 group-hover/card:underline">
                          {isFilterActive ? '● Filtre actif' : 'cliquer pour afficher'}
                        </span>
                      </div>
                      
                      {assignedTables.length === 0 ? (
                        <div className="text-[11px] text-gray-500 italic py-1">
                          Aucune table assignée
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1 max-h-[64px] overflow-y-auto pr-0.5 scrollbar-thin">
                          {assignedTables.map((t) => (
                            <span
                              key={t.id}
                              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border transition-all ${
                                isFilterActive
                                  ? 'bg-amber-500 text-black border-amber-400 shadow-sm'
                                  : t.status !== 'LIBRE'
                                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                                    : 'bg-black/30 border-white/10 text-gray-300'
                              }`}
                              title={`${t.name} (${t.status})`}
                            >
                              {t.number}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Server Revenue in Floor Plan */}
                  <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                    <span className="text-gray-400">Total en cours :</span>
                    <span className={`font-mono font-bold ${serverActiveRevenue > 0 ? 'text-amber-400' : 'text-gray-500'}`}>
                      {formatFCFA(serverActiveRevenue)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Filters, Search & Add Table */}
      <div className="space-y-2.5 bg-[#131625] p-3 rounded-2xl border border-white/10">
        
        {/* Zone Pills & Search Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Zone Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
            <button
              id="zone-filter-all"
              onClick={() => setSelectedZone('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedZone === 'ALL'
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              Toutes les Zones ({tables.length})
            </button>

            {Object.entries(ZONE_LABELS).map(([zoneKey, zoneInfo]) => {
              const countInZone = tables.filter(t => t.zone === zoneKey).length;
              const isSelected = selectedZone === zoneKey;
              return (
                <button
                  key={zoneKey}
                  id={`zone-filter-${zoneKey}`}
                  onClick={() => setSelectedZone(zoneKey)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-white text-black shadow-md'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: zoneInfo.color }} 
                  />
                  <span>{zoneInfo.label}</span>
                  <span className="text-[10px] opacity-75">({countInZone})</span>
                </button>
              );
            })}
          </div>

          {/* Search and Add Table button */}
          <div className="flex items-center gap-2">
            <div className="relative min-w-[180px]">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="search-table-input"
                type="text"
                placeholder="Rechercher table ou serveur..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#0b0d14] border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400"
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

            <button
              onClick={handleOpenAddTable}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs flex items-center gap-1.5 shadow cursor-pointer whitespace-nowrap active:scale-95 transition-all"
              title="Ajouter un salon VIP, carré ou table"
            >
              <Plus className="w-4 h-4" />
              <span>+ Ajouter Table</span>
            </button>
          </div>
        </div>

        {/* Dedicated Quick Server/Serveuse Filter Chips Row */}
        <div className="pt-2 border-t border-white/5 flex items-center gap-2 overflow-x-auto scrollbar-thin pb-0.5">
          <div className="flex items-center gap-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider shrink-0 mr-1">
            <UserCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Filtrer par Serveuse / Staff :</span>
          </div>

          <button
            onClick={() => setSelectedServerFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              selectedServerFilter === 'ALL'
                ? 'bg-amber-500 text-black shadow-sm'
                : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            Tous ({tables.length} tables)
          </button>

          {staffServers.map((server) => {
            const serverTablesCount = tables.filter(t => t.assignedServerId === server.id).length;
            const isSelected = selectedServerFilter === server.id;

            return (
              <button
                key={server.id}
                id={`btn-filter-server-pill-${server.id}`}
                onClick={() => setSelectedServerFilter(isSelected ? 'ALL' : server.id)}
                title={`Afficher les ${serverTablesCount} table(s) assignée(s) à ${server.name}`}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-amber-500 text-black border-amber-400 shadow-md scale-105'
                    : 'bg-white/5 text-gray-300 border-white/5 hover:border-white/20 hover:bg-white/10'
                }`}
              >
                <span
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] text-white font-black shrink-0"
                  style={{ backgroundColor: server.avatarColor }}
                >
                  {server.name.charAt(0)}
                </span>
                <span>{server.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isSelected
                    ? 'bg-black/30 text-white'
                    : 'bg-white/10 text-gray-300'
                }`}>
                  {serverTablesCount}
                </span>
              </button>
            );
          })}
        </div>

      </div>

      {/* Active Server Highlight Banner */}
      {selectedServerFilter !== 'ALL' && (() => {
        const activeServer = staffServers.find(s => s.id === selectedServerFilter);
        if (!activeServer) return null;
        const activeServerTables = tables.filter(t => t.assignedServerId === activeServer.id);
        const activeServerRevenue = activeServerTables.reduce((acc, t) => acc + t.totalAmountFCFA, 0);
        const occupiedCountServer = activeServerTables.filter(t => t.status !== 'LIBRE').length;

        return (
          <div className="bg-gradient-to-r from-[#191f3a] via-[#14172c] to-[#121526] border-2 border-amber-400/80 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-xl shadow-amber-500/10 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3.5">
              <div 
                className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg text-white shadow-lg shrink-0 ring-2 ring-amber-400"
                style={{ backgroundColor: activeServer.avatarColor }}
              >
                {activeServer.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-black text-white flex items-center gap-1.5">
                    <span>Tables assignées à {activeServer.name}</span>
                  </h3>
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-500 text-black shadow">
                    {activeServerTables.length} table(s) assignée(s)
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/10 text-gray-300">
                    {activeServer.role} {activeServer.phone ? `• Tél: ${activeServer.phone}` : ''}
                  </span>
                </div>
                <p className="text-xs text-gray-300 mt-1">
                  Total des additions en cours : <strong className="text-amber-400 font-mono text-sm">{formatFCFA(activeServerRevenue)}</strong>
                  {occupiedCountServer > 0 ? (
                    <span className="ml-2 text-emerald-400 font-semibold">
                      ({occupiedCountServer} table(s) occupée(s))
                    </span>
                  ) : (
                    <span className="ml-2 text-gray-400">(Toutes les tables sont libres)</span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <button
                id="btn-clear-server-filter"
                onClick={() => setSelectedServerFilter('ALL')}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Afficher Toutes les Tables ({tables.length})</span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* Tables Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredTables.map((table) => {
          const zoneInfo = ZONE_LABELS[table.zone] || { label: table.zone, color: '#888', badgeBg: 'bg-gray-500/20 text-gray-300' };
          const statusBadge = getStatusBadge(table.status);
          const isOccupied = table.status !== 'LIBRE';
          const isVIP = table.zone === 'CARRE_PREMIUM' || table.zone.startsWith('VIP');
          const isAssigningThisTable = assigningTableId === table.id;
          const assignedUser = users.find(u => u.id === table.assignedServerId);

          return (
            <div
              key={table.id}
              id={`table-card-${table.id}`}
              className={`rounded-2xl border p-4 transition-all duration-200 relative overflow-hidden flex flex-col justify-between group ${
                isOccupied
                  ? isVIP
                    ? 'bg-gradient-to-b from-[#1c192e] to-[#131422] border-amber-500/50 shadow-xl shadow-amber-500/10'
                    : 'bg-[#141726] border-white/20 shadow-lg'
                  : 'bg-[#10121d] border-white/5 opacity-90 hover:opacity-100 hover:border-white/15'
              }`}
            >
              
              {/* Card Header */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-black px-2 py-0.5 rounded-lg bg-black/40 border border-white/10 text-white">
                      {table.number}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${zoneInfo.badgeBg}`}>
                      {zoneInfo.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadge.color}`}>
                      {statusBadge.label}
                    </span>

                    {/* Quick Edit & Delete Icons */}
                    <button
                      onClick={(e) => handleOpenEditTable(table, e)}
                      className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                      title="Modifier cette table"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    
                    {!isOccupied && (
                      <button
                        onClick={(e) => handleDeleteTable(table, e)}
                        className="p-1 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Supprimer cette table"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-baseline justify-between mt-1">
                  <h3 className="font-bold text-white text-base truncate">
                    {table.name}
                  </h3>
                  <div className="flex items-center gap-1 text-gray-400 text-xs shrink-0">
                    <Users className="w-3.5 h-3.5" />
                    <span>{table.capacity}p</span>
                  </div>
                </div>

                {/* Min spend for VIP */}
                {table.minSpendFCFA && (
                  <div className="text-[11px] text-amber-400/90 font-medium mt-1">
                    Conso Min: {formatFCFA(table.minSpendFCFA)}
                  </div>
                )}
              </div>

              {/* Middle Section: Total Accumulé & Serveur Assigné */}
              <div className="my-4 py-3 px-3.5 rounded-xl bg-black/30 border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Addition en cours :</span>
                  <span className={`font-mono text-lg font-black ${table.totalAmountFCFA > 0 ? 'text-amber-400' : 'text-gray-500'}`}>
                    {formatFCFA(table.totalAmountFCFA)}
                  </span>
                </div>

                {/* Assigned Server Badge with 1-Click Filter & Quick Reassignment */}
                <div className="flex items-center justify-between text-[11px] text-gray-400 pt-2 border-t border-white/5 relative">
                  <span>Serveur :</span>
                  
                  <div className="flex items-center gap-1">
                    {table.assignedServerId ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedServerFilter(table.assignedServerId || 'ALL');
                        }}
                        title={`Cliquer pour afficher toutes les tables assignées à ${table.assignedServerName}`}
                        className="flex items-center gap-1 font-semibold text-gray-200 hover:text-amber-300 bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded-lg border border-white/10 hover:border-amber-400/50 transition-all cursor-pointer group/srv"
                      >
                        {assignedUser && (
                          <span
                            className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] text-white font-bold"
                            style={{ backgroundColor: assignedUser.avatarColor }}
                          >
                            {assignedUser.name.charAt(0)}
                          </span>
                        )}
                        <span className="group-hover/srv:underline">{table.assignedServerName}</span>
                      </button>
                    ) : (
                      <span className="text-gray-500 italic text-[10px]">Non assigné</span>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setAssigningTableId(isAssigningThisTable ? null : table.id);
                      }}
                      className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-amber-300 transition-colors cursor-pointer"
                      title="Changer le serveur assigné à cette table"
                    >
                      <ChevronDown className="w-3 h-3 opacity-75" />
                    </button>
                  </div>

                  {/* Dropdown for fast server assignment */}
                  {isAssigningThisTable && (
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-8 z-30 w-48 bg-[#181c2f] border border-white/20 rounded-xl p-1.5 shadow-2xl space-y-1 animate-in fade-in"
                    >
                      <div className="text-[10px] font-bold text-gray-400 px-2 py-1 uppercase tracking-wider">
                        Assigner un serveur :
                      </div>
                      {staffServers.map((s) => (
                        <button
                          key={s.id}
                          onClick={(e) => handleQuickAssignServer(table, s, e)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                            table.assignedServerId === s.id
                              ? 'bg-amber-500 text-black font-bold'
                              : 'text-gray-200 hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span 
                              className="w-4 h-4 rounded text-[9px] flex items-center justify-center font-bold text-white"
                              style={{ backgroundColor: s.avatarColor }}
                            >
                              {s.name.charAt(0)}
                            </span>
                            <span>{s.name}</span>
                          </div>
                          {table.assignedServerId === s.id && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </button>
                      ))}
                      <button
                        onClick={(e) => handleQuickAssignServer(table, null, e)}
                        className="w-full text-left px-2.5 py-1 rounded-lg text-[11px] text-rose-400 hover:bg-rose-500/10 cursor-pointer pt-1 border-t border-white/5"
                      >
                        Désassigner
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                
                {/* Take / Add Order */}
                <button
                  id={`btn-order-table-${table.id}`}
                  onClick={() => onSelectTableForOrder(table.id)}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-xs transition-all shadow-md shadow-amber-500/20 active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isOccupied ? 'Ajouter Boisson' : 'Commander'}</span>
                </button>

                {/* Checkout / Detail */}
                <button
                  id={`btn-checkout-table-${table.id}`}
                  disabled={!isOccupied || table.totalAmountFCFA === 0}
                  onClick={() => onSelectTableForCheckout(table.id)}
                  className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isOccupied && table.totalAmountFCFA > 0
                      ? 'bg-[#1f253d] hover:bg-[#2a3354] text-white border border-white/10 hover:border-amber-500/40 active:scale-95'
                      : 'bg-white/5 text-gray-600 border border-white/5 cursor-not-allowed opacity-50'
                  }`}
                >
                  <Receipt className="w-4 h-4 text-amber-400" />
                  <span>Facturer (FCFA)</span>
                </button>

              </div>

            </div>
          );
        })}
      </div>

      {filteredTables.length === 0 && (
        <div className="text-center py-12 bg-[#131625] rounded-2xl border border-white/10 space-y-3">
          <Wine className="w-12 h-12 text-gray-600 mx-auto mb-1" />
          <h3 className="text-base font-bold text-gray-300">
            {selectedServerFilter !== 'ALL' 
              ? `Aucune table n'est assignée à ${staffServers.find(s => s.id === selectedServerFilter)?.name || 'ce serveur'}`
              : 'Aucune table ne correspond aux critères'}
          </h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            {selectedServerFilter !== 'ALL'
              ? 'Vous pouvez assigner des tables existantes à cette serveuse en cliquant sur le menu serveur de chaque table ou afficher toutes les tables.'
              : 'Modifiez vos filtres de zone ou de serveur ou ajoutez une nouvelle table.'}
          </p>
          <div className="pt-2 flex items-center justify-center gap-2">
            <button
              onClick={() => {
                setSelectedServerFilter('ALL');
                setSelectedZone('ALL');
                setSearchQuery('');
              }}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-colors cursor-pointer"
            >
              Afficher Toutes les Tables
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit Table Modal */}
      {isTableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#131625] border border-white/15 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl text-white">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#181c2d]">
              <div className="flex items-center gap-2">
                <Wine className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-bold text-white">
                  {editingTableId ? 'Modifier la Table / Salon VIP' : 'Créer une Nouvelle Table / Salon'}
                </h2>
              </div>
              <button
                onClick={() => setIsTableModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTable} className="p-6 space-y-4">
              
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Numéro / Identifiant (Ex: VIP-1, T-12, CARRE-OR) :
                </label>
                <input
                  type="text"
                  required
                  value={formNumber}
                  onChange={(e) => setFormNumber(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#0b0d14] border border-white/10 text-sm text-white font-mono focus:border-amber-400 focus:outline-none uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Nom d'affichage (Ex: Salon Champagne, Table Piste 4) :
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#0b0d14] border border-white/10 text-sm text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Zone du Club :
                  </label>
                  <select
                    value={formZone}
                    onChange={(e) => setFormZone(e.target.value as TableZone)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0b0d14] border border-white/10 text-xs text-white focus:border-amber-400 focus:outline-none cursor-pointer"
                  >
                    {ZONE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Capacité (Places) :
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={formCapacity}
                    onChange={(e) => setFormCapacity(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#0b0d14] border border-white/10 text-sm text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Assigned Server */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Serveur Référent / Assigné :
                </label>
                <select
                  value={formAssignedServerId}
                  onChange={(e) => setFormAssignedServerId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#0b0d14] border border-white/10 text-xs text-white focus:border-amber-400 focus:outline-none cursor-pointer"
                >
                  <option value="">-- Aucun serveur assigné --</option>
                  {staffServers.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Consommation Minimum Recommandée (FCFA) - Optionnel :
                </label>
                <input
                  type="number"
                  placeholder="Ex: 100000"
                  value={formMinSpendFCFA}
                  onChange={(e) => setFormMinSpendFCFA(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#0b0d14] border border-white/10 text-sm text-white font-mono focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTableModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-1.5 shadow cursor-pointer active:scale-95 transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>Enregistrer la Table</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Section Closing Modal */}
      <SectionClosingModal
        isOpen={isSectionClosingModalOpen}
        onClose={() => setIsSectionClosingModalOpen(false)}
      />

      {/* Full Backup Management Modal */}
      <BackupManagementModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
      />

    </div>
  );
};
