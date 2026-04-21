import mysql, { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise'
import type {
  SyncProfile, SyncJob, FileEvent,
  Conflict, FileVersion, ConflictResolution
} from '../shared/types'

export class SyncDatabase {
  private pool!: Pool

  constructor() {}

  async init(): Promise<void> {
    this.pool = mysql.createPool({
      host:     'localhost',
      port:     3306,
      user:     'root',
      password: '',
      database: 'syncfiles',
      waitForConnections: true,
      connectionLimit:    10
    })
    await this.initSchema()
  }

  private async initSchema(): Promise<void> {
    await this.pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        nom           VARCHAR(255) NOT NULL,
        email         VARCHAR(255) NOT NULL UNIQUE,
        mot_de_passe  VARCHAR(255) NOT NULL,
        role          VARCHAR(50)  NOT NULL DEFAULT 'user',
        date_creation DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await this.pool.execute(`
      CREATE TABLE IF NOT EXISTS sync_profiles (
        id        INT AUTO_INCREMENT PRIMARY KEY,
        nom       VARCHAR(255) NOT NULL,
        sens      VARCHAR(50)  NOT NULL,
        mode      VARCHAR(50)  NOT NULL,
        cron_expr VARCHAR(100),
        statut    VARCHAR(50)  NOT NULL DEFAULT 'ACTIVE',
        filtres   TEXT         NOT NULL,
        user_id   INT          NOT NULL
      )
    `)

    await this.pool.execute(`
      CREATE TABLE IF NOT EXISTS endpoints (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        type        VARCHAR(50)  NOT NULL,
        chemin      TEXT         NOT NULL,
        credentials TEXT,
        role        VARCHAR(50)  NOT NULL,
        profile_id  INT          NOT NULL
      )
    `)

    await this.pool.execute(`
      CREATE TABLE IF NOT EXISTS sync_jobs (
        id                INT AUTO_INCREMENT PRIMARY KEY,
        profile_id        INT      NOT NULL,
        date_debut        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        date_fin          DATETIME,
        statut            VARCHAR(50)  NOT NULL DEFAULT 'PENDING',
        fichiers_total    INT      NOT NULL DEFAULT 0,
        fichiers_traites  INT      NOT NULL DEFAULT 0,
        fichiers_erreur   INT      NOT NULL DEFAULT 0,
        octets_transferes BIGINT   NOT NULL DEFAULT 0
      )
    `)

    await this.pool.execute(`
      CREATE TABLE IF NOT EXISTS file_events (
        id             INT AUTO_INCREMENT PRIMARY KEY,
        job_id         INT          NOT NULL,
        nom_fichier    VARCHAR(255) NOT NULL,
        chemin_relatif TEXT         NOT NULL,
        action         VARCHAR(50)  NOT NULL,
        checksum_avant VARCHAR(64),
        checksum_apres VARCHAR(64),
        taille         BIGINT       NOT NULL DEFAULT 0,
        date_evenement DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        erreur         TEXT
      )
    `)

    await this.pool.execute(`
      CREATE TABLE IF NOT EXISTS conflicts (
        id               INT AUTO_INCREMENT PRIMARY KEY,
        job_id           INT          NOT NULL,
        chemin_relatif   TEXT         NOT NULL,
        checksum_local   VARCHAR(64)  NOT NULL,
        checksum_distant VARCHAR(64)  NOT NULL,
        taille_local     BIGINT       NOT NULL DEFAULT 0,
        taille_distant   BIGINT       NOT NULL DEFAULT 0,
        date_local       DATETIME     NOT NULL,
        date_distant     DATETIME     NOT NULL,
        statut           VARCHAR(50)  NOT NULL DEFAULT 'PENDING',
        date_detection   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await this.pool.execute(`
      CREATE TABLE IF NOT EXISTS file_versions (
        id             INT AUTO_INCREMENT PRIMARY KEY,
        profile_id     INT          NOT NULL,
        chemin_relatif TEXT         NOT NULL,
        checksum       VARCHAR(64)  NOT NULL,
        taille         BIGINT       NOT NULL DEFAULT 0,
        date_version   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        chemin_backup  TEXT         NOT NULL
      )
    `)
  }

  // ── Profils ─────────────────────────────────────────────────

  async getProfile(id: number): Promise<SyncProfile | null> {
    const [rows] = await this.pool.execute<RowDataPacket[]>(`
      SELECT p.*,
        s.id as src_id, s.type as src_type, s.chemin as src_chemin, s.credentials as src_creds,
        d.id as dst_id, d.type as dst_type, d.chemin as dst_chemin, d.credentials as dst_creds
      FROM sync_profiles p
      LEFT JOIN endpoints s ON s.profile_id = p.id AND s.role = 'SOURCE'
      LEFT JOIN endpoints d ON d.profile_id = p.id AND d.role = 'DESTINATION'
      WHERE p.id = ?
    `, [id])
    if (!rows.length) return null
    return this.mapProfile(rows[0])
  }

  async getAllProfiles(userId?: number): Promise<SyncProfile[]> {
    const base = `
      SELECT p.*,
        s.id as src_id, s.type as src_type, s.chemin as src_chemin, s.credentials as src_creds,
        d.id as dst_id, d.type as dst_type, d.chemin as dst_chemin, d.credentials as dst_creds
      FROM sync_profiles p
      LEFT JOIN endpoints s ON s.profile_id = p.id AND s.role = 'SOURCE'
      LEFT JOIN endpoints d ON d.profile_id = p.id AND d.role = 'DESTINATION'
    `
    const [rows] = userId
      ? await this.pool.execute<RowDataPacket[]>(base + ' WHERE p.user_id = ?', [userId])
      : await this.pool.execute<RowDataPacket[]>(base)
    return rows.map(r => this.mapProfile(r))
  }

  private mapProfile(row: any): SyncProfile {
    return {
      id: row.id, nom: row.nom, sens: row.sens, mode: row.mode,
      cron_expr: row.cron_expr, statut: row.statut, user_id: row.user_id,
      filtres: typeof row.filtres === 'string' ? JSON.parse(row.filtres) : row.filtres,
      source: {
        id: row.src_id, type: row.src_type, chemin: row.src_chemin,
        credentials: row.src_creds ? JSON.parse(row.src_creds) : null,
        profile_id: row.id, role: 'SOURCE'
      },
      destination: {
        id: row.dst_id, type: row.dst_type, chemin: row.dst_chemin,
        credentials: row.dst_creds ? JSON.parse(row.dst_creds) : null,
        profile_id: row.id, role: 'DESTINATION'
      }
    }
  }

  async createProfile(data: {
    nom: string; sens: string; mode: string; cron_expr?: string
    filtres: object; user_id: number
    source:      { type: string; chemin: string; credentials?: object }
    destination: { type: string; chemin: string; credentials?: object }
  }): Promise<number> {
    const [result] = await this.pool.execute<ResultSetHeader>(
      `INSERT INTO sync_profiles (nom, sens, mode, cron_expr, filtres, user_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [data.nom, data.sens, data.mode, data.cron_expr ?? null,
       JSON.stringify(data.filtres), data.user_id]
    )
    const profileId = result.insertId

    await this.pool.execute(
      `INSERT INTO endpoints (type, chemin, credentials, role, profile_id)
       VALUES (?, ?, ?, 'SOURCE', ?)`,
      [data.source.type, data.source.chemin,
       data.source.credentials ? JSON.stringify(data.source.credentials) : null,
       profileId]
    )

    await this.pool.execute(
      `INSERT INTO endpoints (type, chemin, credentials, role, profile_id)
       VALUES (?, ?, ?, 'DESTINATION', ?)`,
      [data.destination.type, data.destination.chemin,
       data.destination.credentials ? JSON.stringify(data.destination.credentials) : null,
       profileId]
    )

    return profileId
  }

  // ── Jobs ─────────────────────────────────────────────────────

  async createJob(profileId: number): Promise<number> {
    const [result] = await this.pool.execute<ResultSetHeader>(
      `INSERT INTO sync_jobs (profile_id, statut) VALUES (?, 'PENDING')`,
      [profileId]
    )
    return result.insertId
  }

  async updateJob(id: number, data: Partial<SyncJob>): Promise<void> {
    const keys   = Object.keys(data).filter(k => k !== 'id')
    const values = keys.map(k => (data as any)[k])
    const fields = keys.map(k => `${k} = ?`).join(', ')
    await this.pool.execute(
      `UPDATE sync_jobs SET ${fields} WHERE id = ?`,
      [...values, id]
    )
  }

  async getJob(id: number): Promise<SyncJob | null> {
    const [rows] = await this.pool.execute<RowDataPacket[]>(
      'SELECT * FROM sync_jobs WHERE id = ?', [id]
    )
    return rows.length ? rows[0] as SyncJob : null
  }

  async getJobsByProfile(profileId: number, limit = 50): Promise<SyncJob[]> {
    const [rows] = await this.pool.execute<RowDataPacket[]>(
      'SELECT * FROM sync_jobs WHERE profile_id = ? ORDER BY date_debut DESC LIMIT ?',
      [profileId, limit]
    )
    return rows as SyncJob[]
  }

  // ── Événements ───────────────────────────────────────────────

  async insertFileEvent(e: Omit<FileEvent, 'id' | 'date_evenement'>): Promise<void> {
    await this.pool.execute(
      `INSERT INTO file_events
         (job_id, nom_fichier, chemin_relatif, action,
          checksum_avant, checksum_apres, taille, erreur)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [e.job_id, e.nom_fichier, e.chemin_relatif, e.action,
       e.checksum_avant, e.checksum_apres, e.taille, e.erreur]
    )
  }

  async getRecentEvents(limit = 100): Promise<FileEvent[]> {
    const [rows] = await this.pool.execute<RowDataPacket[]>(
      'SELECT * FROM file_events ORDER BY date_evenement DESC LIMIT ?',
      [limit]
    )
    return rows as FileEvent[]
  }

  async getEventsByJob(jobId: number): Promise<FileEvent[]> {
    const [rows] = await this.pool.execute<RowDataPacket[]>(
      'SELECT * FROM file_events WHERE job_id = ? ORDER BY date_evenement DESC',
      [jobId]
    )
    return rows as FileEvent[]
  }

  // ── Conflits ─────────────────────────────────────────────────

  async insertConflict(c: Omit<Conflict, 'id' | 'date_detection'>): Promise<number> {
    const [result] = await this.pool.execute<ResultSetHeader>(
      `INSERT INTO conflicts
         (job_id, chemin_relatif, checksum_local, checksum_distant,
          taille_local, taille_distant, date_local, date_distant, statut)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      [c.job_id, c.chemin_relatif, c.checksum_local, c.checksum_distant,
       c.taille_local, c.taille_distant, c.date_local, c.date_distant]
    )
    return result.insertId
  }

  async resolveConflict(id: number, resolution: ConflictResolution): Promise<void> {
    await this.pool.execute(
      'UPDATE conflicts SET statut = ? WHERE id = ?',
      [resolution, id]
    )
  }

  async getPendingConflicts(): Promise<Conflict[]> {
    const [rows] = await this.pool.execute<RowDataPacket[]>(
      `SELECT * FROM conflicts WHERE statut = 'PENDING' ORDER BY date_detection DESC`
    )
    return rows as Conflict[]
  }

  // ── Versions ─────────────────────────────────────────────────

  async insertVersion(v: Omit<FileVersion, 'id' | 'date_version'>): Promise<void> {
    await this.pool.execute(
      `INSERT INTO file_versions
         (profile_id, chemin_relatif, checksum, taille, chemin_backup)
       VALUES (?, ?, ?, ?, ?)`,
      [v.profile_id, v.chemin_relatif, v.checksum, v.taille, v.chemin_backup]
    )
  }

  async getVersions(profileId: number, cheminRelatif: string): Promise<FileVersion[]> {
    const [rows] = await this.pool.execute<RowDataPacket[]>(
      `SELECT * FROM file_versions
       WHERE profile_id = ? AND chemin_relatif = ?
       ORDER BY date_version DESC`,
      [profileId, cheminRelatif]
    )
    return rows as FileVersion[]
  }

  async pruneVersions(
    profileId: number,
    cheminRelatif: string,
    maxVersions: number
  ): Promise<void> {
    const versions = await this.getVersions(profileId, cheminRelatif)
    if (versions.length > maxVersions) {
      for (const v of versions.slice(maxVersions)) {
        await this.pool.execute(
          'DELETE FROM file_versions WHERE id = ?', [v.id]
        )
      }
    }
  }

  // ── Stats dashboard ───────────────────────────────────────────

  async getDashboardStats() {
    const [[r1]] = await this.pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as n FROM sync_profiles WHERE statut = 'ACTIVE'`
    )
    const [[r2]] = await this.pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as n FROM file_events
       WHERE DATE(date_evenement) = CURDATE() AND action != 'SKIPPED'`
    )
    const [[r3]] = await this.pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as n FROM conflicts WHERE statut = 'PENDING'`
    )
    const [[r4]] = await this.pool.execute<RowDataPacket[]>(
      `SELECT COALESCE(SUM(octets_transferes), 0) as total FROM sync_jobs
       WHERE YEAR(date_debut) = YEAR(NOW()) AND MONTH(date_debut) = MONTH(NOW())`
    )
    return {
      profilsActifs:          r1.n,
      fichiersSyncAujourdhui: r2.n,
      conflitsEnAttente:      r3.n,
      octetsTransferesMois:   r4.total
    }
  }

  async close(): Promise<void> {
    await this.pool.end()
  }
}