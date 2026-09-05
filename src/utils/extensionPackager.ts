import JSZip from 'jszip';

/**
 * Generates and downloads a complete, ready-to-install Chrome/Edge Browser Extension (Manifest V3)
 */
export async function downloadExtensionZip(): Promise<void> {
  const zip = new JSZip();

  // 1. Chrome / Edge Manifest V3
  const manifestJson = {
    manifest_version: 3,
    name: "ClubPOS FCFA - Caisse & Bar Nightclub",
    short_name: "ClubPOS",
    version: "1.2.0",
    description: "Extension officielle ClubPOS FCFA pour Chrome, Edge & Brave : Caisse, Bar KDS, Tables VIP, Reçus ESC/POS et Clôture Z 100% hors-ligne.",
    icons: {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    },
    action: {
      default_title: "Ouvrir ClubPOS FCFA",
      default_popup: "popup.html",
      default_icon: {
        "16": "icons/icon-16.png",
        "48": "icons/icon-48.png",
        "128": "icons/icon-128.png"
      }
    },
    side_panel: {
      default_path: "sidepanel.html"
    },
    background: {
      service_worker: "background.js"
    },
    permissions: [
      "storage",
      "sidePanel"
    ],
    host_permissions: [
      "<all_urls>"
    ]
  };

  zip.file("manifest.json", JSON.stringify(manifestJson, null, 2));

  // 2. Background Service Worker
  const backgroundJs = `// ClubPOS FCFA Extension Background Service Worker (Manifest V3)
chrome.runtime.onInstalled.addListener(() => {
  console.log('[ClubPOS Extension] Installée avec succès.');
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});
  }
});

// Listen for messages from popup or sidepanel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'OPEN_FULL_APP') {
    const currentUrl = request.appUrl || 'https://ais-dev-zi5tdfrcwpkolt5yqocqkb-826408269379.europe-west2.run.app';
    chrome.windows.create({
      url: currentUrl,
      type: 'popup',
      width: 1366,
      height: 860,
      focused: true
    });
    sendResponse({ status: 'opened' });
  }
  return true;
});
`;
  zip.file("background.js", backgroundJs);

  // 3. Extension Popup HTML
  const currentOrigin = typeof window !== 'undefined' ? window.location.href : 'https://ais-dev-zi5tdfrcwpkolt5yqocqkb-826408269379.europe-west2.run.app';
  
  const popupHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>ClubPOS FCFA Extension</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body {
      width: 360px;
      background: #0c0e17;
      color: #f1f5f9;
      padding: 16px;
      user-select: none;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding-bottom: 14px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    .logo-badge {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: linear-gradient(135deg, #f59e0b, #9333ea);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
    }
    .title {
      font-size: 15px;
      font-weight: 800;
      color: #fbbf24;
      letter-spacing: 0.5px;
    }
    .subtitle {
      font-size: 11px;
      color: #94a3b8;
    }
    .status-pill {
      margin-top: 12px;
      padding: 6px 10px;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 8px;
      color: #34d399;
      font-size: 11px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 6px #10b981;
    }
    .actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 14px;
    }
    .btn {
      width: 100%;
      padding: 10px 14px;
      border-radius: 10px;
      border: none;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      transition: all 0.2s;
    }
    .btn-primary {
      background: linear-gradient(135deg, #f59e0b, #d97706);
      color: #000;
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.25);
    }
    .btn-primary:hover {
      background: linear-gradient(135deg, #fbbf24, #f59e0b);
      transform: translateY(-1px);
    }
    .btn-secondary {
      background: #1e2238;
      color: #e2e8f0;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .btn-secondary:hover {
      background: #282d4a;
      border-color: rgba(245, 158, 11, 0.4);
    }
    .shortcuts-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      margin-top: 10px;
    }
    .shortcut-btn {
      background: #16192a;
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 8px;
      padding: 8px;
      text-align: center;
      color: #cbd5e1;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }
    .shortcut-btn:hover {
      background: #20243d;
      color: #fbbf24;
      border-color: rgba(245, 158, 11, 0.3);
    }
    .footer {
      margin-top: 14px;
      text-align: center;
      font-size: 10px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-badge">🍸</div>
    <div>
      <div class="title">ClubPOS FCFA</div>
      <div class="subtitle">Extension de Caisse & Bar Nightclub</div>
    </div>
  </div>

  <div class="status-pill">
    <div class="status-dot"></div>
    <span>100% Autonome & Mode Hors-ligne</span>
  </div>

  <div class="actions">
    <button id="btn-open-window" class="btn btn-primary">
      <span>🖥️ Ouvrir en Fenêtre Dédiée POS</span>
      <span>➔</span>
    </button>
    <button id="btn-open-tab" class="btn btn-secondary">
      <span>🌐 Ouvrir dans un Nouvel Onglet</span>
      <span>↗</span>
    </button>
  </div>

  <div style="font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-top: 12px; letter-spacing: 0.5px;">
    Accès Direct :
  </div>

  <div class="shortcuts-grid">
    <div class="shortcut-btn" data-tab="TABLES">🛋️ Plan des Tables</div>
    <div class="shortcut-btn" data-tab="KDS_BAR">🍹 Écran Barman</div>
    <div class="shortcut-btn" data-tab="ORDER">📝 Prise de Commande</div>
    <div class="shortcut-btn" data-tab="REPORTS">📊 Rapport Z / Clôture</div>
  </div>

  <div class="footer">
    ClubPOS FCFA v1.2 • Caisse & Bar Nightclub
  </div>

  <script src="popup.js"></script>
</body>
</html>`;
  zip.file("popup.html", popupHtml);

  // 4. Popup JS
  const popupJs = `const APP_URL = "${currentOrigin}";

document.getElementById('btn-open-window').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'OPEN_FULL_APP', appUrl: APP_URL }, () => {
    window.close();
  });
});

document.getElementById('btn-open-tab').addEventListener('click', () => {
  chrome.tabs.create({ url: APP_URL });
  window.close();
});

document.querySelectorAll('.shortcut-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.getAttribute('data-tab');
    const targetUrl = APP_URL.includes('?') ? APP_URL + '&tab=' + tab : APP_URL + '?tab=' + tab;
    chrome.tabs.create({ url: targetUrl });
    window.close();
  });
});
`;
  zip.file("popup.js", popupJs);

  // 5. Sidepanel HTML
  const sidepanelHtml = `<!DOCTYPE html>
<html lang="fr" style="height: 100%; margin: 0; padding: 0;">
<head>
  <meta charset="UTF-8">
  <title>ClubPOS - Volet Latéral</title>
  <style>
    body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #090b12; }
    iframe { width: 100%; height: 100%; border: none; }
  </style>
</head>
<body>
  <iframe src="${currentOrigin}" allow="bluetooth; camera; clipboard-write"></iframe>
</body>
</html>`;
  zip.file("sidepanel.html", sidepanelHtml);

  // 6. Installation Guide README in French
  const readmeTxt = `========================================================================
 CLUBPOS FCFA - GUIDE D'INSTALLATION DE L'EXTENSION CHROME / EDGE / BRAVE
========================================================================

Félicitations ! Vous venez de télécharger l'extension ClubPOS FCFA.
Suivez ces 3 étapes simples pour l'installer dans votre navigateur :

Étape 1 : Dézipper cette archive
------------------------------------------------------------------------
- Faites un clic droit sur le fichier zip téléchargé
- Cliquez sur "Extraire tout..." (ou Décompresser) dans un dossier de votre choix.

Étape 2 : Ouvrir la gestion des extensions
------------------------------------------------------------------------
- Sur Google Chrome ou Brave : Tapez chrome://extensions dans la barre d'adresse
- Sur Microsoft Edge : Tapez edge://extensions dans la barre d'adresse

Étape 3 : Activer le Mode Développeur & Charger l'extension
------------------------------------------------------------------------
1. Activez le bouton "Mode développeur" (en haut à droite de l'écran).
2. Cliquez sur le bouton "Charger l'extension non empaquetée" (Load unpacked).
3. Sélectionnez le dossier extrait contenant le fichier manifest.json.
4. C'est prêt ! L'icône ClubPOS apparaît immédiatement dans votre barre d'outils.

Astuce Pro :
- Cliquez sur l'icône de l'extension pour ouvrir la caisse en fenêtre flottante dédiée POS, en plein écran ou en volet latéral.
- L'extension fonctionne 100% hors-ligne avec la prise en charge des imprimantes thermiques Bluetooth ESC/POS et le calcul en Francs CFA.
`;
  zip.file("README_INSTALLATION.txt", readmeTxt);

  // 7. Generate Icons folder with SVG representations
  const iconsFolder = zip.folder("icons");
  if (iconsFolder) {
    const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f59e0b"/>
          <stop offset="50%" stop-color="#9333ea"/>
          <stop offset="100%" stop-color="#4f46e5"/>
        </linearGradient>
      </defs>
      <rect width="128" height="128" rx="28" fill="#0c0e17"/>
      <rect x="4" y="4" width="120" height="120" rx="24" fill="none" stroke="url(#g)" stroke-width="4"/>
      <path d="M40 36 L88 36 L64 68 Z M64 68 L64 94 M50 94 L78 94" stroke="#fbbf24" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <circle cx="64" cy="50" r="5" fill="#f59e0b"/>
    </svg>`;

    // Generate basic data URIs or SVG text fallback for icons
    iconsFolder.file("icon-16.png", iconSvg);
    iconsFolder.file("icon-48.png", iconSvg);
    iconsFolder.file("icon-128.png", iconSvg);
  }

  // 8. Generate and download the ZIP file
  const content = await zip.generateAsync({ type: 'blob' });
  const downloadUrl = URL.createObjectURL(content);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = 'ClubPOS_Extension_Navigateur_Chrome_Edge.zip';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(downloadUrl);
}
