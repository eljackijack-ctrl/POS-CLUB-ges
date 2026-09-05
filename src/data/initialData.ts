import { User, Table, Product, PrinterConfig, CompanyProfile, StartupOptions } from '../types';

export const INITIAL_USERS: User[] = [
  { id: 'u1', name: 'Yao (Serveur)', role: 'SERVEUR', pin: '1111', avatarColor: '#3B82F6', phone: '+228 90 11 22 33' },
  { id: 'u2', name: 'Amina (Serveuse)', role: 'SERVEUR', pin: '2222', avatarColor: '#EC4899', phone: '+228 91 44 55 66' },
  { id: 'u3', name: 'Kofi (Serveur VIP)', role: 'SERVEUR', pin: '3333', avatarColor: '#8B5CF6', phone: '+228 92 77 88 99' },
  { id: 'u4', name: 'Marc (Chef Barman)', role: 'BARMAN', pin: '4444', avatarColor: '#10B981' },
  { id: 'u5', name: 'David (Barman)', role: 'BARMAN', pin: '5555', avatarColor: '#059669' },
  { id: 'u6', name: 'Alexandre (Manager Caisse)', role: 'MANAGER', pin: '9999', avatarColor: '#F59E0B' },
  { id: 'u7', name: 'Direction / Admin', role: 'ADMIN', pin: '0000', avatarColor: '#EF4444' },
];

export const INITIAL_TABLES: Table[] = [
  // Carré Premium & VIP
  { id: 't_c1', number: 'C-01', name: 'Carré Or VIP', zone: 'CARRE_PREMIUM', capacity: 10, status: 'LIBRE', totalAmountFCFA: 0, minSpendFCFA: 300000 },
  { id: 't_c2', number: 'C-02', name: 'Carré Platine Royal', zone: 'CARRE_PREMIUM', capacity: 12, status: 'LIBRE', totalAmountFCFA: 0, minSpendFCFA: 500000 },
  
  // VIP 1 & 2
  { id: 't_v1', number: 'V-01', name: 'VIP Salon 1', zone: 'VIP_1', capacity: 6, status: 'LIBRE', totalAmountFCFA: 0, minSpendFCFA: 150000 },
  { id: 't_v2', number: 'V-02', name: 'VIP Salon 2', zone: 'VIP_1', capacity: 6, status: 'LIBRE', totalAmountFCFA: 0, minSpendFCFA: 150000 },
  { id: 't_v3', number: 'V-03', name: 'VIP Mezzanine A', zone: 'VIP_2', capacity: 8, status: 'LIBRE', totalAmountFCFA: 0, minSpendFCFA: 200000 },
  { id: 't_v4', number: 'V-04', name: 'VIP Mezzanine B', zone: 'VIP_2', capacity: 8, status: 'LIBRE', totalAmountFCFA: 0, minSpendFCFA: 200000 },

  // Piste principale
  { id: 't_p1', number: 'T-01', name: 'Table Piste 1', zone: 'PISTE', capacity: 4, status: 'LIBRE', totalAmountFCFA: 0 },
  { id: 't_p2', number: 'T-02', name: 'Table Piste 2', zone: 'PISTE', capacity: 4, status: 'LIBRE', totalAmountFCFA: 0 },
  { id: 't_p3', number: 'T-03', name: 'Table Piste 3', zone: 'PISTE', capacity: 4, status: 'LIBRE', totalAmountFCFA: 0 },
  { id: 't_p4', number: 'T-04', name: 'Table Piste 4', zone: 'PISTE', capacity: 4, status: 'LIBRE', totalAmountFCFA: 0 },
  { id: 't_p5', number: 'T-05', name: 'Table Piste 5', zone: 'PISTE', capacity: 5, status: 'LIBRE', totalAmountFCFA: 0 },
  { id: 't_p6', number: 'T-06', name: 'Table Piste 6', zone: 'PISTE', capacity: 5, status: 'LIBRE', totalAmountFCFA: 0 },

  // Comptoir Bar
  { id: 't_b1', number: 'BAR-1', name: 'Comptoir Central 1', zone: 'COMPTOIR_BAR', capacity: 2, status: 'LIBRE', totalAmountFCFA: 0 },
  { id: 't_b2', number: 'BAR-2', name: 'Comptoir Central 2', zone: 'COMPTOIR_BAR', capacity: 2, status: 'LIBRE', totalAmountFCFA: 0 },
  { id: 't_b3', number: 'BAR-3', name: 'Comptoir Lounge', zone: 'COMPTOIR_BAR', capacity: 3, status: 'LIBRE', totalAmountFCFA: 0 },

  // Terrasse Lounge
  { id: 't_ter1', number: 'TER-1', name: 'Terrasse Chicha 1', zone: 'TERRASSE', capacity: 4, status: 'LIBRE', totalAmountFCFA: 0 },
  { id: 't_ter2', number: 'TER-2', name: 'Terrasse Chicha 2', zone: 'TERRASSE', capacity: 4, status: 'LIBRE', totalAmountFCFA: 0 },
];

export const INITIAL_PRODUCTS: Product[] = [
  // Champagnes
  {
    id: 'p_dom_lum',
    name: 'Dom Pérignon Luminous 75cl',
    category: 'CHAMPAGNE',
    categoryName: 'Champagne',
    priceFCFA: 350000,
    costPriceFCFA: 220000,
    format: 'BOUTEILLE',
    volumeCl: 75,
    currentStock: 0,
    minStockThreshold: 4,
    isAlcoholic: true,
    badge: 'Prestige VIP',
    description: 'Champagne d’exception étiquette lumineuse LED'
  },
  {
    id: 'p_moet_nec_ros',
    name: 'Moët & Chandon Nectar Impérial Rosé',
    category: 'CHAMPAGNE',
    categoryName: 'Champagne',
    priceFCFA: 120000,
    costPriceFCFA: 75000,
    format: 'BOUTEILLE',
    volumeCl: 75,
    currentStock: 0,
    minStockThreshold: 6,
    isAlcoholic: true,
    badge: 'Top Vente',
    description: 'Le champagne star de la nuit'
  },
  {
    id: 'p_moet_brut',
    name: 'Moët & Chandon Brut Impérial',
    category: 'CHAMPAGNE',
    categoryName: 'Champagne',
    priceFCFA: 95000,
    costPriceFCFA: 58000,
    format: 'BOUTEILLE',
    volumeCl: 75,
    currentStock: 0,
    minStockThreshold: 5,
    isAlcoholic: true,
    description: 'Élégant et festif'
  },
  {
    id: 'p_veuve_clicquot',
    name: 'Veuve Clicquot Brut Carte Jaune',
    category: 'CHAMPAGNE',
    categoryName: 'Champagne',
    priceFCFA: 100000,
    costPriceFCFA: 62000,
    format: 'BOUTEILLE',
    volumeCl: 75,
    currentStock: 0,
    minStockThreshold: 4,
    isAlcoholic: true
  },
  {
    id: 'p_moet_magnum',
    name: 'Moët & Chandon Magnum (1.5L)',
    category: 'CHAMPAGNE',
    categoryName: 'Champagne',
    priceFCFA: 220000,
    costPriceFCFA: 135000,
    format: 'MAGNUM',
    volumeCl: 150,
    currentStock: 0,
    minStockThreshold: 2,
    isAlcoholic: true,
    badge: 'Magnum'
  },

  // Spiritueux (Bouteilles & Doses)
  {
    id: 'p_don_julio_1942',
    name: 'Don Julio 1942 Tequila Anejo',
    category: 'SPIRITUEUX',
    categoryName: 'Spiritueux',
    priceFCFA: 400000,
    costPriceFCFA: 260000,
    format: 'BOUTEILLE',
    volumeCl: 70,
    dosesPerBottle: 14,
    currentStock: 0,
    minStockThreshold: 2,
    isAlcoholic: true,
    badge: 'Ultra Premium'
  },
  {
    id: 'p_hennessy_vsop',
    name: 'Cognac Hennessy VSOP 70cl',
    category: 'SPIRITUEUX',
    categoryName: 'Spiritueux',
    priceFCFA: 110000,
    costPriceFCFA: 68000,
    format: 'BOUTEILLE',
    volumeCl: 70,
    dosesPerBottle: 14,
    currentStock: 0,
    minStockThreshold: 4,
    isAlcoholic: true,
    badge: 'Classique'
  },
  {
    id: 'p_hennessy_vs',
    name: 'Cognac Hennessy VS 70cl',
    category: 'SPIRITUEUX',
    categoryName: 'Spiritueux',
    priceFCFA: 75000,
    costPriceFCFA: 45000,
    format: 'BOUTEILLE',
    volumeCl: 70,
    dosesPerBottle: 14,
    currentStock: 0,
    minStockThreshold: 5,
    isAlcoholic: true
  },
  {
    id: 'p_hennessy_dose',
    name: 'Shot / Dose Hennessy VS (5cl)',
    category: 'SPIRITUEUX',
    categoryName: 'Spiritueux',
    priceFCFA: 7000,
    costPriceFCFA: 3200,
    format: 'VERRE_DOSE',
    volumeCl: 5,
    currentStock: 0,
    minStockThreshold: 10,
    isAlcoholic: true
  },
  {
    id: 'p_jack_daniels',
    name: 'Jack Daniel’s Old No.7 (Bouteille)',
    category: 'SPIRITUEUX',
    categoryName: 'Spiritueux',
    priceFCFA: 60000,
    costPriceFCFA: 35000,
    format: 'BOUTEILLE',
    volumeCl: 70,
    dosesPerBottle: 14,
    currentStock: 0,
    minStockThreshold: 5,
    isAlcoholic: true
  },
  {
    id: 'p_jack_dose',
    name: 'Verre Jack Daniel’s & Cola (5cl)',
    category: 'SPIRITUEUX',
    categoryName: 'Spiritueux',
    priceFCFA: 6000,
    costPriceFCFA: 2500,
    format: 'VERRE_DOSE',
    volumeCl: 5,
    currentStock: 0,
    minStockThreshold: 10,
    isAlcoholic: true
  },
  {
    id: 'p_ciroc_vodka',
    name: 'Vodka Cîroc Premium 70cl',
    category: 'SPIRITUEUX',
    categoryName: 'Spiritueux',
    priceFCFA: 70000,
    costPriceFCFA: 42000,
    format: 'BOUTEILLE',
    volumeCl: 70,
    dosesPerBottle: 14,
    currentStock: 0,
    minStockThreshold: 4,
    isAlcoholic: true
  },
  {
    id: 'p_belvedere_vodka',
    name: 'Vodka Belvedere 70cl',
    category: 'SPIRITUEUX',
    categoryName: 'Spiritueux',
    priceFCFA: 85000,
    costPriceFCFA: 50000,
    format: 'BOUTEILLE',
    volumeCl: 70,
    dosesPerBottle: 14,
    currentStock: 0,
    minStockThreshold: 3,
    isAlcoholic: true
  },
  {
    id: 'p_tequila_shot',
    name: 'Shot Tequila Sierra Silver (4cl)',
    category: 'SPIRITUEUX',
    categoryName: 'Spiritueux',
    priceFCFA: 4000,
    costPriceFCFA: 1500,
    format: 'VERRE_DOSE',
    volumeCl: 4,
    currentStock: 0,
    minStockThreshold: 15,
    isAlcoholic: true
  },

  // Cocktails
  {
    id: 'p_cocktail_mojito',
    name: 'Mojito Cubano Signature',
    category: 'COCKTAILS',
    categoryName: 'Cocktails',
    priceFCFA: 7000,
    costPriceFCFA: 2500,
    format: 'VERRE_DOSE',
    volumeCl: 25,
    currentStock: 0,
    minStockThreshold: 15,
    isAlcoholic: true,
    description: 'Rhum Blanc, Menthe fraîche, Sucre de canne, Citron vert, Perrier'
  },
  {
    id: 'p_cocktail_long_island',
    name: 'Long Island Iced Tea',
    category: 'COCKTAILS',
    categoryName: 'Cocktails',
    priceFCFA: 8000,
    costPriceFCFA: 3000,
    format: 'VERRE_DOSE',
    volumeCl: 25,
    currentStock: 0,
    minStockThreshold: 15,
    isAlcoholic: true,
    badge: 'Corsé'
  },
  {
    id: 'p_cocktail_pina_colada',
    name: 'Piña Colada Fraîche',
    category: 'COCKTAILS',
    categoryName: 'Cocktails',
    priceFCFA: 7000,
    costPriceFCFA: 2600,
    format: 'VERRE_DOSE',
    volumeCl: 25,
    currentStock: 0,
    minStockThreshold: 10,
    isAlcoholic: true
  },
  {
    id: 'p_cocktail_sex_on_beach',
    name: 'Sex on the Beach',
    category: 'COCKTAILS',
    categoryName: 'Cocktails',
    priceFCFA: 7000,
    costPriceFCFA: 2400,
    format: 'VERRE_DOSE',
    volumeCl: 25,
    currentStock: 0,
    minStockThreshold: 10,
    isAlcoholic: true
  },
  {
    id: 'p_cocktail_virgin_mojito',
    name: 'Virgin Mojito (Sans Alcool)',
    category: 'COCKTAILS',
    categoryName: 'Cocktails',
    priceFCFA: 5000,
    costPriceFCFA: 1500,
    format: 'VERRE_DOSE',
    volumeCl: 25,
    currentStock: 0,
    minStockThreshold: 20,
    isAlcoholic: false
  },

  // Bières & Cidres
  {
    id: 'p_heineken',
    name: 'Heineken Bouteille 33cl',
    category: 'BIERES',
    categoryName: 'Bières',
    priceFCFA: 3000,
    costPriceFCFA: 1200,
    format: 'BOUTEILLE',
    volumeCl: 33,
    currentStock: 0,
    minStockThreshold: 24,
    isAlcoholic: true
  },
  {
    id: 'p_corona',
    name: 'Corona Extra 33cl',
    category: 'BIERES',
    categoryName: 'Bières',
    priceFCFA: 4000,
    costPriceFCFA: 1800,
    format: 'BOUTEILLE',
    volumeCl: 33,
    currentStock: 0,
    minStockThreshold: 18,
    isAlcoholic: true
  },
  {
    id: 'p_guinness',
    name: 'Guinness Foreign Extra 33cl',
    category: 'BIERES',
    categoryName: 'Bières',
    priceFCFA: 3500,
    costPriceFCFA: 1400,
    format: 'BOUTEILLE',
    volumeCl: 33,
    currentStock: 0,
    minStockThreshold: 15,
    isAlcoholic: true
  },
  {
    id: 'p_desperados',
    name: 'Desperados Tequila Flavoured 33cl',
    category: 'BIERES',
    categoryName: 'Bières',
    priceFCFA: 4000,
    costPriceFCFA: 1700,
    format: 'BOUTEILLE',
    volumeCl: 33,
    currentStock: 0,
    minStockThreshold: 12,
    isAlcoholic: true
  },

  // Softs & Boissons Énergisantes
  {
    id: 'p_redbull',
    name: 'Red Bull Energy Drink 25cl',
    category: 'SOFTS_ENERGY',
    categoryName: 'Softs & Énergie',
    priceFCFA: 3500,
    costPriceFCFA: 1400,
    format: 'CANETTE',
    volumeCl: 25,
    currentStock: 0,
    minStockThreshold: 30,
    isAlcoholic: false,
    badge: 'Mixer N°1'
  },
  {
    id: 'p_coca_cola',
    name: 'Coca-Cola 33cl',
    category: 'SOFTS_ENERGY',
    categoryName: 'Softs & Énergie',
    priceFCFA: 2000,
    costPriceFCFA: 700,
    format: 'CANETTE',
    volumeCl: 33,
    currentStock: 0,
    minStockThreshold: 24,
    isAlcoholic: false
  },
  {
    id: 'p_sprite',
    name: 'Sprite 33cl',
    category: 'SOFTS_ENERGY',
    categoryName: 'Softs & Énergie',
    priceFCFA: 2000,
    costPriceFCFA: 700,
    format: 'CANETTE',
    volumeCl: 33,
    currentStock: 0,
    minStockThreshold: 20,
    isAlcoholic: false
  },
  {
    id: 'p_eau_minerale',
    name: 'Eau Minérale Voltic / Awa 50cl',
    category: 'SOFTS_ENERGY',
    categoryName: 'Softs & Énergie',
    priceFCFA: 1500,
    costPriceFCFA: 400,
    format: 'BOUTEILLE',
    volumeCl: 50,
    currentStock: 0,
    minStockThreshold: 20,
    isAlcoholic: false
  },
  {
    id: 'p_tonic',
    name: 'Schweppes Tonic 33cl',
    category: 'SOFTS_ENERGY',
    categoryName: 'Softs & Énergie',
    priceFCFA: 2000,
    costPriceFCFA: 700,
    format: 'CANETTE',
    volumeCl: 33,
    currentStock: 0,
    minStockThreshold: 15,
    isAlcoholic: false
  },

  // Packs VIP
  {
    id: 'p_pack_diamant',
    name: 'Pack VIP Diamant (2 Moët Nectar + 1 Hennessy VSOP + 6 Red Bull)',
    category: 'PACKS_VIP',
    categoryName: 'Packs VIP',
    priceFCFA: 320000,
    costPriceFCFA: 210000,
    format: 'PACK',
    currentStock: 0,
    minStockThreshold: 2,
    isAlcoholic: true,
    badge: 'Pack Stars',
    description: 'Offre show pyrotechnique avec feux de Bengale & DJ Shouting inclus'
  },
  {
    id: 'p_pack_royal_dom',
    name: 'Pack Carré Royal (1 Dom Pérignon + 1 Don Julio 1942 + 8 Red Bull)',
    category: 'PACKS_VIP',
    categoryName: 'Packs VIP',
    priceFCFA: 700000,
    costPriceFCFA: 470000,
    format: 'PACK',
    currentStock: 0,
    minStockThreshold: 1,
    isAlcoholic: true,
    badge: 'Show VIP Ultra'
  },

  // Chichas
  {
    id: 'p_chicha_double_pomme',
    name: 'Chicha Premium Double Pomme',
    category: 'CHICHAS',
    categoryName: 'Chichas Lounge',
    priceFCFA: 15000,
    costPriceFCFA: 3000,
    format: 'UNITE',
    currentStock: 0,
    minStockThreshold: 5,
    isAlcoholic: false,
    description: 'Tabac Al Fakher + charbon naturel haute durée'
  },
  {
    id: 'p_chicha_menthe_raisin',
    name: 'Chicha Love 66 / Menthe Glaciale',
    category: 'CHICHAS',
    categoryName: 'Chichas Lounge',
    priceFCFA: 15000,
    costPriceFCFA: 3000,
    format: 'UNITE',
    currentStock: 0,
    minStockThreshold: 5,
    isAlcoholic: false
  },
  {
    id: 'p_recharge_chicha',
    name: 'Recharge Tête & Charbon Chicha',
    category: 'CHICHAS',
    categoryName: 'Chichas Lounge',
    priceFCFA: 7000,
    costPriceFCFA: 1500,
    format: 'UNITE',
    currentStock: 0,
    minStockThreshold: 10,
    isAlcoholic: false
  }
];

export const INITIAL_STARTUP_OPTIONS: StartupOptions = {
  showStartupModalOnLaunch: true,
  defaultScreen: 'TABLES',
  requirePinOnStartup: false,
  isSoundEnabled: true,
  autoConnectBluetooth: true,
  autoPrintReceiptOnCheckout: true,
  printCopiesCount: 1,
  paperWidth: 58,
  defaultZoneFilter: 'ALL'
};

export const INITIAL_COMPANY_PROFILE: CompanyProfile = {
  name: 'LE VELVET VIP CLUB & LOUNGE',
  slogan: 'Cocktails d’Exception, Champagnes & Prestige VIP',
  rccm: 'RCCM: TG-LOM-2024-B-1284',
  nif: 'NIF: 1002345890',
  address: 'Boulevard du 13 Janvier, Zone Nocturne',
  cityCountry: 'Lomé, Togo',
  phone: '+228 90 11 22 33',
  email: 'direction@velvetvipclub.com',
  receiptFooterMessage: 'Merci pour votre confiance ! L’abus d’alcool est dangereux pour la santé, à consommer avec modération.',
  currency: 'FCFA',
  logoIcon: 'crown',
  isConfigured: true,
  configuredAt: '2026-08-20T00:00:00.000Z'
};

export const INITIAL_PRINTER_CONFIG: PrinterConfig = {
  type: 'BLUETOOTH',
  name: 'Imprimante Thermique Bluetooth ESC/POS (58mm/80mm)',
  paperWidth: 58,
  autoPrintReceipt: true,
  isConnected: true,
  bluetoothDeviceName: 'POS-58 Bluetooth Thermal Printer',
  bluetoothDeviceId: 'BT_POS_58_01',
  printCopies: 1,
  printFiscalHeader: true,
  printLogo: true,
  cutPaper: true,
  openCashDrawer: true,
  scanOptions: {
    scanMode: 'POS_PRINTERS_ONLY',
    customNamePrefix: 'POS',
    targetService: 'AUTO',
    scanTimeoutSeconds: 10,
    autoReconnect: true,
    chunkSize: 100,
    includeSimulatedNearby: true
  },
  savedDevices: [
    {
      id: 'BT_POS_58_01',
      name: 'POS-58 Portable Mini Thermal',
      deviceType: 'PRINTER_58',
      rssi: -48,
      paperWidthDefault: 58,
      lastConnectedAt: '2026-08-20T02:30:00.000Z',
      isFavorite: true,
      isPaired: true,
      serviceUuid: '000018f0-0000-1000-8000-00805f9b34fb',
      macOrAddress: '68:37:E9:12:4A:8B'
    },
    {
      id: 'BT_POS_80_BAR',
      name: 'Xprinter XP-P801A (Bar Central)',
      deviceType: 'PRINTER_80',
      rssi: -62,
      paperWidthDefault: 80,
      lastConnectedAt: '2026-08-19T23:15:00.000Z',
      isFavorite: true,
      isPaired: true,
      serviceUuid: 'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
      macOrAddress: '00:1B:35:89:C4:E1'
    },
    {
      id: 'BT_SUNMI_V2',
      name: 'Sunmi V2 PRO Caisse Mobile',
      deviceType: 'POS_TERMINAL',
      rssi: -71,
      paperWidthDefault: 58,
      lastConnectedAt: '2026-08-19T21:40:00.000Z',
      isFavorite: false,
      isPaired: false,
      serviceUuid: '49535343-fe7d-4ae5-8fa9-9fafd205e455',
      macOrAddress: 'AC:22:0B:45:9F:72'
    },
    {
      id: 'BT_MPT_II',
      name: 'MPT-II Bluetooth ESC/POS',
      deviceType: 'PRINTER_58',
      rssi: -84,
      paperWidthDefault: 58,
      isFavorite: false,
      isPaired: false,
      serviceUuid: '0000ffe0-0000-1000-8000-00805f9b34fb',
      macOrAddress: 'DC:0D:30:61:2E:39'
    }
  ]
};

export const ZONE_LABELS: Record<string, { label: string; color: string; badgeBg: string }> = {
  CARRE_PREMIUM: { label: 'Carré Premium / Or', color: '#F59E0B', badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  VIP_1: { label: 'Salons VIP 1', color: '#A855F7', badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
  VIP_2: { label: 'Mezzanine VIP 2', color: '#8B5CF6', badgeBg: 'bg-violet-500/20 text-violet-300 border-violet-500/40' },
  PISTE: { label: 'Piste Centrale', color: '#3B82F6', badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  COMPTOIR_BAR: { label: 'Comptoir Bar', color: '#10B981', badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  TERRASSE: { label: 'Terrasse Lounge', color: '#06B6D4', badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' },
};

import { Payment, DailyBackupSnapshot } from '../types';

export const PRODUCT_CATEGORIES: Array<{ id: string; name: string }> = [
  { id: 'CHAMPAGNE', name: 'Champagnes' },
  { id: 'SPIRITUEUX', name: 'Spiritueux & Whiskies' },
  { id: 'COCKTAILS', name: 'Cocktails Signature' },
  { id: 'BIERES', name: 'Bières & Cidres' },
  { id: 'SOFTS_ENERGY', name: 'Softs & Energy Drinks' },
  { id: 'PACKS_VIP', name: 'Packs & Bouteilles VIP' },
  { id: 'CHICHAS', name: 'Chichas & Accessoires' },
];

export const INITIAL_PAYMENTS: Payment[] = [];

export const INITIAL_DAILY_BACKUPS: DailyBackupSnapshot[] = [];

export interface StarterDatasetOptions {
  name: string;
  templateType: 'VIP_NIGHTCLUB' | 'BAR_LOUNGE' | 'ROOFTOP_CLUB' | 'RESTAURANT_MAQUIS' | 'BLANK_CLEAN';
  enterpriseId: string;
  enterpriseCode: string;
  directorName?: string;
  directorPin?: string;
  phone?: string;
  address?: string;
  currency?: string;
  starterCatalogOption?: 'TEMPLATE_CATALOG' | 'EMPTY';
}

export function createStarterDatasetForTemplate(options: StarterDatasetOptions): {
  profile: CompanyProfile;
  users: User[];
  tables: Table[];
  products: Product[];
  printerConfig: PrinterConfig;
  startupOptions: StartupOptions;
} {
  const dirPin = options.directorPin?.trim() || '0000';
  const dirName = options.directorName?.trim() || 'Directeur Général';
  const entCurrency = options.currency?.trim() || 'FCFA';

  const profile: CompanyProfile = {
    name: options.name,
    enterpriseId: options.enterpriseId,
    enterpriseCode: options.enterpriseCode,
    slogan: options.templateType === 'VIP_NIGHTCLUB' ? 'Nightclub VIP & Lounge Élite'
      : options.templateType === 'BAR_LOUNGE' ? 'Cocktail Bar & Tapas Lounge'
      : options.templateType === 'ROOFTOP_CLUB' ? 'Rooftop Lounge & Sunset Club'
      : options.templateType === 'RESTAURANT_MAQUIS' ? 'Restaurant & Maquis Gastronomique'
      : 'Gestion & Caisse Professionnelle',
    address: options.address || 'Abidjan / Lomé / Dakar / Yaoundé',
    cityCountry: options.address ? options.address : 'Abidjan / Lomé / Dakar',
    phone: options.phone || '+225 07 00 00 00 00',
    email: `contact@${options.enterpriseCode.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
    rccm: `CI-ABJ-${new Date().getFullYear()}-B-${Math.floor(1000 + Math.random() * 9000)}`,
    nif: `${Math.floor(1000000 + Math.random() * 9000000)}`,
    currency: entCurrency,
    receiptFooterMessage: 'Merci pour votre confiance ! À très bientôt.\nSystème de Caisse Pro ClubPOS Cloud',
    logoIcon: options.templateType === 'VIP_NIGHTCLUB' ? 'crown'
      : options.templateType === 'BAR_LOUNGE' ? 'martini'
      : options.templateType === 'ROOFTOP_CLUB' ? 'sparkles'
      : options.templateType === 'RESTAURANT_MAQUIS' ? 'wine'
      : 'flame',
    isConfigured: true,
    configuredAt: new Date().toISOString()
  };

  const users: User[] = [
    {
      id: `u_${options.enterpriseId}_dir`,
      name: dirName,
      role: 'ADMIN',
      pin: dirPin,
      avatarColor: '#EF4444',
      phone: options.phone
    },
    {
      id: `u_${options.enterpriseId}_mgr`,
      name: 'Superviseur Caisse',
      role: 'MANAGER',
      pin: '9999',
      avatarColor: '#F59E0B'
    },
    {
      id: `u_${options.enterpriseId}_bar`,
      name: 'Chef Barman',
      role: 'BARMAN',
      pin: '4444',
      avatarColor: '#10B981'
    },
    {
      id: `u_${options.enterpriseId}_srv1`,
      name: 'Serveur 1',
      role: 'SERVEUR',
      pin: '1111',
      avatarColor: '#3B82F6'
    },
    {
      id: `u_${options.enterpriseId}_srv2`,
      name: 'Serveur 2',
      role: 'SERVEUR',
      pin: '2222',
      avatarColor: '#8B5CF6'
    }
  ];

  let tables: Table[] = [];

  if (options.templateType === 'BAR_LOUNGE') {
    tables = [
      { id: `t_${options.enterpriseId}_b1`, number: 'B-01', name: 'Bar Principal 1', zone: 'COMPTOIR_BAR', capacity: 2, status: 'LIBRE', totalAmountFCFA: 0 },
      { id: `t_${options.enterpriseId}_b2`, number: 'B-02', name: 'Bar Principal 2', zone: 'COMPTOIR_BAR', capacity: 2, status: 'LIBRE', totalAmountFCFA: 0 },
      { id: `t_${options.enterpriseId}_b3`, number: 'B-03', name: 'Bar Comptoir VIP', zone: 'COMPTOIR_BAR', capacity: 3, status: 'LIBRE', totalAmountFCFA: 0 },
      { id: `t_${options.enterpriseId}_l1`, number: 'L-01', name: 'Salon Lounge Cosy', zone: 'VIP_1', capacity: 6, status: 'LIBRE', totalAmountFCFA: 0, minSpendFCFA: 50000 },
      { id: `t_${options.enterpriseId}_l2`, number: 'L-02', name: 'Salon Lounge Ambiance', zone: 'VIP_1', capacity: 6, status: 'LIBRE', totalAmountFCFA: 0, minSpendFCFA: 50000 },
      { id: `t_${options.enterpriseId}_l3`, number: 'L-03', name: 'Salon Grand Club', zone: 'VIP_2', capacity: 8, status: 'LIBRE', totalAmountFCFA: 0, minSpendFCFA: 80000 },
      { id: `t_${options.enterpriseId}_t1`, number: 'T-01', name: 'Terrasse Ombragée 1', zone: 'TERRASSE', capacity: 4, status: 'LIBRE', totalAmountFCFA: 0 },
      { id: `t_${options.enterpriseId}_t2`, number: 'T-02', name: 'Terrasse Ombragée 2', zone: 'TERRASSE', capacity: 4, status: 'LIBRE', totalAmountFCFA: 0 },
      { id: `t_${options.enterpriseId}_s1`, number: 'S-01', name: 'Table Salle 1', zone: 'PISTE', capacity: 4, status: 'LIBRE', totalAmountFCFA: 0 },
      { id: `t_${options.enterpriseId}_s2`, number: 'S-02', name: 'Table Salle 2', zone: 'PISTE', capacity: 4, status: 'LIBRE', totalAmountFCFA: 0 }
    ];
  } else if (options.templateType === 'ROOFTOP_CLUB') {
    tables = [
      { id: `t_${options.enterpriseId}_rf1`, number: 'SKY-1', name: 'Sky Lounge Vue Panoramique', zone: 'CARRE_PREMIUM', capacity: 8, status: 'LIBRE', totalAmountFCFA: 0, minSpendFCFA: 200000 },
      { id: `t_${options.enterpriseId}_rf2`, number: 'SKY-2', name: 'Sky Carré Étoiles', zone: 'CARRE_PREMIUM', capacity: 10, status: 'LIBRE', totalAmountFCFA: 0, minSpendFCFA: 250000 },
      { id: `t_${options.enterpriseId}_v1`, number: 'R-VIP1', name: 'Rooftop VIP 1', zone: 'VIP_1', capacity: 6, status: 'LIBRE', totalAmountFCFA: 0, minSpendFCFA: 100000 },
      { id: `t_${options.enterpriseId}_v2`, number: 'R-VIP2', name: 'Rooftop VIP 2', zone: 'VIP_2', capacity: 6, status: 'LIBRE', totalAmountFCFA: 0, minSpendFCFA: 100000 },
      { id: `t_${options.enterpriseId}_ter1`, number: 'TER-1', name: 'Terrasse Plein Air 1', zone: 'TERRASSE', capacity: 4, status: 'LIBRE', totalAmountFCFA: 0 },
      { id: `t_${options.enterpriseId}_ter2`, number: 'TER-2', name: 'Terrasse Plein Air 2', zone: 'TERRASSE', capacity: 4, status: 'LIBRE', totalAmountFCFA: 0 },
      { id: `t_${options.enterpriseId}_bar1`, number: 'BAR-1', name: 'Bar Rooftop Mixologie', zone: 'COMPTOIR_BAR', capacity: 2, status: 'LIBRE', totalAmountFCFA: 0 },
      { id: `t_${options.enterpriseId}_pst1`, number: 'DJ-1', name: 'Table Avant Scène DJ', zone: 'PISTE', capacity: 5, status: 'LIBRE', totalAmountFCFA: 0 }
    ];
  } else if (options.templateType === 'RESTAURANT_MAQUIS') {
    tables = [
      { id: `t_${options.enterpriseId}_r1`, number: 'R-01', name: 'Table Salle Restaurant 1', zone: 'PISTE', capacity: 4, status: 'LIBRE', totalAmountFCFA: 0 },
      { id: `t_${options.enterpriseId}_r2`, number: 'R-02', name: 'Table Salle Restaurant 2', zone: 'PISTE', capacity: 4, status: 'LIBRE', totalAmountFCFA: 0 },
      { id: `t_${options.enterpriseId}_r3`, number: 'R-03', name: 'Table Familiale', zone: 'PISTE', capacity: 8, status: 'LIBRE', totalAmountFCFA: 0 },
      { id: `t_${options.enterpriseId}_vip1`, number: 'SAL-1', name: 'Salon Privé Climatise', zone: 'VIP_1', capacity: 6, status: 'LIBRE', totalAmountFCFA: 0, minSpendFCFA: 50000 },
      { id: `t_${options.enterpriseId}_vip2`, number: 'SAL-2', name: 'Salon Boisé Affaires', zone: 'VIP_2', capacity: 6, status: 'LIBRE', totalAmountFCFA: 0, minSpendFCFA: 50000 },
      { id: `t_${options.enterpriseId}_ter1`, number: 'MAQ-1', name: 'Espace Maquis Convivial 1', zone: 'TERRASSE', capacity: 6, status: 'LIBRE', totalAmountFCFA: 0 },
      { id: `t_${options.enterpriseId}_ter2`, number: 'MAQ-2', name: 'Espace Maquis Convivial 2', zone: 'TERRASSE', capacity: 6, status: 'LIBRE', totalAmountFCFA: 0 },
      { id: `t_${options.enterpriseId}_bar`, number: 'BAR', name: 'Comptoir Boissons', zone: 'COMPTOIR_BAR', capacity: 2, status: 'LIBRE', totalAmountFCFA: 0 }
    ];
  } else {
    // Default VIP Nightclub or clean slate
    tables = [
      { id: `t_${options.enterpriseId}_c1`, number: 'C-01', name: 'Carré VIP Or', zone: 'CARRE_PREMIUM', capacity: 10, status: 'LIBRE', totalAmountFCFA: 0, minSpendFCFA: 200000 },
      { id: `t_${options.enterpriseId}_v1`, number: 'V-01', name: 'Salon VIP 1', zone: 'VIP_1', capacity: 6, status: 'LIBRE', totalAmountFCFA: 0, minSpendFCFA: 100000 },
      { id: `t_${options.enterpriseId}_v2`, number: 'V-02', name: 'Salon VIP 2', zone: 'VIP_2', capacity: 6, status: 'LIBRE', totalAmountFCFA: 0, minSpendFCFA: 100000 },
      { id: `t_${options.enterpriseId}_p1`, number: 'P-01', name: 'Table Piste 1', zone: 'PISTE', capacity: 4, status: 'LIBRE', totalAmountFCFA: 0 },
      { id: `t_${options.enterpriseId}_p2`, number: 'P-02', name: 'Table Piste 2', zone: 'PISTE', capacity: 4, status: 'LIBRE', totalAmountFCFA: 0 },
      { id: `t_${options.enterpriseId}_p3`, number: 'P-03', name: 'Table Piste 3', zone: 'PISTE', capacity: 4, status: 'LIBRE', totalAmountFCFA: 0 },
      { id: `t_${options.enterpriseId}_b1`, number: 'BAR-1', name: 'Comptoir Bar Central', zone: 'COMPTOIR_BAR', capacity: 2, status: 'LIBRE', totalAmountFCFA: 0 },
      { id: `t_${options.enterpriseId}_ter`, number: 'TER-1', name: 'Terrasse Extérieure', zone: 'TERRASSE', capacity: 4, status: 'LIBRE', totalAmountFCFA: 0 }
    ];
  }

  let products: Product[] = [];
  if (options.starterCatalogOption !== 'EMPTY' && options.templateType !== 'BLANK_CLEAN') {
    // Clone starter catalog with zero current stock so enterprise starts fresh and ready for physical inventory
    products = INITIAL_PRODUCTS.map((p, idx) => ({
      ...p,
      id: `p_${options.enterpriseId}_${idx + 1}`,
      currentStock: 0 // New company starts with clean stock at 0
    }));
  }

  const printerConfig: PrinterConfig = {
    ...INITIAL_PRINTER_CONFIG,
    name: `Imprimante Ticket (${options.name})`
  };

  const startupOptions: StartupOptions = {
    ...INITIAL_STARTUP_OPTIONS,
    showStartupModalOnLaunch: false
  };

  return {
    profile,
    users,
    tables,
    products,
    printerConfig,
    startupOptions
  };
}
