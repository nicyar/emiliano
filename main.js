const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs   = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 700,
    minWidth: 820,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

// ─── Ruta del archivo de configuración ───────────────────────────────────────
function getConfigPath() {
  return path.join(app.getPath('userData'), 'config.json');
}

// Precios por defecto (se usan solo la primera vez)
const defaultConfig = {
  pba_mensual:      67000,
  pba_historico:    60000,
  tad_mensual:      45000,
  tad_historico:    60000,
  caba_base:        30000,
  caba_mensual:     50000,
  caba_historico:   80000,
  firma:            100000,
  puesta_en_marcha: 90000
};

// ─── Cargar configuración ────────────────────────────────────────────────────
ipcMain.handle('load-config', () => {
  const configPath = getConfigPath();
  if (fs.existsSync(configPath)) {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
  fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
  return defaultConfig;
});

// ─── Guardar configuración ───────────────────────────────────────────────────
ipcMain.handle('save-config', (event, config) => {
  fs.writeFileSync(getConfigPath(), JSON.stringify(config, null, 2));
  return true;
});

// ─── Generar PDF ─────────────────────────────────────────────────────────────
ipcMain.handle('generate-pdf', async (event, data) => {
  const nombre = (data.razonSocial || 'Presupuesto').replace(/\s+/g, '_');
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Guardar presupuesto',
    defaultPath: `Presupuesto_${nombre}_${data.fecha}.pdf`,
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  });

  if (canceled || !filePath) return { success: false };

  try {
    const generatePDF = require('./pdf');
    await generatePDF(data, filePath);
    shell.openPath(filePath);
    return { success: true, filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
