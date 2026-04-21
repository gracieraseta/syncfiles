import React, { useEffect, useState } from 'react'

type Page = 'dashboard' | 'profiles' | 'conflicts' | 'logs'

interface Stats {
  profilsActifs:          number
  fichiersSyncAujourdhui: number
  conflitsEnAttente:      number
  octetsTransferesMois:   number
}

interface SyncRow {
  id:               number
  nom:              string
  statut:           string
  fichiers_traites: number
  fichiers_total:   number
}

interface Props {
  onNavigate: (page: Page) => void
}

function formatBytes(bytes: number): string {
  if (bytes < 1024)        return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  if (bytes < 1024 ** 3)   return `${(bytes / 1024 ** 2).toFixed(1)} Mo`
  return `${(bytes / 1024 ** 3).toFixed(2)} Go`
}

export default function Dashboard({ onNavigate }: Props) {
  const [stats,    setStats]    = useState<Stats | null>(null)
  const [profiles, setProfiles] = useState<SyncRow[]>([])
  const [jobs,     setJobs]     = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)
  const [syncing,  setSyncing]  = useState<number | null>(null)
  const [progress, setProgress] = useState<any>(null)

  useEffect(() => {
    loadData()

    // Écoute les événements de progression
    const unsubProgress = (window as any).electron?.onSyncProgress((e: any) => {
      setProgress(e)
      setSyncing(e.jobId)
    })

    const unsubDone = (window as any).electron?.onSyncDone((e: any) => {
      setSyncing(null)
      setProgress(null)
      loadData()
    })

    const unsubError = (window as any).electron?.onSyncError((e: any) => {
      setSyncing(null)
      setProgress(null)
      loadData()
    })

    return () => {
      unsubProgress?.()
      unsubDone?.()
      unsubError?.()
    }
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [s, p] = await Promise.all([
        (window as any).electron?.getDashboardStats(),
        (window as any).electron?.getProfiles()
      ])
      setStats(s)
      setProfiles(p || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleStartSync(profileId: number) {
    try {
      const jobId = await (window as any).electron?.startSync(profileId)
      setSyncing(jobId)
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <span style={{ fontSize: 13, color: 'var(--text3)' }}>Chargement…</span>
      </div>
    )
  }

  return (
    <div>
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <div className="page-title">Vue d'ensemble</div>
          <div className="page-subtitle">
            {new Date().toLocaleDateString('fr-FR', {
              weekday: 'long', year: 'numeric',
              month: 'long', day: 'numeric'
            })}
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => onNavigate('profiles')}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M8 3v10M3 8h10" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Nouveau profil
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Profils actifs</div>
          <div className="stat-value blue">{stats?.profilsActifs ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Fichiers sync</div>
          <div className="stat-value green">{stats?.fichiersSyncAujourdhui ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Conflits</div>
          <div className="stat-value red">{stats?.conflitsEnAttente ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Transféré</div>
          <div className="stat-value">{formatBytes(stats?.octetsTransferesMois ?? 0)}</div>
        </div>
      </div>

      {/* ── Progression active ── */}
      {progress && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-title">Synchronisation en cours</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>
            {progress.fichiersCourant}
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress.progression}%` }}
            />
          </div>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontSize: 11, color: 'var(--text3)', marginTop: 6
          }}>
            <span>{progress.fichiersTraites} / {progress.fichiersTotal} fichiers</span>
            <span>{progress.progression}%</span>
          </div>
        </div>
      )}

      {/* ── Profils ── */}
      <div className="two-col">
        <div className="card">
          <div className="card-title">Profils de synchronisation</div>
          {profiles.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text3)', textAlign: 'center', padding: '20px 0' }}>
              Aucun profil — créez-en un !
            </div>
          ) : (
            profiles.map((p: any) => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 0', borderBottom: '1px solid var(--border)'
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'var(--accent-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                    <path d="M3 10h14M10 3l7 7-7 7" stroke="#2563EB" strokeWidth="1.6"
                      strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                    {p.nom}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                    {p.sens} · {p.mode}
                  </div>
                </div>
                <span className={`badge ${p.statut === 'ACTIVE' ? 'badge-green' : 'badge-amber'}`}>
                  {p.statut === 'ACTIVE' ? 'Actif' : p.statut}
                </span>
                <button
                  className="btn"
                  style={{ height: 28, fontSize: 11, padding: '0 10px' }}
                  onClick={() => handleStartSync(p.id)}
                  disabled={syncing !== null}
                >
                  {syncing !== null ? 'En cours…' : 'Lancer'}
                </button>
              </div>
            ))
          )}
        </div>

        <div className="card">
          <div className="card-title">Informations</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.8 }}>
            <div style={{ marginBottom: 8 }}>
              <span style={{ color: 'var(--text3)' }}>Moteur</span>
              <span style={{ float: 'right', color: 'var(--green)' }}>En ligne</span>
            </div>
            <div style={{ marginBottom: 8 }}>
              <span style={{ color: 'var(--text3)' }}>Base de données</span>
              <span style={{ float: 'right', color: 'var(--green)' }}>MySQL</span>
            </div>
            <div style={{ marginBottom: 8 }}>
              <span style={{ color: 'var(--text3)' }}>Checksum</span>
              <span style={{ float: 'right' }}>SHA-256</span>
            </div>
            <div>
              <span style={{ color: 'var(--text3)' }}>Version</span>
              <span style={{ float: 'right' }}>1.0.0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}