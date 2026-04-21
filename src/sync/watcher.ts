import chokidar, { FSWatcher } from 'chokidar'
import path         from 'path'
import EventEmitter from 'events'
import type { SyncProfile } from '../shared/types'
import type { SyncEngine }  from './engine'
import { logger } from '../utils/logger'

const DEBOUNCE_MS = 1500

export class FileWatcher extends EventEmitter {
  private watchers = new Map<number, FSWatcher>()
  private timers   = new Map<number, NodeJS.Timeout>()
  private engine:  SyncEngine

  constructor(engine: SyncEngine) {
    super()
    this.engine = engine
  }

  watch(profile: SyncProfile): void {
    if (this.watchers.has(profile.id)) return

    const watcher = chokidar.watch(profile.source.chemin, {
      persistent:       true,
      ignoreInitial:    true,
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval:       100
      },
      ignored: (fp: string) => {
        const rel = path.relative(profile.source.chemin, fp)
        return profile.filtres.exclure.some(p =>
          rel.includes(p.replace(/\*/g, ''))
        )
      }
    })

    watcher
      .on('add',    fp => this.onChanged(profile, fp, 'ADDED'))
      .on('change', fp => this.onChanged(profile, fp, 'MODIFIED'))
      .on('unlink', fp => this.onChanged(profile, fp, 'DELETED'))
      .on('error',  err => {
        logger.error(`Watcher erreur profil ${profile.id}`, { err: String(err) })
        this.emit('watcher:error', { profileId: profile.id, error: String(err) })
      })
      .on('ready', () => {
        logger.info(`Watcher prêt : ${profile.source.chemin}`)
        this.emit('watcher:ready', { profileId: profile.id })
      })

    this.watchers.set(profile.id, watcher)
    logger.info(`Watcher démarré — profil ${profile.id}`)
  }

  async unwatch(profileId: number): Promise<void> {
    await this.watchers.get(profileId)?.close()
    this.watchers.delete(profileId)
    const t = this.timers.get(profileId)
    if (t) { clearTimeout(t); this.timers.delete(profileId) }
    logger.info(`Watcher arrêté — profil ${profileId}`)
  }

  async unwatchAll(): Promise<void> {
    await Promise.all([...this.watchers.keys()].map(id => this.unwatch(id)))
  }

  getActiveProfiles(): number[] {
    return [...this.watchers.keys()]
  }

  private onChanged(
    profile: SyncProfile,
    filePath: string,
    action: string
  ): void {
    const rel = path.relative(profile.source.chemin, filePath)
    logger.debug(`Fichier ${action} : ${rel}`, { profileId: profile.id })
    this.emit('watcher:change', { profileId: profile.id, filePath: rel, action })

    const existing = this.timers.get(profile.id)
    if (existing) clearTimeout(existing)

    const timer = setTimeout(async () => {
      this.timers.delete(profile.id)
      logger.info(`Déclenchement sync temps réel — profil ${profile.id}`)
      try {
        const jobId = await this.engine.startSync(profile.id)
        this.emit('watcher:sync-started', { profileId: profile.id, jobId })
      } catch (err: any) {
        logger.error(`Erreur déclenchement sync`, {
          profileId: profile.id, err: err.message
        })
        this.emit('watcher:error', { profileId: profile.id, error: err.message })
      }
    }, DEBOUNCE_MS)

    this.timers.set(profile.id, timer)
  }
}