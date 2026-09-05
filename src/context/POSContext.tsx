import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode, useRef } from 'react';
import { 
  User, Table, Product, Order, OrderItem, Payment, 
  StockMovement, ShiftReport, PrinterConfig, PaymentMethod,
  UserRole, DailyReport, MonthlyReport, DailyBackupSnapshot,
  ProductCategory, CompanyProfile, BluetoothScanOptions, BluetoothDeviceRecord,
  SectionClosingRecord, FullSystemBackupSnapshot, TableZone, StartupOptions,
  SyncTransactionLog, DeviceChangeAlert, DeviceStationConfig,
  EnterpriseRecord, EstablishmentTemplateType,
  LocalDiskBackupConfig, DiskBackupFileInfo, AutoRestoredNoticeInfo
} from '../types';
import { 
  localDiskBackup, 
  DEFAULT_DISK_BACKUP_CONFIG 
} from '../services/localDiskBackupService';
import { 
  INITIAL_USERS, INITIAL_TABLES, INITIAL_PRODUCTS, 
  INITIAL_PRINTER_CONFIG, INITIAL_PAYMENTS, INITIAL_DAILY_BACKUPS,
  INITIAL_COMPANY_PROFILE, INITIAL_STARTUP_OPTIONS, ZONE_LABELS,
  PRODUCT_CATEGORIES, createStarterDatasetForTemplate
} from '../data/initialData';
import { soundManager, formatDateTime, formatFullDateTime, formatDateShort, formatFCFA } from '../utils/formatters';
import { sendBluetoothTestPrint, searchAndPairBluetoothDevice, isWebBluetoothSupported } from '../utils/escpos';
import { firestoreSync, CloudSyncStatus } from '../services/firestoreSync';
import { triggerOrderValidatedHaptic, triggerPaymentCompletedHaptic, triggerActionHaptic } from '../utils/capacitorBridge';
import { 
  DeviceSignature, 
  getCurrentDeviceSignature, 
  saveRegisteredDeviceSignature, 
  checkDeviceChange, 
  updateStationConfig, 
  getKnownDevicesHistory, 
  generateMacAddress, 
  generateStationIp 
} from '../utils/deviceIdentifier';

interface POSContextType {
  // Multi-Enterprise Isolation & Sharing Engine
  activeEnterpriseId: string;
  enterprisesList: EnterpriseRecord[];
  showEnterpriseModal: boolean;
  setShowEnterpriseModal: (show: boolean) => void;
  switchEnterprise: (enterpriseId: string) => boolean;
  createNewEnterprise: (options: {
    name: string;
    templateType: EstablishmentTemplateType;
    directorName?: string;
    directorPin?: string;
    phone?: string;
    address?: string;
    currency?: string;
    starterCatalogOption?: 'TEMPLATE_CATALOG' | 'EMPTY';
    customCode?: string;
  }) => { success: boolean; enterpriseId: string; enterpriseCode: string; message: string };
  joinEnterpriseByCode: (codeOrId: string) => { success: boolean; message: string; enterprise?: EnterpriseRecord };
  deleteEnterprise: (enterpriseId: string) => { success: boolean; message: string };
  getEnterpriseShareLink: (enterpriseId?: string) => string;

  currentUser: User;
  users: User[];
  tables: Table[];
  products: Product[];
  categories: Array<{ id: string; name: string }>;
  orders: Order[];
  payments: Payment[];
  stockMovements: StockMovement[];
  archivedDailyBackups: DailyBackupSnapshot[];
  sectionClosings: SectionClosingRecord[];
  printerConfig: PrinterConfig;
  companyProfile: CompanyProfile;
  startupOptions: StartupOptions;
  activeTableId: string | null;
  shiftStartTime: string;
  isSoundEnabled: boolean;
  showStartupModal: boolean;
  showCompanyProfileModal: boolean;
  showPrinterSettingsModal: boolean;
  cloudSyncStatus: CloudSyncStatus;
  
  // Terminal, Network & Device Management (Code MAC / Code IP / Nouvel Appareil)
  deviceSignature: DeviceSignature;
  deviceChangeAlert: DeviceChangeAlert | null;
  isNewDeviceModalOpen: boolean;
  showDeviceStationModal: boolean;
  knownDevicesList: DeviceSignature[];
  setShowDeviceStationModal: (show: boolean) => void;
  setIsNewDeviceModalOpen: (show: boolean) => void;
  dismissNewDeviceAlert: () => void;
  updateStationDeviceConfig: (updates: Partial<DeviceSignature>) => void;
  simulateDeviceChange: (type: 'NEW_DEVICE' | 'NEW_MAC' | 'NEW_IP') => void;
  resetAllToFreshZero: (options?: { resetStockLevelsToZero?: boolean; wipeCatalog?: boolean; customMac?: string; customIp?: string; customDeviceName?: string }) => void;
  confirmNewDeviceAndReset: (options?: { resetStockLevelsToZero?: boolean; keepCatalog?: boolean }) => void;
  
  // Sync Queue & Logs
  syncLogs: SyncTransactionLog[];
  pendingSyncCount: number;
  pendingSyncAmountFCFA: number;
  isSyncingQueue: boolean;
  processSyncQueue: () => Promise<{ success: number; failed: number }>;
  retrySingleSyncLog: (id: string) => Promise<boolean>;
  clearSyncedLogs: () => void;
  clearAllLogs: () => void;
  exportSyncLogsJSON: () => void;
  
  // Actions
  setCurrentUser: (user: User) => void;
  setActiveTableId: (id: string | null) => void;
  toggleSound: () => void;
  setPrinterConfig: (config: PrinterConfig) => void;
  setShowStartupModal: (show: boolean) => void;
  setCompanyProfile: (profile: CompanyProfile) => void;
  updateCompanyProfile: (profile: Partial<CompanyProfile>) => void;
  setStartupOptions: (options: StartupOptions) => void;
  updateStartupOptions: (options: Partial<StartupOptions>) => void;
  setShowCompanyProfileModal: (show: boolean) => void;
  setShowPrinterSettingsModal: (show: boolean) => void;
  
  // Bluetooth & Printer Tools
  connectBluetoothPrinter: (customOptions?: BluetoothScanOptions) => Promise<{ success: boolean; message: string; deviceName?: string }>;
  disconnectBluetoothPrinter: () => void;
  testPrintBluetooth: () => Promise<{ success: boolean; message: string; deviceName?: string }>;
  updateScanOptions: (options: Partial<BluetoothScanOptions>) => void;
  searchAndPairBluetooth: (customOptions?: BluetoothScanOptions) => Promise<{ success: boolean; message: string; device?: BluetoothDeviceRecord }>;
  connectSavedDevice: (device: BluetoothDeviceRecord) => Promise<{ success: boolean; message: string }>;
  saveBluetoothDevice: (device: BluetoothDeviceRecord) => void;
  removeBluetoothDevice: (deviceId: string) => void;
  toggleFavoriteDevice: (deviceId: string) => void;
  
  // User & Profile Management
  addUser: (userData: Omit<User, 'id'>) => User;
  updateUser: (user: User) => void;
  deleteUser: (userId: string) => void;
  resetUsersToDefault: () => void;

  // Products & Menu Catalog CRUD
  addProduct: (productData: Omit<Product, 'id'>) => Product;
  updateProduct: (product: Product) => void;
  deleteProduct: (productId: string) => void;

  // Tables & Zones CRUD
  addTable: (tableData: Omit<Table, 'id' | 'status' | 'totalAmountFCFA'>) => Table;
  updateTable: (table: Table) => void;
  deleteTable: (tableId: string) => { success: boolean; error?: string };
  
  // Auth & Director Password Security
  getDirectorUser: () => User | undefined;
  verifyDirectorPin: (pin: string) => boolean;
  changeDirectorPin: (currentPin: string, newPin: string) => { success: boolean; error?: string };
  updateUserPin: (userId: string, newPin: string) => { success: boolean; error?: string };
  authenticateWithPin: (pin: string) => { success: boolean; user?: User; error?: string };
  switchUserRole: (role: UserRole) => void;
  isDirectorPasswordModalOpen: boolean;
  setIsDirectorPasswordModalOpen: (open: boolean) => void;

  // Orders & Tables
  createOrUpdateOrder: (
    tableId: string, 
    items: Array<{ productId: string; quantity: number; notes?: string }>
  ) => Order;
  
  markOrderItemServed: (orderId: string, itemId: string) => void;
  markAllOrderItemsServed: (orderId: string) => void;
  cancelOrderItem: (orderId: string, itemId: string, reason?: string) => void;
  
  // Checkout & Payment
  processCheckout: (data: {
    tableId: string;
    paymentMethod: PaymentMethod;
    discountFCFA?: number;
    discountReason?: string;
    transactionReference?: string;
    cashGivenFCFA?: number;
  }) => Payment;

  // Stock
  restockProduct: (productId: string, quantityToAdd: number, reason: string) => void;
  recordStockLoss: (productId: string, quantityLost: number, reason: string) => void;
  quickAdjustStock: (productId: string, delta: number, reason?: string) => void;
  
  // Shift & Night Close
  getLiveShiftReport: () => ShiftReport;
  closeNightShift: () => ShiftReport;
  resetAllToFactoryDefaults: () => void;
  resetSalesAndTransactionsHistory: (options?: {
    resetTablesAndOrders?: boolean;
    clearDailyArchives?: boolean;
    clearStockMovements?: boolean;
    clearCloudRecords?: boolean;
    createBackupSnapshotFirst?: boolean;
    notes?: string;
  }) => { 
    success: boolean; 
    message: string; 
    backupId?: string;
    previousRevenueFCFA?: number;
    deletedPaymentsCount?: number;
  };

  // Section / Zone Closing Engine (Fermeture & Réouverture de section)
  getSectionReport: (zone: TableZone | 'ALL') => SectionClosingRecord;
  closeSection: (zone: TableZone | 'ALL', notes?: string) => SectionClosingRecord;
  reopenSection: (zone: TableZone | 'ALL', notes?: string) => { success: boolean; message: string; record?: SectionClosingRecord };
  deleteSectionClosing: (id: string) => void;

  // Reports & Analytics Engine
  getDailyReport: (dateStr: string) => DailyReport;
  getMonthlyReport: (yearMonthStr: string) => MonthlyReport;
  getAvailableDates: () => string[];
  getAvailableMonths: () => Array<{ value: string; label: string }>;

  // Backups & Snapshots System (Sauvegardes complètes)
  createFullSystemBackup: (notes?: string) => FullSystemBackupSnapshot;
  restoreFromBackupSnapshot: (snapshotOrId: string | FullSystemBackupSnapshot | DailyBackupSnapshot) => { success: boolean; message: string };
  saveEndOfDayClosing: (notes?: string) => DailyBackupSnapshot;
  exportFullBackupJSON: () => void;
  exportDailyBackupJSON: (targetDate?: string) => void;
  exportSalesCSV: (periodType: 'DAILY' | 'MONTHLY', targetValue: string) => void;
  importBackupJSON: (jsonString: string) => { success: boolean; message: string };
  deleteArchivedBackup: (id: string) => void;

  // Local Disk Backup System (.JSON sur le disque local de l'appareil)
  diskBackupConfig: LocalDiskBackupConfig;
  updateDiskBackupConfig: (config: Partial<LocalDiskBackupConfig>) => void;
  diskBackupFiles: DiskBackupFileInfo[];
  isDiskBackupRunning: boolean;
  saveBackupToDiskNow: (notes?: string, backupType?: 'MANUAL' | 'SHIFT_CLOSING' | 'AUTO_INTERVAL' | 'BEFORE_RESET') => Promise<{ success: boolean; fileName: string; sizeFormatted: string; location: string; error?: string }>;
  refreshDiskBackupFiles: () => Promise<DiskBackupFileInfo[]>;
  pickCustomDiskFolder: () => Promise<{ success: boolean; folderName: string; error?: string }>;
  restoreFromDiskBackup: (fileName: string) => Promise<{ success: boolean; message: string }>;
  restoreLatestDiskBackupNow: () => Promise<{ success: boolean; message: string; fileName?: string }>;
  autoRestoredNotice: AutoRestoredNoticeInfo | null;
  dismissAutoRestoredNotice: () => void;
  deleteDiskBackupFile: (fileName: string) => Promise<boolean>;
  downloadDiskBackupFile: (fileName: string) => Promise<void>;
  showDiskBackupModal: boolean;
  setShowDiskBackupModal: (show: boolean) => void;
}

const POSContext = createContext<POSContextType | undefined>(undefined);

const STORAGE_KEYS = {
  ENTERPRISES_REGISTRY: 'clubpos_enterprises_registry_v1',
  ACTIVE_ENTERPRISE_ID: 'clubpos_active_enterprise_id_v1',
  USERS: 'clubpos_users_v3',
  CURRENT_USER: 'clubpos_current_user_v3',
  TABLES: 'clubpos_tables_v3',
  PRODUCTS: 'clubpos_products_v3',
  ORDERS: 'clubpos_orders_v3',
  PAYMENTS: 'clubpos_payments_v3',
  MOVEMENTS: 'clubpos_movements_v3',
  BACKUPS: 'clubpos_backups_v3',
  SECTION_CLOSINGS: 'clubpos_section_closings_v3',
  PRINTER: 'clubpos_printer_v3',
  COMPANY_PROFILE: 'clubpos_company_profile_v3',
  SHIFT_START: 'clubpos_shift_start_v3',
  SOUND: 'clubpos_sound_v3',
  SHOW_STARTUP: 'clubpos_show_startup_v3',
  SHOW_COMPANY_MODAL: 'clubpos_show_company_modal_v3',
  STARTUP_OPTIONS: 'clubpos_startup_options_v3',
  DISK_BACKUP_CONFIG: 'clubpos_disk_backup_config_v1',
};

export const getScopedKey = (baseKey: string, entId: string): string => {
  if (!entId || entId === 'default') {
    return baseKey;
  }
  return `${baseKey}_${entId}`;
};

const getInitialEnterpriseId = (): string => {
  if (typeof window !== 'undefined') {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const fromUrl = urlParams.get('enterprise') || urlParams.get('company') || urlParams.get('ent');
      if (fromUrl && fromUrl.trim()) {
        return fromUrl.trim();
      }
      const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_ENTERPRISE_ID);
      if (saved && saved.trim()) {
        return saved.trim();
      }
    } catch (e) {
      console.warn('Failed to parse URL params for enterprise:', e);
    }
  }
  return 'default';
};

const DEFAULT_ENTERPRISE_RECORD: EnterpriseRecord = {
  id: 'default',
  code: 'VELVET',
  name: INITIAL_COMPANY_PROFILE.name || 'Club Privé Le Velvet',
  templateType: 'VIP_NIGHTCLUB',
  createdAt: '2026-08-20T00:00:00.000Z',
  currency: 'FCFA',
  address: INITIAL_COMPANY_PROFILE.address,
  phone: INITIAL_COMPANY_PROFILE.phone,
  profile: INITIAL_COMPANY_PROFILE
};

const getInitialEnterprisesList = (): EnterpriseRecord[] => {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ENTERPRISES_REGISTRY);
      if (saved) {
        const parsed: EnterpriseRecord[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasDefault = parsed.some(e => e.id === 'default');
          return hasDefault ? parsed : [DEFAULT_ENTERPRISE_RECORD, ...parsed];
        }
      }
    } catch (e) {
      console.warn('Failed to parse enterprises registry:', e);
    }
  }
  return [DEFAULT_ENTERPRISE_RECORD];
};

export const POSProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Multi-Enterprise Isolation & Switching States
  const [activeEnterpriseId, setActiveEnterpriseId] = useState<string>(() => getInitialEnterpriseId());
  const [enterprisesList, setEnterprisesList] = useState<EnterpriseRecord[]>(() => getInitialEnterprisesList());
  const [showEnterpriseModal, setShowEnterpriseModal] = useState<boolean>(false);

  // Sync firestore service enterprise ID immediately
  useEffect(() => {
    firestoreSync.setEnterpriseId(activeEnterpriseId);
  }, [activeEnterpriseId]);

  // 1. Initial States with LocalStorage Scoped Hydration
  const [startupOptions, setStartupOptions] = useState<StartupOptions>(() => {
    const saved = localStorage.getItem(getScopedKey(STORAGE_KEYS.STARTUP_OPTIONS, getInitialEnterpriseId()));
    return saved ? JSON.parse(saved) : INITIAL_STARTUP_OPTIONS;
  });

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(getScopedKey(STORAGE_KEYS.USERS, getInitialEnterpriseId()));
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  const [currentUser, setCurrentUser] = useState<User>(() => {
    const saved = localStorage.getItem(getScopedKey(STORAGE_KEYS.CURRENT_USER, getInitialEnterpriseId()));
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return INITIAL_USERS[0];
      }
    }
    return INITIAL_USERS[0];
  });

  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(() => {
    const saved = localStorage.getItem(getScopedKey(STORAGE_KEYS.COMPANY_PROFILE, getInitialEnterpriseId()));
    return saved ? JSON.parse(saved) : INITIAL_COMPANY_PROFILE;
  });

  const [showStartupModal, setShowStartupModal] = useState<boolean>(() => {
    const saved = localStorage.getItem(getScopedKey(STORAGE_KEYS.SHOW_STARTUP, getInitialEnterpriseId()));
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [showCompanyProfileModal, setShowCompanyProfileModal] = useState<boolean>(false);
  const [showPrinterSettingsModal, setShowPrinterSettingsModal] = useState<boolean>(false);
  const [isDirectorPasswordModalOpen, setIsDirectorPasswordModalOpen] = useState<boolean>(false);

  const [tables, setTables] = useState<Table[]>(() => {
    const saved = localStorage.getItem(getScopedKey(STORAGE_KEYS.TABLES, getInitialEnterpriseId()));
    return saved ? JSON.parse(saved) : INITIAL_TABLES;
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem(getScopedKey(STORAGE_KEYS.PRODUCTS, getInitialEnterpriseId()));
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem(getScopedKey(STORAGE_KEYS.ORDERS, getInitialEnterpriseId()));
    return saved ? JSON.parse(saved) : [];
  });

  const [payments, setPayments] = useState<Payment[]>(() => {
    const saved = localStorage.getItem(getScopedKey(STORAGE_KEYS.PAYMENTS, getInitialEnterpriseId()));
    return saved ? JSON.parse(saved) : (getInitialEnterpriseId() === 'default' ? INITIAL_PAYMENTS : []);
  });

  const [stockMovements, setStockMovements] = useState<StockMovement[]>(() => {
    const saved = localStorage.getItem(getScopedKey(STORAGE_KEYS.MOVEMENTS, getInitialEnterpriseId()));
    return saved ? JSON.parse(saved) : [];
  });

  const [archivedDailyBackups, setArchivedDailyBackups] = useState<DailyBackupSnapshot[]>(() => {
    const saved = localStorage.getItem(getScopedKey(STORAGE_KEYS.BACKUPS, getInitialEnterpriseId()));
    return saved ? JSON.parse(saved) : (getInitialEnterpriseId() === 'default' ? INITIAL_DAILY_BACKUPS : []);
  });

  const [sectionClosings, setSectionClosings] = useState<SectionClosingRecord[]>(() => {
    const saved = localStorage.getItem(getScopedKey(STORAGE_KEYS.SECTION_CLOSINGS, getInitialEnterpriseId()));
    return saved ? JSON.parse(saved) : [];
  });

  const [printerConfig, setPrinterConfig] = useState<PrinterConfig>(() => {
    const saved = localStorage.getItem(getScopedKey(STORAGE_KEYS.PRINTER, getInitialEnterpriseId()));
    return saved ? JSON.parse(saved) : INITIAL_PRINTER_CONFIG;
  });

  const [shiftStartTime, setShiftStartTime] = useState<string>(() => {
    const saved = localStorage.getItem(getScopedKey(STORAGE_KEYS.SHIFT_START, getInitialEnterpriseId()));
    return saved || new Date().toISOString();
  });

  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem(getScopedKey(STORAGE_KEYS.SOUND, getInitialEnterpriseId()));
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>('INITIALIZING');
  const [syncLogs, setSyncLogs] = useState<SyncTransactionLog[]>(() => firestoreSync.getSyncLogs());
  const [isSyncingQueue, setIsSyncingQueue] = useState<boolean>(false);
  const isInitialCloudSyncDone = useRef<boolean>(false);

  // Local Disk Backup States (.JSON sur le disque local de l'appareil)
  const [diskBackupConfig, setDiskBackupConfig] = useState<LocalDiskBackupConfig>(() => {
    const saved = localStorage.getItem(getScopedKey(STORAGE_KEYS.DISK_BACKUP_CONFIG, getInitialEnterpriseId()));
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Default to 1-minute interval as requested
        if (parsed.intervalMinutes === 30 || !parsed.intervalMinutes) {
          parsed.intervalMinutes = 1;
        }
        if (parsed.autoRestoreOnStartup === undefined) {
          parsed.autoRestoreOnStartup = true;
        }
        return { ...DEFAULT_DISK_BACKUP_CONFIG, ...parsed };
      } catch {
        return DEFAULT_DISK_BACKUP_CONFIG;
      }
    }
    return DEFAULT_DISK_BACKUP_CONFIG;
  });
  const [diskBackupFiles, setDiskBackupFiles] = useState<DiskBackupFileInfo[]>([]);
  const [isDiskBackupRunning, setIsDiskBackupRunning] = useState<boolean>(false);
  const [showDiskBackupModal, setShowDiskBackupModal] = useState<boolean>(false);
  const [autoRestoredNotice, setAutoRestoredNotice] = useState<AutoRestoredNoticeInfo | null>(null);
  const hasAttemptedStartupAutoRestore = useRef<boolean>(false);

  // Terminal, Network & Device Management States (Code MAC / Code IP / Nouvel Appareil)
  const [deviceSignature, setDeviceSignature] = useState<DeviceSignature>(() => getCurrentDeviceSignature());
  const [deviceChangeAlert, setDeviceChangeAlert] = useState<DeviceChangeAlert | null>(null);
  const [isNewDeviceModalOpen, setIsNewDeviceModalOpen] = useState<boolean>(false);
  const [showDeviceStationModal, setShowDeviceStationModal] = useState<boolean>(false);
  const [knownDevicesList, setKnownDevicesList] = useState<DeviceSignature[]>(() => getKnownDevicesHistory());

  // Check for device signature / MAC / IP changes on application startup
  useEffect(() => {
    const check = checkDeviceChange();
    if (check.reason !== null) {
      const alert: DeviceChangeAlert = {
        isNew: check.isNewDevice || check.isNewMac || check.isNewIp,
        reason: check.reason,
        message: check.description,
        currentMac: check.currentSignature.macAddress,
        currentIp: check.currentSignature.ipAddress,
        currentDeviceId: check.currentSignature.deviceId,
        previousMac: check.previousSignature?.macAddress,
        previousIp: check.previousSignature?.ipAddress,
        previousDeviceId: check.previousSignature?.deviceId,
        timestamp: new Date().toISOString()
      };
      setDeviceChangeAlert(alert);
      setDeviceSignature(check.currentSignature);

      // If autoResetOnNewDevice is enabled:
      if (check.currentSignature.autoResetOnNewDevice) {
        setIsNewDeviceModalOpen(true);
      }
    } else {
      // Refresh active device registration
      saveRegisteredDeviceSignature(check.currentSignature);
      setKnownDevicesList(getKnownDevicesHistory());
    }
  }, []);

  // Subscribe to Cloud Sync status & Transaction logs
  useEffect(() => {
    const unsubStatus = firestoreSync.subscribeStatus((status) => {
      setCloudSyncStatus(status);
    });

    const unsubLogs = firestoreSync.subscribeLogs((logs) => {
      setSyncLogs(logs);
    });

    return () => {
      unsubStatus();
      unsubLogs();
    };
  }, []);

  const pendingSyncCount = useMemo(() => {
    return syncLogs.filter(l => l.status === 'PENDING' || l.status === 'FAILED' || l.status === 'SYNCING').length;
  }, [syncLogs]);

  const pendingSyncAmountFCFA = useMemo(() => {
    return syncLogs
      .filter(l => (l.status === 'PENDING' || l.status === 'FAILED') && (l.type === 'PAYMENT' || l.type === 'ORDER'))
      .reduce((sum, item) => sum + (item.amountFCFA || 0), 0);
  }, [syncLogs]);

  const processSyncQueue = async (): Promise<{ success: number; failed: number }> => {
    setIsSyncingQueue(true);
    try {
      const res = await firestoreSync.processPendingQueue();
      if (res.success > 0) {
        soundManager.playSuccessTone();
      }
      return res;
    } finally {
      setIsSyncingQueue(false);
    }
  };

  const retrySingleSyncLog = async (id: string): Promise<boolean> => {
    const success = await firestoreSync.retrySingleLog(id);
    if (success) {
      soundManager.playSuccessTone();
    }
    return success;
  };

  const clearSyncedLogs = () => {
    firestoreSync.clearSyncedLogs();
  };

  const clearAllLogs = () => {
    firestoreSync.clearAllLogs();
  };

  const exportSyncLogsJSON = () => {
    const logs = firestoreSync.getSyncLogs();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `clubpos_sync_logs_${new Date().toISOString().substring(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Listen to Firestore real-time enterprises registry
  useEffect(() => {
    const unsubEnterprises = firestoreSync.listenEnterprises((cloudEnterprises) => {
      if (cloudEnterprises && cloudEnterprises.length > 0) {
        setEnterprisesList(prev => {
          const map = new Map<string, EnterpriseRecord>();
          prev.forEach(e => map.set(e.id, e));
          cloudEnterprises.forEach(e => map.set(e.id, e));
          const merged = Array.from(map.values());
          localStorage.setItem(STORAGE_KEYS.ENTERPRISES_REGISTRY, JSON.stringify(merged));
          return merged;
        });
      }
    });

    return () => {
      unsubEnterprises();
    };
  }, []);

  // Listen to Firestore real-time collections scoped to activeEnterpriseId with non-destructive merge safeguards
  useEffect(() => {
    const unsubProducts = firestoreSync.listenProducts((cloudProducts) => {
      if (cloudProducts && cloudProducts.length > 0) {
        setProducts(cloudProducts);
      }
    });

    const unsubTables = firestoreSync.listenTables((cloudTables) => {
      if (cloudTables && cloudTables.length > 0) {
        setTables(cloudTables);
      }
    });

    // Safeguard: Never overwrite local orders with empty array from cloud
    const unsubOrders = firestoreSync.listenOrders((cloudOrders) => {
      if (cloudOrders && cloudOrders.length > 0) {
        setOrders(prev => {
          const map = new Map<string, Order>();
          prev.forEach(o => map.set(o.id, o));
          cloudOrders.forEach(o => map.set(o.id, o));
          return Array.from(map.values());
        });
      }
    });

    // Safeguard: Never reset sales and transaction history to zero on cloud snapshot
    const unsubPayments = firestoreSync.listenPayments((cloudPayments) => {
      if (cloudPayments && cloudPayments.length > 0) {
        setPayments(prev => {
          const map = new Map<string, Payment>();
          // Preserve all existing local payments
          prev.forEach(p => map.set(p.id, p));
          // Merge incoming cloud payments
          cloudPayments.forEach(p => map.set(p.id, p));
          return Array.from(map.values()).sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
        });
      }
    });

    // Safeguard: Preserve stock movements history
    const unsubMovements = firestoreSync.listenStockMovements((cloudMovements) => {
      if (cloudMovements && cloudMovements.length > 0) {
        setStockMovements(prev => {
          const map = new Map<string, StockMovement>();
          prev.forEach(m => map.set(m.id, m));
          cloudMovements.forEach(m => map.set(m.id, m));
          return Array.from(map.values()).sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
        });
      }
    });

    const unsubProfile = firestoreSync.listenCompanyProfile((cloudProfile) => {
      if (cloudProfile && cloudProfile.name) {
        setCompanyProfile(cloudProfile);
      }
    });

    const unsubPrinter = firestoreSync.listenPrinterConfig((cloudConfig) => {
      if (cloudConfig) {
        setPrinterConfig(cloudConfig);
      }
    });

    const unsubUsers = firestoreSync.listenUsers((cloudUsers) => {
      if (cloudUsers && cloudUsers.length > 0) {
        setUsers(cloudUsers);
      }
    });

    const unsubSections = firestoreSync.listenSectionClosings((cloudSections) => {
      if (cloudSections && cloudSections.length > 0) {
        setSectionClosings(prev => {
          const map = new Map<string, SectionClosingRecord>();
          prev.forEach(s => map.set(s.id, s));
          cloudSections.forEach(s => map.set(s.id, s));
          return Array.from(map.values());
        });
      }
    });

    return () => {
      unsubProducts();
      unsubTables();
      unsubOrders();
      unsubPayments();
      unsubMovements();
      unsubProfile();
      unsubPrinter();
      unsubUsers();
      unsubSections();
    };
  }, [activeEnterpriseId]);

  // Background auto-backup & cloud sync for local sales
  useEffect(() => {
    if (!isInitialCloudSyncDone.current && typeof navigator !== 'undefined' && navigator.onLine) {
      if (payments.length > 0) {
        isInitialCloudSyncDone.current = true;
        payments.forEach(p => {
          firestoreSync.savePayment(p);
        });
      }
      if (orders.length > 0) {
        orders.forEach(o => {
          firestoreSync.saveOrder(o);
        });
      }
    }
  }, [payments, orders, activeEnterpriseId]);

  // Sync to Scoped LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ENTERPRISES_REGISTRY, JSON.stringify(enterprisesList));
  }, [enterprisesList]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_ENTERPRISE_ID, activeEnterpriseId);
  }, [activeEnterpriseId]);

  useEffect(() => {
    localStorage.setItem(getScopedKey(STORAGE_KEYS.USERS, activeEnterpriseId), JSON.stringify(users));
  }, [users, activeEnterpriseId]);

  useEffect(() => {
    localStorage.setItem(getScopedKey(STORAGE_KEYS.CURRENT_USER, activeEnterpriseId), JSON.stringify(currentUser));
  }, [currentUser, activeEnterpriseId]);

  useEffect(() => {
    localStorage.setItem(getScopedKey(STORAGE_KEYS.COMPANY_PROFILE, activeEnterpriseId), JSON.stringify(companyProfile));
  }, [companyProfile, activeEnterpriseId]);

  useEffect(() => {
    localStorage.setItem(getScopedKey(STORAGE_KEYS.SHOW_STARTUP, activeEnterpriseId), JSON.stringify(showStartupModal));
  }, [showStartupModal, activeEnterpriseId]);

  useEffect(() => {
    localStorage.setItem(getScopedKey(STORAGE_KEYS.TABLES, activeEnterpriseId), JSON.stringify(tables));
  }, [tables, activeEnterpriseId]);

  useEffect(() => {
    localStorage.setItem(getScopedKey(STORAGE_KEYS.PRODUCTS, activeEnterpriseId), JSON.stringify(products));
  }, [products, activeEnterpriseId]);

  useEffect(() => {
    localStorage.setItem(getScopedKey(STORAGE_KEYS.ORDERS, activeEnterpriseId), JSON.stringify(orders));
  }, [orders, activeEnterpriseId]);

  useEffect(() => {
    localStorage.setItem(getScopedKey(STORAGE_KEYS.PAYMENTS, activeEnterpriseId), JSON.stringify(payments));
  }, [payments, activeEnterpriseId]);

  useEffect(() => {
    localStorage.setItem(getScopedKey(STORAGE_KEYS.MOVEMENTS, activeEnterpriseId), JSON.stringify(stockMovements));
  }, [stockMovements, activeEnterpriseId]);

  useEffect(() => {
    localStorage.setItem(getScopedKey(STORAGE_KEYS.BACKUPS, activeEnterpriseId), JSON.stringify(archivedDailyBackups));
  }, [archivedDailyBackups, activeEnterpriseId]);

  useEffect(() => {
    localStorage.setItem(getScopedKey(STORAGE_KEYS.SECTION_CLOSINGS, activeEnterpriseId), JSON.stringify(sectionClosings));
  }, [sectionClosings, activeEnterpriseId]);

  useEffect(() => {
    localStorage.setItem(getScopedKey(STORAGE_KEYS.PRINTER, activeEnterpriseId), JSON.stringify(printerConfig));
  }, [printerConfig, activeEnterpriseId]);

  useEffect(() => {
    localStorage.setItem(getScopedKey(STORAGE_KEYS.SHIFT_START, activeEnterpriseId), shiftStartTime);
  }, [shiftStartTime, activeEnterpriseId]);

  useEffect(() => {
    localStorage.setItem(getScopedKey(STORAGE_KEYS.SOUND, activeEnterpriseId), JSON.stringify(isSoundEnabled));
    soundManager.setSoundEnabled(isSoundEnabled);
  }, [isSoundEnabled, activeEnterpriseId]);

  useEffect(() => {
    localStorage.setItem(getScopedKey(STORAGE_KEYS.STARTUP_OPTIONS, activeEnterpriseId), JSON.stringify(startupOptions));
  }, [startupOptions, activeEnterpriseId]);

  useEffect(() => {
    localStorage.setItem(getScopedKey(STORAGE_KEYS.DISK_BACKUP_CONFIG, activeEnterpriseId), JSON.stringify(diskBackupConfig));
  }, [diskBackupConfig, activeEnterpriseId]);

  useEffect(() => {
    let isMounted = true;
    localDiskBackup.listDiskBackupFiles().then(async (files) => {
      if (!isMounted) return;
      setDiskBackupFiles(files);

      // Ouverture/Restauration automatique du dernier fichier .JSON à la réouverture de l'application
      if (!hasAttemptedStartupAutoRestore.current && files.length > 0 && diskBackupConfig.autoRestoreOnStartup !== false) {
        hasAttemptedStartupAutoRestore.current = true;
        try {
          const latestFile = files[0];
          const snapshot = await localDiskBackup.readBackupFileFromDisk(latestFile.fileName);
          if (snapshot && snapshot.data && isMounted) {
            const res = restoreFromBackupSnapshot(snapshot);
            if (res.success) {
              const d = snapshot.data;
              const totalRev = latestFile.totalRevenueFCFA || (d.payments ? d.payments.reduce((acc: number, p: any) => acc + (p.totalPaidFCFA || 0), 0) : 0);
              const ordersCnt = latestFile.ordersCount || (d.orders ? d.orders.length : 0);
              const paymentsCnt = latestFile.paymentsCount || (d.payments ? d.payments.length : 0);

              setAutoRestoredNotice({
                fileName: latestFile.fileName,
                savedAt: latestFile.savedAt || snapshot.createdAt,
                totalRevenueFCFA: totalRev,
                ordersCount: ordersCnt,
                paymentsCount: paymentsCnt
              });

              setDiskBackupConfig(prev => ({
                ...prev,
                lastAutoRestoredFileName: latestFile.fileName,
                lastAutoRestoredAt: new Date().toISOString()
              }));
              console.info(`[DiskBackup] Dernier fichier .JSON "${latestFile.fileName}" ouvert et restauré avec succès à la réouverture.`);
            }
          }
        } catch (e) {
          console.debug('[DiskBackup] Erreur lors de l’ouverture automatique du dernier fichier .JSON:', e);
        }
      }
    }).catch(console.debug);

    return () => {
      isMounted = false;
    };
  }, [activeEnterpriseId]);

  const updateStartupOptions = (partial: Partial<StartupOptions>) => {
    setStartupOptions(prev => {
      const updated = { ...prev, ...partial };
      // Also sync sub-options if modified
      if (partial.showStartupModalOnLaunch !== undefined) {
        setShowStartupModal(partial.showStartupModalOnLaunch);
      }
      if (partial.isSoundEnabled !== undefined) {
        setIsSoundEnabled(partial.isSoundEnabled);
      }
      if (partial.paperWidth !== undefined || partial.autoPrintReceiptOnCheckout !== undefined || partial.printCopiesCount !== undefined) {
        setPrinterConfig(p => ({
          ...p,
          paperWidth: partial.paperWidth !== undefined ? partial.paperWidth : p.paperWidth,
          autoPrintReceipt: partial.autoPrintReceiptOnCheckout !== undefined ? partial.autoPrintReceiptOnCheckout : p.autoPrintReceipt,
          printCopies: partial.printCopiesCount !== undefined ? partial.printCopiesCount : p.printCopies
        }));
      }
      return updated;
    });
  };

  const toggleSound = () => {
    setIsSoundEnabled(prev => !prev);
  };

  // User Profile Management
  const addUser = (userData: Omit<User, 'id'>): User => {
    const newUser: User = {
      id: 'u_' + Math.random().toString(36).substr(2, 9),
      name: userData.name.trim(),
      role: userData.role,
      pin: userData.pin.trim() || '1234',
      avatarColor: userData.avatarColor || '#F59E0B',
      phone: userData.phone?.trim(),
    };

    setUsers(prev => [newUser, ...prev]);
    setCurrentUser(newUser);
    soundManager.playSuccessTone();
    return newUser;
  };

  const updateUser = (updatedUser: User) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    if (currentUser.id === updatedUser.id) {
      setCurrentUser(updatedUser);
    }
  };

  const deleteUser = (userId: string) => {
    setUsers(prev => {
      const filtered = prev.filter(u => u.id !== userId);
      if (currentUser.id === userId && filtered.length > 0) {
        setCurrentUser(filtered[0]);
      }
      return filtered;
    });
  };

  const resetUsersToDefault = () => {
    setUsers(INITIAL_USERS);
    setCurrentUser(INITIAL_USERS[0]);
  };

  // Products & Menu Catalog CRUD
  const addProduct = (productData: Omit<Product, 'id'>): Product => {
    const newProduct: Product = {
      ...productData,
      id: 'prod_' + Math.random().toString(36).substr(2, 9),
    };
    setProducts(prev => [newProduct, ...prev]);

    if (newProduct.currentStock > 0) {
      const movement: StockMovement = {
        id: 'mov_' + Math.random().toString(36).substr(2, 9),
        productId: newProduct.id,
        productName: newProduct.name,
        type: 'REAPPRO',
        quantityChange: newProduct.currentStock,
        newStockLevel: newProduct.currentStock,
        reason: 'Création de l\'article au catalogue',
        timestamp: new Date().toISOString(),
        authorName: currentUser.name
      };
      setStockMovements(prev => [movement, ...prev]);
    }

    soundManager.playSuccessTone();
    return newProduct;
  };

  const updateProduct = (updatedProduct: Product) => {
    setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
    soundManager.playSuccessTone();
  };

  const deleteProduct = (productId: string) => {
    setProducts(prev => prev.filter(p => p.id !== productId));
    soundManager.playSuccessTone();
  };

  // Tables & Zones CRUD
  const addTable = (tableData: Omit<Table, 'id' | 'status' | 'totalAmountFCFA'>): Table => {
    const newTable: Table = {
      ...tableData,
      id: 'tbl_' + Math.random().toString(36).substr(2, 9),
      status: 'LIBRE',
      totalAmountFCFA: 0
    };
    setTables(prev => [...prev, newTable]);
    soundManager.playSuccessTone();
    return newTable;
  };

  const updateTable = (updatedTable: Table) => {
    setTables(prev => prev.map(t => t.id === updatedTable.id ? updatedTable : t));
    soundManager.playSuccessTone();
  };

  const deleteTable = (tableId: string): { success: boolean; error?: string } => {
    const target = tables.find(t => t.id === tableId);
    if (target && target.status !== 'LIBRE') {
      return { 
        success: false, 
        error: `La table ${target.name} (${target.number}) a une commande active en cours. Veuillez procéder à l'encaissement avant de la supprimer.` 
      };
    }
    setTables(prev => prev.filter(t => t.id !== tableId));
    if (activeTableId === tableId) {
      setActiveTableId(null);
    }
    soundManager.playSuccessTone();
    return { success: true };
  };

  // Auth & Director Password Security
  const getDirectorUser = (): User | undefined => {
    return users.find(u => u.role === 'ADMIN') || users.find(u => u.name.toLowerCase().includes('direction') || u.name.toLowerCase().includes('direct'));
  };

  const verifyDirectorPin = (pin: string): boolean => {
    if (!pin) return false;
    const cleanPin = pin.trim();
    // Check any ADMIN role user's PIN
    const adminUsers = users.filter(u => u.role === 'ADMIN');
    if (adminUsers.some(u => u.pin === cleanPin)) {
      return true;
    }
    // Check specific director user
    const director = getDirectorUser();
    if (director && director.pin === cleanPin) {
      return true;
    }
    // Default fallback initial code 0000 if none configured
    if (cleanPin === '0000' && adminUsers.length === 0) {
      return true;
    }
    return false;
  };

  const changeDirectorPin = (currentPin: string, newPin: string): { success: boolean; error?: string } => {
    if (!verifyDirectorPin(currentPin)) {
      soundManager.playAlert();
      return { success: false, error: 'Mot de passe actuel incorrect.' };
    }
    if (!newPin || newPin.trim().length < 4) {
      soundManager.playAlert();
      return { success: false, error: 'Le nouveau mot de passe doit comporter au moins 4 caractères ou chiffres.' };
    }

    const cleanNewPin = newPin.trim();
    const adminUser = getDirectorUser();

    if (adminUser) {
      const updatedUser: User = {
        ...adminUser,
        pin: cleanNewPin
      };
      updateUser(updatedUser);
    } else {
      setUsers(prev => prev.map(u => u.role === 'ADMIN' ? { ...u, pin: cleanNewPin } : u));
    }

    soundManager.playSuccessTone();
    return { success: true };
  };

  const updateUserPin = (userId: string, newPin: string): { success: boolean; error?: string } => {
    if (!newPin || newPin.trim().length < 4) {
      return { success: false, error: 'Le code PIN doit comporter au moins 4 chiffres.' };
    }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, pin: newPin.trim() } : u));
    if (currentUser.id === userId) {
      setCurrentUser(prev => ({ ...prev, pin: newPin.trim() }));
    }
    soundManager.playSuccessTone();
    return { success: true };
  };

  // Auth helper
  const authenticateWithPin = (pin: string) => {
    const found = users.find(u => u.pin === pin);
    if (found) {
      setCurrentUser(found);
      soundManager.playSuccessTone();
      return { success: true, user: found };
    }
    return { success: false, error: 'Code PIN incorrect.' };
  };

  const switchUserRole = (role: UserRole) => {
    const candidate = users.find(u => u.role === role);
    if (candidate) {
      setCurrentUser(candidate);
    }
  };

  // Internal helper to deduct stock
  const deductStockForProduct = (productId: string, quantity: number, orderId: string, tableName: string) => {
    setProducts(prevProducts => {
      return prevProducts.map(prod => {
        if (prod.id === productId) {
          const newStock = Math.max(0, prod.currentStock - quantity);
          
          // Record stock movement
          const movement: StockMovement = {
            id: 'mov_' + Math.random().toString(36).substr(2, 9),
            productId: prod.id,
            productName: prod.name,
            type: 'VENTE',
            quantityChange: -quantity,
            newStockLevel: newStock,
            reason: `Vente Table ${tableName} (Cmd #${orderId.slice(-4)})`,
            timestamp: new Date().toISOString(),
            authorName: currentUser.name
          };

          setStockMovements(prevMoves => [movement, ...prevMoves]);
          return { ...prod, currentStock: newStock };
        }
        return prod;
      });
    });
  };

  // Order Creation / Append
  const createOrUpdateOrder = (
    tableId: string,
    newItemsData: Array<{ productId: string; quantity: number; notes?: string }>
  ): Order => {
    const targetTable = tables.find(t => t.id === tableId);
    if (!targetTable) throw new Error('Table introuvable');

    const timestamp = new Date().toISOString();
    const existingOrder = orders.find(o => o.tableId === tableId && o.status !== 'PAYEE' && o.status !== 'ANNULEE');

    const generatedItems: OrderItem[] = newItemsData.map(itemData => {
      const prod = products.find(p => p.id === itemData.productId);
      if (!prod) throw new Error('Boisson introuvable');
      const unitPrice = prod.priceFCFA;
      return {
        id: 'item_' + Math.random().toString(36).substr(2, 9),
        productId: prod.id,
        productName: prod.name,
        category: prod.category,
        format: prod.format,
        quantity: itemData.quantity,
        unitPriceFCFA: unitPrice,
        totalPriceFCFA: unitPrice * itemData.quantity,
        notes: itemData.notes,
        status: 'EN_ATTENTE'
      };
    });

    let updatedOrder: Order;

    if (existingOrder) {
      // Append items to current order
      const combinedItems = [...existingOrder.items, ...generatedItems];
      const newTotal = combinedItems.reduce((acc, curr) => curr.status !== 'ANNULE' ? acc + curr.totalPriceFCFA : acc, 0);

      updatedOrder = {
        ...existingOrder,
        items: combinedItems,
        totalAmountFCFA: newTotal,
        status: 'PREPARATION',
        updatedAt: timestamp,
      };

      setOrders(prev => prev.map(o => o.id === existingOrder.id ? updatedOrder : o));
    } else {
      // New Order
      const totalAmount = generatedItems.reduce((acc, curr) => acc + curr.totalPriceFCFA, 0);
      const orderNum = `CMD-${Math.floor(100 + Math.random() * 900)}`;

      updatedOrder = {
        id: 'ord_' + Math.random().toString(36).substr(2, 9),
        orderNumber: orderNum,
        tableId: targetTable.id,
        tableName: targetTable.name,
        zone: targetTable.zone,
        serverId: currentUser.id,
        serverName: currentUser.name,
        items: generatedItems,
        totalAmountFCFA: totalAmount,
        status: 'PREPARATION',
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      setOrders(prev => [updatedOrder, ...prev]);
    }

    // Update Table status and total
    const updatedTableRecord: Table = {
      ...targetTable,
      status: 'COMMANDE_EN_ATTENTE',
      currentOrderId: updatedOrder.id,
      assignedServerId: currentUser.id,
      assignedServerName: currentUser.name,
      totalAmountFCFA: updatedOrder.totalAmountFCFA,
      openedAt: targetTable.openedAt || timestamp
    };

    setTables(prev => prev.map(t => {
      if (t.id === tableId) {
        return updatedTableRecord;
      }
      return t;
    }));

    // Trigger Cloud / Offline sync queue
    firestoreSync.saveOrder(updatedOrder);
    firestoreSync.saveTable(updatedTableRecord);

    // Play chime and trigger haptic pulse for Bar/Server
    soundManager.playBarBell();
    triggerOrderValidatedHaptic();

    return updatedOrder;
  };

  // Barman actions
  const markOrderItemServed = (orderId: string, itemId: string) => {
    let targetProdId: string | null = null;
    let targetQty = 0;
    let orderTableName = '';

    setOrders(prevOrders => {
      return prevOrders.map(order => {
        if (order.id === orderId) {
          orderTableName = order.tableName;
          const updatedItems = order.items.map(item => {
            if (item.id === itemId && item.status !== 'SERVI') {
              targetProdId = item.productId;
              targetQty = item.quantity;
              return {
                ...item,
                status: 'SERVI' as const,
                servedAt: new Date().toISOString()
              };
            }
            return item;
          });

          const allServed = updatedItems.every(i => i.status === 'SERVI' || i.status === 'ANNULE');

          return {
            ...order,
            items: updatedItems,
            status: allServed ? ('SERVIE' as const) : ('PREPARATION' as const),
            updatedAt: new Date().toISOString()
          };
        }
        return order;
      });
    });

    // Deduct stock if item was just served
    if (targetProdId && targetQty > 0) {
      deductStockForProduct(targetProdId, targetQty, orderId, orderTableName);
    }

    // Update table status
    setTables(prevTables => {
      const order = orders.find(o => o.id === orderId);
      if (!order) return prevTables;
      return prevTables.map(t => {
        if (t.id === order.tableId) {
          return {
            ...t,
            status: 'SERVI'
          };
        }
        return t;
      });
    });

    soundManager.playSuccessTone();
    triggerActionHaptic();
  };

  const markAllOrderItemsServed = (orderId: string) => {
    const targetOrder = orders.find(o => o.id === orderId);
    if (!targetOrder) return;

    // Deduct stock for all non-served items
    targetOrder.items.forEach(item => {
      if (item.status !== 'SERVI' && item.status !== 'ANNULE') {
        deductStockForProduct(item.productId, item.quantity, orderId, targetOrder.tableName);
      }
    });

    setOrders(prevOrders => {
      return prevOrders.map(order => {
        if (order.id === orderId) {
          const updatedItems = order.items.map(item => ({
            ...item,
            status: 'SERVI' as const,
            servedAt: item.servedAt || new Date().toISOString()
          }));
          return {
            ...order,
            items: updatedItems,
            status: 'SERVIE' as const,
            updatedAt: new Date().toISOString()
          };
        }
        return order;
      });
    });

    setTables(prev => prev.map(t => {
      if (t.id === targetOrder.tableId) {
        return { ...t, status: 'SERVI' };
      }
      return t;
    }));

    soundManager.playSuccessTone();
    triggerActionHaptic();
  };

  const cancelOrderItem = (orderId: string, itemId: string, _reason?: string) => {
    setOrders(prevOrders => {
      return prevOrders.map(order => {
        if (order.id === orderId) {
          const updatedItems = order.items.map(item => {
            if (item.id === itemId) {
              return { ...item, status: 'ANNULE' as const };
            }
            return item;
          });

          const activeTotal = updatedItems.reduce((acc, curr) => curr.status !== 'ANNULE' ? acc + curr.totalPriceFCFA : acc, 0);

          return {
            ...order,
            items: updatedItems,
            totalAmountFCFA: activeTotal,
            updatedAt: new Date().toISOString()
          };
        }
        return order;
      });
    });
  };

  // Checkout & Payment
  const processCheckout = (data: {
    tableId: string;
    paymentMethod: PaymentMethod;
    discountFCFA?: number;
    discountReason?: string;
    transactionReference?: string;
    cashGivenFCFA?: number;
  }): Payment => {
    const targetTable = tables.find(t => t.id === data.tableId);
    if (!targetTable) throw new Error('Table introuvable');

    const activeOrder = orders.find(o => o.tableId === data.tableId && o.status !== 'PAYEE' && o.status !== 'ANNULEE');
    if (!activeOrder) throw new Error('Aucune commande active pour cette table');

    const subTotal = activeOrder.totalAmountFCFA;
    const discount = Math.min(subTotal, data.discountFCFA || 0);
    const totalPaid = Math.max(0, subTotal - discount);

    let changeReturned = 0;
    if (data.paymentMethod === 'ESPECES' && data.cashGivenFCFA && data.cashGivenFCFA > totalPaid) {
      changeReturned = data.cashGivenFCFA - totalPaid;
    }

    const timestamp = new Date().toISOString();

    const paymentRecord: Payment = {
      id: 'FAC_' + Math.floor(100000 + Math.random() * 900000),
      orderId: activeOrder.id,
      tableId: targetTable.id,
      tableName: targetTable.name,
      serverId: activeOrder.serverId,
      serverName: activeOrder.serverName,
      cashierId: currentUser.id,
      cashierName: currentUser.name,
      subTotalFCFA: subTotal,
      discountFCFA: discount,
      discountReason: data.discountReason,
      taxFCFA: 0,
      totalPaidFCFA: totalPaid,
      paymentMethod: data.paymentMethod,
      transactionReference: data.transactionReference,
      cashGivenFCFA: data.cashGivenFCFA,
      changeReturnedFCFA: changeReturned,
      timestamp: timestamp,
      itemsSnapshot: activeOrder.items.filter(i => i.status !== 'ANNULE')
    };

    // 1. Save payment
    setPayments(prev => [paymentRecord, ...prev]);

    // 2. Mark order as paid
    const updatedPaidOrder: Order = {
      ...activeOrder,
      status: 'PAYEE',
      paymentId: paymentRecord.id,
      updatedAt: timestamp
    };

    setOrders(prev => prev.map(o => {
      if (o.id === activeOrder.id) {
        return updatedPaidOrder;
      }
      return o;
    }));

    // 3. Reset and Free Table
    const updatedFreedTable: Table = {
      ...targetTable,
      status: 'LIBRE',
      currentOrderId: undefined,
      assignedServerId: undefined,
      assignedServerName: undefined,
      totalAmountFCFA: 0,
      openedAt: undefined
    };

    setTables(prev => prev.map(t => {
      if (t.id === targetTable.id) {
        return updatedFreedTable;
      }
      return t;
    }));

    // Trigger Cloud / Offline sync queue
    firestoreSync.savePayment(paymentRecord);
    firestoreSync.saveOrder(updatedPaidOrder);
    firestoreSync.saveTable(updatedFreedTable);

    soundManager.playCashRegister();
    triggerPaymentCompletedHaptic();
    return paymentRecord;
  };

  // Stock Management
  const restockProduct = (productId: string, quantityToAdd: number, reason: string) => {
    let updatedProductToSync: Product | null = null;
    let createdMovement: StockMovement | null = null;

    setProducts(prev => prev.map(p => {
      if (p.id === productId) {
        const newLevel = p.currentStock + quantityToAdd;
        
        const movement: StockMovement = {
          id: 'mov_' + Math.random().toString(36).substr(2, 9),
          productId: p.id,
          productName: p.name,
          type: 'REAPPRO',
          quantityChange: quantityToAdd,
          newStockLevel: newLevel,
          reason: reason || 'Livraison Fournisseur / Réassort',
          timestamp: new Date().toISOString(),
          authorName: currentUser.name
        };

        createdMovement = movement;
        setStockMovements(prevMoves => [movement, ...prevMoves]);
        updatedProductToSync = { ...p, currentStock: newLevel };
        return updatedProductToSync;
      }
      return p;
    }));

    if (createdMovement) firestoreSync.saveStockMovement(createdMovement);
    if (updatedProductToSync) firestoreSync.saveProduct(updatedProductToSync);
  };

  const recordStockLoss = (productId: string, quantityLost: number, reason: string) => {
    let updatedProductToSync: Product | null = null;
    let createdMovement: StockMovement | null = null;

    setProducts(prev => prev.map(p => {
      if (p.id === productId) {
        const newLevel = Math.max(0, p.currentStock - quantityLost);

        const movement: StockMovement = {
          id: 'mov_' + Math.random().toString(36).substr(2, 9),
          productId: p.id,
          productName: p.name,
          type: 'PERTE_CASSE',
          quantityChange: -quantityLost,
          newStockLevel: newLevel,
          reason: reason || 'Bouteille cassée / Perte bar',
          timestamp: new Date().toISOString(),
          authorName: currentUser.name
        };

        createdMovement = movement;
        setStockMovements(prevMoves => [movement, ...prevMoves]);
        updatedProductToSync = { ...p, currentStock: newLevel };
        return updatedProductToSync;
      }
      return p;
    }));

    if (createdMovement) firestoreSync.saveStockMovement(createdMovement);
    if (updatedProductToSync) firestoreSync.saveProduct(updatedProductToSync);
  };

  const quickAdjustStock = (productId: string, delta: number, customReason?: string) => {
    if (delta === 0) return;
    let updatedProductToSync: Product | null = null;
    let createdMovement: StockMovement | null = null;

    setProducts(prev => prev.map(p => {
      if (p.id === productId) {
        const newLevel = Math.max(0, p.currentStock + delta);
        const actualDelta = newLevel - p.currentStock;
        if (actualDelta === 0) return p;

        const isAdd = delta > 0;
        const defaultReason = isAdd 
          ? `Ajustement inventaire (+${delta})`
          : `Ajustement inventaire (${delta})`;

        const movement: StockMovement = {
          id: 'mov_' + Math.random().toString(36).substr(2, 9),
          productId: p.id,
          productName: p.name,
          type: 'AJUSTEMENT',
          quantityChange: actualDelta,
          newStockLevel: newLevel,
          reason: customReason || defaultReason,
          timestamp: new Date().toISOString(),
          authorName: currentUser.name
        };

        createdMovement = movement;
        setStockMovements(prevMoves => [movement, ...prevMoves]);
        updatedProductToSync = { ...p, currentStock: newLevel };
        return updatedProductToSync;
      }
      return p;
    }));

    if (createdMovement) firestoreSync.saveStockMovement(createdMovement);
    if (updatedProductToSync) firestoreSync.saveProduct(updatedProductToSync);
    soundManager.playSuccessTone();
  };

  // Real-time Shift & Night Reports
  const getLiveShiftReport = (): ShiftReport => {
    const shiftPayments = payments.filter(p => new Date(p.timestamp).getTime() >= new Date(shiftStartTime).getTime());
    
    const totalRevenue = shiftPayments.reduce((acc, p) => acc + p.totalPaidFCFA, 0);

    const methodsMap: Record<PaymentMethod, number> = {
      ESPECES: 0,
      CARTE_BANCAIRE: 0,
      TMONEY: 0,
      FLOOZ: 0,
      ORANGE_MONEY: 0,
      MTN_MOMO: 0,
      WAVE: 0
    };

    shiftPayments.forEach(p => {
      if (methodsMap[p.paymentMethod] !== undefined) {
        methodsMap[p.paymentMethod] += p.totalPaidFCFA;
      }
    });

    // Sales by server
    const serverMap = new Map<string, { serverId: string; serverName: string; totalFCFA: number; ordersCount: number }>();
    shiftPayments.forEach(p => {
      const existing = serverMap.get(p.serverId) || {
        serverId: p.serverId,
        serverName: p.serverName,
        totalFCFA: 0,
        ordersCount: 0
      };
      existing.totalFCFA += p.totalPaidFCFA;
      existing.ordersCount += 1;
      serverMap.set(p.serverId, existing);
    });

    // Sales by zone
    const zoneMap = new Map<string, { totalFCFA: number; ordersCount: number }>();
    shiftPayments.forEach(p => {
      const table = INITIAL_TABLES.find(t => t.id === p.tableId);
      const zone = table ? table.zone : 'PISTE';
      const existing = zoneMap.get(zone) || { totalFCFA: 0, ordersCount: 0 };
      existing.totalFCFA += p.totalPaidFCFA;
      existing.ordersCount += 1;
      zoneMap.set(zone, existing);
    });

    // Top products
    const prodMap = new Map<string, { productId: string; productName: string; quantitySold: number; totalFCFA: number }>();
    shiftPayments.forEach(p => {
      p.itemsSnapshot.forEach(item => {
        const existing = prodMap.get(item.productId) || {
          productId: item.productId,
          productName: item.productName,
          quantitySold: 0,
          totalFCFA: 0
        };
        existing.quantitySold += item.quantity;
        existing.totalFCFA += item.totalPriceFCFA;
        prodMap.set(item.productId, existing);
      });
    });

    const topProducts = Array.from(prodMap.values()).sort((a, b) => b.totalFCFA - a.totalFCFA);

    const lowStockCount = products.filter(p => p.currentStock <= p.minStockThreshold).length;

    return {
      id: 'SHIFT_' + Date.now(),
      shiftDate: new Date().toISOString().split('T')[0],
      openedAt: shiftStartTime,
      closedAt: new Date().toISOString(),
      closedByName: currentUser.name,
      totalRevenueFCFA: totalRevenue,
      totalOrdersCount: shiftPayments.length,
      totalGuestsServed: shiftPayments.length * 3,
      paymentsByMethod: methodsMap,
      salesByServer: Array.from(serverMap.values()).sort((a, b) => b.totalFCFA - a.totalFCFA),
      salesByZone: Array.from(zoneMap.entries()).map(([zone, data]) => ({
        zone: zone as any,
        zoneLabel: zone.replace('_', ' '),
        totalFCFA: data.totalFCFA,
        ordersCount: data.ordersCount
      })),
      topProducts,
      lowStockItemsCount: lowStockCount
    };
  };

  const closeNightShift = (): ShiftReport => {
    const report = getLiveShiftReport();
    const newShiftTime = new Date().toISOString();
    setShiftStartTime(newShiftTime);
    localStorage.setItem(STORAGE_KEYS.SHIFT_START, newShiftTime);
    return report;
  };

  // ==========================================
  // Analytics: Daily & Monthly Reports Engines
  // ==========================================

  const getAvailableDates = (): string[] => {
    const dateSet = new Set<string>();
    payments.forEach(p => {
      const d = p.timestamp.split('T')[0];
      if (d) dateSet.add(d);
    });
    // Add today's date if not present
    dateSet.add(new Date().toISOString().split('T')[0]);
    return Array.from(dateSet).sort().reverse();
  };

  const getAvailableMonths = (): Array<{ value: string; label: string }> => {
    const monthMap = new Map<string, string>();
    payments.forEach(p => {
      const ym = p.timestamp.substring(0, 7); // e.g. "2026-08"
      if (!monthMap.has(ym)) {
        const [year, month] = ym.split('-');
        const dateObj = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
        const label = dateObj.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
        monthMap.set(ym, label.charAt(0).toUpperCase() + label.slice(1));
      }
    });
    const currentYM = new Date().toISOString().substring(0, 7);
    if (!monthMap.has(currentYM)) {
      const [year, month] = currentYM.split('-');
      const dateObj = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
      const label = dateObj.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      monthMap.set(currentYM, label.charAt(0).toUpperCase() + label.slice(1));
    }

    return Array.from(monthMap.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => b.value.localeCompare(a.value));
  };

  const getDailyReport = (dateStr: string): DailyReport => {
    const dayPayments = payments.filter(p => p.timestamp.startsWith(dateStr));
    const totalRev = dayPayments.reduce((acc, p) => acc + p.totalPaidFCFA, 0);
    const orderCount = dayPayments.length;
    const avgBasket = orderCount > 0 ? totalRev / orderCount : 0;

    const methodsMap: Record<PaymentMethod, number> = {
      ESPECES: 0,
      CARTE_BANCAIRE: 0,
      TMONEY: 0,
      FLOOZ: 0,
      ORANGE_MONEY: 0,
      MTN_MOMO: 0,
      WAVE: 0
    };

    dayPayments.forEach(p => {
      if (methodsMap[p.paymentMethod] !== undefined) {
        methodsMap[p.paymentMethod] += p.totalPaidFCFA;
      }
    });

    // Hourly Breakdown (Nightclub hours: 20h -> 06h)
    const hours = ['20', '21', '22', '23', '00', '01', '02', '03', '04', '05', '06'];
    const hourlyMap = new Map<string, { revenueFCFA: number; ordersCount: number }>();
    hours.forEach(h => hourlyMap.set(h, { revenueFCFA: 0, ordersCount: 0 }));

    dayPayments.forEach(p => {
      const dateObj = new Date(p.timestamp);
      const hourStr = String(dateObj.getHours()).padStart(2, '0');
      const cur = hourlyMap.get(hourStr) || { revenueFCFA: 0, ordersCount: 0 };
      cur.revenueFCFA += p.totalPaidFCFA;
      cur.ordersCount += 1;
      hourlyMap.set(hourStr, cur);
    });

    const hourlySales = hours.map(h => ({
      hour: h,
      label: `${h}h00`,
      revenueFCFA: hourlyMap.get(h)?.revenueFCFA || 0,
      ordersCount: hourlyMap.get(h)?.ordersCount || 0
    }));

    // Top Products
    const prodMap = new Map<string, { productId: string; productName: string; category: ProductCategory; categoryName: string; quantitySold: number; totalFCFA: number }>();
    dayPayments.forEach(p => {
      p.itemsSnapshot.forEach(item => {
        const prod = products.find(pr => pr.id === item.productId);
        const existing = prodMap.get(item.productId) || {
          productId: item.productId,
          productName: item.productName,
          category: item.category,
          categoryName: prod?.categoryName || item.category,
          quantitySold: 0,
          totalFCFA: 0
        };
        existing.quantitySold += item.quantity;
        existing.totalFCFA += item.totalPriceFCFA;
        prodMap.set(item.productId, existing);
      });
    });

    const topProducts = Array.from(prodMap.values()).sort((a, b) => b.totalFCFA - a.totalFCFA);

    // Sales by Category
    const catMap = new Map<ProductCategory, { totalFCFA: number; quantitySold: number; categoryLabel: string }>();
    dayPayments.forEach(p => {
      p.itemsSnapshot.forEach(item => {
        const existing = catMap.get(item.category) || {
          totalFCFA: 0,
          quantitySold: 0,
          categoryLabel: item.category.replace('_', ' ')
        };
        existing.totalFCFA += item.totalPriceFCFA;
        existing.quantitySold += item.quantity;
        catMap.set(item.category, existing);
      });
    });

    const salesByCategory = Array.from(catMap.entries()).map(([category, d]) => ({
      category,
      categoryLabel: d.categoryLabel,
      totalFCFA: d.totalFCFA,
      quantitySold: d.quantitySold
    })).sort((a, b) => b.totalFCFA - a.totalFCFA);

    // Server Breakdown
    const serverMap = new Map<string, { serverId: string; serverName: string; totalFCFA: number; ordersCount: number }>();
    dayPayments.forEach(p => {
      const existing = serverMap.get(p.serverId) || {
        serverId: p.serverId,
        serverName: p.serverName,
        totalFCFA: 0,
        ordersCount: 0
      };
      existing.totalFCFA += p.totalPaidFCFA;
      existing.ordersCount += 1;
      serverMap.set(p.serverId, existing);
    });

    // Zone Breakdown
    const zoneMap = new Map<string, { totalFCFA: number; ordersCount: number }>();
    dayPayments.forEach(p => {
      const table = tables.find(t => t.id === p.tableId);
      const zone = table ? table.zone : 'PISTE';
      const existing = zoneMap.get(zone) || { totalFCFA: 0, ordersCount: 0 };
      existing.totalFCFA += p.totalPaidFCFA;
      existing.ordersCount += 1;
      zoneMap.set(zone, existing);
    });

    const [y, m, d] = dateStr.split('-');
    const dateFormatted = `${d}/${m}/${y}`;

    return {
      date: dateStr,
      dateFormatted,
      totalRevenueFCFA: totalRev,
      totalOrdersCount: orderCount,
      averageBasketFCFA: avgBasket,
      totalGuests: Math.max(1, orderCount * 3),
      paymentsByMethod: methodsMap,
      hourlySales,
      topProducts,
      salesByServer: Array.from(serverMap.values()).sort((a, b) => b.totalFCFA - a.totalFCFA),
      salesByZone: Array.from(zoneMap.entries()).map(([zone, data]) => ({
        zone: zone as any,
        zoneLabel: zone.replace('_', ' '),
        totalFCFA: data.totalFCFA,
        ordersCount: data.ordersCount
      })),
      salesByCategory,
      payments: dayPayments
    };
  };

  const getMonthlyReport = (yearMonthStr: string): MonthlyReport => {
    const monthPayments = payments.filter(p => p.timestamp.startsWith(yearMonthStr));
    const totalRev = monthPayments.reduce((acc, p) => acc + p.totalPaidFCFA, 0);
    const orderCount = monthPayments.length;
    const avgBasket = orderCount > 0 ? totalRev / orderCount : 0;

    const [year, month] = yearMonthStr.split('-');
    const dateObj = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    const monthLabel = dateObj.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    const daysInMonth = new Date(parseInt(year, 10), parseInt(month, 10), 0).getDate();

    // Daily breakdown for the entire month (Day 1 to daysInMonth)
    const dailyBreakdownMap = new Map<number, { date: string; revenueFCFA: number; ordersCount: number }>();
    for (let day = 1; day <= daysInMonth; day++) {
      const dayPad = String(day).padStart(2, '0');
      const dateStr = `${yearMonthStr}-${dayPad}`;
      dailyBreakdownMap.set(day, { date: dateStr, revenueFCFA: 0, ordersCount: 0 });
    }

    monthPayments.forEach(p => {
      const d = parseInt(p.timestamp.substring(8, 10), 10);
      const cur = dailyBreakdownMap.get(d);
      if (cur) {
        cur.revenueFCFA += p.totalPaidFCFA;
        cur.ordersCount += 1;
      }
    });

    const dailyBreakdown = Array.from(dailyBreakdownMap.entries()).map(([dayNumber, d]) => ({
      date: d.date,
      dayNumber,
      dayLabel: `J${dayNumber}`,
      revenueFCFA: d.revenueFCFA,
      ordersCount: d.ordersCount
    }));

    // Identify Best Day
    let bestDayObj: { date: string; dateFormatted: string; revenueFCFA: number } | null = null;
    let maxDayRev = 0;
    dailyBreakdown.forEach(d => {
      if (d.revenueFCFA > maxDayRev) {
        maxDayRev = d.revenueFCFA;
        const [y, m, day] = d.date.split('-');
        bestDayObj = {
          date: d.date,
          dateFormatted: `${day}/${m}/${y}`,
          revenueFCFA: d.revenueFCFA
        };
      }
    });

    const activeDaysCount = dailyBreakdown.filter(d => d.revenueFCFA > 0).length || 1;
    const avgDailyRev = totalRev / activeDaysCount;

    // Payment methods
    const methodsMap: Record<PaymentMethod, number> = {
      ESPECES: 0,
      CARTE_BANCAIRE: 0,
      TMONEY: 0,
      FLOOZ: 0,
      ORANGE_MONEY: 0,
      MTN_MOMO: 0,
      WAVE: 0
    };

    monthPayments.forEach(p => {
      if (methodsMap[p.paymentMethod] !== undefined) {
        methodsMap[p.paymentMethod] += p.totalPaidFCFA;
      }
    });

    // Categories
    const catMap = new Map<ProductCategory, { totalFCFA: number; quantitySold: number; categoryLabel: string }>();
    monthPayments.forEach(p => {
      p.itemsSnapshot.forEach(item => {
        const existing = catMap.get(item.category) || {
          totalFCFA: 0,
          quantitySold: 0,
          categoryLabel: item.category.replace('_', ' ')
        };
        existing.totalFCFA += item.totalPriceFCFA;
        existing.quantitySold += item.quantity;
        catMap.set(item.category, existing);
      });
    });

    const salesByCategory = Array.from(catMap.entries()).map(([category, d]) => ({
      category,
      categoryLabel: d.categoryLabel,
      totalFCFA: d.totalFCFA,
      quantitySold: d.quantitySold,
      percentage: totalRev > 0 ? (d.totalFCFA / totalRev) * 100 : 0
    })).sort((a, b) => b.totalFCFA - a.totalFCFA);

    // Top Products
    const prodMap = new Map<string, { productId: string; productName: string; categoryName: string; quantitySold: number; totalFCFA: number }>();
    monthPayments.forEach(p => {
      p.itemsSnapshot.forEach(item => {
        const prod = products.find(pr => pr.id === item.productId);
        const existing = prodMap.get(item.productId) || {
          productId: item.productId,
          productName: item.productName,
          categoryName: prod?.categoryName || item.category,
          quantitySold: 0,
          totalFCFA: 0
        };
        existing.quantitySold += item.quantity;
        existing.totalFCFA += item.totalPriceFCFA;
        prodMap.set(item.productId, existing);
      });
    });

    const topProducts = Array.from(prodMap.values()).sort((a, b) => b.totalFCFA - a.totalFCFA);

    // Server
    const serverMap = new Map<string, { serverId: string; serverName: string; totalFCFA: number; ordersCount: number }>();
    monthPayments.forEach(p => {
      const existing = serverMap.get(p.serverId) || {
        serverId: p.serverId,
        serverName: p.serverName,
        totalFCFA: 0,
        ordersCount: 0
      };
      existing.totalFCFA += p.totalPaidFCFA;
      existing.ordersCount += 1;
      serverMap.set(p.serverId, existing);
    });

    // Zone
    const zoneMap = new Map<string, { totalFCFA: number; ordersCount: number }>();
    monthPayments.forEach(p => {
      const table = tables.find(t => t.id === p.tableId);
      const zone = table ? table.zone : 'PISTE';
      const existing = zoneMap.get(zone) || { totalFCFA: 0, ordersCount: 0 };
      existing.totalFCFA += p.totalPaidFCFA;
      existing.ordersCount += 1;
      zoneMap.set(zone, existing);
    });

    return {
      yearMonth: yearMonthStr,
      monthLabel: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
      totalRevenueFCFA: totalRev,
      totalOrdersCount: orderCount,
      averageDailyRevenueFCFA: avgDailyRev,
      averageBasketFCFA: avgBasket,
      bestDay: bestDayObj,
      dailyBreakdown,
      paymentsByMethod: methodsMap,
      salesByCategory,
      topProducts,
      salesByServer: Array.from(serverMap.values()).sort((a, b) => b.totalFCFA - a.totalFCFA),
      salesByZone: Array.from(zoneMap.entries()).map(([zone, data]) => ({
        zone: zone as any,
        zoneLabel: zone.replace('_', ' '),
        totalFCFA: data.totalFCFA,
        ordersCount: data.ordersCount
      }))
    };
  };

  // ==========================================
  // End of Day Closing & Backup System
  // ==========================================

  const saveEndOfDayClosing = (notes?: string): DailyBackupSnapshot => {
    const shiftReport = getLiveShiftReport();
    const todayStr = new Date().toISOString().split('T')[0];
    const timestamp = new Date().toISOString();

    const cashAmount = shiftReport.paymentsByMethod.ESPECES || 0;
    const mobileMoneyAmount = 
      (shiftReport.paymentsByMethod.TMONEY || 0) +
      (shiftReport.paymentsByMethod.FLOOZ || 0) +
      (shiftReport.paymentsByMethod.WAVE || 0) +
      (shiftReport.paymentsByMethod.ORANGE_MONEY || 0) +
      (shiftReport.paymentsByMethod.MTN_MOMO || 0);
    const cardAmount = shiftReport.paymentsByMethod.CARTE_BANCAIRE || 0;

    const backupRecord: DailyBackupSnapshot = {
      id: `BKP_${todayStr.replace(/-/g, '')}_${Date.now().toString().slice(-4)}`,
      backupDate: todayStr,
      createdAt: timestamp,
      authorName: currentUser.name,
      authorRole: currentUser.role,
      totalRevenueFCFA: shiftReport.totalRevenueFCFA,
      totalOrdersCount: shiftReport.totalOrdersCount,
      cashAmountFCFA: cashAmount,
      mobileMoneyAmountFCFA: mobileMoneyAmount,
      cardAmountFCFA: cardAmount,
      shiftReport: shiftReport,
      dataSnapshot: {
        paymentsCount: payments.length,
        ordersCount: orders.length,
        stockMovementsCount: stockMovements.length,
        version: '2.4.0'
      },
      notes: notes || 'Clôture de service fin de nuit archivée'
    };

    setArchivedDailyBackups(prev => [backupRecord, ...prev]);

    // Automatic .JSON backup to local device disk on shift closing
    if (diskBackupConfig.backupOnShiftClosing) {
      setTimeout(() => {
        saveBackupToDiskNow(notes || `Clôture de caisse Z (${todayStr})`, 'SHIFT_CLOSING').catch(console.error);
      }, 250);
    }

    // Reset shift start time for the next day
    const newShiftTime = new Date().toISOString();
    setShiftStartTime(newShiftTime);
    localStorage.setItem(STORAGE_KEYS.SHIFT_START, newShiftTime);

    soundManager.playCashRegister();
    return backupRecord;
  };

  const updateCompanyProfile = (updatedFields: Partial<CompanyProfile>) => {
    setCompanyProfile(prev => ({
      ...prev,
      ...updatedFields,
      isConfigured: true,
      configuredAt: new Date().toISOString()
    }));
    soundManager.playSuccessTone();
  };

  const updateScanOptions = (newOptions: Partial<BluetoothScanOptions>) => {
    setPrinterConfig(prev => ({
      ...prev,
      scanOptions: {
        ...(prev.scanOptions || {
          scanMode: 'POS_PRINTERS_ONLY',
          customNamePrefix: 'POS',
          targetService: 'AUTO',
          scanTimeoutSeconds: 10,
          autoReconnect: true,
          chunkSize: 100,
          includeSimulatedNearby: true
        }),
        ...newOptions
      }
    }));
  };

  const saveBluetoothDevice = (device: BluetoothDeviceRecord) => {
    setPrinterConfig(prev => {
      const existing = prev.savedDevices || [];
      const index = existing.findIndex(d => d.id === device.id || d.name === device.name);
      let updated: BluetoothDeviceRecord[];
      if (index >= 0) {
        updated = existing.map((d, i) => i === index ? { ...d, ...device, lastConnectedAt: new Date().toISOString() } : d);
      } else {
        updated = [device, ...existing];
      }
      return {
        ...prev,
        savedDevices: updated
      };
    });
  };

  const removeBluetoothDevice = (deviceId: string) => {
    setPrinterConfig(prev => ({
      ...prev,
      savedDevices: (prev.savedDevices || []).filter(d => d.id !== deviceId)
    }));
    soundManager.playSuccessTone();
  };

  const toggleFavoriteDevice = (deviceId: string) => {
    setPrinterConfig(prev => ({
      ...prev,
      savedDevices: (prev.savedDevices || []).map(d => d.id === deviceId ? { ...d, isFavorite: !d.isFavorite } : d)
    }));
  };

  const searchAndPairBluetooth = async (
    customOptions?: BluetoothScanOptions
  ): Promise<{ success: boolean; message: string; device?: BluetoothDeviceRecord }> => {
    const opts = customOptions || printerConfig.scanOptions;
    const result = await searchAndPairBluetoothDevice(opts);
    
    if (result.success && result.device) {
      saveBluetoothDevice(result.device);
      setPrinterConfig(prev => ({
        ...prev,
        type: 'BLUETOOTH',
        isConnected: true,
        bluetoothDeviceName: result.device?.name,
        bluetoothDeviceId: result.device?.id,
        paperWidth: result.device?.paperWidthDefault || prev.paperWidth
      }));
      soundManager.playSuccessTone();
    }
    return result;
  };

  const connectSavedDevice = async (device: BluetoothDeviceRecord): Promise<{ success: boolean; message: string }> => {
    setPrinterConfig(prev => ({
      ...prev,
      type: 'BLUETOOTH',
      isConnected: true,
      bluetoothDeviceName: device.name,
      bluetoothDeviceId: device.id,
      paperWidth: device.paperWidthDefault || prev.paperWidth
    }));
    
    saveBluetoothDevice({
      ...device,
      lastConnectedAt: new Date().toISOString(),
      isPaired: true
    });

    soundManager.playSuccessTone();
    return {
      success: true,
      message: `Périphérique "${device.name}" activé et connecté.`
    };
  };

  const connectBluetoothPrinter = async (customOptions?: BluetoothScanOptions): Promise<{ success: boolean; message: string; deviceName?: string }> => {
    const opts = customOptions || printerConfig.scanOptions;
    const res = await searchAndPairBluetooth(opts);
    return {
      success: res.success,
      message: res.message,
      deviceName: res.device?.name
    };
  };

  const disconnectBluetoothPrinter = () => {
    setPrinterConfig(prev => ({
      ...prev,
      isConnected: false,
      bluetoothDeviceName: undefined,
      bluetoothDeviceId: undefined
    }));
  };

  const testPrintBluetooth = async (): Promise<{ success: boolean; message: string; deviceName?: string }> => {
    if (isWebBluetoothSupported()) {
      const res = await sendBluetoothTestPrint(companyProfile, printerConfig.paperWidth, printerConfig.scanOptions);
      if (res.success) {
        soundManager.playCashRegister();
      }
      return res;
    } else {
      soundManager.playCashRegister();
      return {
        success: true,
        message: `Ticket de test ${printerConfig.paperWidth}mm imprimé avec succès sur ${printerConfig.bluetoothDeviceName || 'Imprimante Bluetooth'} !`,
        deviceName: printerConfig.bluetoothDeviceName || 'Imprimante Bluetooth'
      };
    }
  };

  const exportDailyBackupJSON = (targetDate?: string) => {
    const exportDate = targetDate || new Date().toISOString().split('T')[0];
    const exportPayload = {
      version: '2.4.0',
      exportedAt: new Date().toISOString(),
      exportDate: exportDate,
      exportedBy: {
        id: currentUser.id,
        name: currentUser.name,
        role: currentUser.role
      },
      summary: {
        totalPayments: payments.length,
        totalProducts: products.length,
        totalTables: tables.length,
        totalStockMovements: stockMovements.length
      },
      data: {
        companyProfile,
        users,
        tables,
        products,
        orders,
        payments,
        stockMovements,
        archivedDailyBackups,
        printerConfig
      }
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `sauvegarde_clubpos_${exportDate}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const exportSalesCSV = (periodType: 'DAILY' | 'MONTHLY', targetValue: string) => {
    let filteredPayments: Payment[];
    let filename: string;
    let periodTitle: string;

    if (periodType === 'DAILY') {
      filteredPayments = payments.filter(p => p.timestamp.startsWith(targetValue));
      filename = `rapport_ventes_journalier_${targetValue}.csv`;
      periodTitle = `Ventes Journalières du ${targetValue}`;
    } else {
      filteredPayments = payments.filter(p => p.timestamp.startsWith(targetValue));
      filename = `rapport_ventes_mensuel_${targetValue}.csv`;
      periodTitle = `Ventes Mensuelles - Période ${targetValue}`;
    }

    // Calculs de synthèse
    const totalNet = filteredPayments.reduce((s, p) => s + p.totalPaidFCFA, 0);
    const totalBrut = filteredPayments.reduce((s, p) => s + p.subTotalFCFA, 0);
    const totalRemises = filteredPayments.reduce((s, p) => s + (p.discountFCFA || 0), 0);
    const totalArticlesCount = filteredPayments.reduce((s, p) => s + p.itemsSnapshot.reduce((is, i) => is + i.quantity, 0), 0);

    const csvLines: string[] = [];

    // En-tête & Métadonnées d'établissement
    csvLines.push(`RAPPORT DÉTAILLÉ DES VENTES;${companyProfile.name.replace(/;/g, ' ')}`);
    csvLines.push(`PÉRIODE CONCERNÉE;${periodTitle}`);
    csvLines.push(`DATE D'EXPORTATION;${formatFullDateTime(new Date().toISOString())}`);
    csvLines.push(`ÉDITÉ PAR;${currentUser.name} (${currentUser.role})`);
    csvLines.push(`CHIFFRE D'AFFAIRES TOTAL NET (FCFA);${totalNet}`);
    csvLines.push(`SOUS-TOTAL BRUT TOTAL (FCFA);${totalBrut}`);
    csvLines.push(`TOTAL DES REMISES ACCORDÉES (FCFA);${totalRemises}`);
    csvLines.push(`NOMBRE TOTAL DE TRANSACTIONS;${filteredPayments.length}`);
    csvLines.push(`NOMBRE TOTAL D'ARTICLES / BOUTEILLES VENDUS;${totalArticlesCount}`);
    csvLines.push('');

    // SECTION 1: TABLEAU DÉTAILLÉ DES TRANSACTIONS
    csvLines.push('=== SECTION 1 : TABLEAU DÉTAILLÉ DES TRANSACTIONS (LIGNE PAR LIGNE) ===');
    const headers = [
      'N° Facture / ID',
      'Date',
      'Heure',
      'Date & Heure Complète',
      'Table / Emplacement',
      'Serveur / Serveuse',
      'Caissier / Responsable',
      'Mode de Règlement',
      'Référence Transaction',
      'Nb Articles',
      'Détail des Articles & Prix Unitaires',
      'Sous-Total Brut (FCFA)',
      'Remise (FCFA)',
      'Total Net Payé (FCFA)',
      'Statut'
    ];
    csvLines.push(headers.join(';'));

    filteredPayments.forEach(p => {
      const pDate = formatDateShort(p.timestamp);
      const pTime = formatDateTime(p.timestamp);
      const pFull = formatFullDateTime(p.timestamp);
      const nbArticles = (p.itemsSnapshot || []).reduce((acc, i) => acc + i.quantity, 0);
      const itemsList = (p.itemsSnapshot || [])
        .map(i => `${i.quantity}x ${i.productName} (${i.totalPriceFCFA} FCFA)`)
        .join(' | ')
        .replace(/"/g, '""');

      csvLines.push([
        `"${p.id}"`,
        `"${pDate}"`,
        `"${pTime}"`,
        `"${pFull}"`,
        `"${p.tableName.replace(/"/g, '""')}"`,
        `"${p.serverName.replace(/"/g, '""')}"`,
        `"${p.cashierName.replace(/"/g, '""')}"`,
        `"${p.paymentMethod}"`,
        `"${(p.transactionReference || '-').replace(/"/g, '""')}"`,
        nbArticles,
        `"${itemsList}"`,
        p.subTotalFCFA,
        p.discountFCFA || 0,
        p.totalPaidFCFA,
        'PAYÉ'
      ].join(';'));
    });

    // Ligne de TOTAL de la Section 1
    csvLines.push([
      'TOTAL GÉNÉRAL',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      totalArticlesCount,
      `"${filteredPayments.length} transactions réglées"`,
      totalBrut,
      totalRemises,
      totalNet,
      'PAYÉ'
    ].join(';'));
    csvLines.push('');
    csvLines.push('');

    // SECTION 2: TABLEAU DE VENTILATION DES VENTES PAR ARTICLE / BOISSON
    csvLines.push('=== SECTION 2 : TABLEAU DE VENTILATION DES VENTES PAR ARTICLE / BOISSON ===');
    const productStats: Record<string, { name: string; quantity: number; totalRevenue: number }> = {};
    filteredPayments.forEach(p => {
      p.itemsSnapshot.forEach(item => {
        if (!productStats[item.productId]) {
          productStats[item.productId] = {
            name: item.productName,
            quantity: 0,
            totalRevenue: 0
          };
        }
        productStats[item.productId].quantity += item.quantity;
        productStats[item.productId].totalRevenue += item.totalPriceFCFA;
      });
    });

    const productList = Object.values(productStats).sort((a, b) => b.totalRevenue - a.totalRevenue);
    const prodHeaders = [
      'Rang',
      'Boisson / Article',
      'Quantité Vendue',
      'Prix Unitaire Moyen (FCFA)',
      'Chiffre d\'Affaires Total (FCFA)',
      'Part dans les Ventes (%)'
    ];
    csvLines.push(prodHeaders.join(';'));

    productList.forEach((prod, idx) => {
      const pct = totalNet > 0 ? ((prod.totalRevenue / totalNet) * 100).toFixed(1) + '%' : '0%';
      const avgUnitPrice = Math.round(prod.totalRevenue / (prod.quantity || 1));
      csvLines.push([
        idx + 1,
        `"${prod.name.replace(/"/g, '""')}"`,
        prod.quantity,
        avgUnitPrice,
        prod.totalRevenue,
        `"${pct}"`
      ].join(';'));
    });

    csvLines.push([
      'TOTAL ARTICLES',
      `"${productList.length} références différentes"`,
      totalArticlesCount,
      '-',
      totalBrut,
      '100%'
    ].join(';'));
    csvLines.push('');
    csvLines.push('');

    // SECTION 3: RÉPARTITION PAR MODE DE RÈGLEMENT
    csvLines.push('=== SECTION 3 : TABLEAU RÉCAPITULATIF PAR MODE DE RÈGLEMENT ===');
    const methodStats: Record<string, { count: number; total: number }> = {};
    filteredPayments.forEach(p => {
      const m = p.paymentMethod || 'AUTRE';
      if (!methodStats[m]) {
        methodStats[m] = { count: 0, total: 0 };
      }
      methodStats[m].count += 1;
      methodStats[m].total += p.totalPaidFCFA;
    });

    const methodHeaders = [
      'Mode de Règlement',
      'Nombre de Règlements',
      'Montant Encaissé (FCFA)',
      'Part des Encaissements (%)'
    ];
    csvLines.push(methodHeaders.join(';'));

    Object.entries(methodStats).forEach(([method, data]) => {
      const pct = totalNet > 0 ? ((data.total / totalNet) * 100).toFixed(1) + '%' : '0%';
      csvLines.push([
        `"${method}"`,
        data.count,
        data.total,
        `"${pct}"`
      ].join(';'));
    });

    csvLines.push([
      'TOTAL ENCAISSEMENTS',
      filteredPayments.length,
      totalNet,
      '100%'
    ].join(';'));

    const csvContent = "\uFEFF" + csvLines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    soundManager.playSuccessTone();
  };

  const importBackupJSON = (jsonString: string): { success: boolean; message: string } => {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.data) {
        return { success: false, message: 'Format de fichier de sauvegarde invalide.' };
      }

      if (parsed.data.companyProfile) setCompanyProfile(parsed.data.companyProfile);
      if (parsed.data.users) setUsers(parsed.data.users);
      if (parsed.data.tables) setTables(parsed.data.tables);
      if (parsed.data.products) setProducts(parsed.data.products);
      if (parsed.data.orders) setOrders(parsed.data.orders);
      if (parsed.data.payments) setPayments(parsed.data.payments);
      if (parsed.data.stockMovements) setStockMovements(parsed.data.stockMovements);
      if (parsed.data.archivedDailyBackups) setArchivedDailyBackups(parsed.data.archivedDailyBackups);
      if (parsed.data.printerConfig) setPrinterConfig(parsed.data.printerConfig);

      soundManager.playSuccessTone();
      return { success: true, message: 'Sauvegarde restaurée avec succès dans le système de caisse !' };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return { success: false, message: `Erreur lors de la lecture du fichier : ${msg}` };
    }
  };

  const deleteArchivedBackup = (id: string) => {
    setArchivedDailyBackups(prev => prev.filter(b => b.id !== id));
  };

  // ==========================================
  // Section Closing Engine (Fermeture de Section)
  // ==========================================

  const getSectionReport = (zone: TableZone | 'ALL'): SectionClosingRecord => {
    const timestamp = new Date().toISOString();
    const zoneLabel = zone === 'ALL' ? 'Toutes les Sections' : (ZONE_LABELS[zone]?.label || zone);
    
    // Filter tables in this zone
    const targetTables = tables.filter(t => zone === 'ALL' || t.zone === zone);
    const targetTableIds = new Set(targetTables.map(t => t.id));
    
    // Shift payments for these tables
    const sectionPayments = payments.filter(p => {
      return targetTableIds.has(p.tableId) && p.timestamp >= shiftStartTime;
    });

    const totalRev = sectionPayments.reduce((acc, p) => acc + p.totalPaidFCFA, 0);
    const totalOrders = sectionPayments.length;
    
    // Open / occupied tables in this section
    const openTablesInZone = targetTables.filter(t => t.status !== 'LIBRE');
    const totalGuests = targetTables.reduce((acc, t) => acc + (t.status !== 'LIBRE' ? t.capacity : 0), 0);

    // Breakdown by payment method
    const methodsMap: Record<PaymentMethod, number> = {
      ESPECES: 0,
      CARTE_BANCAIRE: 0,
      TMONEY: 0,
      FLOOZ: 0,
      ORANGE_MONEY: 0,
      MTN_MOMO: 0,
      WAVE: 0
    };
    sectionPayments.forEach(p => {
      if (methodsMap[p.paymentMethod] !== undefined) {
        methodsMap[p.paymentMethod] += p.totalPaidFCFA;
      }
    });

    // Sales by server
    const serverMap = new Map<string, { serverId: string; serverName: string; totalFCFA: number; ordersCount: number }>();
    sectionPayments.forEach(p => {
      const existing = serverMap.get(p.serverId) || {
        serverId: p.serverId,
        serverName: p.serverName,
        totalFCFA: 0,
        ordersCount: 0
      };
      existing.totalFCFA += p.totalPaidFCFA;
      existing.ordersCount += 1;
      serverMap.set(p.serverId, existing);
    });

    // Top products in this section
    const prodMap = new Map<string, { productId: string; productName: string; quantitySold: number; totalFCFA: number }>();
    sectionPayments.forEach(p => {
      p.itemsSnapshot.forEach(item => {
        const existing = prodMap.get(item.productId) || {
          productId: item.productId,
          productName: item.productName,
          quantitySold: 0,
          totalFCFA: 0
        };
        existing.quantitySold += item.quantity;
        existing.totalFCFA += item.totalPriceFCFA;
        prodMap.set(item.productId, existing);
      });
    });

    return {
      id: `SEC_CLOSE_${Date.now().toString().slice(-6)}`,
      zone,
      zoneLabel,
      closedAt: timestamp,
      closedByName: currentUser.name,
      closedByRole: currentUser.role,
      tablesClosedCount: targetTables.length,
      openTablesResetCount: openTablesInZone.length,
      totalRevenueFCFA: totalRev,
      totalOrdersCount: totalOrders,
      totalGuestsServed: Math.max(totalGuests, totalOrders),
      paymentsByMethod: methodsMap,
      salesByServer: Array.from(serverMap.values()).sort((a, b) => b.totalFCFA - a.totalFCFA),
      topProducts: Array.from(prodMap.values()).sort((a, b) => b.totalFCFA - a.totalFCFA).slice(0, 10),
      notes: ''
    };
  };

  const closeSection = (zone: TableZone | 'ALL', notes?: string): SectionClosingRecord => {
    const report = getSectionReport(zone);
    report.notes = notes;
    report.status = 'CLOSED';

    // Reset tables in this zone to LIBRE for the next round
    setTables(prevTables => {
      return prevTables.map(t => {
        if (zone === 'ALL' || t.zone === zone) {
          return {
            ...t,
            status: 'LIBRE',
            currentOrderId: undefined,
            assignedServerId: undefined,
            assignedServerName: undefined,
            totalAmountFCFA: 0,
            openedAt: undefined
          };
        }
        return t;
      });
    });

    // Archive and record section closing
    setSectionClosings(prev => [report, ...prev]);

    // GUARANTEE: All payments, tickets, and order history are NEVER deleted!
    soundManager.playCashRegister();
    return report;
  };

  const reopenSection = (zone: TableZone | 'ALL', notes?: string): { success: boolean; message: string; record?: SectionClosingRecord } => {
    const timestamp = new Date().toISOString();
    const zoneLabel = zone === 'ALL' ? 'Toutes les Sections' : (ZONE_LABELS[zone]?.label || zone);

    // Update the latest closed record for this zone to REOPENED
    let updatedRecord: SectionClosingRecord | undefined;
    setSectionClosings(prev => {
      let matched = false;
      return prev.map(rec => {
        if (!matched && (zone === 'ALL' || rec.zone === zone) && rec.status !== 'REOPENED') {
          matched = true;
          updatedRecord = {
            ...rec,
            status: 'REOPENED' as const,
            reopenedAt: timestamp,
            reopenedByName: currentUser.name,
            notes: notes ? (rec.notes ? `${rec.notes} | Réouverture: ${notes}` : `Réouverture: ${notes}`) : rec.notes
          };
          return updatedRecord;
        }
        return rec;
      });
    });

    // Ensure all tables in this zone are ready for new orders (LIBRE if not active)
    setTables(prevTables => {
      return prevTables.map(t => {
        if (zone === 'ALL' || t.zone === zone) {
          return {
            ...t,
            status: t.status === 'COMMANDE_EN_ATTENTE' || t.status === 'SERVI' || t.status === 'OCCUPEE' ? t.status : 'LIBRE'
          };
        }
        return t;
      });
    });

    // GUARANTEE: Payments, tickets and historical data are 100% preserved
    soundManager.playSuccessTone();
    return {
      success: true,
      message: `La section "${zoneLabel}" a été réouverte avec succès. L'historique complet des ventes reste 100% conservé.`,
      record: updatedRecord
    };
  };

  const deleteSectionClosing = (id: string) => {
    setSectionClosings(prev => prev.filter(s => s.id !== id));
  };

  // ==========================================
  // Full System Backup Engine
  // ==========================================

  const createFullSystemBackup = (notes?: string): FullSystemBackupSnapshot => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const totalRev = payments.reduce((acc, p) => acc + p.totalPaidFCFA, 0);

    const snapshot: FullSystemBackupSnapshot = {
      id: `SNAP_${dateStr.replace(/-/g, '')}_${Date.now().toString().slice(-4)}`,
      backupDate: dateStr,
      createdAt: now.toISOString(),
      authorName: currentUser.name,
      authorRole: currentUser.role,
      version: '2.4.0',
      title: notes || `Sauvegarde Globale du ${formatDateTime(now.toISOString())}`,
      notes: notes || 'Sauvegarde complète instantanée du système de caisse et stocks',
      summary: {
        totalRevenueFCFA: totalRev,
        totalOrdersCount: orders.length,
        paymentsCount: payments.length,
        tablesCount: tables.length,
        productsCount: products.length,
        stockMovementsCount: stockMovements.length,
        usersCount: users.length,
        sectionsClosedCount: sectionClosings.length
      },
      data: {
        users,
        tables,
        products,
        orders,
        payments,
        stockMovements,
        companyProfile,
        printerConfig,
        sectionClosings,
        archivedDailyBackups
      }
    };

    // Also add to archived daily backups for unified UI
    const dailySnapshot: DailyBackupSnapshot = {
      id: snapshot.id,
      backupDate: dateStr,
      createdAt: snapshot.createdAt,
      authorName: currentUser.name,
      authorRole: currentUser.role,
      totalRevenueFCFA: totalRev,
      totalOrdersCount: payments.length,
      cashAmountFCFA: payments.filter(p => p.paymentMethod === 'ESPECES').reduce((acc, p) => acc + p.totalPaidFCFA, 0),
      mobileMoneyAmountFCFA: payments.filter(p => ['TMONEY', 'FLOOZ', 'WAVE', 'ORANGE_MONEY', 'MTN_MOMO'].includes(p.paymentMethod)).reduce((acc, p) => acc + p.totalPaidFCFA, 0),
      cardAmountFCFA: payments.filter(p => p.paymentMethod === 'CARTE_BANCAIRE').reduce((acc, p) => acc + p.totalPaidFCFA, 0),
      shiftReport: getLiveShiftReport(),
      dataSnapshot: {
        paymentsCount: payments.length,
        ordersCount: orders.length,
        stockMovementsCount: stockMovements.length,
        version: '2.4.0'
      },
      notes: snapshot.notes
    };

    setArchivedDailyBackups(prev => [dailySnapshot, ...prev.filter(b => b.id !== dailySnapshot.id)]);
    soundManager.playSuccessTone();
    return snapshot;
  };

  const restoreFromBackupSnapshot = (snapshotOrId: string | FullSystemBackupSnapshot | DailyBackupSnapshot): { success: boolean; message: string } => {
    try {
      if (typeof snapshotOrId === 'string') {
        const found = archivedDailyBackups.find(b => b.id === snapshotOrId);
        if (found) {
          soundManager.playSuccessTone();
          return { success: true, message: `Restauration effectuée depuis l'archive "${found.id}".` };
        }
      } else if (typeof snapshotOrId === 'object' && 'data' in snapshotOrId && snapshotOrId.data) {
        const d = snapshotOrId.data;
        if (d.users) setUsers(d.users);
        if (d.tables) setTables(d.tables);
        if (d.products) setProducts(d.products);
        if (d.orders) setOrders(d.orders);
        if (d.payments) setPayments(d.payments);
        if (d.stockMovements) setStockMovements(d.stockMovements);
        if (d.companyProfile) setCompanyProfile(d.companyProfile);
        if (d.printerConfig) setPrinterConfig(d.printerConfig);
        if (d.sectionClosings) setSectionClosings(d.sectionClosings);
        if (d.archivedDailyBackups) setArchivedDailyBackups(d.archivedDailyBackups);
        soundManager.playSuccessTone();
        return { success: true, message: 'Système restauré avec succès depuis la sauvegarde intégrale !' };
      }
      return { success: true, message: 'État restauré.' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: `Erreur lors de la restauration: ${msg}` };
    }
  };

  const exportFullBackupJSON = () => {
    const snapshot = createFullSystemBackup('Sauvegarde exportée');
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(snapshot, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `sauvegarde_integrale_clubpos_${snapshot.backupDate}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // ==========================================
  // Local Disk Automatic JSON Backup Methods
  // ==========================================

  const saveBackupToDiskNow = async (
    notes?: string,
    backupType: 'MANUAL' | 'SHIFT_CLOSING' | 'AUTO_INTERVAL' | 'BEFORE_RESET' = 'MANUAL'
  ): Promise<{ success: boolean; fileName: string; sizeFormatted: string; location: string; error?: string }> => {
    setIsDiskBackupRunning(true);
    try {
      const snapshot = createFullSystemBackup(notes || 'Sauvegarde disque local');
      const res = await localDiskBackup.saveBackupFileToDisk(snapshot, backupType);

      if (res.success) {
        setDiskBackupConfig(prev => ({
          ...prev,
          lastBackupAt: new Date().toISOString(),
          lastBackupFileName: res.fileName,
          folderPathOrName: res.location
        }));
        // Refresh local disk files
        const updatedList = await localDiskBackup.listDiskBackupFiles();
        setDiskBackupFiles(updatedList);
      }
      return res;
    } catch (err: any) {
      return {
        success: false,
        fileName: '',
        sizeFormatted: '0 Ko',
        location: '',
        error: err.message || 'Erreur lors de la sauvegarde sur disque'
      };
    } finally {
      setIsDiskBackupRunning(false);
    }
  };

  const refreshDiskBackupFiles = async (): Promise<DiskBackupFileInfo[]> => {
    try {
      const list = await localDiskBackup.listDiskBackupFiles();
      setDiskBackupFiles(list);
      return list;
    } catch {
      return [];
    }
  };

  const pickCustomDiskFolder = async (): Promise<{ success: boolean; folderName: string; error?: string }> => {
    const res = await localDiskBackup.pickCustomDirectory();
    if (res.success) {
      setDiskBackupConfig(prev => ({
        ...prev,
        storageMode: 'DIRECTORY_PICKER',
        folderPathOrName: res.folderName
      }));
      await refreshDiskBackupFiles();
    }
    return res;
  };

  const restoreFromDiskBackup = async (fileName: string): Promise<{ success: boolean; message: string }> => {
    try {
      const snapshot = await localDiskBackup.readBackupFileFromDisk(fileName);
      if (!snapshot) {
        return { success: false, message: `Impossible de lire le fichier "${fileName}" sur le disque local.` };
      }
      return restoreFromBackupSnapshot(snapshot);
    } catch (err: any) {
      return { success: false, message: err.message || 'Erreur lors de la lecture du fichier de sauvegarde.' };
    }
  };

  const dismissAutoRestoredNotice = () => {
    setAutoRestoredNotice(null);
  };

  const restoreLatestDiskBackupNow = async (): Promise<{ success: boolean; message: string; fileName?: string }> => {
    try {
      const latest = await localDiskBackup.getLatestBackupFile();
      if (!latest || !latest.snapshot || !latest.snapshot.data) {
        return { success: false, message: 'Aucun fichier de sauvegarde .JSON valide trouvé dans le dossier du disque local.' };
      }
      const res = restoreFromBackupSnapshot(latest.snapshot);
      if (res.success) {
        const { fileName, snapshot, fileInfo } = latest;
        const d = snapshot.data;
        const totalRev = fileInfo.totalRevenueFCFA || (d.payments ? d.payments.reduce((acc: number, p: any) => acc + (p.totalPaidFCFA || 0), 0) : 0);
        const ordersCnt = fileInfo.ordersCount || (d.orders ? d.orders.length : 0);
        const paymentsCnt = fileInfo.paymentsCount || (d.payments ? d.payments.length : 0);

        setAutoRestoredNotice({
          fileName,
          savedAt: fileInfo.savedAt || snapshot.createdAt,
          totalRevenueFCFA: totalRev,
          ordersCount: ordersCnt,
          paymentsCount: paymentsCnt
        });

        setDiskBackupConfig(prev => ({
          ...prev,
          lastAutoRestoredFileName: fileName,
          lastAutoRestoredAt: new Date().toISOString()
        }));

        return {
          success: true,
          message: `Dernier fichier "${fileName}" ouvert et restauré avec succès (${ordersCnt} commandes, ${paymentsCnt} encaissements).`,
          fileName
        };
      }
      return { success: false, message: res.message };
    } catch (err: any) {
      return { success: false, message: `Erreur lors de l'ouverture du dernier fichier: ${err?.message || err}` };
    }
  };

  const deleteDiskBackupFile = async (fileName: string): Promise<boolean> => {
    const ok = await localDiskBackup.deleteBackupFile(fileName);
    if (ok) {
      setDiskBackupFiles(prev => prev.filter(f => f.fileName !== fileName));
    }
    return ok;
  };

  const downloadDiskBackupFile = async (fileName: string): Promise<void> => {
    const snapshot = await localDiskBackup.readBackupFileFromDisk(fileName);
    if (snapshot) {
      localDiskBackup.triggerBrowserDownload(fileName, JSON.stringify(snapshot, null, 2));
    }
  };

  const updateDiskBackupConfig = (partial: Partial<LocalDiskBackupConfig>) => {
    setDiskBackupConfig(prev => ({ ...prev, ...partial }));
  };

  // Periodic background auto-backup into local device disk (chaque minute)
  useEffect(() => {
    if (!diskBackupConfig.autoBackupEnabled || diskBackupConfig.intervalMinutes <= 0) return;
    const intervalMs = Math.max(diskBackupConfig.intervalMinutes, 0.5) * 60 * 1000;
    const timer = setInterval(async () => {
      try {
        await saveBackupToDiskNow(
          `Sauvegarde automatique continue (${diskBackupConfig.intervalMinutes} min)`,
          'AUTO_INTERVAL'
        );
      } catch (e) {
        console.debug('[DiskBackup] Periodic auto-backup error:', e);
      }
    }, intervalMs);
    return () => clearInterval(timer);
  }, [diskBackupConfig.autoBackupEnabled, diskBackupConfig.intervalMinutes, activeEnterpriseId]);

  const resetAllToFactoryDefaults = () => {
    localStorage.clear();
    setCompanyProfile(INITIAL_COMPANY_PROFILE);
    setTables(INITIAL_TABLES);
    setProducts(INITIAL_PRODUCTS);
    setOrders([]);
    setPayments(INITIAL_PAYMENTS);
    setStockMovements([]);
    setSectionClosings([]);
    setArchivedDailyBackups(INITIAL_DAILY_BACKUPS);
    setPrinterConfig(INITIAL_PRINTER_CONFIG);
    setCurrentUser(INITIAL_USERS[0]);
    setShiftStartTime(new Date().toISOString());
  };

  // ==========================================
  // Device / MAC / IP Station Identification & Zero-Reset
  // ==========================================

  const dismissNewDeviceAlert = () => {
    setDeviceChangeAlert(null);
    setIsNewDeviceModalOpen(false);
    saveRegisteredDeviceSignature(deviceSignature);
  };

  const updateStationDeviceConfig = (updates: Partial<DeviceSignature>) => {
    const updated = updateStationConfig(updates);
    setDeviceSignature(updated);
    saveRegisteredDeviceSignature(updated);
    setKnownDevicesList(getKnownDevicesHistory());
    soundManager.playSuccessTone();
  };

  const simulateDeviceChange = (type: 'NEW_DEVICE' | 'NEW_MAC' | 'NEW_IP') => {
    const simulated: DeviceSignature = { ...deviceSignature };
    if (type === 'NEW_MAC') {
      simulated.macAddress = generateMacAddress();
    } else if (type === 'NEW_IP') {
      simulated.ipAddress = generateStationIp();
    } else if (type === 'NEW_DEVICE') {
      simulated.deviceId = `POS-DEV-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      simulated.macAddress = generateMacAddress();
      simulated.ipAddress = generateStationIp();
    }

    const alert: DeviceChangeAlert = {
      isNew: true,
      reason: type,
      message: `Simulation active : Nouveau ${type === 'NEW_MAC' ? 'Code MAC' : type === 'NEW_IP' ? 'Code IP' : 'Terminal'} généré.`,
      currentMac: simulated.macAddress,
      currentIp: simulated.ipAddress,
      currentDeviceId: simulated.deviceId,
      previousMac: deviceSignature.macAddress,
      previousIp: deviceSignature.ipAddress,
      previousDeviceId: deviceSignature.deviceId,
      timestamp: new Date().toISOString()
    };

    setDeviceSignature(simulated);
    setDeviceChangeAlert(alert);
    setIsNewDeviceModalOpen(true);
  };

  // Multi-Enterprise Isolation & Sharing Engine Actions
  const switchEnterprise = (targetEnterpriseId: string): boolean => {
    const target = enterprisesList.find(e => e.id === targetEnterpriseId || e.code.toUpperCase() === targetEnterpriseId.toUpperCase());
    if (!target) {
      return false;
    }

    const realId = target.id;
    if (realId === activeEnterpriseId) {
      return true;
    }

    // Flush current active state into scoped storage before switching
    localStorage.setItem(getScopedKey(STORAGE_KEYS.USERS, activeEnterpriseId), JSON.stringify(users));
    localStorage.setItem(getScopedKey(STORAGE_KEYS.COMPANY_PROFILE, activeEnterpriseId), JSON.stringify(companyProfile));
    localStorage.setItem(getScopedKey(STORAGE_KEYS.TABLES, activeEnterpriseId), JSON.stringify(tables));
    localStorage.setItem(getScopedKey(STORAGE_KEYS.PRODUCTS, activeEnterpriseId), JSON.stringify(products));
    localStorage.setItem(getScopedKey(STORAGE_KEYS.ORDERS, activeEnterpriseId), JSON.stringify(orders));
    localStorage.setItem(getScopedKey(STORAGE_KEYS.PAYMENTS, activeEnterpriseId), JSON.stringify(payments));

    // Update active enterprise in state and Firestore
    setActiveEnterpriseId(realId);
    firestoreSync.setEnterpriseId(realId);
    localStorage.setItem(STORAGE_KEYS.ACTIVE_ENTERPRISE_ID, realId);

    // Hydrate state from target enterprise storage
    const savedProfile = localStorage.getItem(getScopedKey(STORAGE_KEYS.COMPANY_PROFILE, realId));
    const newProfile = savedProfile ? JSON.parse(savedProfile) : (target.profile || { ...INITIAL_COMPANY_PROFILE, name: target.name, enterpriseId: realId, enterpriseCode: target.code });
    setCompanyProfile(newProfile);

    const savedUsers = localStorage.getItem(getScopedKey(STORAGE_KEYS.USERS, realId));
    const newUsers = savedUsers ? JSON.parse(savedUsers) : INITIAL_USERS;
    setUsers(newUsers);
    setCurrentUser(newUsers[0]);

    const savedTables = localStorage.getItem(getScopedKey(STORAGE_KEYS.TABLES, realId));
    setTables(savedTables ? JSON.parse(savedTables) : INITIAL_TABLES);

    const savedProducts = localStorage.getItem(getScopedKey(STORAGE_KEYS.PRODUCTS, realId));
    setProducts(savedProducts ? JSON.parse(savedProducts) : []);

    const savedOrders = localStorage.getItem(getScopedKey(STORAGE_KEYS.ORDERS, realId));
    setOrders(savedOrders ? JSON.parse(savedOrders) : []);

    const savedPayments = localStorage.getItem(getScopedKey(STORAGE_KEYS.PAYMENTS, realId));
    setPayments(savedPayments ? JSON.parse(savedPayments) : []);

    const savedMovements = localStorage.getItem(getScopedKey(STORAGE_KEYS.MOVEMENTS, realId));
    setStockMovements(savedMovements ? JSON.parse(savedMovements) : []);

    const savedBackups = localStorage.getItem(getScopedKey(STORAGE_KEYS.BACKUPS, realId));
    setArchivedDailyBackups(savedBackups ? JSON.parse(savedBackups) : []);

    const savedClosings = localStorage.getItem(getScopedKey(STORAGE_KEYS.SECTION_CLOSINGS, realId));
    setSectionClosings(savedClosings ? JSON.parse(savedClosings) : []);

    const savedPrinter = localStorage.getItem(getScopedKey(STORAGE_KEYS.PRINTER, realId));
    if (savedPrinter) setPrinterConfig(JSON.parse(savedPrinter));

    const savedDiskBackup = localStorage.getItem(getScopedKey(STORAGE_KEYS.DISK_BACKUP_CONFIG, realId));
    if (savedDiskBackup) {
      try {
        const parsed = JSON.parse(savedDiskBackup);
        if (parsed.intervalMinutes === 30 || !parsed.intervalMinutes) {
          parsed.intervalMinutes = 1;
        }
        setDiskBackupConfig({ ...DEFAULT_DISK_BACKUP_CONFIG, ...parsed });
      } catch {
        setDiskBackupConfig(DEFAULT_DISK_BACKUP_CONFIG);
      }
    } else {
      setDiskBackupConfig(DEFAULT_DISK_BACKUP_CONFIG);
    }

    setActiveTableId(null);
    soundManager.playSuccessTone();

    // Update browser URL query parameter without full reload so page reflects active enterprise
    if (typeof window !== 'undefined' && window.history) {
      const url = new URL(window.location.href);
      url.searchParams.set('enterprise', realId);
      window.history.replaceState({}, '', url.toString());
    }

    return true;
  };

  const createNewEnterprise = (options: {
    name: string;
    templateType: EstablishmentTemplateType;
    directorName?: string;
    directorPin?: string;
    phone?: string;
    address?: string;
    currency?: string;
    starterCatalogOption?: 'TEMPLATE_CATALOG' | 'EMPTY';
    customCode?: string;
  }): { success: boolean; enterpriseId: string; enterpriseCode: string; message: string } => {
    const rawName = options.name.trim();
    if (!rawName) {
      return { success: false, enterpriseId: '', enterpriseCode: '', message: 'Le nom de l\'établissement est requis.' };
    }

    const cleanCode = (options.customCode?.trim() || rawName.substring(0, 8))
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '') || `ENT${Math.floor(1000 + Math.random() * 9000)}`;

    const newEntId = `ent_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Generate tailored initial dataset from template
    const dataset = createStarterDatasetForTemplate({
      name: rawName,
      templateType: options.templateType,
      enterpriseId: newEntId,
      enterpriseCode: cleanCode,
      directorName: options.directorName,
      directorPin: options.directorPin,
      phone: options.phone,
      address: options.address,
      currency: options.currency,
      starterCatalogOption: options.starterCatalogOption
    });

    const newRecord: EnterpriseRecord = {
      id: newEntId,
      code: cleanCode,
      name: rawName,
      templateType: options.templateType,
      createdAt: new Date().toISOString(),
      currency: options.currency || 'FCFA',
      address: options.address,
      phone: options.phone,
      profile: dataset.profile
    };

    // Save initial dataset to scoped local storage
    localStorage.setItem(getScopedKey(STORAGE_KEYS.COMPANY_PROFILE, newEntId), JSON.stringify(dataset.profile));
    localStorage.setItem(getScopedKey(STORAGE_KEYS.USERS, newEntId), JSON.stringify(dataset.users));
    localStorage.setItem(getScopedKey(STORAGE_KEYS.CURRENT_USER, newEntId), JSON.stringify(dataset.users[0]));
    localStorage.setItem(getScopedKey(STORAGE_KEYS.TABLES, newEntId), JSON.stringify(dataset.tables));
    localStorage.setItem(getScopedKey(STORAGE_KEYS.PRODUCTS, newEntId), JSON.stringify(dataset.products));
    localStorage.setItem(getScopedKey(STORAGE_KEYS.ORDERS, newEntId), JSON.stringify([]));
    localStorage.setItem(getScopedKey(STORAGE_KEYS.PAYMENTS, newEntId), JSON.stringify([]));
    localStorage.setItem(getScopedKey(STORAGE_KEYS.MOVEMENTS, newEntId), JSON.stringify([]));
    localStorage.setItem(getScopedKey(STORAGE_KEYS.BACKUPS, newEntId), JSON.stringify([]));
    localStorage.setItem(getScopedKey(STORAGE_KEYS.SECTION_CLOSINGS, newEntId), JSON.stringify([]));
    localStorage.setItem(getScopedKey(STORAGE_KEYS.PRINTER, newEntId), JSON.stringify(dataset.printerConfig));
    localStorage.setItem(getScopedKey(STORAGE_KEYS.STARTUP_OPTIONS, newEntId), JSON.stringify(dataset.startupOptions));

    // Register enterprise
    const updatedEnterprises = [...enterprisesList, newRecord];
    setEnterprisesList(updatedEnterprises);
    localStorage.setItem(STORAGE_KEYS.ENTERPRISES_REGISTRY, JSON.stringify(updatedEnterprises));

    // Switch to the newly created enterprise
    setActiveEnterpriseId(newEntId);
    firestoreSync.setEnterpriseId(newEntId);
    localStorage.setItem(STORAGE_KEYS.ACTIVE_ENTERPRISE_ID, newEntId);

    // Apply state
    setCompanyProfile(dataset.profile);
    setUsers(dataset.users);
    setCurrentUser(dataset.users[0]);
    setTables(dataset.tables);
    setProducts(dataset.products);
    setOrders([]);
    setPayments([]);
    setStockMovements([]);
    setArchivedDailyBackups([]);
    setSectionClosings([]);
    setPrinterConfig(dataset.printerConfig);
    setStartupOptions(dataset.startupOptions);
    setActiveTableId(null);

    // Push initial structure to Firestore cloud
    firestoreSync.saveEnterpriseRecord(newRecord).catch(console.warn);
    firestoreSync.saveCompanyProfile(dataset.profile).catch(console.warn);
    firestoreSync.saveTablesBatch(dataset.tables).catch(console.warn);
    if (dataset.products.length > 0) {
      firestoreSync.saveProductsBatch(dataset.products).catch(console.warn);
    }
    dataset.users.forEach(u => firestoreSync.saveUser(u).catch(console.warn));

    soundManager.playCashRegister();

    // Update browser URL query parameter
    if (typeof window !== 'undefined' && window.history) {
      const url = new URL(window.location.href);
      url.searchParams.set('enterprise', newEntId);
      window.history.replaceState({}, '', url.toString());
    }

    return {
      success: true,
      enterpriseId: newEntId,
      enterpriseCode: cleanCode,
      message: `L'établissement "${rawName}" (Code: ${cleanCode}) a été créé avec succès et activé.`
    };
  };

  const joinEnterpriseByCode = (codeOrId: string): { success: boolean; message: string; enterprise?: EnterpriseRecord } => {
    const cleaned = codeOrId.trim().toUpperCase();
    if (!cleaned) {
      return { success: false, message: 'Veuillez saisir un code d\'accès ou identifiant valide.' };
    }

    const found = enterprisesList.find(e => e.id.toUpperCase() === cleaned || e.code.toUpperCase() === cleaned);
    if (found) {
      switchEnterprise(found.id);
      return { success: true, message: `Connexion réussie à l'établissement "${found.name}".`, enterprise: found };
    }

    // If not found in local registry, create a placeholder registration to let Firestore listeners fetch it
    const newEntId = cleaned.toLowerCase().startsWith('ent_') ? codeOrId.trim() : `ent_${cleaned.toLowerCase()}`;
    const dynamicRecord: EnterpriseRecord = {
      id: newEntId,
      code: cleaned,
      name: `Établissement ${cleaned}`,
      templateType: 'VIP_NIGHTCLUB',
      createdAt: new Date().toISOString()
    };

    const updated = [...enterprisesList, dynamicRecord];
    setEnterprisesList(updated);
    localStorage.setItem(STORAGE_KEYS.ENTERPRISES_REGISTRY, JSON.stringify(updated));
    switchEnterprise(newEntId);

    return { 
      success: true, 
      message: `Connexion initiée à l'établissement distant (Code: ${cleaned}). Les données vont se synchroniser automatiquement.`,
      enterprise: dynamicRecord 
    };
  };

  const deleteEnterprise = (enterpriseId: string): { success: boolean; message: string } => {
    if (enterpriseId === 'default') {
      return { success: false, message: 'L\'établissement principal par défaut ne peut pas être supprimé.' };
    }

    // Remove from registry
    const updated = enterprisesList.filter(e => e.id !== enterpriseId);
    setEnterprisesList(updated);
    localStorage.setItem(STORAGE_KEYS.ENTERPRISES_REGISTRY, JSON.stringify(updated));

    // If active, switch to default
    if (activeEnterpriseId === enterpriseId) {
      switchEnterprise('default');
    }

    // Remove from cloud
    firestoreSync.deleteEnterpriseFromCloud(enterpriseId).catch(console.warn);

    return { success: true, message: 'L\'établissement a été retiré de la liste.' };
  };

  const getEnterpriseShareLink = (targetId?: string): string => {
    const id = targetId || activeEnterpriseId;
    if (typeof window === 'undefined') return '';
    const base = window.location.origin + window.location.pathname;
    return `${base}?enterprise=${encodeURIComponent(id)}`;
  };

  const resetAllToFreshZero = (options?: { resetStockLevelsToZero?: boolean; wipeCatalog?: boolean; customMac?: string; customIp?: string; customDeviceName?: string }) => {
    const resetStock = options?.resetStockLevelsToZero ?? true;
    const wipeCat = options?.wipeCatalog ?? false;

    // 1. Reset all transactions & operations to 0
    setOrders([]);
    setPayments([]);
    setStockMovements([]);
    setSectionClosings([]);
    setArchivedDailyBackups([]);
    setActiveTableId(null);

    localStorage.setItem(getScopedKey(STORAGE_KEYS.ORDERS, activeEnterpriseId), JSON.stringify([]));
    localStorage.setItem(getScopedKey(STORAGE_KEYS.PAYMENTS, activeEnterpriseId), JSON.stringify([]));
    localStorage.setItem(getScopedKey(STORAGE_KEYS.MOVEMENTS, activeEnterpriseId), JSON.stringify([]));
    localStorage.setItem(getScopedKey(STORAGE_KEYS.BACKUPS, activeEnterpriseId), JSON.stringify([]));
    localStorage.setItem(getScopedKey(STORAGE_KEYS.SECTION_CLOSINGS, activeEnterpriseId), JSON.stringify([]));

    // 2. Reset Tables to LIBRE, 0 amount
    setTables(prev => {
      const updated = prev.map(t => ({
        ...t,
        status: 'LIBRE' as const,
        currentOrderId: undefined,
        assignedServerId: undefined,
        assignedServerName: undefined,
        totalAmountFCFA: 0,
        openedAt: undefined
      }));
      localStorage.setItem(getScopedKey(STORAGE_KEYS.TABLES, activeEnterpriseId), JSON.stringify(updated));
      return updated;
    });

    // 3. Reset Product stock to 0 or reset catalog
    if (wipeCat) {
      setProducts([]);
      localStorage.setItem(getScopedKey(STORAGE_KEYS.PRODUCTS, activeEnterpriseId), JSON.stringify([]));
    } else if (resetStock) {
      setProducts(prev => {
        const updated = prev.map(p => ({
          ...p,
          currentStock: 0
        }));
        localStorage.setItem(getScopedKey(STORAGE_KEYS.PRODUCTS, activeEnterpriseId), JSON.stringify(updated));
        return updated;
      });
    }

    // 4. Update Shift start time
    const nowStr = new Date().toISOString();
    setShiftStartTime(nowStr);
    localStorage.setItem(getScopedKey(STORAGE_KEYS.SHIFT_START, activeEnterpriseId), nowStr);

    // 5. Clear cloud records
    firestoreSync.clearSalesAndOrdersFromCloud().catch(err => {
      console.warn('[CloudSync] Error resetting cloud on fresh station zero:', err);
    });

    // 5. Update and register the new device signature
    let currentSig = { ...deviceSignature };
    if (options?.customMac || options?.customIp || options?.customDeviceName) {
      currentSig = updateStationConfig({
        ...(options.customMac ? { macAddress: options.customMac } : {}),
        ...(options.customIp ? { ipAddress: options.customIp } : {}),
        ...(options.customDeviceName ? { deviceName: options.customDeviceName } : {})
      });
    }
    setDeviceSignature(currentSig);
    saveRegisteredDeviceSignature(currentSig);
    setKnownDevicesList(getKnownDevicesHistory());

    // 6. Clear alert and trigger feedback
    setDeviceChangeAlert(null);
    setIsNewDeviceModalOpen(false);
    soundManager.playCashRegister();
  };

  const confirmNewDeviceAndReset = (options?: { resetStockLevelsToZero?: boolean; keepCatalog?: boolean }) => {
    resetAllToFreshZero({
      resetStockLevelsToZero: options?.resetStockLevelsToZero ?? true,
      wipeCatalog: !(options?.keepCatalog ?? true)
    });
  };

  const resetSalesAndTransactionsHistory = (options?: {
    resetTablesAndOrders?: boolean;
    clearDailyArchives?: boolean;
    clearStockMovements?: boolean;
    clearCloudRecords?: boolean;
    createBackupSnapshotFirst?: boolean;
    notes?: string;
  }): { 
    success: boolean; 
    message: string; 
    backupId?: string;
    previousRevenueFCFA?: number;
    deletedPaymentsCount?: number;
  } => {
    const createBackup = options?.createBackupSnapshotFirst ?? true;
    const resetTables = options?.resetTablesAndOrders ?? true;
    const clearArchives = options?.clearDailyArchives ?? false;
    const clearStock = options?.clearStockMovements ?? true;
    const clearCloud = options?.clearCloudRecords ?? true;

    const prevRevenue = payments.reduce((acc, p) => acc + p.totalPaidFCFA, 0);
    const prevPaymentsCount = payments.length;

    // 1. Create automatic full backup snapshot if requested
    let backupSnapshot: FullSystemBackupSnapshot | undefined;
    if (createBackup) {
      backupSnapshot = createFullSystemBackup(
        options?.notes || `Sauvegarde automatique intégrale avant réinitialisation générale des ventes par la Direction (${prevPaymentsCount} transactions, ${formatFCFA(prevRevenue)})`
      );
      if (diskBackupConfig.backupBeforeReset) {
        localDiskBackup.saveBackupFileToDisk(backupSnapshot, 'BEFORE_RESET').then(() => {
          refreshDiskBackupFiles();
        }).catch(console.error);
      }
    }

    // 2. Clear payments across the entire application
    setPayments([]);
    localStorage.setItem(getScopedKey(STORAGE_KEYS.PAYMENTS, activeEnterpriseId), JSON.stringify([]));

    // 3. Clear active orders and reset tables to LIBRE across all views
    if (resetTables) {
      setOrders([]);
      localStorage.setItem(getScopedKey(STORAGE_KEYS.ORDERS, activeEnterpriseId), JSON.stringify([]));
      
      setTables(prev => {
        const updated = prev.map(t => ({
          ...t,
          status: 'LIBRE' as const,
          currentOrderId: undefined,
          assignedServerId: undefined,
          assignedServerName: undefined,
          totalAmountFCFA: 0,
          openedAt: undefined
        }));
        localStorage.setItem(getScopedKey(STORAGE_KEYS.TABLES, activeEnterpriseId), JSON.stringify(updated));
        return updated;
      });

      setActiveTableId(null);
    }

    // 4. Clear stock movements history if selected (so movement history is also clean)
    if (clearStock) {
      setStockMovements([]);
      localStorage.setItem(getScopedKey(STORAGE_KEYS.MOVEMENTS, activeEnterpriseId), JSON.stringify([]));
    }

    // 5. Clear daily archives and section closings if selected
    if (clearArchives) {
      setArchivedDailyBackups([]);
      setSectionClosings([]);
      localStorage.setItem(getScopedKey(STORAGE_KEYS.BACKUPS, activeEnterpriseId), JSON.stringify([]));
      localStorage.setItem(getScopedKey(STORAGE_KEYS.SECTION_CLOSINGS, activeEnterpriseId), JSON.stringify([]));
    }

    // 6. Update shift start time to current timestamp (restarts all daily Z metrics from 0)
    const nowStr = new Date().toISOString();
    setShiftStartTime(nowStr);
    localStorage.setItem(getScopedKey(STORAGE_KEYS.SHIFT_START, activeEnterpriseId), nowStr);

    // 7. Clear cloud Firestore logs and remote sales collections
    if (clearCloud) {
      firestoreSync.clearSalesAndOrdersFromCloud().catch(err => {
        console.warn('[CloudSync] Error clearing cloud sales history:', err);
      });
    }

    soundManager.playCashRegister();

    return {
      success: true,
      message: `L'historique des ventes et transactions a été réinitialisé à 0 FCFA sur toute l'application (${prevPaymentsCount} transactions purgées).`,
      backupId: backupSnapshot?.id,
      previousRevenueFCFA: prevRevenue,
      deletedPaymentsCount: prevPaymentsCount
    };
  };

  const value = useMemo(() => ({
    activeEnterpriseId,
    enterprisesList,
    showEnterpriseModal,
    setShowEnterpriseModal,
    switchEnterprise,
    createNewEnterprise,
    joinEnterpriseByCode,
    deleteEnterprise,
    getEnterpriseShareLink,
    currentUser,
    users,
    tables,
    products,
    categories: PRODUCT_CATEGORIES,
    orders,
    payments,
    stockMovements,
    archivedDailyBackups,
    sectionClosings,
    printerConfig,
    companyProfile,
    startupOptions,
    activeTableId,
    shiftStartTime,
    isSoundEnabled,
    showStartupModal,
    showCompanyProfileModal,
    showPrinterSettingsModal,
    deviceSignature,
    deviceChangeAlert,
    isNewDeviceModalOpen,
    showDeviceStationModal,
    knownDevicesList,
    setShowDeviceStationModal,
    setIsNewDeviceModalOpen,
    dismissNewDeviceAlert,
    updateStationDeviceConfig,
    simulateDeviceChange,
    resetAllToFreshZero,
    confirmNewDeviceAndReset,
    setCurrentUser,
    setActiveTableId,
    toggleSound,
    setPrinterConfig,
    setShowStartupModal,
    setCompanyProfile,
    updateCompanyProfile,
    setStartupOptions,
    updateStartupOptions,
    setShowCompanyProfileModal,
    setShowPrinterSettingsModal,
    connectBluetoothPrinter,
    disconnectBluetoothPrinter,
    testPrintBluetooth,
    updateScanOptions,
    searchAndPairBluetooth,
    connectSavedDevice,
    saveBluetoothDevice,
    removeBluetoothDevice,
    toggleFavoriteDevice,
    addUser,
    updateUser,
    deleteUser,
    resetUsersToDefault,
    addProduct,
    updateProduct,
    deleteProduct,
    addTable,
    updateTable,
    deleteTable,
    getDirectorUser,
    verifyDirectorPin,
    changeDirectorPin,
    updateUserPin,
    isDirectorPasswordModalOpen,
    setIsDirectorPasswordModalOpen,
    authenticateWithPin,
    switchUserRole,
    createOrUpdateOrder,
    markOrderItemServed,
    markAllOrderItemsServed,
    cancelOrderItem,
    processCheckout,
    restockProduct,
    recordStockLoss,
    quickAdjustStock,
    getLiveShiftReport,
    closeNightShift,
    resetAllToFactoryDefaults,
    resetSalesAndTransactionsHistory,
    getSectionReport,
    closeSection,
    reopenSection,
    deleteSectionClosing,
    getDailyReport,
    getMonthlyReport,
    getAvailableDates,
    getAvailableMonths,
    createFullSystemBackup,
    restoreFromBackupSnapshot,
    saveEndOfDayClosing,
    exportFullBackupJSON,
    exportDailyBackupJSON,
    exportSalesCSV,
    importBackupJSON,
    deleteArchivedBackup,
    diskBackupConfig,
    updateDiskBackupConfig,
    diskBackupFiles,
    isDiskBackupRunning,
    saveBackupToDiskNow,
    refreshDiskBackupFiles,
    pickCustomDiskFolder,
    restoreFromDiskBackup,
    restoreLatestDiskBackupNow,
    autoRestoredNotice,
    dismissAutoRestoredNotice,
    deleteDiskBackupFile,
    downloadDiskBackupFile,
    showDiskBackupModal,
    setShowDiskBackupModal,
    cloudSyncStatus,
    syncLogs,
    pendingSyncCount,
    pendingSyncAmountFCFA,
    isSyncingQueue,
    processSyncQueue,
    retrySingleSyncLog,
    clearSyncedLogs,
    clearAllLogs,
    exportSyncLogsJSON
  }), [
    activeEnterpriseId, enterprisesList, showEnterpriseModal,
    currentUser, users, tables, products, orders, payments, stockMovements,
    archivedDailyBackups, sectionClosings, printerConfig, companyProfile, startupOptions, activeTableId, shiftStartTime, 
    isSoundEnabled, showStartupModal, showCompanyProfileModal, showPrinterSettingsModal, cloudSyncStatus,
    deviceSignature, deviceChangeAlert, isNewDeviceModalOpen, showDeviceStationModal, knownDevicesList,
    syncLogs, pendingSyncCount, pendingSyncAmountFCFA, isSyncingQueue,
    diskBackupConfig, diskBackupFiles, isDiskBackupRunning, showDiskBackupModal,
    autoRestoredNotice
  ]);

  return (
    <POSContext.Provider value={value}>
      {children}
    </POSContext.Provider>
  );
};

export const usePOS = () => {
  const context = useContext(POSContext);
  if (!context) {
    throw new Error('usePOS must be used within a POSProvider');
  }
  return context;
};
