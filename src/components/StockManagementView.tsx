import React, { useState } from 'react';
import { 
  Package, AlertTriangle, ArrowUpRight, ArrowDownRight, 
  Plus, Minus, Search, Filter, History, Wine, RefreshCw, 
  CheckCircle2, AlertCircle, Sparkles, X, ShieldAlert,
  Edit3, Trash2, Save, DollarSign, Layers, Check, HelpCircle,
  FileSpreadsheet, Download
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { Product, ProductCategory, SaleFormat, StockMovement } from '../types';
import { formatFCFA, formatDateTime, formatDateShort, formatFullDateTime, soundManager } from '../utils/formatters';
import { exportInventoryPDF } from '../utils/pdfGenerator';

const CATEGORY_OPTIONS: Array<{ value: ProductCategory; label: string }> = [
  { value: 'CHAMPAGNE', label: 'Champagne' },
  { value: 'SPIRITUEUX', label: 'Spiritueux & Whiskies' },
  { value: 'COCKTAILS', label: 'Cocktails Signature' },
  { value: 'BIERES', label: 'Bières' },
  { value: 'SOFTS_ENERGY', label: 'Softs & Energy Drinks' },
  { value: 'PACKS_VIP', label: 'Packs VIP Nightclub' },
  { value: 'CHICHAS', label: 'Chichas & Parfums' },
];

const FORMAT_OPTIONS: Array<{ value: SaleFormat; label: string }> = [
  { value: 'BOUTEILLE', label: 'Bouteille (75cl / 70cl)' },
  { value: 'MAGNUM', label: 'Magnum (1.5L / 3L)' },
  { value: 'VERRE_DOSE', label: 'Verre / Dose (Shot / Tumbler)' },
  { value: 'CANETTE', label: 'Canette (33cl / 25cl)' },
  { value: 'PACK', label: 'Pack VIP / Seau de Glace' },
  { value: 'UNITE', label: 'Unité (Chicha, Snack)' },
];

export const StockManagementView: React.FC = () => {
  const { 
    products, 
    stockMovements, 
    restockProduct, 
    recordStockLoss, 
    quickAdjustStock,
    addProduct, 
    updateProduct, 
    deleteProduct, 
    currentUser,
    companyProfile 
  } = usePOS();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [showLowStockOnly, setShowLowStockOnly] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'INVENTORY' | 'MOVEMENTS'>('INVENTORY');

  // Quick adjustment toast/feedback state
  const [lastAdjustedId, setLastAdjustedId] = useState<{ id: string; delta: number; time: number } | null>(null);

  // Delete Confirmation Modal State
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);

  // Restock Modal State
  const [isRestockModalOpen, setIsRestockModalOpen] = useState<boolean>(false);
  const [selectedProductForRestock, setSelectedProductForRestock] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState<string>('12');
  const [restockReason, setRestockReason] = useState<string>('Livraison Fournisseur / Brasserie');

  // Loss Modal State
  const [isLossModalOpen, setIsLossModalOpen] = useState<boolean>(false);
  const [selectedProductForLoss, setSelectedProductForLoss] = useState<Product | null>(null);
  const [lossQty, setLossQty] = useState<string>('1');
  const [lossReason, setLossReason] = useState<string>('Bouteille cassée en salle');

  // Product Add / Edit Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState<boolean>(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  
  // Product Form Fields
  const [formName, setFormName] = useState<string>('');
  const [formCategory, setFormCategory] = useState<ProductCategory>('CHAMPAGNE');
  const [formPriceFCFA, setFormPriceFCFA] = useState<string>('50000');
  const [formCostPriceFCFA, setFormCostPriceFCFA] = useState<string>('30000');
  const [formFormat, setFormFormat] = useState<SaleFormat>('BOUTEILLE');
  const [formVolumeCl, setFormVolumeCl] = useState<string>('75');
  const [formCurrentStock, setFormCurrentStock] = useState<string>('10');
  const [formMinThreshold, setFormMinThreshold] = useState<string>('3');
  const [formBadge, setFormBadge] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formIsAlcoholic, setFormIsAlcoholic] = useState<boolean>(true);
  const [productFormError, setProductFormError] = useState<string | null>(null);

  const totalStockUnits = products.reduce((acc, p) => acc + p.currentStock, 0);
  const totalStockValueFCFA = products.reduce((acc, p) => acc + (p.costPriceFCFA * p.currentStock), 0);
  const lowStockProducts = products.filter(p => p.currentStock <= p.minStockThreshold);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.categoryName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
    const matchesLowStock = !showLowStockOnly || p.currentStock <= p.minStockThreshold;
    return matchesSearch && matchesCategory && matchesLowStock;
  });

  const handleQuickAdjust = (product: Product, delta: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (product.currentStock + delta < 0) return;

    quickAdjustStock(product.id, delta);
    setLastAdjustedId({ id: product.id, delta, time: Date.now() });

    setTimeout(() => {
      setLastAdjustedId(prev => (prev && prev.time <= Date.now() - 1500 ? null : prev));
    }, 1800);
  };

  const handlePromptDeleteProduct = (product: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setProductToDelete(product);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDeleteProduct = () => {
    if (!productToDelete) return;
    deleteProduct(productToDelete.id);
    setIsDeleteModalOpen(false);
    setProductToDelete(null);
    if (isProductModalOpen && editingProductId === productToDelete.id) {
      setIsProductModalOpen(false);
    }
  };

  // Export Inventory CSV as detailed table
  const handleExportInventoryCSV = () => {
    if (products.length === 0) return;

    const totalValuationCost = products.reduce((acc, p) => acc + (p.costPriceFCFA * p.currentStock), 0);
    const totalValuationRetail = products.reduce((acc, p) => acc + (p.priceFCFA * p.currentStock), 0);
    const totalUnits = products.reduce((acc, p) => acc + p.currentStock, 0);

    const csvLines: string[] = [];

    // En-tête & Métadonnées d'inventaire
    csvLines.push(`INVENTAIRE COMPLET DU STOCK;${companyProfile.name.replace(/;/g, ' ')}`);
    csvLines.push(`DATE D'INVENTAIRE;${formatFullDateTime(new Date().toISOString())}`);
    csvLines.push(`ÉDITÉ PAR;${currentUser.name} (${currentUser.role})`);
    csvLines.push(`NOMBRE TOTAL DE RÉFÉRENCES;${products.length}`);
    csvLines.push(`QUANTITÉ TOTALE EN RÉSERVE (UNITÉS);${totalUnits}`);
    csvLines.push(`VALEUR DU STOCK AU COÛT D'ACHAT (FCFA);${totalValuationCost}`);
    csvLines.push(`VALEUR MARCHANDE AU PRIX DE VENTE (FCFA);${totalValuationRetail}`);
    csvLines.push(`MARGE BRUTE POTENTIELLE (FCFA);${totalValuationRetail - totalValuationCost}`);
    csvLines.push('');

    // TABLEAU DÉTAILLÉ DU STOCK
    csvLines.push('=== TABLEAU DÉTAILLÉ DU STOCK ET DES ARTICLES ===');
    const headers = [
      'Réf / ID',
      'Nom de la Boisson / Article',
      'Catégorie',
      'Format de Vente',
      'Volume (cl)',
      'Prix de Vente Client (FCFA)',
      'Coût d\'Achat Réserve (FCFA)',
      'Marge Unitaire (FCFA)',
      'Taux de Marge (%)',
      'Stock Actuel (Unités)',
      'Seuil d\'Alerte (Unités)',
      'Valeur Stock Achat (FCFA)',
      'Valeur Stock Vente (FCFA)',
      'État du Stock'
    ];
    csvLines.push(headers.join(';'));

    products.forEach(p => {
      const marginFCFA = p.priceFCFA - p.costPriceFCFA;
      const marginRate = p.priceFCFA > 0 ? ((marginFCFA / p.priceFCFA) * 100).toFixed(1) + '%' : '0%';
      const stockCostVal = p.costPriceFCFA * p.currentStock;
      const stockRetailVal = p.priceFCFA * p.currentStock;
      const isLow = p.currentStock <= p.minStockThreshold;
      const statusText = p.currentStock === 0 ? 'RUPTURE DE STOCK' : (isLow ? 'STOCK CRITIQUE' : 'STOCK CONFORME');

      csvLines.push([
        `"${p.id}"`,
        `"${p.name.replace(/"/g, '""')}"`,
        `"${p.categoryName || p.category}"`,
        `"${p.format}"`,
        p.volumeCl || '-',
        p.priceFCFA,
        p.costPriceFCFA,
        marginFCFA,
        `"${marginRate}"`,
        p.currentStock,
        p.minStockThreshold,
        stockCostVal,
        stockRetailVal,
        `"${statusText}"`
      ].join(';'));
    });

    // Ligne de Totalisation
    csvLines.push([
      'TOTAL GÉNÉRAL',
      `"${products.length} références"`,
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      totalUnits,
      '',
      totalValuationCost,
      totalValuationRetail,
      ''
    ].join(';'));

    const csvContent = '\uFEFF' + csvLines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `inventaire_stock_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    soundManager.playSuccessTone();
  };

  // Export Movements CSV as detailed table
  const handleExportMovementsCSV = () => {
    if (stockMovements.length === 0) return;

    const csvLines: string[] = [];

    // En-tête & Métadonnées
    csvLines.push(`HISTORIQUE DÉTAILLÉ DES MOUVEMENTS DE STOCK;${companyProfile.name.replace(/;/g, ' ')}`);
    csvLines.push(`DATE D'EXTRACTION;${formatFullDateTime(new Date().toISOString())}`);
    csvLines.push(`RESPONSABLE;${currentUser.name} (${currentUser.role})`);
    csvLines.push(`NOMBRE TOTAL DE MOUVEMENTS;${stockMovements.length}`);
    csvLines.push('');

    // TABLEAU DÉTAILLÉ DES MOUVEMENTS
    csvLines.push('=== TABLEAU DÉTAILLÉ DES MOUVEMENTS DE STOCK ===');
    const headers = [
      'N° Mouvement',
      'Date',
      'Heure',
      'Date & Heure Complète',
      'Boisson / Référence',
      'Type de Mouvement',
      'Variation de Quantité',
      'Auteur du Mouvement',
      'Motif / Commentaire'
    ];
    csvLines.push(headers.join(';'));

    stockMovements.forEach(m => {
      const mDate = formatDateShort(m.timestamp);
      const mTime = formatDateTime(m.timestamp);
      const mFull = formatFullDateTime(m.timestamp);
      const sign = m.quantityChange > 0 ? `+${m.quantityChange}` : `${m.quantityChange}`;

      csvLines.push([
        `"${m.id}"`,
        `"${mDate}"`,
        `"${mTime}"`,
        `"${mFull}"`,
        `"${m.productName.replace(/"/g, '""')}"`,
        `"${m.type}"`,
        sign,
        `"${m.authorName.replace(/"/g, '""')}"`,
        `"${m.reason.replace(/"/g, '""')}"`
      ].join(';'));
    });

    const csvContent = '\uFEFF' + csvLines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `mouvements_stock_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    soundManager.playSuccessTone();
  };

  const handleExportInventoryPDF = () => {
    try {
      exportInventoryPDF(products, companyProfile);
      soundManager.playSuccessTone();
    } catch (err: unknown) {
      console.error('Erreur PDF Inventaire:', err);
    }
  };

  const handleOpenAddModal = () => {
    setEditingProductId(null);
    setFormName('');
    setFormCategory('CHAMPAGNE');
    setFormPriceFCFA('60000');
    setFormCostPriceFCFA('35000');
    setFormFormat('BOUTEILLE');
    setFormVolumeCl('75');
    setFormCurrentStock('12');
    setFormMinThreshold('4');
    setFormBadge('Nouveau');
    setFormDescription('');
    setFormIsAlcoholic(true);
    setProductFormError(null);
    setIsProductModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setEditingProductId(product.id);
    setFormName(product.name);
    setFormCategory(product.category);
    setFormPriceFCFA(product.priceFCFA.toString());
    setFormCostPriceFCFA(product.costPriceFCFA.toString());
    setFormFormat(product.format);
    setFormVolumeCl(product.volumeCl ? product.volumeCl.toString() : '75');
    setFormCurrentStock(product.currentStock.toString());
    setFormMinThreshold(product.minStockThreshold.toString());
    setFormBadge(product.badge || '');
    setFormDescription(product.description || '');
    setFormIsAlcoholic(product.isAlcoholic);
    setProductFormError(null);
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setProductFormError('Veuillez renseigner le nom de la boisson / article.');
      return;
    }
    const price = parseFloat(formPriceFCFA) || 0;
    const cost = parseFloat(formCostPriceFCFA) || 0;
    const stock = parseFloat(formCurrentStock) || 0;
    const minThreshold = parseFloat(formMinThreshold) || 1;
    const volume = parseFloat(formVolumeCl) || undefined;

    if (price <= 0) {
      setProductFormError('Le prix de vente doit être supérieur à 0 FCFA.');
      return;
    }

    const catObj = CATEGORY_OPTIONS.find(c => c.value === formCategory);
    const catName = catObj ? catObj.label : formCategory;

    if (editingProductId) {
      // Update
      const existing = products.find(p => p.id === editingProductId);
      if (existing) {
        const updated: Product = {
          ...existing,
          name: formName.trim(),
          category: formCategory,
          categoryName: catName,
          priceFCFA: price,
          costPriceFCFA: cost,
          format: formFormat,
          volumeCl: volume,
          currentStock: stock,
          minStockThreshold: minThreshold,
          badge: formBadge.trim() || undefined,
          description: formDescription.trim() || undefined,
          isAlcoholic: formIsAlcoholic
        };
        updateProduct(updated);
      }
    } else {
      // Add
      addProduct({
        name: formName.trim(),
        category: formCategory,
        categoryName: catName,
        priceFCFA: price,
        costPriceFCFA: cost,
        format: formFormat,
        volumeCl: volume,
        currentStock: stock,
        minStockThreshold: minThreshold,
        badge: formBadge.trim() || undefined,
        description: formDescription.trim() || undefined,
        isAlcoholic: formIsAlcoholic
      });
    }

    setIsProductModalOpen(false);
  };

  const handleExecuteRestock = () => {
    if (!selectedProductForRestock) return;
    const qty = parseFloat(restockQty) || 0;
    if (qty > 0) {
      restockProduct(selectedProductForRestock.id, qty, restockReason);
      setIsRestockModalOpen(false);
      setSelectedProductForRestock(null);
    }
  };

  const handleExecuteLoss = () => {
    if (!selectedProductForLoss) return;
    const qty = parseFloat(lossQty) || 0;
    if (qty > 0) {
      recordStockLoss(selectedProductForLoss.id, qty, lossReason);
      setIsLossModalOpen(false);
      setSelectedProductForLoss(null);
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        
        <div className="bg-[#131625] border border-white/10 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-gray-400 font-semibold mb-1">
            <span>VALEUR DU STOCK EN CAVE</span>
            <Wine className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {formatFCFA(totalStockValueFCFA)}
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            Coût d'achat total des {totalStockUnits} unités en réserve
          </div>
        </div>

        <div className="bg-[#131625] border border-white/10 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-gray-400 font-semibold mb-1">
            <span>RÉFÉRENCES EN CATALOGUE</span>
            <Package className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-blue-300 font-mono">
            {products.length} boissons / articles
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            Champagnes, Spiritueux, Bières & Cocktails
          </div>
        </div>

        <div className={`p-4 rounded-2xl border transition-all ${
          lowStockProducts.length > 0
            ? 'bg-rose-950/20 border-rose-500/40'
            : 'bg-[#131625] border-white/10'
        }`}>
          <div className="flex items-center justify-between text-xs font-semibold mb-1">
            <span className={lowStockProducts.length > 0 ? 'text-rose-400' : 'text-gray-400'}>
              ALERTES STOCK BAS
            </span>
            <AlertTriangle className={`w-4 h-4 ${lowStockProducts.length > 0 ? 'text-rose-400 animate-pulse' : 'text-gray-500'}`} />
          </div>
          <div className={`text-2xl font-black font-mono ${lowStockProducts.length > 0 ? 'text-rose-300' : 'text-emerald-400'}`}>
            {lowStockProducts.length} référence(s)
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            {lowStockProducts.length > 0 ? 'Réapprovisionnement urgent requis !' : 'Niveaux de stock optimaux'}
          </div>
        </div>

      </div>

      {/* Main View Container */}
      <div className="bg-[#131625] border border-white/10 rounded-2xl p-4 space-y-4">
        
        {/* View Header & Tabs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('INVENTORY')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'INVENTORY'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white bg-white/5'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Inventaire & Ajustement Rapide</span>
            </button>

            <button
              onClick={() => setActiveTab('MOVEMENTS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'MOVEMENTS'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white bg-white/5'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Historique des Mouvements ({stockMovements.length})</span>
            </button>
          </div>

          {/* Search, Low stock filter & Add Product Button */}
          {activeTab === 'INVENTORY' && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Rechercher boisson..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 rounded-xl bg-[#0c0e17] border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-400"
                />
              </div>

              <button
                onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                  showLowStockOnly
                    ? 'bg-rose-500 text-white'
                    : 'bg-white/5 text-gray-400 hover:text-white'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Stock Bas</span>
              </button>

              <button
                id="btn-export-inventory-csv"
                onClick={handleExportInventoryCSV}
                className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="Exporter l'inventaire complet du stock en tableau CSV détaillé"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>

              <button
                id="btn-export-inventory-pdf"
                onClick={handleExportInventoryPDF}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="Télécharger l'inventaire officiel et valorisation du stock en PDF"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Inventaire PDF</span>
              </button>

              <button
                onClick={handleOpenAddModal}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black font-black text-xs shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>+ Nouvelle Boisson</span>
              </button>
            </div>
          )}

          {activeTab === 'MOVEMENTS' && (
            <div className="flex items-center gap-2">
              <button
                id="btn-export-movements-csv"
                onClick={handleExportMovementsCSV}
                disabled={stockMovements.length === 0}
                className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                title="Exporter l'historique complet des mouvements en tableau CSV détaillé"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export Mouvements CSV</span>
              </button>
            </div>
          )}

        </div>

        {/* Category Pills Filter */}
        {activeTab === 'INVENTORY' && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin text-xs">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === 'ALL'
                  ? 'bg-amber-500 text-black shadow-sm'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              Toutes ({products.length})
            </button>
            {CATEGORY_OPTIONS.map(cat => {
              const count = products.filter(p => p.category === cat.value).length;
              const isSel = selectedCategory === cat.value;
              return (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`px-2.5 py-1 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSel
                      ? 'bg-white text-black shadow-sm'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span className="text-[10px] opacity-75 font-mono">({count})</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Tab 1: Inventory Table with Quick +1/-1 and Actions */}
        {activeTab === 'INVENTORY' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0e101a] text-gray-400 uppercase font-semibold border-b border-white/10">
                <tr>
                  <th className="py-3 px-3">Boisson / Format</th>
                  <th className="py-3 px-3">Catégorie</th>
                  <th className="py-3 px-3">Prix Vente</th>
                  <th className="py-3 px-3 text-center min-w-[220px]">Ajustement Rapide (+1 / -1)</th>
                  <th className="py-3 px-3 text-center">Seuil</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredProducts.map((product) => {
                  const isLowStock = product.currentStock <= product.minStockThreshold;
                  const isJustAdjusted = lastAdjustedId && lastAdjustedId.id === product.id;

                  return (
                    <tr 
                      key={product.id}
                      className={`hover:bg-white/[0.02] transition-colors ${
                        isLowStock ? 'bg-rose-950/10' : ''
                      }`}
                    >
                      <td className="py-3 px-3">
                        <div className="font-bold text-white text-sm flex items-center gap-2">
                          <span>{product.name}</span>
                          {product.badge && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              {product.badge}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          Format: <span className="uppercase text-amber-300 font-semibold">{product.format}</span>
                          {product.volumeCl ? ` • ${product.volumeCl}cl` : ''}
                          <span className="ml-2 text-gray-500">Coût: {formatFCFA(product.costPriceFCFA)}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-md bg-white/5 text-gray-300 border border-white/10 font-medium">
                          {product.categoryName}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-mono font-bold text-amber-400">
                        {formatFCFA(product.priceFCFA)}
                      </td>

                      {/* Quick Adjustment (+1 / -1 / +6 / +12) Stepper */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* -1 Button */}
                          <button
                            id={`btn-stock-minus-1-${product.id}`}
                            onClick={(e) => handleQuickAdjust(product, -1, e)}
                            disabled={product.currentStock <= 0}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold transition-all ${
                              product.currentStock > 0
                                ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500 hover:text-white border border-rose-500/40 active:scale-90 cursor-pointer'
                                : 'bg-white/5 text-gray-600 border border-white/5 cursor-not-allowed opacity-50'
                            }`}
                            title="Retrait rapide (-1 unité pour inventaire ou perte)"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>

                          {/* Current Stock Display Badge */}
                          <div className="relative">
                            <span className={`inline-flex items-center justify-center min-w-[72px] font-mono font-bold px-2.5 py-1 rounded-lg text-xs border ${
                              isLowStock
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                                : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            }`}>
                              {product.currentStock} {product.format === 'VERRE_DOSE' ? 'doses' : 'unités'}
                            </span>

                            {/* Floating recent update tag */}
                            {isJustAdjusted && (
                              <span className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-mono font-bold px-1 rounded shadow animate-bounce ${
                                lastAdjustedId.delta > 0
                                  ? 'bg-emerald-500 text-black'
                                  : 'bg-rose-500 text-white'
                              }`}>
                                {lastAdjustedId.delta > 0 ? `+${lastAdjustedId.delta}` : lastAdjustedId.delta}
                              </span>
                            )}
                          </div>

                          {/* +1 Button */}
                          <button
                            id={`btn-stock-plus-1-${product.id}`}
                            onClick={(e) => handleQuickAdjust(product, 1, e)}
                            className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-black border border-emerald-500/40 flex items-center justify-center font-bold transition-all active:scale-90 cursor-pointer"
                            title="Ajout rapide (+1 unité après comptage inventaire)"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>

                          {/* Quick Pack Preset +6 */}
                          <button
                            id={`btn-stock-plus-6-${product.id}`}
                            onClick={(e) => handleQuickAdjust(product, 6, e)}
                            className="px-1.5 h-7 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-gray-400 hover:text-emerald-300 border border-white/10 hover:border-emerald-500/30 font-mono text-[10px] font-bold transition-all active:scale-90 cursor-pointer"
                            title="Ajouter un demi-carton / pack (+6)"
                          >
                            +6
                          </button>

                          {/* Quick Carton Preset +12 */}
                          <button
                            id={`btn-stock-plus-12-${product.id}`}
                            onClick={(e) => handleQuickAdjust(product, 12, e)}
                            className="px-1.5 h-7 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-gray-400 hover:text-emerald-300 border border-white/10 hover:border-emerald-500/30 font-mono text-[10px] font-bold transition-all active:scale-90 cursor-pointer"
                            title="Ajouter un carton plein (+12)"
                          >
                            +12
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center font-mono text-gray-400">
                        {product.minStockThreshold}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Detailed Restock Button */}
                          <button
                            onClick={() => {
                              setSelectedProductForRestock(product);
                              setIsRestockModalOpen(true);
                            }}
                            className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 font-bold transition-all cursor-pointer text-[11px]"
                            title="Réapprovisionnement avec motif"
                          >
                            + Réappro
                          </button>

                          {/* Loss Button */}
                          <button
                            onClick={() => {
                              setSelectedProductForLoss(product);
                              setIsLossModalOpen(true);
                            }}
                            className="px-2 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 font-bold transition-all cursor-pointer text-[11px]"
                            title="Déclarer casse / perte bar"
                          >
                            - Perte
                          </button>

                          {/* Edit Product */}
                          <button
                            onClick={() => handleOpenEditModal(product)}
                            className="p-1.5 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30 transition-all cursor-pointer"
                            title="Modifier ce produit (prix, nom, seuil, catégorie)"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Product */}
                          <button
                            id={`btn-delete-product-${product.id}`}
                            onClick={(e) => handlePromptDeleteProduct(product, e)}
                            className="p-1.5 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/25 hover:bg-rose-500 hover:text-white transition-all cursor-pointer"
                            title="Supprimer définitivement du stock et catalogue"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Movements Log */}
        {activeTab === 'MOVEMENTS' && (
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
            {stockMovements.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-xs">
                Aucun mouvement de stock enregistré sur ce shift.
              </div>
            ) : (
              stockMovements.map((mov) => {
                const isPositive = mov.quantityChange > 0;
                return (
                  <div
                    key={mov.id}
                    className="p-3 rounded-xl bg-[#0e101a] border border-white/5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl border ${
                        isPositive 
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                          : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                      }`}>
                        {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      </div>

                      <div>
                        <div className="font-bold text-white">{mov.productName}</div>
                        <div className="text-[11px] text-gray-400">
                          {mov.reason} • Par: <span className="text-gray-300">{mov.authorName}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`font-mono font-bold text-sm ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isPositive ? `+${mov.quantityChange}` : mov.quantityChange}
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono">
                        {formatDateTime(mov.timestamp)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

      </div>

      {/* Delete Product Confirmation Modal */}
      {isDeleteModalOpen && productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#121524] border-2 border-rose-500/60 rounded-3xl w-full max-w-md p-6 text-white space-y-4 shadow-2xl animate-in zoom-in-95">
            
            <div className="flex items-center justify-between border-b border-rose-500/20 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-rose-400">
                    Supprimer la Boisson
                  </h3>
                  <p className="text-[11px] text-gray-400">Retrait définitif du stock & catalogue</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setProductToDelete(null);
                }} 
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#0b0d17] p-3.5 rounded-2xl border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-white">{productToDelete.name}</span>
                <span className="text-xs font-mono font-bold text-amber-400">{formatFCFA(productToDelete.priceFCFA)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400 border-t border-white/5 pt-2">
                <span>Catégorie : <strong>{productToDelete.categoryName}</strong></span>
                <span>Format : <strong>{productToDelete.format}</strong></span>
              </div>
              <div className="flex items-center justify-between text-xs border-t border-white/5 pt-2">
                <span className="text-gray-400">Unités en stock restant :</span>
                <span className={`font-mono font-bold px-2 py-0.5 rounded ${
                  productToDelete.currentStock > 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-gray-700/50 text-gray-300'
                }`}>
                  {productToDelete.currentStock} unités
                </span>
              </div>
            </div>

            {productToDelete.currentStock > 0 && (
              <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong>Attention :</strong> Il reste encore <strong>{productToDelete.currentStock} unités</strong> en réserve d'une valeur totale de <strong>{formatFCFA(productToDelete.currentStock * productToDelete.costPriceFCFA)}</strong>.
                </div>
              </div>
            )}

            <p className="text-xs text-gray-400">
              Êtes-vous sûr de vouloir supprimer définitivement cette référence ? Elle ne sera plus proposée lors de la prise de commande.
            </p>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setProductToDelete(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 hover:text-white font-bold text-xs cursor-pointer transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                id="btn-confirm-delete-product"
                onClick={handleConfirmDeleteProduct}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-lg shadow-rose-600/30 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
              >
                <Trash2 className="w-4 h-4" />
                <span>Supprimer Définitivement</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#121524] border border-amber-500/40 rounded-3xl w-full max-w-xl p-6 text-white space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-base text-amber-400 flex items-center gap-2">
                <Wine className="w-5 h-5" />
                <span>{editingProductId ? 'Modifier la Boisson / Référence' : 'Ajouter une Nouvelle Boisson au Catalogue'}</span>
              </h3>
              <button 
                onClick={() => setIsProductModalOpen(false)} 
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3.5 text-xs">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-gray-300 font-semibold block mb-1">
                    Nom de la Boisson / Référence *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Dom Pérignon Luminous 75cl, Jack Daniel's 1L"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0c0e17] border border-white/15 text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-gray-300 font-semibold block mb-1">
                    Catégorie Principale *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as ProductCategory)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0c0e17] border border-white/15 text-white focus:border-amber-400 focus:outline-none cursor-pointer"
                  >
                    {CATEGORY_OPTIONS.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-gray-300 font-semibold block mb-1">
                    Format de Vente *
                  </label>
                  <select
                    value={formFormat}
                    onChange={(e) => setFormFormat(e.target.value as SaleFormat)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0c0e17] border border-white/15 text-white focus:border-amber-400 focus:outline-none cursor-pointer"
                  >
                    {FORMAT_OPTIONS.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-gray-300 font-semibold block mb-1">
                    Prix de Vente Client (FCFA) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={500}
                    value={formPriceFCFA}
                    onChange={(e) => setFormPriceFCFA(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0c0e17] border border-white/15 text-amber-300 font-mono font-bold focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-gray-300 font-semibold block mb-1">
                    Coût d'Achat Réserve (FCFA)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={formCostPriceFCFA}
                    onChange={(e) => setFormCostPriceFCFA(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0c0e17] border border-white/15 text-gray-300 font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-gray-300 font-semibold block mb-1">
                    Stock Actuel en Réserve (Unités)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={formCurrentStock}
                    onChange={(e) => setFormCurrentStock(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0c0e17] border border-white/15 text-emerald-300 font-mono font-bold focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-gray-300 font-semibold block mb-1">
                    Seuil d'Alerte Stock Bas (Unités)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formMinThreshold}
                    onChange={(e) => setFormMinThreshold(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0c0e17] border border-white/15 text-rose-300 font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-gray-300 font-semibold block mb-1">
                    Volume Liquide (cl)
                  </label>
                  <input
                    type="number"
                    placeholder="75"
                    value={formVolumeCl}
                    onChange={(e) => setFormVolumeCl(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0c0e17] border border-white/15 text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-gray-300 font-semibold block mb-1">
                    Badge VIP / Label (Optionnel)
                  </label>
                  <input
                    type="text"
                    placeholder="ex: Prestige VIP, Best Seller"
                    value={formBadge}
                    onChange={(e) => setFormBadge(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0c0e17] border border-white/15 text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-gray-300 font-semibold block mb-1">
                    Description ou Ingrédients
                  </label>
                  <input
                    type="text"
                    placeholder="ex: Champagne millésimé avec seau LED, Cocktail à base de Vodka & Purée de Passion"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0c0e17] border border-white/15 text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2 flex items-center gap-2 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formIsAlcoholic}
                      onChange={(e) => setFormIsAlcoholic(e.target.checked)}
                      className="rounded border-white/20 text-amber-500 focus:ring-amber-400 bg-[#0c0e17] w-4 h-4 cursor-pointer"
                    />
                    <span className="text-gray-300">Contient de l'alcool</span>
                  </label>
                </div>

              </div>

              {productFormError && (
                <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{productFormError}</span>
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/10">
                {/* Delete button from edit modal */}
                {editingProductId ? (
                  <button
                    type="button"
                    onClick={() => {
                      const prod = products.find(p => p.id === editingProductId);
                      if (prod) {
                        setIsProductModalOpen(false);
                        handlePromptDeleteProduct(prod);
                      }
                    }}
                    className="px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Supprimer cette boisson</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsProductModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/10 text-gray-300 hover:text-white font-semibold cursor-pointer"
                  >
                    Annuler
                  </button>

                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black font-black flex items-center gap-1.5 cursor-pointer shadow-lg active:scale-95 transition-all"
                  >
                    <Save className="w-4 h-4" />
                    <span>{editingProductId ? 'Enregistrer les Modifications' : 'Créer l\'Article'}</span>
                  </button>
                </div>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Restock Modal */}
      {isRestockModalOpen && selectedProductForRestock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#121522] border border-emerald-500/40 rounded-3xl w-full max-w-md p-6 text-white space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-emerald-400 flex items-center gap-2">
                <Plus className="w-5 h-5" />
                <span>Réapprovisionnement Stock</span>
              </h3>
              <button onClick={() => setIsRestockModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#0d0f18] p-3 rounded-xl border border-white/5">
              <div className="font-bold text-sm text-white">{selectedProductForRestock.name}</div>
              <div className="text-xs text-gray-400">Stock actuel : {selectedProductForRestock.currentStock}</div>
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Quantité reçue :</label>
              <input
                type="number"
                value={restockQty}
                onChange={(e) => setRestockQty(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#0b0d14] border border-white/10 text-white font-mono font-bold focus:border-emerald-400"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Motif / Réf Fournisseur :</label>
              <input
                type="text"
                value={restockReason}
                onChange={(e) => setRestockReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#0b0d14] border border-white/10 text-xs text-white focus:border-emerald-400"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setIsRestockModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold"
              >
                Annuler
              </button>
              <button
                onClick={handleExecuteRestock}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs shadow"
              >
                Confirmer l'Entrée
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loss Modal */}
      {isLossModalOpen && selectedProductForLoss && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#121522] border border-rose-500/40 rounded-3xl w-full max-w-md p-6 text-white space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-rose-400 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5" />
                <span>Déclaration Casse / Perte</span>
              </h3>
              <button onClick={() => setIsLossModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#0d0f18] p-3 rounded-xl border border-white/5">
              <div className="font-bold text-sm text-white">{selectedProductForLoss.name}</div>
              <div className="text-xs text-gray-400">Stock actuel : {selectedProductForLoss.currentStock}</div>
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Quantité perdue / cassée :</label>
              <input
                type="number"
                value={lossQty}
                onChange={(e) => setLossQty(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#0b0d14] border border-white/10 text-white font-mono font-bold focus:border-rose-400"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Motif de la perte :</label>
              <input
                type="text"
                value={lossReason}
                onChange={(e) => setLossReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#0b0d14] border border-white/10 text-xs text-white focus:border-rose-400"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setIsLossModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold"
              >
                Annuler
              </button>
              <button
                onClick={handleExecuteLoss}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-black text-xs shadow"
              >
                Enregistrer la Perte
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

