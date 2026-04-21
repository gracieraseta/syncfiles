import EventEmitter from 'events'
import type { SyncDatabase }  from '../db/database'
import type {
  EngineOptions, SyncProfile, ConflictResolution
} from '../shared/types'
import { SyncEngine }    from './engine'
import { FileWatcher }   from './watcher'
import { SyncScheduler } from './scheduler'
import { logger }        from '../utils/logger'
import { formatBytes }   from '../utils/fileUtils'

export class SyncManager extends EventEmitter {
  private db:        SyncDatabase
  private engine:    SyncEngine
  private watcher:   FileWatcher
  private scheduler: SyncScheduler

  constructor(db: SyncDatabase, options: EngineOptions) {
    super()
    this.db        = db
    this.engine    = new SyncEngine(db, options)
    this.watcher   = new FileWatcher(this.engine)
    this.scheduler = new SyncScheduler(this.engine)
    this.bindEvents()
  }

  // ── Init & shutdown ──────────────────────────────────────────

  async init(): Promise<void> {
    logger.info('Initialisation du moteur SyncFiles…')
    const profiles = await this.db.getAllProfiles()
    const actifs   = profiles.filter(p => p.statut === 'ACTIVE')
    logger.info(`${actifs.length} profil(s) actif(s)`)
    actifs.forEach(p => this.activateProfile(p))
    this.emit('ready', { profilsActifs: actifs.length })
  }

  async shutdown(): Promise<void> {
    logger.info('Arrêt du moteur…')
    this.scheduler.unscheduleAll()
    await this.watcher.unwatchAll()
    await this.db.close()
    logger.info('Moteur arrêté')
  }

  // ── Profils ───────────────────────────────────────────────────

  activateProfile(profile: SyncProfile): void {
    if (profile.mode === 'REALTIME')  this.watcher.watch(profile)
    if (profile.mode === 'SCHEDULED') this.scheduler.schedule(profile)
  }

  async deactivateProfile(profileId: number): Promise<void> {
    await this.watcher.unwatch(profileId)
    this.scheduler.unschedule(profileId)
  }

  // ── Actions ───────────────────────────────────────────────────

  async startSync(profileId: number)  { return this.engine.startSync(profileId) }
  pauseSync(jobId: number)            { this.engine.pauseSync(jobId) }
  cancelSync(jobId: number)           { this.engine.cancelSync(jobId) }
  async dryRun(profileId: number)     { return this.engine.dryRun(profileId) }

  async resolveConflict(
    conflictId: number,
    resolution: ConflictResolution
  ): Promise<void> {
    await this.db.resolveConflict(conflictId, resolution)
    logger.info(`Conflit ${conflictId} résolu : ${resolution}`)
    this.emit('conflict:resolved', { conflictId, resolution })
  }

  // ── Données UI ────────────────────────────────────────────────

  async getDashboardStats()              { return this.db.getDashboardStats() }
  async getProfiles(userId?: number)     { return this.db.getAllProfiles(userId) }
  async getProfile(id: number)           { return this.db.getProfile(id) }
  async getPendingConflicts()            { return this.db.getPendingConflicts() }
  async getJobHistory(profileId: number) { return this.db.getJobsByProfile(profileId) }
  async getRecentEvents(limit = 100)     { return this.db.getRecentEvents(limit) }

  getSchedulerInfo() {
    return {
      profilsPlanifies: this.scheduler.getScheduledProfiles(),
      profilsTempsReel: this.watcher.getActiveProfiles(),
      presets:          SyncScheduler.PRESETS
    }
  }

  // ── Binding événements ────────────────────────────────────────

  private bindEvents(): void {
    this.engine.on('sync:progress', e => this.emit('progress', e))

    this.engine.on('sync:done', e => {
      logger.info(
        `Job ${e.jobId} terminé — ${e.fichiersSynced} fichiers, ${formatBytes(e.octetsTransferes)}`
      )
      this.emit('done', e)
    })

    this.engine.on('sync:error', e => {
      logger.error(`Job ${e.jobId} erreur`, e)
      this.emit('error', e)
    })

    this.engine.on('sync:conflict', e => this.emit('conflict', e))

    this.watcher.on('watcher:error',  e => this.emit('watcher:error', e))
    this.watcher.on('watcher:change', e => this.emit('file:changed', e))

    this.scheduler.on('scheduler:triggered', e => this.emit('scheduler:triggered', e))
    this.scheduler.on('scheduler:error',     e => this.emit('scheduler:error', e))
  }
}