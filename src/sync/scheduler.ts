import cron, { ScheduledTask } from 'node-cron'
import EventEmitter from 'events'
import type { SyncProfile } from '../shared/types'
import type { SyncEngine }  from './engine'
import { logger } from '../utils/logger'

export class SyncScheduler extends EventEmitter {
  private tasks  = new Map<number, ScheduledTask>()
  private engine: SyncEngine

  constructor(engine: SyncEngine) {
    super()
    this.engine = engine
  }

  schedule(profile: SyncProfile): void {
    if (!profile.cron_expr || !cron.validate(profile.cron_expr)) {
      logger.warn(`Cron invalide ou absent — profil ${profile.id}`)
      return
    }

    this.unschedule(profile.id)

    const task = cron.schedule(profile.cron_expr, async () => {
      logger.info(`Déclenchement planifié — "${profile.nom}"`, {
        profileId: profile.id,
        cron:      profile.cron_expr
      })
      try {
        const jobId = await this.engine.startSync(profile.id)
        this.emit('scheduler:triggered', { profileId: profile.id, jobId })
      } catch (err: any) {
        logger.error(`Erreur sync planifiée`, {
          profileId: profile.id,
          err:       err.message
        })
        this.emit('scheduler:error', { profileId: profile.id, error: err.message })
      }
    })

    this.tasks.set(profile.id, task)
    logger.info(`Planifié : "${profile.nom}" (${profile.cron_expr})`, {
      profileId: profile.id
    })
  }

  unschedule(profileId: number): void {
    this.tasks.get(profileId)?.stop()
    this.tasks.delete(profileId)
  }

  unscheduleAll(): void {
    for (const [id] of this.tasks) this.unschedule(id)
  }

  getScheduledProfiles(): number[] {
    return [...this.tasks.keys()]
  }

  static readonly PRESETS = {
    CHAQUE_HEURE:       '0 * * * *',
    CHAQUE_JOUR_2H:     '0 2 * * *',
    DEUX_FOIS_PAR_JOUR: '0 6,18 * * *',
    CHAQUE_LUNDI:       '0 2 * * 1',
    CHAQUE_MOIS:        '0 2 1 * *'
  } as const
}