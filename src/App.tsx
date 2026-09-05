/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { POSProvider, usePOS } from './context/POSContext';
import { Navbar, AppTabType } from './components/Navbar';
import { TableFloorPlan } from './components/TableFloorPlan';
import { OrderTakingView } from './components/OrderTakingView';
import { BarKDSView } from './components/BarKDSView';
import { StockManagementView } from './components/StockManagementView';
import { NightReportView } from './components/NightReportView';
import { TransactionsHistoryView } from './components/TransactionsHistoryView';
import { DirectorLiveDashboard } from './components/DirectorLiveDashboard';
import { ShareDirectorModal } from './components/ShareDirectorModal';
import { AuthModal } from './components/AuthModal';
import { CheckoutModal } from './components/CheckoutModal';
import { ThermalReceiptModal } from './components/ThermalReceiptModal';
import { ArchitectureModal } from './components/ArchitectureModal';
import { StartupProfileModal } from './components/StartupProfileModal';
import { CompanyProfileModal } from './components/CompanyProfileModal';
import { PrinterSettingsModal } from './components/PrinterSettingsModal';
import { OfflineStatusBar } from './components/OfflineStatusBar';
import { OfflineManagerModal } from './components/OfflineManagerModal';
import { FreshDatabaseNotice } from './components/FreshDatabaseNotice';
import { NewDeviceZeroResetModal } from './components/NewDeviceZeroResetModal';
import { DeviceStationModal } from './components/DeviceStationModal';
import { ChangeDirectorPasswordModal } from './components/ChangeDirectorPasswordModal';
import { EnterpriseManagementModal } from './components/EnterpriseManagementModal';
import { LocalDiskBackupModal } from './components/LocalDiskBackupModal';
import { Payment } from './types';
import { initCapacitorApp } from './utils/capacitorBridge';
import { 
  Users, Coffee, Package, BarChart3, Plus, 
  Wine, Sparkles, Smartphone, ShieldCheck, UserPlus,
  Building2, Bluetooth, AlertCircle, Receipt, Radio
} from 'lucide-react';

function POSAppContent() {
  const { 
    currentUser, 
    showStartupModal, 
    companyProfile,
    showCompanyProfileModal,
    setShowCompanyProfileModal,
    showPrinterSettingsModal,
    setShowPrinterSettingsModal,
    startupOptions,
    deviceChangeAlert,
    isNewDeviceModalOpen,
    showDeviceStationModal,
    setShowDeviceStationModal,
    confirmNewDeviceAndReset,
    dismissNewDeviceAlert,
    isDirectorPasswordModalOpen,
    setIsDirectorPasswordModalOpen,
    showEnterpriseModal,
    setShowEnterpriseModal,
    showDiskBackupModal,
    setShowDiskBackupModal
  } = usePOS();
  
  const [currentTab, setCurrentTab] = useState<AppTabType>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const hash = window.location.hash;
      if (
        params.get('mode') === 'director' || 
        params.get('view') === 'director' || 
        params.get('director') === 'true' || 
        hash === '#director-live'
      ) {
        return 'DIRECTOR_LIVE';
      }
    }
    return startupOptions?.defaultScreen || 'TABLES';
  });
  const [selectedTableForOrder, setSelectedTableForOrder] = useState<string | null>(null);
  const [selectedTableForCheckout, setSelectedTableForCheckout] = useState<string | null>(null);
  
  // Modals
  const [isStartupModalOpen, setIsStartupModalOpen] = useState<boolean>(() => {
    return startupOptions?.showStartupModalOnLaunch || showStartupModal || !companyProfile.isConfigured;
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState<boolean>(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);
  const [isArchModalOpen, setIsArchModalOpen] = useState<boolean>(false);
  const [isOfflineModalOpen, setIsOfflineModalOpen] = useState<boolean>(false);
  const [isShareDirectorModalOpen, setIsShareDirectorModalOpen] = useState<boolean>(false);
  const [offlineModalTab, setOfflineModalTab] = useState<'WEB_APP' | 'SYNC_LOGS' | 'EXTENSION' | 'OFFLINE_STATUS'>('SYNC_LOGS');
  const [lastCompletedPayment, setLastCompletedPayment] = useState<Payment | null>(null);

  const handleOpenOfflineModalWithTab = (tab: 'WEB_APP' | 'SYNC_LOGS' | 'EXTENSION' | 'OFFLINE_STATUS' = 'SYNC_LOGS') => {
    setOfflineModalTab(tab);
    setIsOfflineModalOpen(true);
  };

  // Initialize Capacitor runtime features (Status bar, hardware back button, haptics)
  useEffect(() => {
    initCapacitorApp(() => {
      // Hardware back button behavior
      if (isReceiptModalOpen) setIsReceiptModalOpen(false);
      else if (isCheckoutModalOpen) setIsCheckoutModalOpen(false);
      else if (isAuthModalOpen) setIsAuthModalOpen(false);
      else if (isOfflineModalOpen) setIsOfflineModalOpen(false);
      else if (isStartupModalOpen) setIsStartupModalOpen(false);
      else if (currentTab !== 'TABLES') setCurrentTab('TABLES');
    });
  }, [isReceiptModalOpen, isCheckoutModalOpen, isAuthModalOpen, isOfflineModalOpen, isStartupModalOpen, currentTab]);

  // If first time launch and company profile is not yet confirmed, display startup modal
  useEffect(() => {
    if (!companyProfile.isConfigured) {
      setIsStartupModalOpen(true);
    }
  }, [companyProfile.isConfigured]);

  const handleOpenOrderForTable = (tableId: string) => {
    setSelectedTableForOrder(tableId);
    setCurrentTab('ORDER');
  };

  const handleOpenCheckoutForTable = (tableId: string) => {
    setSelectedTableForCheckout(tableId);
    setIsCheckoutModalOpen(true);
  };

  const handlePaymentSuccess = (payment: Payment) => {
    setLastCompletedPayment(payment);
    setIsReceiptModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#090b12] text-gray-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      
      {/* Top Main Navigation */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenPrinterModal={() => setIsReceiptModalOpen(true)}
        onOpenStartupProfile={() => setIsStartupModalOpen(true)}
        onOpenCompanyProfile={() => setShowCompanyProfileModal(true)}
        onOpenPrinterSettings={() => setShowPrinterSettingsModal(true)}
        onOpenOfflineModal={() => handleOpenOfflineModalWithTab('SYNC_LOGS')}
        onOpenShareDirector={() => setIsShareDirectorModalOpen(true)}
      />

      {/* Offline Alert & Status Banner */}
      <OfflineStatusBar onOpenOfflineModal={handleOpenOfflineModalWithTab} />

      {/* First-time setup helper banner if not configured yet */}
      {!companyProfile.isConfigured && (
        <div className="bg-gradient-to-r from-amber-500/20 via-amber-600/20 to-cyan-500/20 border-b border-amber-500/30 px-4 py-2.5 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-400 shrink-0 animate-bounce" />
            <span>
              <strong>Première utilisation :</strong> Personnalisez le profil de votre établissement (nom, RCCM, NIF, téléphone) pour vos factures thermiques Bluetooth.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowCompanyProfileModal(true)}
            className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shrink-0 transition-colors shadow-sm ml-2 cursor-pointer"
          >
            Configurer maintenant
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 pb-24 sm:pb-8 space-y-4">
        {/* Fresh Database Banner and Toast for first-time usage */}
        <FreshDatabaseNotice
          onNavigateToStock={() => setCurrentTab('STOCK')}
          onOpenCompanyProfile={() => setShowCompanyProfileModal(true)}
          onStartFirstOrder={() => {
            setCurrentTab('TABLES');
          }}
        />

        {currentTab === 'TABLES' && (
          <TableFloorPlan
            onSelectTableForOrder={handleOpenOrderForTable}
            onSelectTableForCheckout={handleOpenCheckoutForTable}
          />
        )}

        {currentTab === 'ORDER' && (
          <OrderTakingView
            initialTableId={selectedTableForOrder}
            onBackToTables={() => {
              setSelectedTableForOrder(null);
              setCurrentTab('TABLES');
            }}
          />
        )}

        {currentTab === 'KDS_BAR' && (
          <BarKDSView />
        )}

        {currentTab === 'STOCK' && (
          <StockManagementView />
        )}

        {currentTab === 'TRANSACTIONS' && (
          <TransactionsHistoryView />
        )}

        {currentTab === 'REPORTS' && (
          <NightReportView onOpenShareDirector={() => setIsShareDirectorModalOpen(true)} />
        )}

        {currentTab === 'DIRECTOR_LIVE' && (
          <DirectorLiveDashboard onBackToPOS={() => setCurrentTab('TABLES')} />
        )}

        {currentTab === 'ARCHITECTURE' && (
          <div className="space-y-4">
            <div className="bg-[#131625] border border-cyan-500/30 p-5 rounded-3xl text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center mx-auto">
                <Smartphone className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-black text-white">Dossier d'Architecture Senior & Guide APK Android</h2>
              <p className="text-xs text-gray-300 max-w-xl mx-auto">
                Consultez le schéma de base de données relationnelle SQL complet, la configuration Capacitor pour compiler le fichier APK, et les protocoles d'impression thermique ESC/POS.
              </p>
              <button
                onClick={() => setIsArchModalOpen(true)}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black font-black text-xs shadow-lg shadow-cyan-500/20 transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Ouvrir la Spécification Technique & Script Build APK</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Mobile Sticky Bottom Bar for instant thumb access */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0c0e17]/95 backdrop-blur-md border-t border-white/10 px-3 py-2 flex items-center justify-around">
        <button
          onClick={() => setCurrentTab('TABLES')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${
            currentTab === 'TABLES' ? 'text-amber-400' : 'text-gray-400'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Tables</span>
        </button>

        <button
          onClick={() => {
            setSelectedTableForOrder(null);
            setCurrentTab('ORDER');
          }}
          className="flex flex-col items-center gap-1 text-[10px] font-bold text-amber-300"
        >
          <div className="w-8 h-8 rounded-full bg-amber-500 text-black flex items-center justify-center font-black -mt-4 shadow-lg shadow-amber-500/30">
            <Plus className="w-5 h-5" />
          </div>
          <span>Commander</span>
        </button>

        <button
          onClick={() => setCurrentTab('KDS_BAR')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${
            currentTab === 'KDS_BAR' ? 'text-emerald-400' : 'text-gray-400'
          }`}
        >
          <Coffee className="w-4 h-4" />
          <span>Barman</span>
        </button>

        <button
          onClick={() => setCurrentTab('STOCK')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${
            currentTab === 'STOCK' ? 'text-purple-400' : 'text-gray-400'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Stock</span>
        </button>

        <button
          onClick={() => setCurrentTab('TRANSACTIONS')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${
            currentTab === 'TRANSACTIONS' ? 'text-indigo-400' : 'text-gray-400'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Ventes</span>
        </button>

        <button
          onClick={() => setCurrentTab('REPORTS')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${
            currentTab === 'REPORTS' ? 'text-blue-400' : 'text-gray-400'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Rapport Z</span>
        </button>

        <button
          onClick={() => setCurrentTab('DIRECTOR_LIVE')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${
            currentTab === 'DIRECTOR_LIVE' ? 'text-amber-400 font-black' : 'text-amber-300/70'
          }`}
        >
          <Radio className="w-4 h-4 text-rose-400 animate-pulse" />
          <span>Directeur</span>
        </button>
      </div>

      {/* Modals */}
      <ShareDirectorModal
        isOpen={isShareDirectorModalOpen}
        onClose={() => setIsShareDirectorModalOpen(false)}
        onOpenDirectorDashboard={() => setCurrentTab('DIRECTOR_LIVE')}
      />

      <StartupProfileModal
        isOpen={isStartupModalOpen}
        onClose={() => setIsStartupModalOpen(false)}
        onNavigateTab={(tab) => setCurrentTab(tab)}
      />

      <CompanyProfileModal
        isOpen={showCompanyProfileModal}
        onClose={() => setShowCompanyProfileModal(false)}
      />

      <PrinterSettingsModal
        isOpen={showPrinterSettingsModal}
        onClose={() => setShowPrinterSettingsModal(false)}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onOpenProfileCreation={() => setIsStartupModalOpen(true)}
        onOpenChangeDirectorPassword={() => setIsDirectorPasswordModalOpen(true)}
      />

      {/* Change Director Password Modal */}
      <ChangeDirectorPasswordModal
        isOpen={isDirectorPasswordModalOpen}
        onClose={() => setIsDirectorPasswordModalOpen(false)}
      />

      <CheckoutModal
        tableId={selectedTableForCheckout}
        isOpen={isCheckoutModalOpen}
        onClose={() => {
          setIsCheckoutModalOpen(false);
          setSelectedTableForCheckout(null);
        }}
        onPaymentCompleted={handlePaymentSuccess}
      />

      <ThermalReceiptModal
        payment={lastCompletedPayment}
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
      />

      <ArchitectureModal
        isOpen={isArchModalOpen}
        onClose={() => setIsArchModalOpen(false)}
      />

      <OfflineManagerModal
        isOpen={isOfflineModalOpen}
        onClose={() => setIsOfflineModalOpen(false)}
        initialTab={offlineModalTab}
      />

      {/* Automatic & Immediate Reset to 0 when detecting a new MAC, IP or Device */}
      <NewDeviceZeroResetModal
        isOpen={isNewDeviceModalOpen && !!deviceChangeAlert}
        alert={deviceChangeAlert}
        onConfirmReset={(opts) => confirmNewDeviceAndReset(opts)}
        onDismiss={() => dismissNewDeviceAlert()}
      />

      {/* Manual Station, Network & Device Management Modal */}
      <DeviceStationModal
        isOpen={showDeviceStationModal}
        onClose={() => setShowDeviceStationModal(false)}
      />

      {/* Multi-Enterprise Management & Sharing Modal */}
      <EnterpriseManagementModal
        isOpen={showEnterpriseModal}
        onClose={() => setShowEnterpriseModal(false)}
      />

      {/* Local Disk Automatic JSON Backup Modal */}
      <LocalDiskBackupModal
        isOpen={showDiskBackupModal}
        onClose={() => setShowDiskBackupModal(false)}
      />

    </div>
  );
}

export default function App() {
  return (
    <POSProvider>
      <POSAppContent />
    </POSProvider>
  );
}
