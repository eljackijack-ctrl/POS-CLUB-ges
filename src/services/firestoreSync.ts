import { 
  db, 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  writeBatch 
} from '../lib/firebase';
import { 
  Product, 
  Table, 
  Order, 
  Payment, 
  StockMovement, 
  CompanyProfile, 
  PrinterConfig, 
  User, 
  DailyBackupSnapshot,
  SectionClosingRecord,
  SyncTransactionLog,
  SyncLogType,
  SyncLogStatus,
  EnterpriseRecord
} from '../types';

export type CloudSyncStatus = 'CONNECTED' | 'SYNCING' | 'OFFLINE' | 'INITIALIZING';

const SYNC_LOGS_STORAGE_KEY = 'clubpos_sync_logs_v3';

class FirestoreSyncService {
  private status: CloudSyncStatus = 'INITIALIZING';
  private listeners: Array<(status: CloudSyncStatus) => void> = [];
  private logListeners: Array<(logs: SyncTransactionLog[]) => void> = [];
  private syncLogs: SyncTransactionLog[] = [];
  private isProcessingQueue: boolean = false;
  private enterpriseId: string = 'default';

  constructor() {
    this.loadLogsFromStorage();

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.setStatus('CONNECTED');
        this.processPendingQueue();
      });

      window.addEventListener('offline', () => {
        this.setStatus('OFFLINE');
      });

      // Background periodic queue processor every 30s
      setInterval(() => {
        if (navigator.onLine && this.getPendingCount() > 0 && !this.isProcessingQueue) {
          this.processPendingQueue();
        }
      }, 30000);
    }
  }

  // --- Enterprise Scoping ---

  public setEnterpriseId(id: string) {
    const cleaned = (id || 'default').trim();
    if (this.enterpriseId !== cleaned) {
      this.enterpriseId = cleaned;
      this.loadLogsFromStorage();
      this.notifyLogListeners();
    }
  }

  public getEnterpriseId(): string {
    return this.enterpriseId;
  }

  private getLogsStorageKey(): string {
    return this.enterpriseId === 'default' 
      ? SYNC_LOGS_STORAGE_KEY 
      : `${SYNC_LOGS_STORAGE_KEY}_${this.enterpriseId}`;
  }

  private getCollectionRef(colName: string) {
    if (!this.enterpriseId || this.enterpriseId === 'default') {
      return collection(db, colName);
    }
    return collection(db, 'enterprises', this.enterpriseId, colName);
  }

  private getDocRef(colName: string, docId: string) {
    if (!this.enterpriseId || this.enterpriseId === 'default') {
      return doc(db, colName, docId);
    }
    return doc(db, 'enterprises', this.enterpriseId, colName, docId);
  }

  private getSettingsDocRef(settingDocId: string) {
    if (!this.enterpriseId || this.enterpriseId === 'default') {
      return doc(db, 'settings', settingDocId);
    }
    return doc(db, 'enterprises', this.enterpriseId, 'settings', settingDocId);
  }

  // --- Storage for Sync Logs ---

  private loadLogsFromStorage() {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const saved = localStorage.getItem(this.getLogsStorageKey());
      if (saved) {
        this.syncLogs = JSON.parse(saved);
      } else {
        this.syncLogs = [];
      }
    } catch (e) {
      console.warn('[FirestoreSync] Failed to load sync logs:', e);
      this.syncLogs = [];
    }
  }

  private saveLogsToStorage() {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      // Keep up to 300 recent logs to avoid unbounded growth while preserving audit trail
      const trimmed = this.syncLogs.slice(-300);
      localStorage.setItem(this.getLogsStorageKey(), JSON.stringify(trimmed));
      this.notifyLogListeners();
    } catch (e) {
      console.warn('[FirestoreSync] Failed to save sync logs:', e);
    }
  }

  public getSyncLogs(): SyncTransactionLog[] {
    return [...this.syncLogs];
  }

  public getPendingCount(): number {
    return this.syncLogs.filter(l => l.status === 'PENDING' || l.status === 'FAILED' || l.status === 'SYNCING').length;
  }

  public getPendingAmountFCFA(): number {
    return this.syncLogs
      .filter(l => (l.status === 'PENDING' || l.status === 'FAILED') && (l.type === 'PAYMENT' || l.type === 'ORDER'))
      .reduce((sum, item) => sum + (item.amountFCFA || 0), 0);
  }

  public subscribeLogs(callback: (logs: SyncTransactionLog[]) => void): () => void {
    this.logListeners.push(callback);
    callback([...this.syncLogs]);
    return () => {
      this.logListeners = this.logListeners.filter(cb => cb !== callback);
    };
  }

  private notifyLogListeners() {
    const logs = [...this.syncLogs];
    this.logListeners.forEach(cb => cb(logs));
  }

  public getStatus(): CloudSyncStatus {
    return this.status;
  }

  public subscribeStatus(callback: (status: CloudSyncStatus) => void): () => void {
    this.listeners.push(callback);
    callback(this.status);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  private setStatus(newStatus: CloudSyncStatus) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.listeners.forEach(cb => cb(newStatus));
    }
  }

  // --- Real-time Listeners ---

  public listenProducts(onUpdate: (products: Product[]) => void) {
    try {
      return onSnapshot(this.getCollectionRef('products'), (snapshot) => {
        if (!snapshot.empty) {
          const items: Product[] = [];
          snapshot.forEach(docSnap => {
            items.push(docSnap.data() as Product);
          });
          onUpdate(items);
          this.setStatus('CONNECTED');
        }
      }, (error) => {
        console.warn('[Firestore] Products listener warning:', error);
      });
    } catch (e) {
      console.warn('[Firestore] Init listener failed:', e);
      return () => {};
    }
  }

  public listenTables(onUpdate: (tables: Table[]) => void) {
    try {
      return onSnapshot(this.getCollectionRef('tables'), (snapshot) => {
        if (!snapshot.empty) {
          const items: Table[] = [];
          snapshot.forEach(docSnap => {
            items.push(docSnap.data() as Table);
          });
          onUpdate(items);
          this.setStatus('CONNECTED');
        }
      }, (error) => {
        console.warn('[Firestore] Tables listener warning:', error);
      });
    } catch (e) {
      return () => {};
    }
  }

  public listenOrders(onUpdate: (orders: Order[]) => void) {
    try {
      return onSnapshot(this.getCollectionRef('orders'), (snapshot) => {
        const items: Order[] = [];
        snapshot.forEach(docSnap => {
          items.push(docSnap.data() as Order);
        });
        onUpdate(items);
        this.setStatus('CONNECTED');
      }, (error) => {
        console.warn('[Firestore] Orders listener warning:', error);
      });
    } catch (e) {
      return () => {};
    }
  }

  public listenPayments(onUpdate: (payments: Payment[]) => void) {
    try {
      return onSnapshot(this.getCollectionRef('payments'), (snapshot) => {
        const items: Payment[] = [];
        snapshot.forEach(docSnap => {
          items.push(docSnap.data() as Payment);
        });
        onUpdate(items);
        this.setStatus('CONNECTED');
      }, (error) => {
        console.warn('[Firestore] Payments listener warning:', error);
      });
    } catch (e) {
      return () => {};
    }
  }

  public listenStockMovements(onUpdate: (movements: StockMovement[]) => void) {
    try {
      return onSnapshot(this.getCollectionRef('stockMovements'), (snapshot) => {
        const items: StockMovement[] = [];
        snapshot.forEach(docSnap => {
          items.push(docSnap.data() as StockMovement);
        });
        onUpdate(items);
        this.setStatus('CONNECTED');
      }, (error) => {
        console.warn('[Firestore] Movements listener warning:', error);
      });
    } catch (e) {
      return () => {};
    }
  }

  public listenCompanyProfile(onUpdate: (profile: CompanyProfile) => void) {
    try {
      return onSnapshot(this.getSettingsDocRef('companyProfile'), (docSnap) => {
        if (docSnap.exists()) {
          onUpdate(docSnap.data() as CompanyProfile);
          this.setStatus('CONNECTED');
        }
      }, (error) => {
        console.warn('[Firestore] CompanyProfile listener warning:', error);
      });
    } catch (e) {
      return () => {};
    }
  }

  public listenPrinterConfig(onUpdate: (config: PrinterConfig) => void) {
    try {
      return onSnapshot(this.getSettingsDocRef('printerConfig'), (docSnap) => {
        if (docSnap.exists()) {
          onUpdate(docSnap.data() as PrinterConfig);
          this.setStatus('CONNECTED');
        }
      }, (error) => {
        console.warn('[Firestore] PrinterConfig listener warning:', error);
      });
    } catch (e) {
      return () => {};
    }
  }

  public listenUsers(onUpdate: (users: User[]) => void) {
    try {
      return onSnapshot(this.getCollectionRef('users'), (snapshot) => {
        if (!snapshot.empty) {
          const items: User[] = [];
          snapshot.forEach(docSnap => {
            items.push(docSnap.data() as User);
          });
          onUpdate(items);
          this.setStatus('CONNECTED');
        }
      }, (error) => {
        console.warn('[Firestore] Users listener warning:', error);
      });
    } catch (e) {
      return () => {};
    }
  }

  public listenSectionClosings(onUpdate: (closings: SectionClosingRecord[]) => void) {
    try {
      return onSnapshot(this.getCollectionRef('sectionClosings'), (snapshot) => {
        const items: SectionClosingRecord[] = [];
        snapshot.forEach(docSnap => {
          items.push(docSnap.data() as SectionClosingRecord);
        });
        onUpdate(items);
      }, (error) => {
        console.warn('[Firestore] Section closings listener warning:', error);
      });
    } catch (e) {
      return () => {};
    }
  }

  // Real-time listener for global registry of enterprises
  public listenEnterprises(onUpdate: (enterprises: EnterpriseRecord[]) => void) {
    try {
      return onSnapshot(collection(db, 'enterprises'), (snapshot) => {
        const items: EnterpriseRecord[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          if (data && data.name) {
            items.push(data as EnterpriseRecord);
          }
        });
        onUpdate(items);
      }, (error) => {
        console.warn('[Firestore] Enterprises listener warning:', error);
      });
    } catch (e) {
      return () => {};
    }
  }

  // --- Queue & Log Management Engine ---

  private async recordAndSync<T>(
    type: SyncLogType,
    entityId: string,
    reference: string,
    details: string,
    payload: T,
    amountFCFA?: number,
    customWriteFn?: () => Promise<void>
  ): Promise<void> {
    const existingIndex = this.syncLogs.findIndex(l => l.entityId === entityId && l.type === type);
    const logId = existingIndex >= 0 ? this.syncLogs[existingIndex].id : `synclog_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const logEntry: SyncTransactionLog = {
      id: logId,
      type,
      entityId,
      reference,
      details,
      amountFCFA,
      createdAt: existingIndex >= 0 ? this.syncLogs[existingIndex].createdAt : new Date().toISOString(),
      lastAttemptAt: new Date().toISOString(),
      status: 'PENDING',
      retryCount: existingIndex >= 0 ? this.syncLogs[existingIndex].retryCount + 1 : 0,
      payload
    };

    if (existingIndex >= 0) {
      this.syncLogs[existingIndex] = logEntry;
    } else {
      this.syncLogs.unshift(logEntry);
    }
    this.saveLogsToStorage();

    // If online, attempt direct cloud write immediately
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        logEntry.status = 'SYNCING';
        this.saveLogsToStorage();

        if (customWriteFn) {
          await customWriteFn();
        } else {
          await this.executeEntityWrite(type, entityId, payload);
        }

        logEntry.status = 'SYNCED';
        logEntry.syncedAt = new Date().toISOString();
        logEntry.errorMessage = undefined;
        this.setStatus('CONNECTED');
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logEntry.status = 'FAILED';
        logEntry.errorMessage = errorMsg;
        console.warn(`[FirestoreSync] Write queued for offline retry (${reference}):`, errorMsg);
      } finally {
        this.saveLogsToStorage();
      }
    } else {
      logEntry.status = 'PENDING';
      logEntry.errorMessage = 'Enregistré localement (Mode Hors-ligne). En attente de connexion réseau.';
      this.saveLogsToStorage();
    }
  }

  private async executeEntityWrite(type: SyncLogType, entityId: string, payload: any): Promise<void> {
    switch (type) {
      case 'PAYMENT':
        await setDoc(this.getDocRef('payments', entityId), payload);
        break;
      case 'ORDER':
        await setDoc(this.getDocRef('orders', entityId), payload);
        break;
      case 'STOCK_MOVEMENT':
        await setDoc(this.getDocRef('stockMovements', entityId), payload);
        break;
      case 'SECTION_CLOSING':
        await setDoc(this.getDocRef('sectionClosings', entityId), payload);
        break;
      case 'PRODUCT_UPDATE':
        await setDoc(this.getDocRef('products', entityId), payload);
        break;
      case 'TABLE_UPDATE':
        await setDoc(this.getDocRef('tables', entityId), payload);
        break;
      case 'DAILY_BACKUP':
        await setDoc(this.getDocRef('dailyBackups', entityId), payload);
        break;
      case 'SETTINGS':
        await setDoc(this.getSettingsDocRef(entityId), payload);
        break;
      default:
        throw new Error(`Type d'entité non reconnu: ${type}`);
    }
  }

  public async processPendingQueue(): Promise<{ success: number; failed: number }> {
    if (this.isProcessingQueue) return { success: 0, failed: 0 };
    this.isProcessingQueue = true;
    this.setStatus('SYNCING');

    const pendingLogs = this.syncLogs.filter(l => l.status === 'PENDING' || l.status === 'FAILED');
    let successCount = 0;
    let failedCount = 0;

    for (const log of pendingLogs) {
      log.status = 'SYNCING';
      log.lastAttemptAt = new Date().toISOString();
      log.retryCount += 1;
      this.saveLogsToStorage();

      try {
        await this.executeEntityWrite(log.type, log.entityId, log.payload);
        log.status = 'SYNCED';
        log.syncedAt = new Date().toISOString();
        log.errorMessage = undefined;
        successCount++;
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        log.status = 'FAILED';
        log.errorMessage = errorMsg;
        failedCount++;
      }
    }

    this.isProcessingQueue = false;
    this.setStatus(failedCount === 0 ? 'CONNECTED' : 'OFFLINE');
    this.saveLogsToStorage();
    return { success: successCount, failed: failedCount };
  }

  public async retrySingleLog(logId: string): Promise<boolean> {
    const log = this.syncLogs.find(l => l.id === logId);
    if (!log) return false;

    log.status = 'SYNCING';
    log.lastAttemptAt = new Date().toISOString();
    log.retryCount += 1;
    this.saveLogsToStorage();

    try {
      await this.executeEntityWrite(log.type, log.entityId, log.payload);
      log.status = 'SYNCED';
      log.syncedAt = new Date().toISOString();
      log.errorMessage = undefined;
      this.saveLogsToStorage();
      return true;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      log.status = 'FAILED';
      log.errorMessage = errorMsg;
      this.saveLogsToStorage();
      return false;
    }
  }

  public clearSyncedLogs() {
    this.syncLogs = this.syncLogs.filter(l => l.status !== 'SYNCED');
    this.saveLogsToStorage();
  }

  public clearAllLogs() {
    this.syncLogs = [];
    this.saveLogsToStorage();
  }

  // --- Public CRUD Cloud Methods with Automatic Queueing ---

  public async saveProduct(product: Product) {
    await this.recordAndSync(
      'PRODUCT_UPDATE',
      product.id,
      product.name,
      `Catégorie: ${product.categoryName} • Prix: ${product.priceFCFA.toLocaleString('fr-FR')} FCFA • Stock: ${product.currentStock}`,
      product
    );
  }

  public async saveProductsBatch(products: Product[]) {
    try {
      const batch = writeBatch(db);
      products.forEach(p => {
        const ref = this.getDocRef('products', p.id);
        batch.set(ref, p);
      });
      await batch.commit();
    } catch (e) {
      console.warn('[Firestore] Save products batch failed:', e);
    }
  }

  public async deleteProduct(productId: string) {
    try {
      await deleteDoc(this.getDocRef('products', productId));
    } catch (e) {
      console.warn('[Firestore] Delete product failed:', e);
    }
  }

  public async saveTable(table: Table) {
    await this.recordAndSync(
      'TABLE_UPDATE',
      table.id,
      `Table ${table.name}`,
      `Zone: ${table.zone} • Statut: ${table.status} • Total: ${table.totalAmountFCFA.toLocaleString('fr-FR')} FCFA`,
      table
    );
  }

  public async saveTablesBatch(tables: Table[]) {
    try {
      const batch = writeBatch(db);
      tables.forEach(t => {
        const ref = this.getDocRef('tables', t.id);
        batch.set(ref, t);
      });
      await batch.commit();
    } catch (e) {
      console.warn('[Firestore] Save tables batch failed:', e);
    }
  }

  public async saveOrder(order: Order) {
    await this.recordAndSync(
      'ORDER',
      order.id,
      `Commande #${order.orderNumber} (${order.tableName})`,
      `Serveur: ${order.serverName} • ${order.items.length} article(s) • Total: ${order.totalAmountFCFA.toLocaleString('fr-FR')} FCFA`,
      order,
      order.totalAmountFCFA
    );
  }

  public async deleteOrder(orderId: string) {
    try {
      await deleteDoc(this.getDocRef('orders', orderId));
    } catch (e) {
      console.warn('[Firestore] Delete order failed:', e);
    }
  }

  public async savePayment(payment: Payment) {
    await this.recordAndSync(
      'PAYMENT',
      payment.id,
      `Ticket #${payment.transactionReference || payment.id.substring(0, 8)} (${payment.tableName})`,
      `Mode: ${payment.paymentMethod} • Serveur: ${payment.serverName} • Total Net: ${payment.totalPaidFCFA.toLocaleString('fr-FR')} FCFA`,
      payment,
      payment.totalPaidFCFA
    );
  }

  public async clearSalesAndOrdersFromCloud(): Promise<void> {
    try {
      this.clearAllLogs();
      if (!navigator.onLine) return;

      // Delete payments
      const paymentsSnap = await getDocs(this.getCollectionRef('payments'));
      if (!paymentsSnap.empty) {
        const batch = writeBatch(db);
        paymentsSnap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }

      // Delete orders
      const ordersSnap = await getDocs(this.getCollectionRef('orders'));
      if (!ordersSnap.empty) {
        const batch = writeBatch(db);
        ordersSnap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
    } catch (e) {
      console.warn('[Firestore] clearSalesAndOrdersFromCloud warning:', e);
    }
  }

  public async saveEnterpriseRecord(record: EnterpriseRecord): Promise<void> {
    try {
      await setDoc(doc(db, 'enterprises', record.id), record);
    } catch (e) {
      console.warn('[Firestore] saveEnterpriseRecord failed:', e);
    }
  }

  public async deleteEnterpriseFromCloud(enterpriseId: string): Promise<void> {
    try {
      if (enterpriseId && enterpriseId !== 'default') {
        await deleteDoc(doc(db, 'enterprises', enterpriseId));
      }
    } catch (e) {
      console.warn('[Firestore] deleteEnterpriseFromCloud failed:', e);
    }
  }

  public async saveStockMovement(movement: StockMovement) {
    await this.recordAndSync(
      'STOCK_MOVEMENT',
      movement.id,
      `Mouvement: ${movement.productName}`,
      `Type: ${movement.type} • Qté: ${movement.quantityChange > 0 ? '+' : ''}${movement.quantityChange} • Nouveau stock: ${movement.newStockLevel} • Motif: ${movement.reason}`,
      movement
    );
  }

  public async saveCompanyProfile(profile: CompanyProfile) {
    await this.recordAndSync(
      'SETTINGS',
      'companyProfile',
      `Profil Établissement (${profile.name})`,
      `RCCM: ${profile.rccm || 'N/A'} • NIF: ${profile.nif || 'N/A'} • Devise: ${profile.currency}`,
      profile
    );
  }

  public async savePrinterConfig(config: PrinterConfig) {
    await this.recordAndSync(
      'SETTINGS',
      'printerConfig',
      `Imprimante (${config.name})`,
      `Type: ${config.type} • Papier: ${config.paperWidth}mm • Bluetooth: ${config.bluetoothDeviceName || 'Non lié'}`,
      config
    );
  }

  public async saveUser(user: User) {
    await this.recordAndSync(
      'SETTINGS',
      user.id,
      `Utilisateur (${user.name})`,
      `Rôle: ${user.role} • PIN: ****`,
      user
    );
  }

  public async saveSectionClosing(record: SectionClosingRecord) {
    await this.recordAndSync(
      'SECTION_CLOSING',
      record.id,
      `Clôture Section (${record.zoneLabel})`,
      `Clôturé par: ${record.closedByName} • ${record.tablesClosedCount} tables • CA: ${record.totalRevenueFCFA.toLocaleString('fr-FR')} FCFA`,
      record,
      record.totalRevenueFCFA
    );
  }

  public async saveDailyBackup(backup: DailyBackupSnapshot) {
    await this.recordAndSync(
      'DAILY_BACKUP',
      backup.id,
      `Sauvegarde Quotidienne (${backup.backupDate})`,
      `CA: ${backup.totalRevenueFCFA.toLocaleString('fr-FR')} FCFA • Commandes: ${backup.totalOrdersCount} • Auteur: ${backup.authorName}`,
      backup,
      backup.totalRevenueFCFA
    );
  }
}

export const firestoreSync = new FirestoreSyncService();
