import React, { useState } from 'react';
import { 
  Search, Plus, Minus, Trash2, Send, Wine, 
  Sparkles, Check, ArrowLeft, AlertTriangle, 
  Flame, GlassWater, Zap, Beer, PackageCheck
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { ProductCategory, Product, Table } from '../types';
import { formatFCFA } from '../utils/formatters';
import { triggerOrderValidatedHaptic, triggerSelectionHaptic, triggerActionHaptic } from '../utils/capacitorBridge';

interface OrderTakingViewProps {
  initialTableId: string | null;
  onBackToTables: () => void;
}

const CATEGORY_TABS: Array<{ id: string; label: string; icon: React.ReactNode }> = [
  { id: 'ALL', label: 'Toutes les Boissons', icon: <Wine className="w-4 h-4" /> },
  { id: 'CHAMPAGNE', label: 'Champagnes', icon: <Sparkles className="w-4 h-4 text-amber-400" /> },
  { id: 'SPIRITUEUX', label: 'Spiritueux & Shots', icon: <GlassWater className="w-4 h-4 text-orange-400" /> },
  { id: 'COCKTAILS', label: 'Cocktails Signatures', icon: <Flame className="w-4 h-4 text-pink-400" /> },
  { id: 'BIERES', label: 'Bières & Cidres', icon: <Beer className="w-4 h-4 text-yellow-400" /> },
  { id: 'SOFTS_ENERGY', label: 'Softs & Red Bull', icon: <Zap className="w-4 h-4 text-cyan-400" /> },
  { id: 'PACKS_VIP', label: 'Packs Show VIP', icon: <Sparkles className="w-4 h-4 text-purple-400" /> },
  { id: 'CHICHAS', label: 'Chichas Lounge', icon: <Flame className="w-4 h-4 text-emerald-400" /> },
];

const COMMON_MODIFIERS = [
  'Avec beaucoup de glaçons',
  'Sans glaçons',
  'Tranches de citron vert',
  'Feux de Bengale (VIP Show)',
  'Verres supplémentaires',
  'Bien frais',
  'Paille VIP'
];

export const OrderTakingView: React.FC<OrderTakingViewProps> = ({
  initialTableId,
  onBackToTables
}) => {
  const { tables, products, currentUser, createOrUpdateOrder } = usePOS();
  
  const [selectedTableId, setSelectedTableId] = useState<string>(
    initialTableId || (tables.length > 0 ? tables[0].id : '')
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Local cart state for this order session
  const [cartItems, setCartItems] = useState<Array<{
    productId: string;
    product: Product;
    quantity: number;
    notes: string;
  }>>([]);

  const [activeItemForNotes, setActiveItemForNotes] = useState<string | null>(null);
  const [orderSentSuccess, setOrderSentSuccess] = useState<boolean>(false);

  const currentTable = tables.find(t => t.id === selectedTableId);

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.categoryName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Cart operations
  const handleAddToCart = (product: Product) => {
    triggerSelectionHaptic();
    setCartItems(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, {
        productId: product.id,
        product,
        quantity: 1,
        notes: ''
      }];
    });
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    triggerSelectionHaptic();
    setCartItems(prev => {
      return prev.map(item => {
        if (item.productId === productId) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      }).filter(Boolean) as typeof prev;
    });
  };

  const handleRemoveFromCart = (productId: string) => {
    triggerActionHaptic();
    setCartItems(prev => prev.filter(item => item.productId !== productId));
  };

  const handleAddNoteToItem = (productId: string, note: string) => {
    triggerSelectionHaptic();
    setCartItems(prev => prev.map(item => {
      if (item.productId === productId) {
        const newNotes = item.notes ? `${item.notes}, ${note}` : note;
        return { ...item, notes: newNotes };
      }
      return item;
    }));
  };

  const handleClearNotes = (productId: string) => {
    setCartItems(prev => prev.map(item => item.productId === productId ? { ...item, notes: '' } : item));
  };

  const cartTotalFCFA = cartItems.reduce((acc, curr) => acc + (curr.product.priceFCFA * curr.quantity), 0);
  const cartTotalItemsCount = cartItems.reduce((acc, curr) => acc + curr.quantity, 0);

  // Send order to barman KDS
  const handleSendOrder = () => {
    if (!selectedTableId || cartItems.length === 0) return;

    triggerOrderValidatedHaptic();

    createOrUpdateOrder(
      selectedTableId,
      cartItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        notes: item.notes || undefined
      }))
    );

    setOrderSentSuccess(true);
    setCartItems([]);

    setTimeout(() => {
      setOrderSentSuccess(false);
      onBackToTables();
    }, 1200);
  };

  return (
    <div className="space-y-4">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#131625] p-3.5 rounded-2xl border border-white/10">
        
        <div className="flex items-center gap-3">
          <button
            id="back-to-tables-btn"
            onClick={onBackToTables}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>Prise de Commande</span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 font-normal">
                Serveur: {currentUser.name}
              </span>
            </h2>
            <p className="text-xs text-gray-400">Sélectionnez la table et les consommations à transmettre au bar</p>
          </div>
        </div>

        {/* Table Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-400 shrink-0">Table cible :</span>
          <select
            id="select-table-dropdown"
            value={selectedTableId}
            onChange={(e) => setSelectedTableId(e.target.value)}
            className="bg-[#1c2136] border border-amber-500/40 text-amber-300 text-xs font-bold py-2 px-3 rounded-xl focus:outline-none focus:border-amber-400 cursor-pointer max-w-[280px] sm:max-w-xs"
          >
            {/* Tables assigned to the logged in server first */}
            {tables.filter(t => t.assignedServerId === currentUser.id).length > 0 && (
              <optgroup label={`⭐ Vos tables assignées (${currentUser.name})`}>
                {tables.filter(t => t.assignedServerId === currentUser.id).map(table => (
                  <option key={table.id} value={table.id}>
                    {table.number} - {table.name} ({table.zone.replace('_', ' ')}) {table.totalAmountFCFA > 0 ? `[${formatFCFA(table.totalAmountFCFA)}]` : '[Libre]'}
                  </option>
                ))}
              </optgroup>
            )}

            {/* Other tables */}
            <optgroup label="Toutes les autres tables">
              {tables.filter(t => t.assignedServerId !== currentUser.id).map(table => (
                <option key={table.id} value={table.id}>
                  {table.number} - {table.name} {table.assignedServerName ? `(${table.assignedServerName})` : ''} {table.totalAmountFCFA > 0 ? `[${formatFCFA(table.totalAmountFCFA)}]` : '[Libre]'}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

      </div>

      {/* Main Order Workspace: Catalog on Left, Cart on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Left Column: Catalog & Search (Span 2) */}
        <div className="lg:col-span-2 space-y-3">
          
          {/* Search and Category Filter */}
          <div className="bg-[#131625] p-3 rounded-2xl border border-white/10 space-y-3">
            
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="catalog-search-input"
                type="text"
                placeholder="Rechercher une bouteille, cocktail, champagne..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#0c0e17] border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              {CATEGORY_TABS.map(tab => (
                <button
                  key={tab.id}
                  id={`cat-tab-${tab.id}`}
                  onClick={() => setSelectedCategory(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                    selectedCategory === tab.id
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold shadow-md shadow-amber-500/20'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[620px] overflow-y-auto pr-1 scrollbar-thin">
            {filteredProducts.map(product => {
              const isLowStock = product.currentStock <= product.minStockThreshold;
              const isOutOfStock = product.currentStock <= 0;

              return (
                <button
                  key={product.id}
                  id={`product-card-${product.id}`}
                  onClick={() => handleAddToCart(product)}
                  disabled={isOutOfStock}
                  className={`text-left p-3 rounded-2xl border transition-all duration-150 relative flex flex-col justify-between cursor-pointer group ${
                    isOutOfStock
                      ? 'bg-[#10121d] border-red-500/20 opacity-50 cursor-not-allowed'
                      : 'bg-[#141727] border-white/10 hover:border-amber-500/50 hover:bg-[#1a1f33] active:scale-[0.98]'
                  }`}
                >
                  <div>
                    {/* Badge / Format */}
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-white/5 text-gray-300 uppercase">
                        {product.format.replace('_', ' ')}
                      </span>
                      {product.badge && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {product.badge}
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-white text-xs sm:text-sm line-clamp-2 group-hover:text-amber-300 transition-colors">
                      {product.name}
                    </h4>

                    {product.description && (
                      <p className="text-[10px] text-gray-400 line-clamp-1 mt-0.5">
                        {product.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 pt-2 border-t border-white/5 flex items-end justify-between">
                    <div>
                      <div className="font-mono text-sm sm:text-base font-black text-amber-400">
                        {formatFCFA(product.priceFCFA)}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-gray-400">
                        <span>Stock:</span>
                        <span className={`font-semibold ${isLowStock ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {product.currentStock} {product.format === 'VERRE_DOSE' ? 'doses' : 'unités'}
                        </span>
                      </div>
                    </div>

                    <div className="w-7 h-7 rounded-lg bg-amber-500 text-black flex items-center justify-center font-bold text-xs shadow group-hover:scale-110 transition-transform">
                      +
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

        </div>

        {/* Right Column: Active Order Cart Drawer */}
        <div className="bg-[#131625] border border-white/10 rounded-2xl p-4 flex flex-col justify-between space-y-4">
          
          <div>
            {/* Cart Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <span>Panier Commande</span>
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-black text-xs font-black flex items-center justify-center">
                    {cartTotalItemsCount}
                  </span>
                </h3>
                <p className="text-[11px] text-amber-400 font-semibold">
                  Pour : {currentTable ? `${currentTable.number} - ${currentTable.name}` : 'Sélectionnez table'}
                </p>
              </div>

              {cartItems.length > 0 && (
                <button
                  id="clear-cart-btn"
                  onClick={() => setCartItems([])}
                  className="text-xs text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Vider</span>
                </button>
              )}
            </div>

            {/* Cart Items List */}
            <div className="mt-3 space-y-2.5 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
              {cartItems.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Wine className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">Le panier est vide.</p>
                  <p className="text-[11px] mt-1">Touchez une boisson dans le catalogue pour l'ajouter.</p>
                </div>
              ) : (
                cartItems.map((item) => (
                  <div
                    key={item.productId}
                    className="p-2.5 rounded-xl bg-[#1a1f33] border border-white/5 space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-xs text-white truncate">
                          {item.product.name}
                        </div>
                        <div className="font-mono text-xs text-amber-400">
                          {formatFCFA(item.product.priceFCFA * item.quantity)}
                        </div>
                      </div>

                      {/* Quantity Modifier Buttons */}
                      <div className="flex items-center gap-1.5 bg-[#0e101a] p-1 rounded-lg border border-white/10 shrink-0">
                        <button
                          onClick={() => handleUpdateQuantity(item.productId, -1)}
                          className="w-6 h-6 rounded flex items-center justify-center text-gray-300 hover:bg-white/10 cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-5 text-center font-mono font-bold text-xs text-white">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleUpdateQuantity(item.productId, 1)}
                          className="w-6 h-6 rounded flex items-center justify-center text-amber-400 hover:bg-white/10 cursor-pointer font-bold"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Notes Display */}
                    {item.notes && (
                      <div className="flex items-center justify-between text-[11px] bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded border border-amber-500/20">
                        <span>Note: {item.notes}</span>
                        <button
                          onClick={() => handleClearNotes(item.productId)}
                          className="text-gray-400 hover:text-white"
                        >
                          ×
                        </button>
                      </div>
                    )}

                    {/* Modifier Quick Tags Toggle */}
                    <div className="pt-1 flex items-center gap-1 overflow-x-auto text-[10px]">
                      <button
                        onClick={() => setActiveItemForNotes(activeItemForNotes === item.productId ? null : item.productId)}
                        className="text-amber-400/80 hover:text-amber-300 underline cursor-pointer"
                      >
                        + Instructions Bar
                      </button>
                    </div>

                    {activeItemForNotes === item.productId && (
                      <div className="pt-1 flex flex-wrap gap-1">
                        {COMMON_MODIFIERS.map(mod => (
                          <button
                            key={mod}
                            onClick={() => handleAddNoteToItem(item.productId, mod)}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 hover:bg-amber-500/20 text-gray-300 hover:text-amber-300 border border-white/10 transition-colors cursor-pointer"
                          >
                            {mod}
                          </button>
                        ))}
                      </div>
                    )}

                  </div>
                ))
              )}
            </div>
          </div>

          {/* Cart Footer: Subtotal & Dispatch Button */}
          <div className="pt-3 border-t border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Total Commande :</span>
              <span className="font-mono text-xl font-black text-amber-400">
                {formatFCFA(cartTotalFCFA)}
              </span>
            </div>

            {orderSentSuccess ? (
              <div className="py-3 rounded-xl bg-emerald-500 text-black font-black text-center flex items-center justify-center gap-2 animate-bounce">
                <Check className="w-5 h-5" />
                <span>COMMANDE ENVOYÉE AU BARMAN !</span>
              </div>
            ) : (
              <button
                id="btn-dispatch-order-kds"
                disabled={cartItems.length === 0}
                onClick={handleSendOrder}
                className={`w-full py-3.5 px-4 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  cartItems.length > 0
                    ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black shadow-lg shadow-emerald-500/25 active:scale-98'
                    : 'bg-white/5 text-gray-600 border border-white/5 cursor-not-allowed opacity-50'
                }`}
              >
                <Send className="w-4 h-4" />
                <span>TRANSMETTRE AU BARMAN (KDS)</span>
              </button>
            )}

            <div className="text-center text-[10px] text-gray-500">
              ⚡ Notification instantanée sur l'écran Barman • Stock décompté au service
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
