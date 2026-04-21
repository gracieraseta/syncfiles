import path         from 'path'
import fs           from 'fs'
import EventEmitter from 'events'
import type { SyncDatabase }  from '../db/database'
import type {
  SyncProfile, SyncJob, EngineOptions,
  SyncProgressEvent, SyncResultEvent
} from '../shared/types'
import {
  scanDirectory, copyFile, removeFile,
  computeChecksum, pathExists,
  formatBytes, formatDuration
} from '../utils/fileUtils'
import { jobLogger, logger } from '../utils/logger'

interface FileDiff {
  toAdd:     string[]
  toUpdate:  string[]
  toDelete:  string[]
  toSkip:    string[]
  conflicts: string[]
}

export class SyncEngine extends EventEmitter {
  private db:         SyncDatabase
  private options:    EngineOptions
  private activeJobs = new Map<number, AbortController>()

  constructor(db: SyncDatabase, options: EngineOptions) {
    super()
    this.db      = db
    this.options = options
  }

  // ── API publique ─────────────────────────────────────────────

  async startSync(profileId: number): Promise<number> {
    const profile = await this.db.getProfile(profileId)
    if (!profile) throw new Error(`Profil introuvable : ${profileId}`)

    const jobId = await this.db.createJob(profileId)
    const log   = jobLogger(jobId)

    log.info(`Démarrage sync — "${profile.nom}"`, {
      sens:        profile.sens,
      source:      profile.source.chemin,
      destination: profile.destination.chemin
    })

    await this.db.updateJob(jobId, {
      statut:     'RUNNING',
      date_debut: new Date().toISOString()
    })

    const abort = new AbortController()
    this.activeJobs.set(jobId, abort)

    this.runSync(jobId, profile, abort.signal)
      .catch(async err => {
        log.error('Erreur fatale', { err: err.message })
        await this.db.updateJob(jobId, {
          statut:   'ERROR',
          date_fin: new Date().toISOString()
        })
        this.emit('sync:error', { jobId, profileId, error: err.message })
      })
      .finally(() => this.activeJobs.delete(jobId))

    return jobId
  }

  pauseSync(jobId: number): void {
    const ctrl = this.activeJobs.get(jobId)
    if (ctrl) {
      ctrl.abort('PAUSED')
      this.db.updateJob(jobId, { statut: 'PAUSED' })
    }
  }

  cancelSync(jobId: number): void {
    const ctrl = this.activeJobs.get(jobId)
    if (ctrl) {
      ctrl.abort('CANCELLED')
      this.db.updateJob(jobId, {
        statut:   'ERROR',
        date_fin: new Date().toISOString()
      })
    }
  }

  // ── Logique principale ────────────────────────────────────────

  private async runSync(
    jobId:   number,
    profile: SyncProfile,
    signal:  AbortSignal
  ): Promise<void> {
    const log       = jobLogger(jobId)
    const startTime = Date.now()
    const srcPath   = profile.source.chemin
    const dstPath   = profile.destination.chemin

    if (!(await pathExists(srcPath)))
      throw new Error(`Source inaccessible : ${srcPath}`)

    if (!(await pathExists(dstPath))) {
      log.info(`Création dossier destination : ${dstPath}`)
      await fs.promises.mkdir(dstPath, { recursive: true })
    }

    this.emitProgress(jobId, profile.id, 'RUNNING', 'Scan en cours…', 0, 0, 0, 0, 0)

    log.info('Scan source…')
    const sourceFiles = await scanDirectory(srcPath, profile.filtres, true)
    log.info(`Source : ${sourceFiles.length} fichiers`)
    this.checkAbort(signal)

    log.info('Scan destination…')
    const destFiles = await scanDirectory(dstPath, profile.filtres, false)
    log.info(`Destination : ${destFiles.length} fichiers`)

    const diff = await this.computeDiff(
      srcPath, dstPath, sourceFiles, destFiles, profile, signal
    )
    const total = diff.toAdd.length + diff.toUpdate.length + diff.toDelete.length

    await this.db.updateJob(jobId, { fichiers_total: total })
    log.info('Diff calculé', {
      ajouter:   diff.toAdd.length,
      modifier:  diff.toUpdate.length,
      supprimer: diff.toDelete.length,
      conflits:  diff.conflicts.length
    })

    if (diff.conflicts.length > 0)
      await this.handleConflicts(jobId, srcPath, dstPath, diff.conflicts, profile)

    let traites = 0, octets = 0, errors = 0

    for (const relPath of [...diff.toAdd, ...diff.toUpdate]) {
      this.checkAbort(signal)
      const src = path.join(srcPath, relPath)
      const dst = path.join(dstPath, relPath)

      try {
        if (diff.toUpdate.includes(relPath))
          await this.saveVersion(profile.id, dst, relPath)

        const { checksum, taille } = await copyFile(src, dst)
        octets += taille

        const action        = diff.toAdd.includes(relPath) ? 'ADDED' : 'MODIFIED'
        const checksumAvant = action === 'MODIFIED'
          ? await computeChecksum(src) : null

        await this.db.insertFileEvent({
          job_id:         jobId,
          nom_fichier:    path.basename(relPath),
          chemin_relatif: relPath,
          action,
          checksum_avant: checksumAvant,
          checksum_apres: checksum,
          taille,
          erreur:         null
        })

        traites++
        await this.db.updateJob(jobId, {
          fichiers_traites:  traites,
          octets_transferes: octets
        })

        const pct   = total > 0 ? Math.round((traites / total) * 100) : 100
        const duree = (Date.now() - startTime) / 1000
        this.emitProgress(
          jobId, profile.id, 'RUNNING', relPath, pct,
          traites, total, octets, octets / Math.max(duree, 1)
        )
        log.debug(`Copié : ${relPath} (${formatBytes(taille)})`)

      } catch (err: any) {
        errors++
        log.error(`Erreur copie : ${relPath}`, { err: err.message })
        await this.db.insertFileEvent({
          job_id:         jobId,
          nom_fichier:    path.basename(relPath),
          chemin_relatif: relPath,
          action:         'ADDED',
          checksum_avant: null,
          checksum_apres: null,
          taille:         0,
          erreur:         err.message
        })
      }
    }

    if (profile.sens !== 'B_TO_A') {
      for (const relPath of diff.toDelete) {
        this.checkAbort(signal)
        try {
          const dst = path.join(dstPath, relPath)
          await this.saveVersion(profile.id, dst, relPath)
          await removeFile(dst)
          await this.db.insertFileEvent({
            job_id:         jobId,
            nom_fichier:    path.basename(relPath),
            chemin_relatif: relPath,
            action:         'DELETED',
            checksum_avant: null,
            checksum_apres: null,
            taille:         0,
            erreur:         null
          })
          traites++
        } catch { errors++ }
      }
    }

    const dureeMs = Date.now() - startTime
    const statut  = errors > 0 ? 'ERROR' : 'DONE'

    await this.db.updateJob(jobId, {
      statut,
      date_fin:          new Date().toISOString(),
      fichiers_traites:  traites,
      fichiers_erreur:   errors,
      octets_transferes: octets
    })

    const result: SyncResultEvent = {
      jobId,
      profileId:        profile.id,
      statut,
      dureeMs,
      fichiersSynced:   traites,
      fichiersErreur:   errors,
      conflits:         diff.conflicts.length,
      octetsTransferes: octets
    }

    this.emit('sync:done', result)
    log.info(
      `Terminé — ${traites} fichiers, ${formatBytes(octets)}, ${formatDuration(dureeMs)}`
    )
  }

  // ── Calcul du diff ────────────────────────────────────────────

  private async computeDiff(
    srcPath:     string,
    dstPath:     string,
    sourceFiles: Awaited<ReturnType<typeof scanDirectory>>,
    destFiles:   Awaited<ReturnType<typeof scanDirectory>>,
    profile:     SyncProfile,
    signal:      AbortSignal
  ): Promise<FileDiff> {
    const diff: FileDiff = {
      toAdd: [], toUpdate: [], toDelete: [], toSkip: [], conflicts: []
    }
    const destIndex = new Map(destFiles.map(f => [f.cheminRelatif, f]))
    const srcIndex  = new Map(sourceFiles.map(f => [f.cheminRelatif, f]))
    const lastSync  = await this.getLastSyncTime(profile.id)

    for (const srcFile of sourceFiles) {
      this.checkAbort(signal)
      const destFile = destIndex.get(srcFile.cheminRelatif)

      if (!destFile) {
        diff.toAdd.push(srcFile.cheminRelatif)
        continue
      }

      const srcCk = await computeChecksum(srcFile.cheminAbsolu, this.options.checksumAlgo)
      const dstCk = await computeChecksum(destFile.cheminAbsolu, this.options.checksumAlgo)

      if (srcCk === dstCk) {
        diff.toSkip.push(srcFile.cheminRelatif)
        continue
      }

      if (profile.sens === 'BIDIRECTIONAL' && lastSync) {
        const srcMs = srcFile.dateMod.getTime()
        const dstMs = destFile.dateMod.getTime()
        if (srcMs > lastSync && dstMs > lastSync) {
          diff.conflicts.push(srcFile.cheminRelatif)
          continue
        }
      }

      diff.toUpdate.push(srcFile.cheminRelatif)
    }

    if (profile.sens !== 'B_TO_A') {
      for (const dstFile of destFiles) {
        if (!srcIndex.has(dstFile.cheminRelatif))
          diff.toDelete.push(dstFile.cheminRelatif)
      }
    }

    return diff
  }

  // ── Gestion des conflits ──────────────────────────────────────

  private async handleConflicts(
    jobId:   number,
    srcPath: string,
    dstPath: string,
    paths:   string[],
    profile: SyncProfile
  ): Promise<void> {
    const log = jobLogger(jobId)
    for (const relPath of paths) {
      const src = path.join(srcPath, relPath)
      const dst = path.join(dstPath, relPath)
      const [srcStat, dstStat, srcCk, dstCk] = await Promise.all([
        fs.promises.stat(src),
        fs.promises.stat(dst),
        computeChecksum(src, this.options.checksumAlgo),
        computeChecksum(dst, this.options.checksumAlgo)
      ])
      const conflictId = await this.db.insertConflict({
        job_id:           jobId,
        chemin_relatif:   relPath,
        checksum_local:   srcCk,
        checksum_distant: dstCk,
        taille_local:     srcStat.size,
        taille_distant:   dstStat.size,
        date_local:       srcStat.mtime.toISOString(),
        date_distant:     dstStat.mtime.toISOString(),
        statut:           'PENDING'
      })
      await this.db.insertFileEvent({
        job_id:         jobId,
        nom_fichier:    path.basename(relPath),
        chemin_relatif: relPath,
        action:         'CONFLICT',
        checksum_avant: srcCk,
        checksum_apres: dstCk,
        taille:         srcStat.size,
        erreur:         null
      })
      log.warn(`Conflit : ${relPath}`, { conflictId })
      this.emit('sync:conflict', {
        jobId,
        profileId:     profile.id,
        conflictId,
        cheminRelatif: relPath
      })
    }
  }

  // ── Versioning ────────────────────────────────────────────────

  private async saveVersion(
    profileId: number,
    filePath:  string,
    relPath:   string
  ): Promise<void> {
    if (!(await pathExists(filePath))) return
    const versionsDir = path.join(
      this.options.versionsDir, String(profileId), path.dirname(relPath)
    )
    await fs.promises.mkdir(versionsDir, { recursive: true })
    const ts         = new Date().toISOString().replace(/[:.]/g, '-')
    const backupPath = path.join(versionsDir, `${path.basename(relPath)}.${ts}.bak`)
    await fs.promises.copyFile(filePath, backupPath)
    const stat     = await fs.promises.stat(filePath)
    const checksum = await computeChecksum(filePath, this.options.checksumAlgo)
    await this.db.insertVersion({
      profile_id:     profileId,
      chemin_relatif: relPath,
      checksum,
      taille:         stat.size,
      chemin_backup:  backupPath
    })
    await this.db.pruneVersions(profileId, relPath, this.options.maxVersions)
  }

  // ── Dry run ───────────────────────────────────────────────────

  async dryRun(profileId: number) {
    const profile = await this.db.getProfile(profileId)
    if (!profile) throw new Error(`Profil introuvable : ${profileId}`)
    const srcFiles = await scanDirectory(profile.source.chemin, profile.filtres, true)
    const dstFiles = await scanDirectory(profile.destination.chemin, profile.filtres, false)
    const abort    = new AbortController()
    const diff     = await this.computeDiff(
      profile.source.chemin, profile.destination.chemin,
      srcFiles, dstFiles, profile, abort.signal
    )
    const octets = srcFiles
      .filter(f =>
        diff.toAdd.includes(f.cheminRelatif) ||
        diff.toUpdate.includes(f.cheminRelatif)
      )
      .reduce((s, f) => s + f.taille, 0)
    return {
      toAdd:         diff.toAdd,
      toUpdate:      diff.toUpdate,
      toDelete:      diff.toDelete,
      conflicts:     diff.conflicts,
      octetsEstimes: octets
    }
  }

  // ── Helpers ───────────────────────────────────────────────────

  private async getLastSyncTime(profileId: number): Promise<number | null> {
    const jobs = await this.db.getJobsByProfile(profileId, 1)
    return jobs.length && jobs[0].date_fin
      ? new Date(jobs[0].date_fin).getTime() : null
  }

  private checkAbort(signal: AbortSignal): void {
    if (signal.aborted) throw new Error(`Sync interrompue : ${signal.reason}`)
  }

  private emitProgress(
    jobId:            number,
    profileId:        number,
    statut:           SyncJob['statut'],
    fichiersCourant:  string,
    progression:      number,
    fichiersTraites:  number,
    fichiersTotal:    number,
    octetsTransferes: number,
    vitesse:          number
  ): void {
    this.emit('sync:progress', {
      jobId, profileId, statut, fichiersCourant,
      progression, fichiersTraites, fichiersTotal,
      octetsTransferes, vitesse
    } as SyncProgressEvent)
  }
}