import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, Clock, Wine, AlertCircle, 
  Sparkles, Coffee, Check, Bell, Flame, 
  User as UserIcon, RefreshCw, XCircle
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { Order, OrderItem } from '../types';
import { formatFCFA, formatDateTime, getElapsedMinutes } from '../utils/formatters';

export const BarKDSView: React.FC = () => {
  const { 
    orders, 
    markOrderItemServed, 
    markAllOrderItemsServed, 
    cancelOrderItem,
    currentUser 
  } = usePOS();

  const [activeFilter, setActiveFilter] = useState<'PENDING' | 'HISTORY'>('PENDING');
  const [now, setNow] = useState<number>(Date.now());

  // Auto-refresh timer for elapsed minutes
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const activeOrders = orders.filter(o => o.status === 'PREPARATION' || o.status === 'ACTIVE');
  const servedOrders = orders.filter(o => o.status === 'SERVIE' || o.status === 'PAYEE').slice(0, 20);

  const displayedOrders = activeFilter === 'PENDING' ? activeOrders : servedOrders;

  const getUrgencyBadge = (createdAt: string) => {
    const minutes = getElapsedMinutes(createdAt);
    if (minutes < 3) {
      return { label: `${minutes} min`, color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
    }
    if (minutes < 8) {
      return { label: `${minutes} min (Attention)`, color: 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse' };
    }
    return { label: `🔥 ${minutes} min (URGENT VIP)`, color: 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-bounce' };
  };

  return (
    <div className="space-y-4">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#131625] p-3.5 rounded-2xl border border-white/10">
        
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>Écran de Préparation Barman (KDS)</span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Poste: {currentUser.name}
              </span>
            </h2>
            <p className="text-xs text-gray-400">Validez les bouteilles et verres servis pour déduire les stocks en direct</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 bg-[#0b0d14] p-1 rounded-xl border border-white/10">
          <button
            id="kds-tab-pending"
            onClick={() => setActiveFilter('PENDING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeFilter === 'PENDING'
                ? 'bg-emerald-500 text-black shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>À Préparer ({activeOrders.length})</span>
          </button>

          <button
            id="kds-tab-history"
            onClick={() => setActiveFilter('HISTORY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeFilter === 'HISTORY'
                ? 'bg-white/20 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            <span>Déjà Servis ({servedOrders.length})</span>
          </button>
        </div>

      </div>

      {/* Orders Stream Grid */}
      <AnimatePresence mode="popLayout">
        {displayedOrders.length === 0 ? (
          <motion.div 
            key="empty-kds"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.3 }}
            className="text-center py-16 bg-[#131625] rounded-2xl border border-white/10"
          >
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-60" />
            <h3 className="text-base font-bold text-white">Toutes les commandes sont prêtes !</h3>
            <p className="text-xs text-gray-400 mt-1">
              Aucun ticket en attente de préparation pour le moment.
            </p>
          </motion.div>
        ) : (
          <motion.div 
            layout
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
          >
            <AnimatePresence mode="popLayout">
              {displayedOrders.map((order, index) => {
                const urgency = getUrgencyBadge(order.createdAt);
                const pendingItems = order.items.filter(i => i.status === 'EN_ATTENTE' || i.status === 'EN_PREPARATION');
                const allItemsServed = order.items.every(i => i.status === 'SERVI' || i.status === 'ANNULE');
                const isVeryNew = getElapsedMinutes(order.createdAt) < 1;

                return (
                  <motion.div
                    layout
                    key={order.id}
                    id={`kds-order-card-${order.id}`}
                    initial={{ opacity: 0, y: 25, scale: 0.94 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.88, y: -15, transition: { duration: 0.22 } }}
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 28,
                      mass: 0.8,
                      delay: Math.min(index * 0.04, 0.2)
                    }}
                    className={`rounded-2xl border p-4 transition-colors duration-300 flex flex-col justify-between relative overflow-hidden ${
                      allItemsServed
                        ? 'bg-[#10121e] border-white/10 opacity-75'
                        : isVeryNew
                        ? 'bg-[#161c32] border-emerald-400/70 shadow-xl shadow-emerald-500/10 ring-1 ring-emerald-400/40'
                        : 'bg-[#15192c] border-emerald-500/40 shadow-xl shadow-emerald-500/5'
                    }`}
                  >
                    {/* Top Glow bar for brand new orders */}
                    {isVeryNew && !allItemsServed && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 animate-pulse" />
                    )}
                    
                    {/* Card Header */}
                    <div>
                      <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-white/10">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-black text-white font-mono">
                              {order.tableName}
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-white/10 text-gray-300 uppercase">
                              {order.orderNumber}
                            </span>
                            {isVeryNew && !allItemsServed && (
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-500 text-black animate-pulse">
                                NOUVEAU
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-400 flex items-center gap-1.5 mt-0.5">
                            <UserIcon className="w-3 h-3 text-amber-400" />
                            <span>Serveur: <strong className="text-white">{order.serverName}</strong></span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${urgency.color}`}>
                            {urgency.label}
                          </span>
                          <span className="text-[10px] text-gray-500 font-mono">
                            {formatDateTime(order.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Order Items Checklist */}
                      <div className="my-3 space-y-2">
                        {order.items.map((item) => {
                          const isServed = item.status === 'SERVI';
                          const isCancelled = item.status === 'ANNULE';

                          return (
                            <motion.div
                              layout
                              key={item.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.2 }}
                              className={`p-2.5 rounded-xl border transition-all flex items-start justify-between gap-2 ${
                                isServed
                                  ? 'bg-emerald-950/20 border-emerald-500/30 text-gray-400'
                                  : isCancelled
                                  ? 'bg-rose-950/20 border-rose-500/30 text-rose-400 opacity-60'
                                  : 'bg-[#0e101a] border-white/10 text-white'
                              }`}
                            >
                              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                <span className={`w-6 h-6 rounded-lg font-mono font-black text-xs flex items-center justify-center shrink-0 ${
                                  isServed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500 text-black'
                                }`}>
                                  {item.quantity}x
                                </span>

                                <div className="min-w-0 flex-1">
                                  <div className={`font-bold text-xs ${isServed ? 'line-through text-gray-400' : 'text-white'}`}>
                                    {item.productName}
                                  </div>
                                  <div className="text-[10px] text-gray-400 flex items-center gap-2 mt-0.5">
                                    <span className="uppercase text-amber-300/80 font-semibold">{item.format}</span>
                                    {item.notes && (
                                      <span className="text-amber-400 font-medium bg-amber-500/15 px-1.5 py-0.2 rounded border border-amber-500/20">
                                        ★ {item.notes}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Action Button for single item */}
                              {!isServed && !isCancelled && (
                                <button
                                  onClick={() => markOrderItemServed(order.id, item.id)}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black font-bold text-xs transition-all shadow cursor-pointer shrink-0"
                                >
                                  Servir ✓
                                </button>
                              )}

                              {isServed && (
                                <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 shrink-0">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Prêt</span>
                                </span>
                              )}
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Card Footer: Bulk Action */}
                    <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                      <div className="text-xs font-mono text-gray-400">
                        Total: <strong className="text-amber-400">{formatFCFA(order.totalAmountFCFA)}</strong>
                      </div>

                      {!allItemsServed && (
                        <button
                          id={`btn-serve-all-order-${order.id}`}
                          onClick={() => markAllOrderItemsServed(order.id)}
                          className="px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black text-xs transition-all shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer flex items-center gap-1.5"
                        >
                          <Check className="w-4 h-4" />
                          <span>Tout Servir & Déduire Stock</span>
                        </button>
                      )}
                    </div>

                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
