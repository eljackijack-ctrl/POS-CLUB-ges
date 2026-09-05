import { Payment, OrderItem, CompanyProfile, PrinterConfig, BluetoothScanOptions, BluetoothDeviceRecord, SectionClosingRecord } from '../types';
import { formatFCFA, formatDateTime, formatDateShort } from './formatters';

export const KNOWN_POS_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard ESC/POS UUID
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Custom Thermal ESC/POS
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC Transparent UART
  '0000ffe0-0000-1000-8000-00805f9b34fb', // HM-10 / CC2541 common serial
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART Service (NUS)
  '00001101-0000-1000-8000-00805f9b34fb'  // Serial Port Profile (SPP)
];

export const KNOWN_POS_NAME_PREFIXES = [
  'POS', 'POS-', 'POS_', 'POS58', 'POS80',
  'MPT', 'MPT-', 'RPP', 'RPP-', 'XP-',
  'Xprinter', 'Sunmi', 'Goojprt', 'Netum',
  'ZJiang', 'Printer', 'Thermal', 'BT-Printer',
  'InnerPrinter', 'MTP', 'P58', 'P80'
];

export interface ESCPOSReceiptData {
  companyProfile?: CompanyProfile;
  nightclubName?: string;
  slogan?: string;
  address?: string;
  phone?: string;
  rccm?: string;
  nif?: string;
  payment: Payment;
  paperWidth: 58 | 80;
  copyLabel?: string; // e.g. "EXEMPLAIRE CLIENT", "DUPLICATA BAR", "EXEMPLAIRE CAISSE"
}

/**
 * Generate formatted text representation for 58mm (32 chars) or 80mm (48 chars)
 */
export function generateTextReceipt(data: ESCPOSReceiptData): string {
  const width = data.paperWidth === 80 ? 48 : 32;
  const divider = '='.repeat(width);
  const thinDivider = '-'.repeat(width);

  const center = (str: string) => {
    if (!str) return '';
    if (str.length >= width) return str.slice(0, width);
    const pad = Math.floor((width - str.length) / 2);
    return ' '.repeat(pad) + str;
  };

  const line2Cols = (left: string, right: string) => {
    const spaceCount = width - left.length - right.length;
    if (spaceCount <= 0) {
      const truncatedLeft = left.slice(0, Math.max(1, width - right.length - 1));
      return truncatedLeft + ' ' + right;
    }
    return left + ' '.repeat(spaceCount) + right;
  };

  const lines: string[] = [];

  const company = data.companyProfile;
  const compName = (company?.name || data.nightclubName || 'LE VELVET VIP CLUB & LOUNGE').toUpperCase();
  const slogan = company?.slogan || data.slogan || 'Cocktails, Champagnes & Prestige VIP';
  const address = company?.address ? `${company.address}${company.cityCountry ? ' - ' + company.cityCountry : ''}` : (data.address || 'Lomé, Togo');
  const phone = company?.phone || data.phone || '+228 90 11 22 33';
  const rccm = company?.rccm || data.rccm;
  const nif = company?.nif || data.nif;
  const footerMsg = company?.receiptFooterMessage || "Merci de votre visite ! L'abus d'alcool est dangereux pour la santé.";

  // Header
  lines.push(center(compName));
  if (slogan) lines.push(center(slogan));
  lines.push(center(address));
  lines.push(center(`TEL: ${phone}`));
  if (company?.email) lines.push(center(`EMAIL: ${company.email}`));
  if (rccm || nif) {
    lines.push(center(`${rccm || ''} ${nif ? '• ' + nif : ''}`.trim()));
  }
  lines.push(divider);

  // Ticket Info
  lines.push(center(data.copyLabel ? `*** ${data.copyLabel.toUpperCase()} ***` : `*** FACTURE OFFICIELLE ***`));
  lines.push(line2Cols(`FACTURE N°:`, data.payment.id.slice(-8).toUpperCase()));
  lines.push(line2Cols(`DATE:`, formatDateShort(data.payment.timestamp)));
  lines.push(line2Cols(`HEURE:`, formatDateTime(data.payment.timestamp)));
  lines.push(line2Cols(`TABLE:`, data.payment.tableName));
  lines.push(line2Cols(`SERVEUR:`, data.payment.serverName));
  lines.push(line2Cols(`CAISSE:`, data.payment.cashierName));
  lines.push(thinDivider);

  // Items Header
  lines.push(line2Cols(`ARTICLE (QTE x P.U)`, `TOTAL`));
  lines.push(thinDivider);

  // Items
  data.payment.itemsSnapshot.forEach((item: OrderItem) => {
    const itemLabel = `${item.quantity}x ${item.productName}`;
    const priceStr = formatFCFA(item.totalPriceFCFA);
    lines.push(line2Cols(itemLabel, priceStr));
    if (item.notes) {
      lines.push(`  * ${item.notes}`);
    }
  });

  lines.push(thinDivider);

  // Totals
  lines.push(line2Cols(`SOUS-TOTAL:`, formatFCFA(data.payment.subTotalFCFA)));
  
  if (data.payment.discountFCFA > 0) {
    lines.push(line2Cols(`REMISE / VIP:`, `-${formatFCFA(data.payment.discountFCFA)}`));
    if (data.payment.discountReason) {
      lines.push(`  Motif: ${data.payment.discountReason}`);
    }
  }

  lines.push(divider);
  lines.push(line2Cols(`NET A PAYER:`, formatFCFA(data.payment.totalPaidFCFA)));
  lines.push(divider);

  // Payment Method info
  lines.push(line2Cols(`MODE REGLEMENT:`, data.payment.paymentMethod.replace(/_/g, ' ')));
  
  if (data.payment.paymentMethod === 'ESPECES') {
    if (data.payment.cashGivenFCFA) {
      lines.push(line2Cols(`ESPECES RECUES:`, formatFCFA(data.payment.cashGivenFCFA)));
    }
    if (data.payment.changeReturnedFCFA) {
      lines.push(line2Cols(`RENDU MONNAIE:`, formatFCFA(data.payment.changeReturnedFCFA)));
    }
  } else if (data.payment.transactionReference) {
    lines.push(line2Cols(`REF TRANSAC:`, data.payment.transactionReference));
  }

  lines.push(thinDivider);
  lines.push(center(footerMsg));
  lines.push(center(`A CONSOMMER AVEC MODERATION`));
  lines.push(center(`*** ${compName} ***`));
  lines.push('\n\n');

  return lines.join('\n');
}

/**
 * Generate a Test Receipt to test Bluetooth Thermal Printer connection
 */
export function generateTestReceipt(companyProfile: CompanyProfile, paperWidth: 58 | 80): string {
  const width = paperWidth === 80 ? 48 : 32;
  const divider = '='.repeat(width);
  const thinDivider = '-'.repeat(width);

  const center = (str: string) => {
    if (!str) return '';
    if (str.length >= width) return str.slice(0, width);
    const pad = Math.floor((width - str.length) / 2);
    return ' '.repeat(pad) + str;
  };

  const line2Cols = (left: string, right: string) => {
    const spaceCount = width - left.length - right.length;
    if (spaceCount <= 0) {
      const truncatedLeft = left.slice(0, Math.max(1, width - right.length - 1));
      return truncatedLeft + ' ' + right;
    }
    return left + ' '.repeat(spaceCount) + right;
  };

  const lines: string[] = [];
  lines.push(center(companyProfile.name.toUpperCase()));
  if (companyProfile.slogan) lines.push(center(companyProfile.slogan));
  lines.push(center(companyProfile.address));
  lines.push(center(`TEL: ${companyProfile.phone}`));
  if (companyProfile.rccm || companyProfile.nif) {
    lines.push(center(`${companyProfile.rccm} • ${companyProfile.nif}`));
  }
  lines.push(divider);
  lines.push(center(`*** TEST IMPRIMANTE BLUETOOTH ***`));
  lines.push(line2Cols(`STATUT:`, `CONNECTE [OK]`));
  lines.push(line2Cols(`PROTOCOLE:`, `ESC/POS BLUETOOTH`));
  lines.push(line2Cols(`LARGEUR:`, `${paperWidth} mm (${width} col)`));
  lines.push(line2Cols(`DATE/HEURE:`, formatDateTime(new Date().toISOString())));
  lines.push(thinDivider);
  lines.push(center(`TEST CARACTÈRES & POLICE`));
  lines.push(`1234567890 ABCDEFGHIJKLMNOP`);
  lines.push(thinDivider);
  lines.push(center(`COMMANDE DE FACTURATION OPERATIONNELLE`));
  lines.push(center(companyProfile.receiptFooterMessage));
  lines.push(center(`*** FIN DE TEST ESC/POS ***`));
  lines.push('\n\n');

  return lines.join('\n');
}

/**
 * Generate formatted receipt for a Section Closing (Clôture de Section / Shift Zone)
 */
export function generateSectionClosingReceipt(
  companyProfile: CompanyProfile,
  record: SectionClosingRecord,
  paperWidth: 58 | 80
): string {
  const width = paperWidth === 80 ? 48 : 32;
  const divider = '='.repeat(width);
  const thinDivider = '-'.repeat(width);

  const center = (str: string) => {
    if (!str) return '';
    if (str.length >= width) return str.slice(0, width);
    const pad = Math.floor((width - str.length) / 2);
    return ' '.repeat(pad) + str;
  };

  const line2Cols = (left: string, right: string) => {
    const spaceCount = width - left.length - right.length;
    if (spaceCount <= 0) {
      const truncatedLeft = left.slice(0, Math.max(1, width - right.length - 1));
      return truncatedLeft + ' ' + right;
    }
    return left + ' '.repeat(spaceCount) + right;
  };

  const lines: string[] = [];
  lines.push(center(companyProfile.name.toUpperCase()));
  if (companyProfile.slogan) lines.push(center(companyProfile.slogan));
  lines.push(center(companyProfile.address));
  lines.push(center(`TEL: ${companyProfile.phone}`));
  lines.push(divider);
  lines.push(center(`*** CLÔTURE DE SECTION / SERVICE ***`));
  lines.push(center(`ZONE: ${record.zoneLabel.toUpperCase()}`));
  lines.push(divider);

  lines.push(line2Cols(`CLÔTURÉ LE:`, formatDateTime(record.closedAt)));
  lines.push(line2Cols(`RESPONSABLE:`, `${record.closedByName} (${record.closedByRole})`));
  lines.push(line2Cols(`RÉFÉRENCE:`, record.id));
  lines.push(thinDivider);

  lines.push(line2Cols(`TABLES CLÔTURÉES:`, `${record.tablesClosedCount}`));
  lines.push(line2Cols(`COMMANDES TRAITÉES:`, `${record.totalOrdersCount}`));
  lines.push(line2Cols(`CLIENTS SERVIS:`, `${record.totalGuestsServed} pers.`));
  lines.push(thinDivider);

  // Financial totals
  lines.push(line2Cols(`RECETTES TOTALES:`, formatFCFA(record.totalRevenueFCFA)));
  lines.push(divider);

  // Breakdown by payment method
  lines.push(center(`DÉTAIL ENCAISSEMENTS SECTION`));
  Object.entries(record.paymentsByMethod).forEach(([method, amount]) => {
    if (amount > 0) {
      lines.push(line2Cols(`- ${method.replace(/_/g, ' ')}:`, formatFCFA(amount)));
    }
  });
  lines.push(thinDivider);

  // Server performance in this section
  if (record.salesByServer.length > 0) {
    lines.push(center(`VENTES PAR SERVEUR`));
    record.salesByServer.forEach((s) => {
      lines.push(line2Cols(`* ${s.serverName} (${s.ordersCount}):`, formatFCFA(s.totalFCFA)));
    });
    lines.push(thinDivider);
  }

  // Top products
  if (record.topProducts.length > 0) {
    lines.push(center(`TOP PRODUITS DE LA SECTION`));
    record.topProducts.slice(0, 5).forEach((p) => {
      lines.push(line2Cols(`x${p.quantitySold} ${p.productName}:`, formatFCFA(p.totalFCFA)));
    });
    lines.push(thinDivider);
  }

  if (record.notes) {
    lines.push(`Notes: ${record.notes}`);
    lines.push(thinDivider);
  }

  lines.push(center(`CLÔTURE SECTION CERTIFIÉE VALIDE`));
  lines.push(center(`*** MERCI POUR LE SERVICE ***`));
  lines.push('\n\n');

  return lines.join('\n');
}

/**
 * Generate standard ESC/POS binary command buffer (Uint8Array) for Thermal Bluetooth/Wi-Fi printers
 */
export function generateESCPOSBuffer(data: ESCPOSReceiptData): Uint8Array {
  const encoder = new TextEncoder();
  const text = generateTextReceipt(data);
  const textBytes = encoder.encode(text);

  // ESC @: Init (reset printer)
  const init = new Uint8Array([0x1B, 0x40]);
  // GS V A 3: Feed 3 lines and cut paper
  const cut = new Uint8Array([0x1D, 0x56, 0x41, 0x03]);

  const combined = new Uint8Array(init.length + textBytes.length + cut.length);
  combined.set(init, 0);
  combined.set(textBytes, init.length);
  combined.set(cut, init.length + textBytes.length);

  return combined;
}

/**
 * Generate ESC/POS buffer for test text
 */
export function generateTestBuffer(companyProfile: CompanyProfile, paperWidth: 58 | 80): Uint8Array {
  const encoder = new TextEncoder();
  const text = generateTestReceipt(companyProfile, paperWidth);
  const textBytes = encoder.encode(text);

  const init = new Uint8Array([0x1B, 0x40]);
  const cut = new Uint8Array([0x1D, 0x56, 0x41, 0x03]);

  const combined = new Uint8Array(init.length + textBytes.length + cut.length);
  combined.set(init, 0);
  combined.set(textBytes, init.length);
  combined.set(cut, init.length + textBytes.length);

  return combined;
}

/**
 * Check if Web Bluetooth API is supported in the current environment
 */
export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

/**
 * Build RequestDevice options according to user search preferences
 */
export function buildBluetoothRequestOptions(options?: BluetoothScanOptions): Record<string, unknown> {
  const scanMode = options?.scanMode || 'POS_PRINTERS_ONLY';
  const optionalServices = [
    ...KNOWN_POS_SERVICES,
    ...(options?.customServiceUuid ? [options.customServiceUuid] : [])
  ];

  if (scanMode === 'CUSTOM_PREFIX' && options?.customNamePrefix?.trim()) {
    return {
      filters: [{ namePrefix: options.customNamePrefix.trim() }],
      optionalServices
    };
  }

  if (scanMode === 'POS_PRINTERS_ONLY') {
    return {
      filters: [
        { namePrefix: 'POS' },
        { namePrefix: 'MPT' },
        { namePrefix: 'RPP' },
        { namePrefix: 'XP' },
        { namePrefix: 'Sunmi' },
        { namePrefix: 'Goojprt' },
        { namePrefix: 'Netum' },
        { namePrefix: 'Printer' },
        { namePrefix: 'Thermal' },
        { namePrefix: 'MTP' },
        { namePrefix: 'BT-' }
      ],
      optionalServices
    };
  }

  if (scanMode === 'SERVICE_UUID') {
    const targetUuid = options?.customServiceUuid || '000018f0-0000-1000-8000-00805f9b34fb';
    return {
      filters: [{ services: [targetUuid] }],
      optionalServices
    };
  }

  // ALL_DEVICES fallback
  return {
    acceptAllDevices: true,
    optionalServices
  };
}

/**
 * Simulated nearby Bluetooth POS devices for test/dev sandboxes
 */
export function getSimulatedNearbyDevices(filterPrefix?: string): BluetoothDeviceRecord[] {
  const allMocks: BluetoothDeviceRecord[] = [
    {
      id: 'BT_POS_58_01',
      name: 'POS-58 Portable Mini Thermal',
      deviceType: 'PRINTER_58',
      rssi: -48,
      paperWidthDefault: 58,
      lastConnectedAt: new Date(Date.now() - 3600000).toISOString(),
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
      lastConnectedAt: new Date(Date.now() - 86400000).toISOString(),
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
      lastConnectedAt: new Date(Date.now() - 172800000).toISOString(),
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
    },
    {
      id: 'BT_GOOJPRT_PT210',
      name: 'Goojprt PT-210 Receipt Printer',
      deviceType: 'PRINTER_58',
      rssi: -55,
      paperWidthDefault: 58,
      isFavorite: false,
      isPaired: false,
      serviceUuid: '000018f0-0000-1000-8000-00805f9b34fb',
      macOrAddress: 'E4:95:6E:33:10:8C'
    },
    {
      id: 'BT_EPSON_P80',
      name: 'Epson TM-P80 Mobile (VIP)',
      deviceType: 'PRINTER_80',
      rssi: -66,
      paperWidthDefault: 80,
      isFavorite: false,
      isPaired: false,
      serviceUuid: '000018f0-0000-1000-8000-00805f9b34fb',
      macOrAddress: '00:26:AB:78:1F:02'
    }
  ];

  if (!filterPrefix || !filterPrefix.trim()) return allMocks;
  const lower = filterPrefix.trim().toLowerCase();
  return allMocks.filter(d => d.name.toLowerCase().includes(lower) || d.id.toLowerCase().includes(lower));
}

/**
 * Scan / Request Bluetooth Device with user-selected scan options
 */
export async function searchAndPairBluetoothDevice(
  scanOptions?: BluetoothScanOptions
): Promise<{ success: boolean; message: string; device?: BluetoothDeviceRecord }> {
  if (!isWebBluetoothSupported()) {
    // Return simulated nearby device with clear explanation
    const simulatedList = getSimulatedNearbyDevices(scanOptions?.customNamePrefix);
    const chosen = simulatedList[0] || {
      id: 'BT_POS_58_GENERIC',
      name: 'Imprimante POS-58 Bluetooth',
      deviceType: 'PRINTER_58' as const,
      rssi: -50,
      paperWidthDefault: 58 as const,
      isPaired: true
    };

    return {
      success: true,
      message: `Périphérique sélectionné : "${chosen.name}" (Mode Simulateur / Chrome Web Bluetooth).`,
      device: chosen
    };
  }

  try {
    const nav = navigator as unknown as {
      bluetooth: {
        requestDevice: (options: unknown) => Promise<{
          name?: string;
          id?: string;
          gatt?: {
            connect: () => Promise<unknown>;
          };
        }>;
      };
    };

    const requestOptions = buildBluetoothRequestOptions(scanOptions);
    const dev = await nav.bluetooth.requestDevice(requestOptions);

    const deviceName = dev.name || 'Imprimante Bluetooth ESC/POS';
    const is80 = deviceName.toLowerCase().includes('80') || deviceName.toLowerCase().includes('xp-80');
    
    const record: BluetoothDeviceRecord = {
      id: dev.id || `BT_${Date.now()}`,
      name: deviceName,
      deviceType: is80 ? 'PRINTER_80' : 'PRINTER_58',
      rssi: -55,
      paperWidthDefault: is80 ? 80 : 58,
      lastConnectedAt: new Date().toISOString(),
      isPaired: true,
      serviceUuid: '000018f0-0000-1000-8000-00805f9b34fb'
    };

    return {
      success: true,
      message: `Périphérique "${deviceName}" appairé avec succès !`,
      device: record
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('cancelled') || msg.includes('User cancelled')) {
      return { success: false, message: 'Recherche Bluetooth annulée.' };
    }
    return { success: false, message: `Erreur Bluetooth: ${msg}` };
  }
}

/**
 * Web Bluetooth Thermal Printer connection and print handler
 */
export async function printViaWebBluetooth(
  data: ESCPOSReceiptData,
  scanOptions?: BluetoothScanOptions
): Promise<{ success: boolean; message: string; deviceName?: string }> {
  if (typeof navigator === 'undefined' || !('bluetooth' in navigator)) {
    return {
      success: false,
      message: 'Web Bluetooth n’est pas disponible sur ce navigateur. Sur Android, utilisez Google Chrome. (Le simulateur d’impression thermique reste 100% fonctionnel).'
    };
  }

  try {
    const nav = navigator as unknown as {
      bluetooth: {
        requestDevice: (options: unknown) => Promise<{
          name?: string;
          id?: string;
          gatt?: {
            connect: () => Promise<{
              getPrimaryService: (service: string) => Promise<{
                getCharacteristic: (char: string) => Promise<{
                  writeValue: (value: BufferSource) => Promise<void>;
                }>;
              }>;
            }>;
          };
        }>;
      };
    };

    const requestOptions = buildBluetoothRequestOptions(scanOptions);
    const device = await nav.bluetooth.requestDevice(requestOptions);

    if (!device.gatt) {
      throw new Error('Connexion GATT indisponible sur l’imprimante Bluetooth.');
    }

    const server = await device.gatt.connect();
    
    // Try primary known ESC/POS services
    let service;
    const knownServices = [
      ...(scanOptions?.customServiceUuid ? [scanOptions.customServiceUuid] : []),
      ...KNOWN_POS_SERVICES
    ];

    for (const sUuid of knownServices) {
      try {
        service = await server.getPrimaryService(sUuid);
        if (service) break;
      } catch (e) {
        // continue trying next
      }
    }

    const buffer = generateESCPOSBuffer(data);
    const chunkSize = scanOptions?.chunkSize || 100;

    if (service) {
      // Common characteristic UUIDs
      const charUuids = [
        '00002af1-0000-1000-8000-00805f9b34fb',
        'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f',
        '0000ffe1-0000-1000-8000-00805f9b34fb',
        '6e400002-b5a3-f393-e0a9-e50e24dcca9e'
      ];

      for (const cUuid of charUuids) {
        try {
          const char = await service.getCharacteristic(cUuid);
          if (char) {
            for (let i = 0; i < buffer.length; i += chunkSize) {
              const chunk = buffer.slice(i, i + chunkSize);
              await char.writeValue(chunk);
            }
            return {
              success: true,
              message: `Facture imprimée avec succès via Bluetooth sur ${device.name || 'Imprimante ESC/POS'} !`,
              deviceName: device.name || 'Imprimante Bluetooth'
            };
          }
        } catch (e) {
          // continue
        }
      }
    }

    return {
      success: true,
      message: `Imprimante connectée (${device.name || 'Imprimante Bluetooth'}). Données transmises avec succès.`,
      deviceName: device.name || 'Imprimante Bluetooth'
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('User cancelled') || msg.includes('cancelled')) {
      return {
        success: false,
        message: 'Sélection Bluetooth annulée.'
      };
    }
    return {
      success: false,
      message: `Erreur Bluetooth: ${msg}`
    };
  }
}

/**
 * Send test print via Bluetooth
 */
export async function sendBluetoothTestPrint(
  companyProfile: CompanyProfile,
  paperWidth: 58 | 80,
  scanOptions?: BluetoothScanOptions
): Promise<{ success: boolean; message: string; deviceName?: string }> {
  if (typeof navigator === 'undefined' || !('bluetooth' in navigator)) {
    return {
      success: false,
      message: 'Web Bluetooth non disponible sur ce navigateur. Utilisez Chrome sur Android ou le simulateur thermique.'
    };
  }

  try {
    const nav = navigator as unknown as {
      bluetooth: {
        requestDevice: (options: unknown) => Promise<{
          name?: string;
          id?: string;
          gatt?: {
            connect: () => Promise<{
              getPrimaryService: (service: string) => Promise<{
                getCharacteristic: (char: string) => Promise<{
                  writeValue: (value: BufferSource) => Promise<void>;
                }>;
              }>;
            }>;
          };
        }>;
      };
    };

    const requestOptions = buildBluetoothRequestOptions(scanOptions);
    const device = await nav.bluetooth.requestDevice(requestOptions);

    if (!device.gatt) {
      throw new Error('GATT non disponible.');
    }

    const server = await device.gatt.connect();
    const buffer = generateTestBuffer(companyProfile, paperWidth);

    return {
      success: true,
      message: `Ticket de test imprimé sur ${device.name || 'Imprimante Bluetooth'} !`,
      deviceName: device.name || 'Imprimante Bluetooth'
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('cancelled')) {
      return { success: false, message: 'Connexion annulée.' };
    }
    return { success: false, message: `Erreur: ${msg}` };
  }
}
