import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { SyncDatabase } from '../../src/db/database'
import { SyncManager }  from '../../src/sync/manager'
import { AuthService }  from './auth'
import type { EngineOptions, ConflictResolution } from '../../src/shared/types'

let mainWindow: BrowserWindow | null = null
let manager:    SyncManager   | null = null
let auth:       AuthService   | null = null

const options: EngineOptions = {
  dbPath:             '',
  versionsDir:        'C:\\synctest\\versions',
  maxVersions:        5,
  checksumAlgo:       'sha256',
  compressionActif:   false,
  bandwidthLimitKBps: null
}

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width:           1280,
    height:          800,
    minWidth:        900,
    minHeight:       600,
    backgroundColor: '#F4F3F0',
    webPreferences: {
      preload:          join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration:  false
    }
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../../out/renderer/index.html'))
  }
}

async function initEngine(): Promise<void> {
  const db = new SyncDatabase()
  await db.init()

  // Init auth service
  auth = new AuthService(db)
  await auth.init()

  // Init sync manager
  manager = new SyncManager(db, options)

  manager.on('progress', (e: any) => {
    mainWindow?.webContents.send('sync:progress', e)
  })
  manager.on('done', (e: any) => {
    mainWindow?.webContents.send('sync:done', e)
  })
  manager.on('error', (e: any) => {
    mainWindow?.webContents.send('sync:error', e)
  })
  manager.on('conflict', (e: any) => {
    mainWindow?.webContents.send('sync:conflict', e)
  })
  manager.on('file:changed', (e: any) => {
    mainWindow?.webContents.send('file:changed', e)
  })

  await manager.init()
}

function registerIpcHandlers(): void {

  // ── Auth ──────────────────────────────────────────────────

  ipcMain.handle('auth:login', async (_, email: string, password: string) => {
    return auth?.login(email, password)
  })

  ipcMain.handle('auth:register', async (_, nom: string, email: string, password: string) => {
    return auth?.register(nom, email, password)
  })

  ipcMain.handle('auth:forgot', async (_, email: string) => {
    return auth?.forgotPassword(email)
  })

  ipcMain.handle('auth:reset', async (_, token: string, newPassword: string) => {
    return auth?.resetPassword(token, newPassword)
  })

  // ── Sync ──────────────────────────────────────────────────

  ipcMain.handle('sync:start', async (_, profileId: number) => {
    return manager?.startSync(profileId)
  })

  ipcMain.handle('sync:pause', (_, jobId: number) => {
    manager?.pauseSync(jobId)
  })

  ipcMain.handle('sync:cancel', (_, jobId: number) => {
    manager?.cancelSync(jobId)
  })

  ipcMain.handle('sync:dryrun', async (_, profileId: number) => {
    return manager?.dryRun(profileId)
  })

  // ── Profils ───────────────────────────────────────────────

  ipcMain.handle('profiles:list', async () => {
    return manager?.getProfiles()
  })

  ipcMain.handle('profiles:get', async (_, id: number) => {
    return manager?.getProfile(id)
  })

  ipcMain.handle('profiles:create', async (_, data: any) => {
    return (manager as any)?.db.createProfile(data)
  })

  // ── Conflits ──────────────────────────────────────────────

  ipcMain.handle('conflicts:list', async () => {
    return manager?.getPendingConflicts()
  })

  ipcMain.handle('conflicts:resolve', async (
    _, conflictId: number, resolution: ConflictResolution
  ) => {
    return manager?.resolveConflict(conflictId, resolution)
  })

  // ── Logs ──────────────────────────────────────────────────

  ipcMain.handle('events:recent', async (_, limit: number) => {
    return manager?.getRecentEvents(limit)
  })

  // ── Dashboard ─────────────────────────────────────────────

  ipcMain.handle('dashboard:stats', async () => {
    return manager?.getDashboardStats()
  })

  ipcMain.handle('scheduler:info', async () => {
    return manager?.getSchedulerInfo()
  })
}

// ── Cycle de vie Electron ─────────────────────────────────────

app.whenReady().then(async () => {
  await initEngine()
  registerIpcHandlers()
  await createWindow()

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0)
      await createWindow()
  })
})

app.on('window-all-closed', async () => {
  await manager?.shutdown()
  if (process.platform !== 'darwin') app.quit()
})