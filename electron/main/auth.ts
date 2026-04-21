import bcrypt        from 'bcryptjs'
import crypto        from 'crypto'
import { SyncDatabase } from '../../src/db/database'
import { sendResetEmail } from './mailer'

export class AuthService {
  private db: SyncDatabase

  constructor(db: SyncDatabase) {
    this.db = db
  }

  // ── Initialisation table reset tokens ────────────────────────

  async init(): Promise<void> {
    await this.db.pool.execute(`
      CREATE TABLE IF NOT EXISTS reset_tokens (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        user_id    INT          NOT NULL,
        token      VARCHAR(64)  NOT NULL UNIQUE,
        expires_at DATETIME     NOT NULL,
        used       BOOLEAN      NOT NULL DEFAULT FALSE,
        created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
  }

  // ── Inscription ───────────────────────────────────────────────

  async register(
    nom: string, email: string, password: string
  ): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      // Vérifier si email déjà utilisé
      const [existing] = await this.db.pool.execute<any[]>(
        'SELECT id FROM users WHERE email = ?', [email]
      )
      if ((existing as any[]).length > 0) {
        return { success: false, error: 'Cet email est déjà utilisé' }
      }

      // Hasher le mot de passe
      const hash = await bcrypt.hash(password, 12)

      // Créer l'utilisateur
      const [result] = await this.db.pool.execute<any>(
        `INSERT INTO users (nom, email, mot_de_passe, role)
         VALUES (?, ?, ?, 'user')`,
        [nom, email, hash]
      )

      const user = {
        id:    result.insertId,
        nom,
        email,
        role:  'user'
      }

      return { success: true, user }

    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  // ── Connexion ─────────────────────────────────────────────────

  async login(
    email: string, password: string
  ): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      const [rows] = await this.db.pool.execute<any[]>(
        'SELECT * FROM users WHERE email = ?', [email]
      )

      const users = rows as any[]
      if (users.length === 0) {
        return { success: false, error: 'Email ou mot de passe incorrect' }
      }

      const user = users[0]
      const valid = await bcrypt.compare(password, user.mot_de_passe)

      if (!valid) {
        return { success: false, error: 'Email ou mot de passe incorrect' }
      }

      return {
        success: true,
        user: {
          id:    user.id,
          nom:   user.nom,
          email: user.email,
          role:  user.role
        }
      }

    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  // ── Mot de passe oublié ───────────────────────────────────────

  async forgotPassword(
    email: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const [rows] = await this.db.pool.execute<any[]>(
        'SELECT * FROM users WHERE email = ?', [email]
      )

      const users = rows as any[]

      // Toujours retourner success pour ne pas révéler si l'email existe
      if (users.length === 0) {
        return { success: true }
      }

      const user  = users[0]
      const token = crypto.randomBytes(32).toString('hex')
      const expires = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes

      // Supprimer les anciens tokens
      await this.db.pool.execute(
        'DELETE FROM reset_tokens WHERE user_id = ?', [user.id]
      )

      // Insérer le nouveau token
      await this.db.pool.execute(
        `INSERT INTO reset_tokens (user_id, token, expires_at)
         VALUES (?, ?, ?)`,
        [user.id, token, expires]
      )

      // Envoyer l'email
      await sendResetEmail(user.email, user.nom, token)

      return { success: true }

    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  // ── Réinitialisation mot de passe ─────────────────────────────

  async resetPassword(
    token: string, newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const [rows] = await this.db.pool.execute<any[]>(
        `SELECT rt.*, u.email FROM reset_tokens rt
         JOIN users u ON u.id = rt.user_id
         WHERE rt.token = ?
           AND rt.used = FALSE
           AND rt.expires_at > NOW()`,
        [token]
      )

      const tokens = rows as any[]
      if (tokens.length === 0) {
        return { success: false, error: 'Token invalide ou expiré' }
      }

      const resetToken = tokens[0]
      const hash = await bcrypt.hash(newPassword, 12)

      // Mettre à jour le mot de passe
      await this.db.pool.execute(
        'UPDATE users SET mot_de_passe = ? WHERE id = ?',
        [hash, resetToken.user_id]
      )

      // Marquer le token comme utilisé
      await this.db.pool.execute(
        'UPDATE reset_tokens SET used = TRUE WHERE id = ?',
        [resetToken.id]
      )

      return { success: true }

    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }
}