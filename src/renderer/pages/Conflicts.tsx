import React, { useEffect, useState } from 'react'

export default function Conflicts() {
  const [conflicts, setConflicts] = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    loadConflicts()

    const unsub = (window as any).electron?.onSyncConflict(() => {
      loadConflicts()
    })

    return () => unsub?.()
  }, [])

  async function loadConflicts() {
    try {
      setLoading(true)
      const c = await (window as any).electron?.getConflicts()
      setConflicts(c || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleResolve(
    conflictId: number,
    resolution: 'KEEP_LOCAL' | 'KEEP_REMOTE' | 'MERGE'
  ) {
    try {
      await (window as any).electron?.resolveConflict(conflictId, resolution)
      await loadConflicts()
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', height: '100%'
      }}>
        <span style={{ fontSize: 13, color: 'var(--text3)' }}>Chargement…</span>
      </div>
    )
  }

  return (
    <div>
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <div className="page-title">Conflits</div>
          <div className="page-subtitle">
            {conflicts.length === 0
              ? 'Aucun conflit en attente'
              : `${conflicts.length} conflit(s) à résoudre`}
          </div>
        </div>
        <button className="btn" onClick={loadConflicts}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M13 8A5 5 0 1 1 8 3" stroke="currentColor" strokeWidth="1.3"
              strokeLinecap="round"/>
            <path d="M13 3v5h-5" stroke="currentColor" strokeWidth="1.3"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Actualiser
        </button>
      </div>

      {/* ── Aucun conflit ── */}
      {conflicts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none"
            style={{ margin: '0 auto 12px', display: 'block', opacity: .3 }}>
            <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M14 20l4 4 8-8" stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text2)' }}>
            Aucun conflit
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
            Toutes les synchronisations sont à jour
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {conflicts.map((c: any) => (
            <div key={c.id} className="card">

              {/* ── En-tête conflit ── */}
              <div style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', marginBottom: 12
              }}>
                <span style={{
                  fontSize: 13, fontWeight: 600,
                  color: 'var(--text)', fontFamily: 'var(--mono)'
                }}>
                  {c.chemin_relatif}
                </span>
                <span className="badge badge-amber">En attente</span>
              </div>

              {/* ── Comparaison versions ── */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 28px 1fr',
                gap: 8, marginBottom: 10,
                alignItems: 'center'
              }}>

                {/* Version locale */}
                <div style={{
                  background: 'var(--surface2)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 12px'
                }}>
                  <div style={{
                    fontSize: 10, fontWeight: 600,
                    color: 'var(--text3)', textTransform: 'uppercase',
                    letterSpacing: '.06em', marginBottom: 4
                  }}>
                    Version locale
                  </div>
                  <div style={{
                    fontSize: 12, color: 'var(--text)',
                    fontFamily: 'var(--mono)', marginBottom: 2
                  }}>
                    {new Date(c.date_local).toLocaleString('fr-FR')}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>
                    {(c.taille_local / 1024).toFixed(1)} Ko
                  </div>
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center', height: 28, fontSize: 11 }}
                    onClick={() => handleResolve(c.id, 'KEEP_LOCAL')}
                  >
                    Garder locale
                  </button>
                </div>

                {/* VS */}
                <div style={{
                  textAlign: 'center', fontSize: 11,
                  color: 'var(--text3)', fontWeight: 600
                }}>
                  vs
                </div>

                {/* Version distante */}
                <div style={{
                  background: 'var(--surface2)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 12px'
                }}>
                  <div style={{
                    fontSize: 10, fontWeight: 600,
                    color: 'var(--text3)', textTransform: 'uppercase',
                    letterSpacing: '.06em', marginBottom: 4
                  }}>
                    Version distante
                  </div>
                  <div style={{
                    fontSize: 12, color: 'var(--text)',
                    fontFamily: 'var(--mono)', marginBottom: 2
                  }}>
                    {new Date(c.date_distant).toLocaleString('fr-FR')}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>
                    {(c.taille_distant / 1024).toFixed(1)} Ko
                  </div>
                  <button
                    className="btn"
                    style={{ width: '100%', justifyContent: 'center', height: 28, fontSize: 11 }}
                    onClick={() => handleResolve(c.id, 'KEEP_REMOTE')}
                  >
                    Garder distante
                  </button>
                </div>
              </div>

              {/* ── Fusionner ── */}
              <button
                className="btn"
                style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}
                onClick={() => handleResolve(c.id, 'MERGE')}
              >
                Fusionner les deux versions
              </button>

            </div>
          ))}
        </div>
      )}
    </div>
  )
}