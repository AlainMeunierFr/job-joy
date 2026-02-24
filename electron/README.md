# Electron (US-3.6)

- **En dev** : `npm run dev` — DATA_DIR = répertoire projet (`data/`), port **3001**.
- **Tester Electron** : `npm run start:electron` — lance Electron avec DATA_DIR = userData (ex. %APPDATA%/job-joy), port **3002** (pour coexister avec le dev sur la même machine).
- **Port Electron** : 3002 par défaut ; variable d'environnement `ELECTRON_APP_PORT` pour surcharger.

Build installateur Windows : `npm run build:electron` (produit dans `dist-electron/`).
