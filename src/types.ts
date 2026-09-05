export type UserRole = 'SERVEUR' | 'BARMAN' | 'MANAGER' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  pin: string;
  avatarColor: string;
  phone?: string;
}

export type TableZone = 'PISTE' | 'VIP_1' | 'VIP_2' | 'CARRE_PREMIUM' | 'COMPTOIR_BAR' | 'TERRASSE';

export type TableStatus = 'LIBRE' | 'OCCUPEE' | 'COMMANDE_EN_ATTENTE' | 'SERVI' | 'ADDITION_DEMANDEE';

export interface Table {
  id: string;
  number: string;
  name: string;
  zone: TableZone;
  capacity: number;
  status: TableStatus;
  currentOrderId?: string;
  assignedServerId?: string;
  assignedServerName?: string;
  totalAmountFCFA: number;
  openedAt?: string;
  minSpendFCFA?: number;
}

export type ProductCategory = 
  | 'CHAMPAGNE' 
  | 'SPIRITUEUX' 
  | 'COCKTAILS' 
  | 'BIERES' 
  | 'SOFTS_ENERGY' 
  | 'PACKS_VIP' 
  | 'CHICHAS';

export type SaleFormat = 'BOUTEILLE' | 'VERRE_DOSE' | 'MAGNUM' | 'CANETTE' | 'PACK' | 'UNITE';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  categoryName: string;
  priceFCFA: number;
  costPriceFCFA: number;
  format: SaleFormat;
  volumeCl?: number;
  dosesPerBottle?: number; // e.g. 15 doses of 5cl per 75cl bottle
  currentStock: number; // in units (bottles, cans) or partial (e.g. 8.4 bottles)
  minStockThreshold: number;
  isAlcoholic: boolean;
  badge?: string;
  description?: string;
}

export type OrderItemStatus = 'EN_ATTENTE' | 'EN_PREPARATION' | 'SERVI' | 'ANNULE';

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  category: ProductCategory;
  format: SaleFormat;
  quantity: number;
  unitPriceFCFA: number;
  totalPriceFCFA: number;
  notes?: string;
  status: OrderItemStatus;
  servedAt?: string;
}

export type OrderStatus = 'ACTIVE' | 'PREPARATION' | 'SERVIE' | 'PAYEE' | 'ANNULEE';

export interface Order {
  id: string;
  orderNumber: string;
  tableId: string;
  tableName: string;
  zone: TableZone;
  serverId: string;
  serverName: string;
  items: OrderItem[];
  totalAmountFCFA: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  paymentId?: string;
  guestCount?: number;
}

export type PaymentMethod = 
  | 'ESPECES' 
  | 'CARTE_BANCAIRE' 
  | 'TMONEY' 
  | 'FLOOZ' 
  | 'ORANGE_MONEY' 
  | 'MTN_MOMO' 
  | 'WAVE';

export interface Payment {
  id: string;
  orderId: string;
  tableId: string;
  tableName: string;
  serverId: string;
  serverName: string;
  cashierId: string;
  cashierName: string;
  subTotalFCFA: number;
  discountFCFA: number;
  discountReason?: string;
  taxFCFA: number;
  totalPaidFCFA: number;
  paymentMethod: PaymentMethod;
  transactionReference?: string;
  cashGivenFCFA?: number;
  changeReturnedFCFA?: number;
  timestamp: string;
  itemsSnapshot: OrderItem[];
}

export type StockMovementType = 'VENTE' | 'REAPPRO' | 'PERTE_CASSE' | 'AJUSTEMENT';

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: StockMovementType;
  quantityChange: number; // positive or negative
  newStockLevel: number;
  reason: string;
  timestamp: string;
  authorName: string;
}

export interface ShiftReport {
  id: string;
  shiftDate: string;
  openedAt: string;
  closedAt: string;
  closedByName: string;
  totalRevenueFCFA: number;
  totalOrdersCount: number;
  totalGuestsServed: number;
  paymentsByMethod: Record<PaymentMethod, number>;
  salesByServer: Array<{ serverId: string; serverName: string; totalFCFA: number; ordersCount: number }>;
  salesByZone: Array<{ zone: TableZone; zoneLabel: string; totalFCFA: number; ordersCount: number }>;
  topProducts: Array<{ productId: string; productName: string; quantitySold: number; totalFCFA: number }>;
  lowStockItemsCount: number;
}

export interface DailyReport {
  date: string;
  dateFormatted: string;
  totalRevenueFCFA: number;
  totalOrdersCount: number;
  averageBasketFCFA: number;
  totalGuests: number;
  paymentsByMethod: Record<PaymentMethod, number>;
  hourlySales: Array<{ hour: string; label: string; revenueFCFA: number; ordersCount: number }>;
  topProducts: Array<{ productId: string; productName: string; category: ProductCategory; categoryName: string; quantitySold: number; totalFCFA: number }>;
  salesByServer: Array<{ serverId: string; serverName: string; totalFCFA: number; ordersCount: number }>;
  salesByZone: Array<{ zone: TableZone; zoneLabel: string; totalFCFA: number; ordersCount: number }>;
  salesByCategory: Array<{ category: ProductCategory; categoryLabel: string; totalFCFA: number; quantitySold: number }>;
  payments: Payment[];
}

export interface MonthlyReport {
  yearMonth: string; // e.g. "2026-08"
  monthLabel: string; // e.g. "Août 2026"
  totalRevenueFCFA: number;
  totalOrdersCount: number;
  averageDailyRevenueFCFA: number;
  averageBasketFCFA: number;
  bestDay: { date: string; dateFormatted: string; revenueFCFA: number } | null;
  dailyBreakdown: Array<{ date: string; dayNumber: number; dayLabel: string; revenueFCFA: number; ordersCount: number }>;
  paymentsByMethod: Record<PaymentMethod, number>;
  salesByCategory: Array<{ category: ProductCategory; categoryLabel: string; totalFCFA: number; quantitySold: number; percentage: number }>;
  topProducts: Array<{ productId: string; productName: string; categoryName: string; quantitySold: number; totalFCFA: number }>;
  salesByServer: Array<{ serverId: string; serverName: string; totalFCFA: number; ordersCount: number }>;
  salesByZone: Array<{ zone: TableZone; zoneLabel: string; totalFCFA: number; ordersCount: number }>;
}

export interface DailyBackupSnapshot {
  id: string;
  backupDate: string;
  createdAt: string;
  authorName: string;
  authorRole: UserRole;
  totalRevenueFCFA: number;
  totalOrdersCount: number;
  cashAmountFCFA: number;
  mobileMoneyAmountFCFA: number;
  cardAmountFCFA: number;
  shiftReport: ShiftReport;
  dataSnapshot: {
    paymentsCount: number;
    ordersCount: number;
    stockMovementsCount: number;
    version: string;
  };
  notes?: string;
}

export interface StartupOptions {
  showStartupModalOnLaunch: boolean;
  defaultScreen: 'TABLES' | 'ORDER' | 'KDS_BAR' | 'STOCK' | 'TRANSACTIONS' | 'REPORTS' | 'ARCHITECTURE';
  requirePinOnStartup: boolean;
  isSoundEnabled: boolean;
  autoConnectBluetooth: boolean;
  autoPrintReceiptOnCheckout: boolean;
  printCopiesCount: number;
  paperWidth: 58 | 80;
  defaultZoneFilter: TableZone | 'ALL';
}

export type EstablishmentTemplateType = 'VIP_NIGHTCLUB' | 'BAR_LOUNGE' | 'ROOFTOP_CLUB' | 'RESTAURANT_MAQUIS' | 'BLANK_CLEAN';

export interface EnterpriseRecord {
  id: string; // Unique ID (e.g. "default", "ent_velvet_vip", "ent_alchimiste")
  code: string; // Short share code or slug
  name: string; // Establishment / Company name
  templateType: EstablishmentTemplateType;
  createdAt: string;
  updatedAt?: string;
  address?: string;
  phone?: string;
  currency?: string;
  profile?: CompanyProfile;
}

export interface CompanyProfile {
  enterpriseId?: string;
  enterpriseCode?: string;
  name: string;
  slogan: string;
  rccm: string;
  nif: string;
  address: string;
  cityCountry: string;
  phone: string;
  email: string;
  receiptFooterMessage: string;
  currency: string;
  logoIcon: 'crown' | 'sparkles' | 'flame' | 'martini' | 'disc' | 'wine';
  isConfigured: boolean;
  configuredAt?: string;
}

export type BluetoothScanMode = 'ALL_DEVICES' | 'POS_PRINTERS_ONLY' | 'CUSTOM_PREFIX' | 'SERVICE_UUID';
export type BluetoothServiceTarget = 'AUTO' | 'STANDARD_ESCPOS' | 'ISSC' | 'HM10' | 'CUSTOM';

export interface BluetoothDeviceRecord {
  id: string;
  name: string;
  deviceType?: 'PRINTER_58' | 'PRINTER_80' | 'POS_TERMINAL' | 'GENERIC_BLE';
  rssi?: number; // Signal strength in dBm (-30 to -95)
  paperWidthDefault: 58 | 80;
  lastConnectedAt?: string;
  isFavorite?: boolean;
  isPaired?: boolean;
  serviceUuid?: string;
  macOrAddress?: string;
}

export interface BluetoothScanOptions {
  scanMode: BluetoothScanMode;
  customNamePrefix?: string;
  targetService: BluetoothServiceTarget;
  customServiceUuid?: string;
  scanTimeoutSeconds: number;
  autoReconnect: boolean;
  chunkSize: number; // 20, 50, 100, 200 bytes
  includeSimulatedNearby: boolean;
}

export interface PrinterConfig {
  type: 'BLUETOOTH' | 'WIFI' | 'SIMULATEUR';
  name: string;
  paperWidth: 58 | 80;
  autoPrintReceipt: boolean;
  isConnected: boolean;
  bluetoothDeviceName?: string;
  bluetoothDeviceId?: string;
  ipAddress?: string;
  printCopies: number; // 1, 2 (Client + Bar), 3
  printFiscalHeader: boolean;
  printLogo: boolean;
  cutPaper: boolean;
  openCashDrawer: boolean;
  // Extended Bluetooth scan settings
  scanOptions?: BluetoothScanOptions;
  savedDevices?: BluetoothDeviceRecord[];
}

export interface SectionClosingRecord {
  id: string;
  zone: TableZone | 'ALL';
  zoneLabel: string;
  closedAt: string;
  closedByName: string;
  closedByRole: UserRole;
  tablesClosedCount: number;
  openTablesResetCount: number;
  totalRevenueFCFA: number;
  totalOrdersCount: number;
  totalGuestsServed: number;
  paymentsByMethod: Record<PaymentMethod, number>;
  salesByServer: Array<{ serverId: string; serverName: string; totalFCFA: number; ordersCount: number }>;
  topProducts: Array<{ productId: string; productName: string; quantitySold: number; totalFCFA: number }>;
  notes?: string;
  status?: 'CLOSED' | 'REOPENED';
  reopenedAt?: string;
  reopenedByName?: string;
}

export interface FullSystemBackupSnapshot {
  id: string;
  backupDate: string;
  createdAt: string;
  authorName: string;
  authorRole: UserRole;
  version: string;
  title: string;
  notes?: string;
  summary: {
    totalRevenueFCFA: number;
    totalOrdersCount: number;
    paymentsCount: number;
    tablesCount: number;
    productsCount: number;
    stockMovementsCount: number;
    usersCount: number;
    sectionsClosedCount: number;
  };
  data: {
    users: User[];
    tables: Table[];
    products: Product[];
    orders: Order[];
    payments: Payment[];
    stockMovements: StockMovement[];
    companyProfile: CompanyProfile;
    printerConfig: PrinterConfig;
    sectionClosings?: SectionClosingRecord[];
    archivedDailyBackups?: DailyBackupSnapshot[];
  };
}

export type SyncLogType = 
  | 'PAYMENT' 
  | 'ORDER' 
  | 'STOCK_MOVEMENT' 
  | 'SECTION_CLOSING' 
  | 'PRODUCT_UPDATE' 
  | 'TABLE_UPDATE' 
  | 'DAILY_BACKUP'
  | 'SETTINGS';

export type SyncLogStatus = 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';

export interface DeviceStationConfig {
  deviceId: string;
  macAddress: string;
  ipAddress: string;
  deviceName: string;
  platform: string;
  autoResetOnNewDevice: boolean;
  registeredAt?: string;
  lastSeenAt?: string;
}

export type DeviceChangeReason = 'NEW_DEVICE' | 'NEW_MAC' | 'NEW_IP' | 'MULTIPLE_CHANGES' | 'FIRST_LAUNCH' | 'MANUAL_SWITCH' | null;

export interface DeviceChangeAlert {
  isNew: boolean;
  reason: DeviceChangeReason;
  message: string;
  currentMac: string;
  currentIp: string;
  currentDeviceId: string;
  previousMac?: string;
  previousIp?: string;
  previousDeviceId?: string;
  timestamp: string;
}

export interface SyncTransactionLog {
  id: string;
  type: SyncLogType;
  entityId: string;
  reference: string;
  details: string;
  amountFCFA?: number;
  createdAt: string;
  lastAttemptAt?: string;
  syncedAt?: string;
  status: SyncLogStatus;
  retryCount: number;
  errorMessage?: string;
  payload?: any;
}

export type LocalDiskStorageMode = 'DIRECTORY_PICKER' | 'OPFS_STORAGE' | 'CAPACITOR_NATIVE' | 'DOWNLOAD_FALLBACK';

export interface LocalDiskBackupConfig {
  autoBackupEnabled: boolean;
  intervalMinutes: number; // 0 = only on closing, 1, 2, 5, 10, 15, 30, 60
  backupOnShiftClosing: boolean;
  backupBeforeReset: boolean;
  maxFilesToKeep: number;
  preferredDirectoryName: string;
  lastBackupAt?: string;
  lastBackupFileName?: string;
  storageMode: LocalDiskStorageMode;
  folderPathOrName?: string;
  autoRestoreOnStartup?: boolean; // Restauration/Ouverture automatique du dernier fichier .JSON à la réouverture de l'application
  lastAutoRestoredAt?: string;
  lastAutoRestoredFileName?: string;
}

export interface AutoRestoredNoticeInfo {
  fileName: string;
  savedAt: string;
  totalRevenueFCFA: number;
  ordersCount: number;
  paymentsCount: number;
}

export interface DiskBackupFileInfo {
  fileName: string;
  fileSizeBytes: number;
  formattedSize: string;
  savedAt: string;
  enterpriseId: string;
  enterpriseName: string;
  totalRevenueFCFA: number;
  ordersCount: number;
  paymentsCount: number;
  backupType: 'AUTO_INTERVAL' | 'SHIFT_CLOSING' | 'MANUAL' | 'BEFORE_RESET';
  snapshotId: string;
}


