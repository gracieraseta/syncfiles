import path from 'path'
import os   from 'os'
import { SyncDatabase }  from './db/database'
import { SyncManager }   from './sync/manager'
import { SyncScheduler } from './sync/scheduler'
import { logger }        from './utils/logger'
import { formatBytes }   from './utils/fileUtils'
import type { EngineOptions } from './shared/types'

async function main() {
  const options: EngineOptions = {
    dbPath:             path.join(os.homedir(), '.syncfiles', 'syncfiles.db'),
    versionsDir:        'C:\\synctest\\versions',
    maxVersions:        5,
    checksumAlgo:       'sha256',
    compressionActif:   false,
    bandwidthLimitKBps: null
  }

  const db = new SyncDatabase()
  await db.init()
  logger.info('Connexion MySQL établie')

  const manager = new SyncManager(db, options)

  manager.on('ready', ({ profilsActifs }: { profilsActifs: number }) =>
    logger.info(`Moteur prêt — ${profilsActifs} profil(s) actif(s)`)
  )

  manager.on('progress', (e: any) => {
    process.stdout.write(
      `\r  [${String(e.progression).padStart(3)}%] ` +
      `${String(e.fichiersCourant).slice(0, 45).padEnd(45)} ` +
      `${e.fichiersTraites}/${e.fichiersTotal} — ` +
      `${formatBytes(e.vitesse)}/s  `
    )
  })

  manager.on('done', (e: any) => {
    console.log(
      `\n  Job ${e.jobId} terminé — ` +
      `${e.fichiersSynced} fichiers, ` +
      `${formatBytes(e.octetsTransferes)}, ` +
      `${e.dureeMs}ms`
    )
    if (e.conflits > 0)
      logger.warn(`  ${e.conflits} conflit(s) en attente de résolution`)
  })

  manager.on('conflict', (e: any) =>
    logger.warn(`Conflit détecté : ${e.cheminRelatif}`, { conflictId: e.conflictId })
  )

  manager.on('error', (e: any) =>
    logger.error(`Erreur job ${e.jobId}`, { error: e.error })
  )

  manager.on('file:changed', (e: any) =>
    logger.debug(`Fichier modifié (watcher)`, e)
  )

  await manager.init()

  // ── Créer les dossiers de test ───────────────────────────────
  const fs = await import('fs')
  const srcDir = 'C:\\synctest\\source'
  const dstDir = 'C:\\synctest\\destination'

  if (!fs.existsSync(srcDir)) fs.mkdirSync(srcDir, { recursive: true })
  if (!fs.existsSync(dstDir)) fs.mkdirSync(dstDir, { recursive: true })

  // Créer des fichiers de test si dossier vide
  const fichiers = fs.readdirSync(srcDir)
  if (fichiers.length === 0) {
    fs.writeFileSync(`${srcDir}\\fichier1.txt`, 'Contenu fichier test 1')
    fs.writeFileSync(`${srcDir}\\fichier2.txt`, 'Contenu fichier test 2')
    fs.writeFileSync(`${srcDir}\\document.txt`, 'Document important SyncFiles')
    logger.info('Fichiers de test créés dans C:\\synctest\\source')
  }

  // ── Créer utilisateur + profil de test ───────────────────────
  const profiles = await db.getAllProfiles()

  if (profiles.length === 0) {
    logger.info('Création du profil de test…')

    await db.createProfile({
      nom:     'Test — Source vers Destination',
      sens:    'A_TO_B',
      mode:    'MANUAL',
      filtres: {
        exclure:       ['*.tmp', '.DS_Store'],
        inclure:       [],
        taille_max_mo: 100
      },
      user_id:     1,
      source:      { type: 'LOCAL', chemin: srcDir },
      destination: { type: 'LOCAL', chemin: dstDir }
    })

    logger.info('Profil de test créé !')
  }

  // ── Récupérer le profil ───────────────────────────────────────
  const allProfiles = await db.getAllProfiles()
  const profile     = allProfiles[0]

  logger.info(`Profil actif : "${profile.nom}"`, {
    source:      profile.source.chemin,
    destination: profile.destination.chemin
  })

  // ── Dry run (simulation) ─────────────────────────────────────
  logger.info('Simulation (dry run)…')
  const preview = await manager.dryRun(profile.id)
  logger.info('Aperçu sync', {
    aAjouter:      preview.toAdd.length,
    aModifier:     preview.toUpdate.length,
    aSupprimer:    preview.toDelete.length,
    conflits:      preview.conflicts.length,
    octetsEstimes: formatBytes(preview.octetsEstimes)
  })

  // ── Lancer la sync ────────────────────────────────────────────
  logger.info('Lancement synchronisation…')
  const jobId = await manager.startSync(profile.id)
  logger.info(`Job démarré (id: ${jobId})`)

  // Attendre la fin du job
  await new Promise<void>(resolve => {
    manager.on('done',  () => setTimeout(resolve, 500))
    manager.on('error', () => setTimeout(resolve, 500))
  })

  // ── Stats finales ─────────────────────────────────────────────
  const stats = await manager.getDashboardStats()
  logger.info('Stats finales', {
    profilsActifs:          stats.profilsActifs,
    fichiersSyncAujourdhui: stats.fichiersSyncAujourdhui,
    conflitsEnAttente:      stats.conflitsEnAttente,
    octetsTransferes:       formatBytes(stats.octetsTransferesMois)
  })

  logger.info('Presets cron disponibles :')
  Object.entries(SyncScheduler.PRESETS).forEach(([k, v]) =>
    logger.info(`  ${k.padEnd(22)} → ${v}`)
  )

  // Arrêt propre
  process.on('SIGINT', async () => {
    console.log('')
    logger.info('Arrêt en cours…')
    await manager.shutdown()
    process.exit(0)
  })

  logger.info('En attente — Ctrl+C pour arrêter')
}

main().catch(err => {
  logger.error('Erreur fatale', { err: err.message })
  process.exit(1)
})