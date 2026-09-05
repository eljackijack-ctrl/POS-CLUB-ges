import React, { useState } from 'react';
import { 
  X, Smartphone, Database, Terminal, ShieldCheck, 
  Layers, Bluetooth, Server, FileCode, CheckCircle2, 
  Copy, Check
} from 'lucide-react';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'STACK' | 'SQL_SCHEMA' | 'BUILD_APK' | 'ESC_POS' | 'TESTS'>('STACK');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const sqlSchemaCode = `-- ==========================================================
-- SCHÉMA DE BASE DE DONNÉES RELATIONNELLE : CLUB POS (FCFA)
-- ==========================================================

-- 1. Table Utilisateurs & Staff
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('SERVEUR', 'BARMAN', 'MANAGER', 'ADMIN')),
    pin_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(30),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tables & Zones du Nightclub
CREATE TABLE tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    number VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    zone VARCHAR(30) NOT NULL CHECK (zone IN ('CARRE_PREMIUM', 'VIP_1', 'VIP_2', 'PISTE', 'COMPTOIR_BAR', 'TERRASSE')),
    capacity INT DEFAULT 4,
    status VARCHAR(30) NOT NULL DEFAULT 'LIBRE' CHECK (status IN ('LIBRE', 'OCCUPEE', 'COMMANDE_EN_ATTENTE', 'SERVI', 'ADDITION_DEMANDEE')),
    min_spend_fcfa NUMERIC(12, 2) DEFAULT 0,
    current_order_id UUID,
    assigned_server_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Produits & Stock (Bouteilles & Doses)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL,
    price_fcfa NUMERIC(12, 2) NOT NULL,
    cost_price_fcfa NUMERIC(12, 2) NOT NULL,
    format VARCHAR(20) NOT NULL CHECK (format IN ('BOUTEILLE', 'VERRE_DOSE', 'MAGNUM', 'CANETTE', 'PACK', 'UNITE')),
    volume_cl NUMERIC(6, 2),
    doses_per_bottle INT DEFAULT 1,
    current_stock NUMERIC(10, 2) NOT NULL DEFAULT 0,
    min_stock_threshold NUMERIC(10, 2) NOT NULL DEFAULT 5,
    is_alcoholic BOOLEAN DEFAULT TRUE,
    badge VARCHAR(50)
);

-- 4. Commandes
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(30) NOT NULL UNIQUE,
    table_id UUID NOT NULL REFERENCES tables(id),
    server_id UUID NOT NULL REFERENCES users(id),
    total_amount_fcfa NUMERIC(12, 2) NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'PREPARATION' CHECK (status IN ('ACTIVE', 'PREPARATION', 'SERVIE', 'PAYEE', 'ANNULEE')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Lignes de Commande
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price_fcfa NUMERIC(12, 2) NOT NULL,
    total_price_fcfa NUMERIC(12, 2) NOT NULL,
    notes TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'EN_ATTENTE' CHECK (status IN ('EN_ATTENTE', 'EN_PREPARATION', 'SERVI', 'ANNULE')),
    served_at TIMESTAMP WITH TIME ZONE
);

-- 6. Paiements & Factures Finales
CREATE TABLE payments (
    id VARCHAR(50) PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id),
    table_id UUID NOT NULL REFERENCES tables(id),
    server_id UUID NOT NULL REFERENCES users(id),
    cashier_id UUID NOT NULL REFERENCES users(id),
    subtotal_fcfa NUMERIC(12, 2) NOT NULL,
    discount_fcfa NUMERIC(12, 2) DEFAULT 0,
    discount_reason VARCHAR(255),
    total_paid_fcfa NUMERIC(12, 2) NOT NULL,
    payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('ESPECES', 'CARTE_BANCAIRE', 'TMONEY', 'FLOOZ', 'ORANGE_MONEY', 'MTN_MOMO', 'WAVE')),
    transaction_reference VARCHAR(100),
    cash_given_fcfa NUMERIC(12, 2),
    change_returned_fcfa NUMERIC(12, 2),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Mouvements de Stock (Traçabilité)
CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id),
    type VARCHAR(30) NOT NULL CHECK (type IN ('VENTE', 'REAPPRO', 'PERTE_CASSE', 'AJUSTEMENT')),
    quantity_change NUMERIC(10, 2) NOT NULL,
    new_stock_level NUMERIC(10, 2) NOT NULL,
    reason TEXT NOT NULL,
    author_id UUID REFERENCES users(id),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index pour performance ultra-rapide en salle
CREATE INDEX idx_orders_table ON orders(table_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_payments_timestamp ON payments(timestamp);
CREATE INDEX idx_stock_product ON stock_movements(product_id);`;

  const capacitorCommands = `# =====================================================
# ÉTAPES DE GÉNÉRATION DU FICHIER APK ANDROID (CAPACITOR)
# =====================================================

# 1. Installer Capacitor Core & CLI dans le projet
npm install @capacitor/core @capacitor/android @capacitor/cli @capacitor-community/bluetooth-le

# 2. Initialiser le projet Capacitor
npx cap init "ClubPOS" "com.clubpos.nightclub" --web-dir "dist"

# 3. Construire le build web de production
npm run build

# 4. Ajouter la plateforme Android native
npx cap add android

# 5. Synchroniser le build web dans le projet Android
npx cap sync

# 6. Ouvrir Android Studio pour compiler l'APK
npx cap open android

# OU générer directement l'APK release en ligne de commande :
cd android && ./gradlew assembleRelease
# Le fichier APK sera prêt dans : android/app/build/outputs/apk/release/app-release-unsigned.apk`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#121522] border border-cyan-500/40 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl text-white max-h-[92vh] flex flex-col justify-between">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#171b2d]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">Architecture Senior & Guide Génération APK Android</h2>
              <p className="text-xs text-gray-400">Stack Mobile, Schéma Relationnel SQL, Impression Thermique & Tests</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-white/10 bg-[#0e101a] overflow-x-auto scrollbar-thin">
          <button
            onClick={() => setActiveTab('STACK')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'STACK' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            1. Stack Mobile (APK)
          </button>
          <button
            onClick={() => setActiveTab('SQL_SCHEMA')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'SQL_SCHEMA' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            2. Schéma Relationnel SQL
          </button>
          <button
            onClick={() => setActiveTab('BUILD_APK')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'BUILD_APK' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            3. Guide Build APK
          </button>
          <button
            onClick={() => setActiveTab('ESC_POS')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'ESC_POS' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            4. ESC/POS & Bluetooth
          </button>
          <button
            onClick={() => setActiveTab('TESTS')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'TESTS' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            5. Stratégie de Tests
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto max-h-[520px] scrollbar-thin text-xs space-y-4">
          
          {/* Tab 1: Stack */}
          {activeTab === 'STACK' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#161a2c] border border-cyan-500/30 space-y-2">
                <h4 className="font-bold text-sm text-cyan-300 flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  <span>Recommandation Architecturale : React 19 + Capacitor 6 Android</span>
                </h4>
                <p className="text-gray-300 leading-relaxed">
                  Pour un POS de boîte de nuit réactif, l'approche <strong>Capacitor + React / Vite</strong> offre le meilleur compromis :
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-300 ml-2">
                  <li><strong>Génération d'APK native en 1 commande</strong> via Gradle ou Android Studio.</li>
                  <li><strong>Support direct des imprimantes thermiques Bluetooth ESC/POS</strong> via les plugins natifs Android Bluetooth SPP & BLE (`@capacitor-community/bluetooth-le` ou `cordova-plugin-bluetooth-serial`).</li>
                  <li><strong>Synchronisation temps réel WebSocket / Supabase Realtime / Firebase</strong> pour une réactivité instantanée entre serveurs, barmans et caisse.</li>
                  <li><strong>Mode Offline-First complet</strong> avec SQLite local (`@capacitor-community/sqlite`) pour continuer à servir même en cas de coupure Internet en boîte de nuit.</li>
                </ul>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-[#0e101a] border border-white/10">
                  <div className="font-bold text-white mb-1">Frontend Mobile</div>
                  <div className="text-gray-400">React 19 + TypeScript + Tailwind CSS (OLED Dark Mode)</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#0e101a] border border-white/10">
                  <div className="font-bold text-white mb-1">Packaging Android</div>
                  <div className="text-gray-400">Capacitor 6 Android Bridge (APK Release / AAB Play Store)</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#0e101a] border border-white/10">
                  <div className="font-bold text-white mb-1">Synchronisation Temps Réel</div>
                  <div className="text-gray-400">WebSockets / Supabase Realtime / Firestore</div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: SQL Schema */}
          {activeTab === 'SQL_SCHEMA' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">Schéma SQL Relationnel Complet (PostgreSQL / SQLite) :</span>
                <button
                  onClick={() => handleCopy(sqlSchemaCode, 'sql')}
                  className="px-3 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30 font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedKey === 'sql' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'sql' ? 'Copié !' : 'Copier SQL'}</span>
                </button>
              </div>

              <pre className="p-4 rounded-2xl bg-[#0a0c14] border border-white/10 font-mono text-[11px] text-cyan-200/90 overflow-x-auto leading-relaxed">
                {sqlSchemaCode}
              </pre>
            </div>
          )}

          {/* Tab 3: Build APK */}
          {activeTab === 'BUILD_APK' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">Commandes CLI pour Générer l'APK Android :</span>
                <button
                  onClick={() => handleCopy(capacitorCommands, 'build')}
                  className="px-3 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30 font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedKey === 'build' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'build' ? 'Copié !' : 'Copier Commandes'}</span>
                </button>
              </div>

              <pre className="p-4 rounded-2xl bg-[#0a0c14] border border-white/10 font-mono text-[11px] text-amber-300/90 overflow-x-auto leading-relaxed">
                {capacitorCommands}
              </pre>
            </div>
          )}

          {/* Tab 4: ESC/POS */}
          {activeTab === 'ESC_POS' && (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-[#161a2c] border border-amber-500/30 space-y-2">
                <h4 className="font-bold text-sm text-amber-300 flex items-center gap-2">
                  <Bluetooth className="w-4 h-4" />
                  <span>Protocole ESC/POS & Imprimantes Thermiques Portables (58mm / 80mm)</span>
                </h4>
                <p className="text-gray-300">
                  L'application intègre le format de commande standard ESC/POS pour communiquer avec les imprimantes de caisse :
                </p>
                <div className="space-y-1.5 text-gray-300">
                  <div>• <code>ESC @ (0x1B, 0x40)</code> : Initialisation et remise à zéro de l'imprimante.</div>
                  <div>• <code>ESC a n (0x1B, 0x61, n)</code> : Alignement (0: Gauche, 1: Centré, 2: Droite).</div>
                  <div>• <code>ESC E 1 (0x1B, 0x45, 1)</code> : Gras pour les montants FCFA & N° de table.</div>
                  <div>• <code>GS V 66 0 (0x1D, 0x56, 0x42, 0x00)</code> : Découpe automatique du papier.</div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 5: Tests */}
          {activeTab === 'TESTS' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-[#0e101a] border border-white/10 space-y-1">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Tests Unitaires (Vitest / Jest)</span>
                  </div>
                  <p className="text-gray-400">
                    Validation des calculs de facturation FCFA, application des remises VIP, décompte précis des doses par bouteille (ex: 14 doses de 5cl pour 70cl), et intégrité de la clôture de caisse Z.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#0e101a] border border-white/10 space-y-1">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Tests E2E & Charge (Playwright / Maestro)</span>
                  </div>
                  <p className="text-gray-400">
                    Simulation du rush nocturne (50 commandes simultanées envoyées au barman en moins de 10 secondes sans latence UI ni perte de paquet).
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-[#171b2d] flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs transition-colors cursor-pointer"
          >
            Fermer le Guide
          </button>
        </div>

      </div>
    </div>
  );
};
