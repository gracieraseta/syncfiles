import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electron', {

  // ── Auth ──────────────────────────────────────────────────

  login: (email: string, password: string) =>
    ipcRenderer.invoke('auth:login', email, password),

  register: (nom: string, email: string, password: string) =>
    ipcRenderer.invoke('auth:register', nom, email, password),

  forgotPassword: (email: string) =>
    ipcRenderer.invoke('auth:forgot', email),

  resetPassword: (token: string, newPassword: string) =>
    ipcRenderer.invoke('auth:reset', token, newPassword),

  // ── Sync ──────────────────────────────────────────────────

  startSync: (profileId: number) =>
    ipcRenderer.invoke('sync:start', profileId),

  pauseSync: (jobId: number) =>
    ipcRenderer.invoke('sync:pause', jobId),

  cancelSync: (jobId: number) =>
    ipcRenderer.invoke('sync:cancel', jobId),

  dryRun: (profileId: number) =>
    ipcRenderer.invoke('sync:dryrun', profileId),

  // ── Profils ───────────────────────────────────────────────

  getProfiles: () =>
    ipcRenderer.invoke('profiles:list'),

  getProfile: (id: number) =>
    ipcRenderer.invoke('profiles:get', id),

  createProfile: (data: any) =>
    ipcRenderer.invoke('profiles:create', data),

  // ── Conflits ──────────────────────────────────────────────

  getConflicts: () =>
    ipcRenderer.invoke('conflicts:list'),

  resolveConflict: (conflictId: number, resolution: string) =>
    ipcRenderer.invoke('conflicts:resolve', conflictId, resolution),

  // ── Logs ──────────────────────────────────────────────────

  getRecentEvents: (limit: number) =>
    ipcRenderer.invoke('events:recent', limit),

  // ── Dashboard ─────────────────────────────────────────────

  getDashboardStats: () =>
    ipcRenderer.invoke('dashboard:stats'),

  getSchedulerInfo: () =>
    ipcRenderer.invoke('scheduler:info'),

  // ── Événements push (Main → Renderer) ────────────────────

  onSyncProgress: (cb: (e: any) => void) => {
    ipcRenderer.on('sync:progress', (_, data) => cb(data))
    return () => ipcRenderer.removeAllListeners('sync:progress')
  },

  onSyncDone: (cb: (e: any) => void) => {
    ipcRenderer.on('sync:done', (_, data) => cb(data))
    return () => ipcRenderer.removeAllListeners('sync:done')
  },

  onSyncError: (cb: (e: any) => void) => {
    ipcRenderer.on('sync:error', (_, data) => cb(data))
    return () => ipcRenderer.removeAllListeners('sync:error')
  },

  onSyncConflict: (cb: (e: any) => void) => {
    ipcRenderer.on('sync:conflict', (_, data) => cb(data))
    return () => ipcRenderer.removeAllListeners('sync:conflict')
  },

  onFileChanged: (cb: (e: any) => void) => {
    ipcRenderer.on('file:changed', (_, data) => cb(data))
    return () => ipcRenderer.removeAllListeners('file:changed')
  }
})